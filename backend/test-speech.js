const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient({
  keyFilename: './google-speech-key.json',
  projectId: 'video-interview-transcription'
});

console.log('✅ Google Speech-to-Text is connected!');