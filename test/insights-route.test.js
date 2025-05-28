const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

// Mock Claude service
jest.mock('../services/claudeService', () => ({
  sendMessage: jest.fn().mockResolvedValue({
    content: JSON.stringify({
      triggerThemes: ['I felt abandoned'],
      negativeCoreBeliefs: ['I am not good enough'],
      affirmations: ['I am enough just as I am'],
      summary: 'Summary here.'
    })
  })
}));

const claudeService = require('../services/claudeService');
const insightsRoute = require('../routes/insights');

const app = express();
app.use(express.json());
app.use('/api/insights', insightsRoute);

// Helper to create JWT
function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
}

describe('GET /api/insights/:userId', () => {
  let user, token;

  beforeAll(async () => {
    // Connect to in-memory MongoDB or test DB
    await mongoose.connect(global.__MONGO_URI__ || 'mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Message.deleteMany({});
    user = await User.create({ email: 'test@example.com', password: 'pass', name: 'Test User' });
    token = createToken(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should require authentication', async () => {
    const res = await request(app).get(`/api/insights/${user._id}`);
    expect(res.status).toBe(401);
  });

  it('should forbid access to other users', async () => {
    const otherId = new mongoose.Types.ObjectId();
    const otherToken = createToken(otherId.toString());
    const res = await request(app)
      .get(`/api/insights/${user._id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('should return 400 for invalid userId', async () => {
    const res = await request(app)
      .get('/api/insights/invalidid')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('should return null insights and empty messages if no messages', async () => {
    const res = await request(app)
      .get(`/api/insights/${user._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.insights).toBeNull();
    expect(res.body.data.messages).toEqual([]);
  });

  it('should return structured insights for user with messages', async () => {
    await Message.create({
      userId: user._id,
      content: 'I feel abandoned and not good enough.',
      sender: 'user',
      conversationId: new mongoose.Types.ObjectId()
    });
    const res = await request(app)
      .get(`/api/insights/${user._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.insights).toHaveProperty('triggerThemes');
    expect(res.body.data.insights).toHaveProperty('negativeCoreBeliefs');
    expect(res.body.data.insights).toHaveProperty('affirmations');
    expect(res.body.data.insights).toHaveProperty('summary');
    expect(Array.isArray(res.body.data.insights.triggerThemes)).toBe(true);
    expect(Array.isArray(res.body.data.insights.negativeCoreBeliefs)).toBe(true);
    expect(Array.isArray(res.body.data.insights.affirmations)).toBe(true);
    expect(typeof res.body.data.insights.summary).toBe('string');
    expect(res.body.data.messages.length).toBe(1);
  });
}); 