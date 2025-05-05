import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateQuiz = async (context) => {
  const prompt = `Based on the following study material, generate 5 multiple-choice questions with 4 options each and indicate the correct answer:
 with explanation for the answers
${context}

Format:
1. Question?
   a) Option A
   b) Option B
   c) Option C
   d) Option D
Answer: b) Option B

Ensure the questions are relevant to the provided material.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return text;
};

export default generateQuiz;