const mongoose = require('mongoose');
const Message = require('../models/Message');
const claudeService = require('../services/claudeService');
require('dotenv').config();

async function getEmotionsFromClaude(text) {
  const prompt = `\nAnalyze the following message and rate the intensity of each emotion (anger, sadness, fear, shame, disgust) on a scale from 0 (not present) to 10 (very strong).\nReturn ONLY a JSON object like {\"anger\": 0, \"sadness\": 0, \"fear\": 0, \"shame\": 0, \"disgust\": 0}.\n\nMessage: \"${text}\"\n`;
  const aiResponse = await claudeService.sendMessage(prompt);
  try {
    const emotions = JSON.parse(aiResponse.content);
    const keys = ['anger', 'sadness', 'fear', 'shame', 'disgust'];
    if (keys.every(k => typeof emotions[k] === 'number')) return emotions;
  } catch (e) {}
  return { anger: 0, sadness: 0, fear: 0, shame: 0, disgust: 0 };
}

async function backfillEmotions() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotionalsupportapp');

  // Find messages missing emotions or with all-zero emotions
  const messages = await Message.find({
    $or: [
      { emotions: { $exists: false } },
      { 'emotions.anger': 0, 'emotions.sadness': 0, 'emotions.fear': 0, 'emotions.shame': 0, 'emotions.disgust': 0 }
    ]
  });
  console.log(`Found ${messages.length} messages to backfill emotions.`);

  for (const msg of messages) {
    msg.emotions = await getEmotionsFromClaude(msg.content);
    await msg.save();
    console.log(`Updated message ${msg._id} with emotions:`, msg.emotions);
  }

  mongoose.disconnect();
}

backfillEmotions(); 