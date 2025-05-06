// services/translationService.js
import { httpClient } from '../utils/httpClient.js';
import { GOOGLE_API_KEY } from '../config/env.js';

/**
 * Translate arbitrary text into English.
 * @param {string} text
 * @returns {Promise<string>} Translated English text
 */
export async function translateToEnglish(text) {
  const url = `https://translation.googleapis.com/language/translate/v2`;
  const params = {
    key: GOOGLE_API_KEY,
    q: text,
    target: 'en'
  };

  try {
    const response = await httpClient.post(url, null, { params });
    const translations = response.data.data.translations;
    if (translations && translations.length > 0) {
      return translations[0].translatedText;
    }
    throw new Error('No translation result');
  } catch (err) {
    console.error('Translation to English failed:', err.message);
    // If translation fails, just return original text:
    return text;
  }
}
