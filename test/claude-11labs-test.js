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

// Helper to count words in a string
const countWords = (str) => str.trim().split(/\s+/).length;

// Simple test function
async function testIntegration() {
  try {
    console.log("Testing Claude + 11labs integration...");
    
    // Test cases with different emotional scenarios
    const testCases = [
      "I'm feeling really anxious about my upcoming presentation.",
      "Today was a tough day at work, feeling overwhelmed.",
      "I just got some great news and wanted to share!"
    ];

    for (const testMessage of testCases) {
      console.log(`\nTesting message: "${testMessage}"`);
      console.time('Response time');
      
      const result = await getClaudeAndSpeechWithCache(
        testMessage,
        [], // history
        null, // systemPrompt
        { tts: {} }
      );
      
      console.timeEnd('Response time');
      
      // Log Claude's response
      console.log("\n----- Claude Response -----");
      console.log(result.text);
      console.log("--------------------------");
      
      // Verify response length
      const wordCount = countWords(result.text);
      console.log(`Response word count: ${wordCount}`);
      if (wordCount > 100) {
        console.warn(`⚠️ Response exceeds target length (${wordCount} words)`);
      } else {
        console.log("✅ Response length within target range");
      }
      
      // Handle audio
      if (result.audio) {
        const filename = testMessage.substring(0, 20).replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const outputFile = path.join(outputDir, `${filename}-${Date.now()}.mp3`);
        fs.writeFileSync(outputFile, result.audio);
        console.log(`Audio saved to: ${outputFile} (${result.audio.length} bytes)`);
      } else {
        console.log("⚠️ No audio returned.");
      }
    }
    
    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
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
