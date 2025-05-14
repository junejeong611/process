# Claude + ElevenLabs Integration Test

## Purpose
The `claude-11labs-test.js` file is a test script designed to verify the integration between Claude's AI response generation and ElevenLabs' speech synthesis. It tests the end-to-end functionality of generating a response and converting it to speech.

## Features
- **Integration Testing**: Tests the combined functionality of Claude and ElevenLabs services.
- **Performance Measurement**: Measures the time taken for the integration process.
- **Audio Handling**: Saves the synthesized audio to a file for manual verification.

## Usage

### Running the Test
To run the test, execute the script using Node.js. It will output the results to the console and save the audio file in the `output` directory.

```bash
node test/claude-11labs-test.js
```

### Test Output
- **Claude Response**: The AI-generated text response from Claude.
- **Audio File**: The synthesized speech saved as an MP3 file in the `output` directory.
- **Performance Metrics**: The total time taken for the integration process.

## Dependencies
- **fs**: Node.js module for file system operations.
- **path**: Node.js module for handling file paths.
- **aiIntegration**: Custom module for integrating Claude and ElevenLabs services.

## Error Handling
The script includes error handling to capture and log any issues that occur during the test, including HTTP response details if available.

## Limitations
- **Manual Verification**: The audio output is saved for manual listening, requiring human verification of the speech quality. 