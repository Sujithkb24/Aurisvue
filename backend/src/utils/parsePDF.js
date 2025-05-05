import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';

// Get current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Always parses the same PDF file (no user input allowed).
 * @returns {Promise<string>} Extracted text from the fixed PDF path.
 */
const parsePDF = async ({ debug = false } = {}) => {
  try {
    const pdfPath = path.normalize(path.join(__dirname, '../test/data/isl_tb.pdf'));
    if (debug) console.log(`[PDF Parser] Always using: ${pdfPath}`);
    console.log(`[PDF Parser] Constructed file path: ${pdfPath}`);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`[PDF Parser] File does not exist at path: ${pdfPath}`);
    }

    // Read file synchronously (throws error if missing)
    const buffer = fs.readFileSync(pdfPath);

    // Parse PDF
    const result = await pdfParse(buffer, { 
      max: 0,               // All pages
      normalizeWhitespace: true, // Clean text
    });

    if (!result.text?.trim()) {
      throw new Error('PDF is empty or could not extract text.');
    }

    // Return cleaned text
    return result.text.trim().replace(/\s+/g, ' ');

  } catch (error) {
    console.error('[PDF Parser] Failed:', error.message);
    throw error; // Re-throw to let caller handle it
  }
};

export default parsePDF;