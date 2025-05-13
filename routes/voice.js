const express = require('express');
const auth = require('../middleware/auth');
const { synthesizeSpeech } = require('../services/elevenLabsService');

const router = express.Router();

// @route   POST /api/voice/tts
// @desc    Convert text to speech using ElevenLabs API
// @access  Private
router.post('/tts', auth, async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }
  try {
    const result = await synthesizeSpeech(text);
    res.set('Content-Type', result.contentType);
    res.send(result.audio);
  } catch (err) {
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

module.exports = router; 