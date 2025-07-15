// root/utils/voice.js
const speech = require('@google-cloud/speech');

// Initialize the client with credentials from environment variable
let client;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  client = new speech.SpeechClient({
    credentials: credentials
  });
} else {
  console.warn('GOOGLE_APPLICATION_CREDENTIALS_JSON not found, using default credentials');
  client = new speech.SpeechClient();
}

async function recordAndTranscribe(audioBuffer) {
  const audioBytes = audioBuffer.toString('base64');

  const audio = {
    content: audioBytes,
  };

  const config = {
    encoding: 'LINEAR16',        // or 'WEBM_OPUS' if you're uploading webm from browser
    languageCode: 'en-US',
  };

  const request = {
    audio,
    config,
  };

  try {
    const [response] = await client.recognize(request);
    const transcript = response.results
      .map(result => result.alternatives[0].transcript)
      .join(' ');

    return transcript || 'No speech recognized.';
  } catch (err) {
    console.error('❌ Google Speech API error:', err);
    throw err;
  }
}

module.exports = recordAndTranscribe;
