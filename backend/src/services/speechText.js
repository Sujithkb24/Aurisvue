import fs from 'fs';
import speech from '@google-cloud/speech';

const client = new speech.SpeechClient();

export async function transcribeWithGoogle(filePath, predominantLang) {
  const file = fs.readFileSync(filePath);
  const audioBytes = file.toString('base64');

  const request = {
    audio: { content: audioBytes },
    config: {
      encoding: 'WEBM_OPUS', // or LINEAR16 if WAV
      sampleRateHertz: 48000,
      languageCode: predominantLang || 'en-IN',
      alternativeLanguageCodes: ['en-IN', 'hi-IN', 'kn-IN'], // to handle mixed speech
      enableAutomaticPunctuation: true
    }
  };

  const [response] = await client.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join(' ');

  return transcription;
}
