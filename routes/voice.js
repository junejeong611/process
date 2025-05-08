const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

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
    // Call ElevenLabs API
    const response = await axios.post(
      `${process.env.ELEVENLABS_API_URL}/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: {
          stability: parseFloat(process.env.AUDIO_STABILITY) || 0.5,
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer', // Get audio as buffer
      }
    );
    res.set('Content-Type', `audio/${process.env.AUDIO_FORMAT || 'mp3'}`);
    res.send(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

module.exports = router; 