const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Message = require('../models/Message');
const claudeService = require('../services/claudeService');
const auth = require('../../middleware/auth');

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

module.exports = router;
