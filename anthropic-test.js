const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

async function testStream() {
  const streamIterable = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    system: 'You are a helpful assistant.',
    messages: [{ role: 'user', content: 'Hello, Claude!' }],
    max_tokens: 256,
    stream: true,
  });

  for await (const chunk of streamIterable) {
    console.log('Stream chunk:', chunk);
  }
  console.log('Stream finished');
}

testStream().catch(console.error); 