const record = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient();

const request = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
  },
  interimResults: true,
};

let gotFinal = false;

// Start recording and get the stream
const recording = record
  .record({
    sampleRateHertz: 16000,
    threshold: 0,
    verbose: false,
    recordProgram: 'sox', // or 'rec'
    silence: '1.0',
  });

const recognizeStream = client
  .streamingRecognize(request)
  .on('error', console.error)
  .on('data', data => {
    const result = data.results[0];
    const transcript = result?.alternatives[0]?.transcript;

    if (transcript) {
      if (result.isFinal && !gotFinal) {
        gotFinal = true;
        console.log(`✅ Final Transcription: ${transcript}`);

        // Stop recording
        recording.stop(); // <-- This works!
      } else if (!gotFinal) {
        console.log(`📝 Interim: ${transcript}`);
      }
    }
  });

console.log('🎤 Speak now. Waiting for final transcription...\n');

// Pipe audio to the Google stream
recording.stream()
.on('error', err => {
  console.log('🎤 Recording closed:', err.message);
  recording.stop();
}).pipe(recognizeStream);
