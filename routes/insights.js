const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Message = require('../models/Message');
const claudeService = require('../services/claudeService');
const auth = require('../middleware/auth');

// Helper: Build the analysis prompt
function buildAnalysisPrompt(messagesText) {
  return `
You are an expert emotional support AI. Analyze the following user messages and extract meaningful insights.

Here are the messages (in chronological order):
${messagesText}

Organize your analysis into the following three categories. For each, select all that apply and provide a brief explanation for each selection.

Category 1: Trigger Themes
- Rejection and Abandonment: I felt abandoned, I felt rejected, I felt like an outsider, I felt forgotten, I felt invisible, I felt dismissed, I felt ignored
- Powerlessness and Control: I felt powerless, I felt manipulated, I felt controlled, I felt trapped, I felt helpless, I felt suffocated, I felt pressured, I felt overwhelmed
- Criticism and Judgment: I felt judged, I felt blamed, I felt criticized, I felt shamed, I felt humiliated, I felt like the bad guy, I felt like a failure, I felt like I disappointed others, I felt not good enough
- Disconnection and Isolation: I felt disconnected, I felt isolated, I felt unsupported, I felt uncared for, I felt unloved, I felt taken for granted
- Safety and Threat: I felt unsafe, I felt threatened, I felt violated, I felt exploited
- Lack of Love and Self-Worth: I felt a lack of affection, I felt unloved, I felt like a burden
- Anxiety and Hopelessness: I felt anxious, I felt hopeless

Category 2: Negative Core Beliefs About the Self
- Unworthiness and Shame: I am not good enough, I am unlovable, I am a bad person, I am inadequate, I am undeserving, I am insignificant, I am a failure, There is something wrong with me, I do not belong
- Powerlessness and Helplessness: I am powerless, I am helpless, I will not get better
- Isolation and Disconnection: I am alone, I am invisible, No one understands me
- Distrust and Safety: I cannot trust myself or others, I am not safe

Category 3: Affirmations to Counter Negative Core Beliefs
- For Unworthiness and Shame: I am enough just as I am, I am worthy of love and kindness, I am not perfect and still deserve love, I deserve joy and peace, I am important and my presence matters, I am capable of growth and change, I am learning and healing every day, I did the best I could with what I knew, I release blame and forgive myself, I am not responsible for others' actions, thoughts, or emotions, I am allowed to make mistakes and learn, I am more than my mistakes or pain
- For Powerlessness and Helplessness: I have the strength to face challenges, I am learning to trust my inner power, I am capable of making positive choices, I am not defined by my past, I can create safety for myself, Each small step I take builds my resilience, Healing is possible, Change takes time, and I choose to be patient with myself
- For Isolation and Disconnection: I am connected to others who care about me, I am seen and heard, I am not alone in my experiences, I deserve meaningful relationships, I can reach out and find support
- For Distrust and Safety: I am learning to trust myself more each day, I am safe in this moment, I can set boundaries that protect me, I deserve to feel secure and supported

Usage Tips:
Encourage users to repeat these affirmations daily, ideally aloud or in writing. Remind users that healing is a gradual process and self-kindness is key.

Return your analysis as a JSON object with keys: triggerThemes, negativeCoreBeliefs, affirmations, and a brief summary. Each key should contain an array of selected items with explanations.
`.trim();
}

// @route   GET /api/insights/:userId
// @desc    Get user message analysis (insights)
// @access  Private (protected by auth middleware)
router.get('/:userId', auth, async (req, res) => {
  const { userId } = req.params;

  // Only allow access if the authenticated user matches the requested userId
  if (req.user._id.toString() !== userId) {
    return res.status(403).json({ success: false, error: 'Access denied.' });
  }

  // Validate userId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, error: 'Invalid userId format.' });
  }

  try {
    // Limit the number of messages to avoid prompt overflow (e.g., last 100)
    const messages = await Message.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    if (!messages.length) {
      return res.json({ success: true, data: { insights: null, messages: [] } });
    }

    // Combine messages in chronological order
    const combinedMessages = messages
      .reverse() // oldest first
      .map(m => m.content)
      .join('\n---\n');

    const analysisPrompt = buildAnalysisPrompt(combinedMessages);

    // Send to Claude
    const aiResponse = await claudeService.sendMessage(analysisPrompt);

    let insights;
    let structured = { triggerThemes: [], negativeCoreBeliefs: [], affirmations: [], summary: '', raw: null };
    try {
      // Try direct parse first
      insights = JSON.parse(aiResponse.content);
    } catch (e) {
      // Try to extract JSON from within the string
      const match = aiResponse.content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          insights = JSON.parse(match[0]);
        } catch (inner) {
          insights = null;
        }
      }
    }
    if (insights) {
      structured.triggerThemes = insights.triggerThemes || [];
      structured.negativeCoreBeliefs = insights.negativeCoreBeliefs || [];
      structured.affirmations = insights.affirmations || [];
      structured.summary = insights.summary || '';
    } else {
      structured.raw = aiResponse.content;
    }

    res.json({ success: true, data: { insights: structured, messages } });
  } catch (error) {
    console.error('Insights route error:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// GET /api/insights/:userId/trigger-frequency?period=week|month
router.get('/:userId/trigger-frequency', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query;

    // Only allow access if the authenticated user matches the requested userId
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid userId format.' });
    }

    let startDate = new Date();
    if (period === 'week') {
      // Set to start of this week (Monday)
      const day = startDate.getDay() || 7;
      if (day !== 1) startDate.setDate(startDate.getDate() - (day - 1));
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      // Set to start of this month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Default: last 7 days
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    const pipeline = [
      { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
      { $unwind: "$triggers" },
      { $group: { _id: "$triggers", count: { $sum: 1 } } },
      { $project: { trigger: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ];

    const results = await Message.aggregate(pipeline);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch trigger frequency' });
  }
});

// GET /api/insights/:userId/emotional-timeline?period=week|month
router.get('/:userId/emotional-timeline', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query;

    // Only allow access if the authenticated user matches the requested userId
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid userId format.' });
    }

    let startDate = new Date();
    if (period === 'week') {
      // Set to start of this week (Monday)
      const day = startDate.getDay() || 7;
      if (day !== 1) startDate.setDate(startDate.getDate() - (day - 1));
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      // Set to start of this month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Default: last 7 days
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    const pipeline = [
      { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        anger: { $avg: '$emotions.anger' },
        sadness: { $avg: '$emotions.sadness' },
        fear: { $avg: '$emotions.fear' },
        shame: { $avg: '$emotions.shame' },
        disgust: { $avg: '$emotions.disgust' }
      } },
      { $project: {
        _id: 0,
        date: '$_id',
        anger: { $ifNull: ['$anger', 0] },
        sadness: { $ifNull: ['$sadness', 0] },
        fear: { $ifNull: ['$fear', 0] },
        shame: { $ifNull: ['$shame', 0] },
        disgust: { $ifNull: ['$disgust', 0] }
      } },
      { $sort: { date: 1 } }
    ];

    const results = await Message.aggregate(pipeline);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch emotional timeline' });
  }
});

// GET /api/insights/:userId/weekly-summary
router.get('/:userId/weekly-summary', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow access if the authenticated user matches the requested userId
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid userId format.' });
    }

    // Helper to get start of week (Monday)
    function getStartOfWeek(date) {
      const d = new Date(date);
      const day = d.getDay() || 7;
      if (day !== 1) d.setDate(d.getDate() - (day - 1));
      d.setHours(0, 0, 0, 0);
      return d;
    }

    // Dates for current and previous week
    const now = new Date();
    const startOfThisWeek = getStartOfWeek(now);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1);

    // Aggregate for this week
    const thisWeekMessages = await Message.find({
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: startOfThisWeek }
    });
    // Aggregate for last week
    const lastWeekMessages = await Message.find({
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek }
    });

    // Total conversations/messages
    const totalConversations = thisWeekMessages.length;

    // Average mood score (average of all emotion values, per message, then averaged)
    function avgMood(messages) {
      if (!messages.length) return 0;
      let total = 0, count = 0;
      for (const msg of messages) {
        if (msg.emotions) {
          const vals = [msg.emotions.anger, msg.emotions.sadness, msg.emotions.fear, msg.emotions.shame, msg.emotions.disgust];
          total += vals.reduce((a, b) => a + b, 0) / vals.length;
          count++;
        }
      }
      return count ? +(total / count).toFixed(2) : 0;
    }
    const averageMoodScore = avgMood(thisWeekMessages);
    const lastWeekMoodScore = avgMood(lastWeekMessages);
    const improvementFromLastWeek = lastWeekMoodScore ? +(((averageMoodScore - lastWeekMoodScore) / lastWeekMoodScore) * 100).toFixed(1) : 0;

    // Most active day
    const dayCounts = {};
    for (const msg of thisWeekMessages) {
      const day = new Date(msg.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    const mostActiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Dominant emotion (highest average across all messages)
    const emotionSums = { anger: 0, sadness: 0, fear: 0, shame: 0, disgust: 0 };
    let emotionCount = 0;
    for (const msg of thisWeekMessages) {
      if (msg.emotions) {
        for (const key of Object.keys(emotionSums)) {
          emotionSums[key] += msg.emotions[key] || 0;
        }
        emotionCount++;
      }
    }
    let dominantEmotion = null;
    if (emotionCount) {
      const avgEmotions = Object.entries(emotionSums).map(([k, v]) => [k, v / emotionCount]);
      dominantEmotion = avgEmotions.sort((a, b) => b[1] - a[1])[0][0];
    }

    // Trigger reduction (compare number of triggers this week vs last week)
    function countTriggers(messages) {
      let count = 0;
      for (const msg of messages) {
        if (msg.triggers && msg.triggers.length) count += msg.triggers.length;
      }
      return count;
    }
    const thisWeekTriggers = countTriggers(thisWeekMessages);
    const lastWeekTriggers = countTriggers(lastWeekMessages);
    const triggerReduction = lastWeekTriggers ? +(((lastWeekTriggers - thisWeekTriggers) / lastWeekTriggers) * 100).toFixed(1) : 0;

    // Insights (simple templated for now)
    const insights = [];
    if (improvementFromLastWeek > 0) insights.push(`Your mood score improved by ${improvementFromLastWeek}% compared to last week.`);
    if (triggerReduction > 0) insights.push(`You experienced ${triggerReduction}% fewer triggers than last week.`);
    if (dominantEmotion) insights.push(`Your dominant emotion this week was ${dominantEmotion}.`);
    if (!insights.length) insights.push('Keep chatting to unlock more weekly insights!');

    res.json({
      success: true,
      data: {
        totalConversations,
        averageMoodScore,
        improvementFromLastWeek,
        mostActiveDay,
        dominantEmotion,
        triggerReduction,
        insights
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch weekly summary' });
  }
});

// GET /api/insights/:userId/emotional-distribution?period=week|month
router.get('/:userId/emotional-distribution', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query;

    // Only allow access if the authenticated user matches the requested userId
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid userId format.' });
    }

    let startDate = new Date();
    if (period === 'week') {
      // Set to start of this week (Monday)
      const day = startDate.getDay() || 7;
      if (day !== 1) startDate.setDate(startDate.getDate() - (day - 1));
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      // Set to start of this month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Default: last 7 days
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    // Aggregate emotion sums
    const pipeline = [
      { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
      { $group: {
        _id: null,
        anger: { $sum: '$emotions.anger' },
        sadness: { $sum: '$emotions.sadness' },
        fear: { $sum: '$emotions.fear' },
        shame: { $sum: '$emotions.shame' },
        disgust: { $sum: '$emotions.disgust' }
      } }
    ];

    const [result] = await Message.aggregate(pipeline);
    if (!result) {
      // No data
      return res.json({ success: true, data: [
        { emotion: 'anger', value: 0 },
        { emotion: 'sadness', value: 0 },
        { emotion: 'fear', value: 0 },
        { emotion: 'shame', value: 0 },
        { emotion: 'disgust', value: 0 }
      ] });
    }
    const total = result.anger + result.sadness + result.fear + result.shame + result.disgust;
    const data = [
      { emotion: 'anger', value: total ? Math.round((result.anger / total) * 100) : 0 },
      { emotion: 'sadness', value: total ? Math.round((result.sadness / total) * 100) : 0 },
      { emotion: 'fear', value: total ? Math.round((result.fear / total) * 100) : 0 },
      { emotion: 'shame', value: total ? Math.round((result.shame / total) * 100) : 0 },
      { emotion: 'disgust', value: total ? Math.round((result.disgust / total) * 100) : 0 }
    ];
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch emotional distribution' });
  }
});

module.exports = router;
