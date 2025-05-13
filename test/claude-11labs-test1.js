const { getClaudeAndSpeechWithCache } = require('../utils/aiIntegration');
const fs = require('fs');
const path = require('path');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function testPrompt(prompt) {
  console.log(`Testing prompt: "${prompt}"`);
  
  try {
    const result = await getClaudeAndSpeechWithCache(
      prompt,
      [],
      null,
      { tts: {} }
    );
    
    console.log('\n----- Claude Response -----');
    console.log(result.text);
    console.log('--------------------------\n');
    
    if (result.audio) {
      const filename = prompt.substring(0, 20).replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const outputFile = path.join(outputDir, `${filename}-${Date.now()}.mp3`);
      fs.writeFileSync(outputFile, result.audio);
      console.log(`Audio saved to: ${outputFile} (${result.audio.length} bytes)`);
      return { success: true, outputFile };
    } else {
      console.log('⚠️ No audio returned.');
      return { success: false };
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const prompts = [
    "Hi there, I'm feeling a bit down today.",
    "I've been feeling overwhelmed with work lately."
  ];
  
  const results = [];
  
  for (const prompt of prompts) {
    console.log(`\n===== Testing: ${prompt} =====\n`);
    const startTime = Date.now();
    const result = await testPrompt(prompt);
    const duration = Date.now() - startTime;
    
    results.push({
      prompt,
      success: result.success,
      duration: `${(duration / 1000).toFixed(2)}s`,
      outputFile: result.outputFile || null
    });
  }
  
  console.log('\n===== Test Summary =====');
  console.table(results);
}

runTests(); 