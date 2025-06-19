const mongoose = require('mongoose');
const Message = require('../models/Message');
const claudeService = require('../services/claudeService');
require('dotenv').config();

async function getTriggersFromClaude(text) {
  const prompt = `\nExtract the emotional triggers from the following message. \nReturn ONLY a JSON array of trigger keywords (e.g., [\"perfectionism\", \"fear of failure\"]).\n\nMessage: \"${text}\"\n`;
  const aiResponse = await claudeService.sendMessage(prompt);
  try {
    const triggers = JSON.parse(aiResponse.content);
    if (Array.isArray(triggers)) return triggers;
  } catch (e) {}
  return [];
}

async function backfillTriggers() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotionalsupportapp');

  // Find messages missing triggers or with empty triggers
  const messages = await Message.find({ $or: [{ triggers: { $exists: false } }, { triggers: { $size: 0 } }] });
  console.log(`Found ${messages.length} messages to backfill.`);

  for (const msg of messages) {
    msg.triggers = await getTriggersFromClaude(msg.content);
    await msg.save();
    console.log(`Updated message ${msg._id} with triggers: ${msg.triggers}`);
  }

  mongoose.disconnect();
}

backfillTriggers(); 