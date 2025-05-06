import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parsePDF = async () => {
    try {
        // 1. Construct the PDF path
        const pdfPath = path.join(__dirname, '../test/data/isl_tb.pdf');
        console.log(`[PDF Parser] Constructed file path: ${pdfPath}`);

        // 2. Read the PDF file
        const dataBuffer = fs.readFileSync(pdfPath);

        // 3. Parse the PDF with custom options
        const data = await pdfParse(dataBuffer, {
            max: 10, // Limit to 10 pages (adjust as needed)
            pagerender: render_page, // Custom renderer for better text extraction
        });

        // 4. Display the extracted text
        // console.log('=== Extracted PDF Content ===');
        // console.log(data.text);
        // console.log('============================');

        return data.text;

    } catch (error) {
        console.error('[PDF Parser] Error:', error.message);
        throw error;
    }
};

// Custom page renderer for better text extraction
function render_page(pageData) {
    const render_options = {
        normalizeWhitespace: true,
        disableCombineTextItems: false
    };
    return pageData.getTextContent(render_options)
        .then(textContent => {
            let lastY, text = '';
            for (const item of textContent.items) {
                if (lastY !== item.transform[5]) {
                    text += '\n'; // New line when Y position changes
                }
                text += item.str + ' ';
                lastY = item.transform[5];
            }
            return text;
        });
}

// Execute the parser
parsePDF();

export default parsePDF;