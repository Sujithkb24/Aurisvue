import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



// Function to generate quiz based on difficulty level
const generateQuiz = async (context, difficulty = 'medium') => {
  const prompt = `Based on the following study material, generate multiple-choice questions with 4 options each and indicate the correct answer. The difficulty of the questions should be ${difficulty}:

the thin

${context}

Format (JSON, without markdown or triple backticks):
{
  "questions": [
    {
      "text": "Question?",
      "options": ["Option A", "Option B", "Option C", "Option D"]
    }
  ],
  "answers": [
    {
      "correctAnswer": "Option B",
      "correctIndex": 1
    }
  ]
}

Only return valid pure JSON. Do not include markdown or text.

Make sure to generate a different set of questions each time, ensuring they are not repeated from previous outputs.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = await response.text();

    // Strip Markdown-style code fences
    text = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1').trim();

    // Try parsing the response as JSON
    const parsed = JSON.parse(text);
    return parsed;
  } catch (err) {
    console.error('Error generating quiz:', err.message);
    throw new Error('Failed to generate quiz.');
  }
};

export default generateQuiz;



