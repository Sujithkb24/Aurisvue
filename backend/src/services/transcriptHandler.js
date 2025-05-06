import { detectLanguage } from '../utils/languageDetector.js';
import { translateToEnglish } from './translationService.js';
import { callFastAPI } from './fastapiService.js';

export const handleSpeechTranscript = async (text) => {
  try {
    let inputText = text;

    const lang = await detectLanguage(text);
    if (lang !== 'en') {
      inputText = await translateToEnglish(text);
    }

    const result = await callFastAPI(inputText);
    return { success: true, data: result };
  } catch (error) {
    console.error('Transcript handling error:', error.message);
    return { success: false, error: error.message };
  }
};
