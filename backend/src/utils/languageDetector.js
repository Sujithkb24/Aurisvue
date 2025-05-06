// utils/languageDetector.js
import { httpClient } from '../utils/httpClient.js';
import { GOOGLE_API_KEY } from '../config/env.js';

/**
 * Detect the language of the given text.
 * @param {string} text
 * @returns {Promise<string>} ISO-639-1 code ('en', 'hi', 'kn', etc.)
 */
export async function detectLanguage(text) {
  const url = `https://translation.googleapis.com/language/translate/v2/detect`;
  const params = {
    key: GOOGLE_API_KEY,
    q: text
  };

  try {
    const response = await httpClient.post(url, null, { params });
    const detections = response.data.data.detections?.[0];
    if (detections && detections.length > 0) {
      return detections[0].language; // e.g. 'en', 'hi', 'kn'
    }
    throw new Error('No detection result');
  } catch (err) {
    console.error('Language detection failed:', err.message);
    // Fallback to basic regex if API fails
    const isEnglish = /^[A-Za-z\s.,?'"!-]+$/.test(text);
    return isEnglish ? 'en' : 'und'; // 'und' = undetermined
  }
}
