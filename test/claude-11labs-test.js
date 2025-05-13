// test/claude-11labs-test.js
// Import your integration modules directly
const { getClaudeAndSpeechWithCache } = require('../utils/aiIntegration');
const fs = require('fs');
const path = require('path');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Simple test function
async function testIntegration() {
  try {
    console.log("Testing Claude + 11labs integration...");
    
    // Call the integration function directly
    console.time('Integration time');
    const result = await getClaudeAndSpeechWithCache(
      "Hello, this is a test message for the emotional support app.",
      [], // history
      null, // systemPrompt
      { tts: {} }
    );
    console.timeEnd('Integration time');
    
    // Log Claude's response
    console.log("\n----- Claude Response -----");
    console.log(result.text);
    console.log("--------------------------\n");
    
    // Handle audio
    if (result.audio) {
      console.log(`Audio buffer received: ${result.audio.length} bytes`);
      
      // Save the audio to a file for manual listening
      const outputFile = path.join(outputDir, `test-output-${Date.now()}.mp3`);
      fs.writeFileSync(outputFile, result.audio);
      console.log(`Audio saved to: ${outputFile}`);
    } else {
      console.log("⚠️ No audio returned.");
    }
    
    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    // If there's a response property, it might contain more error details
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

// Add a simple run/report wrapper
(async () => {
  console.log("===== Claude + 11labs Integration Test =====\n");
  
  const startTime = Date.now();
  await testIntegration();
  const duration = Date.now() - startTime;
  
  console.log(`\nTotal test duration: ${duration}ms`);
})();
