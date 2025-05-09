import { detectLanguage } from '../utils/languageDetector.js';
import { translateToEnglish } from './translationService.js';

export const handleSpeechTranscript = async (text, predominantLang) => {
  try {
    let inputText = text;
    console.log('Raw transcript:', inputText);

    // Detect language unless provided
    const lang = predominantLang || (await detectLanguage(inputText));
    
    // Translate to English if needed
    if (lang !== 'en') {
      inputText = await translateToEnglish(inputText);
    }

    return { success: true, transcript: inputText, originalLanguage: lang };
  } catch (error) {
    console.error('Transcript handling error:', error.message);
    return { success: false, error: error.message };
  }
};
