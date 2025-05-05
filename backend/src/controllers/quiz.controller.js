import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import parsePDF from '../utils/parsePdf.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Leaderboard from '../models/leaderboard.model.js';
import generateQuiz from '../services/GeminiService.js';
// Get the absolute path to your PDF
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfPath= path.join(__dirname, '../test/data/isl_tb.pdf');

export const getQuestions = async (req, res) => {
  try {
    const context = await parsePDF(pdfPath);
    const quiz = await generateQuiz(context);
    res.status(200).json({ quiz });
  } catch (error) {
    console.error('Final error:', error);
    res.status(500).json({
      error: 'PDF access failed',
      message: error.message,
      currentDir: __dirname,
    });
  }
};
// Submit quiz answers and save score
export const submitQuiz = async (req, res) => {
  const { userId, score, totalQuestions, difficulty } = req.body;

  if (!userId || score === undefined) {
    return res.status(400).json({ message: 'userId and score are required' });
  }

  try {
    const leaderboard = new Leaderboard({
      userId,
      score,
      totalQuestions: totalQuestions || 6,
      difficulty: difficulty || 'medium',
      completedAt: new Date()
    });

    await leaderboard.save();
    res.status(201).json({
      message: 'Score saved successfully',
      score,
      percentageScore: Math.round((score / (totalQuestions || 6)) * 100)
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get feedback on user's quiz performance from Gemini AI
export const getQuizFeedback = async (req, res) => {
    const { userId, score, totalQuestions, difficulty, answers } = req.body;
  
    if (!userId || score === undefined || !answers) {
      return res.status(400).json({ message: 'userId, score, and answers are required' });
    }
  
    // Fallback feedback generator
    const generateFallbackFeedback = () => ({
      feedback: `You scored ${score} out of ${totalQuestions}. Keep practicing ISL!`,
      areasToImprove: ["ISL hand shapes", "ISL grammar structure"],
      practicalTip: "Try watching ISL videos with subtitles to improve comprehension"
    });
  
    try {
      // Check if API key is configured - CORRECTED THIS LINE
      if (!process.env.GEMINI_API_KEY) {
        console.warn('Google Gemini API key not configured, using fallback feedback');
        return res.status(200).json(generateFallbackFeedback());
      }
  
      // Initialize the API client with your key - ADDED THIS
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro"
      });
  
      const percentage = Math.round((score / totalQuestions) * 100);
      const prompt = `I took an Indian Sign Language (ISL) quiz with ${totalQuestions} questions at ${difficulty} difficulty. 
      I scored ${score} out of ${totalQuestions} (${percentage}%).
  
      Here are my answers (correct ones and incorrect ones):
      ${JSON.stringify(answers, null, 2)}
  
      Provide feedback in this exact JSON format:
      {
        "feedback": "2-3 paragraph personalized assessment",
        "areasToImprove": ["Specific area 1", "Specific area 2"],
        "practicalTip": "One actionable practice suggestion"
      }`;
  
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
  
      try {
        // More robust JSON extraction
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        const jsonString = text.slice(jsonStart, jsonEnd);
        
        const feedback = JSON.parse(jsonString);
        
        // Validate response structure
        if (!feedback.feedback || !feedback.areasToImprove || !feedback.practicalTip) {
          throw new Error("Invalid feedback structure");
        }
        
        return res.status(200).json(feedback);
      } catch (parseError) {
        console.error("Error parsing AI feedback:", parseError);
        return res.status(200).json(generateFallbackFeedback());
      }
    } catch (error) {
      console.error('Error generating feedback:', error);
      
      // Specific handling for API key errors
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
        return res.status(400).json({
          ...generateFallbackFeedback(),
          warning: "Service temporarily unavailable - using basic feedback"
        });
      }
      
      return res.status(500).json({
        ...generateFallbackFeedback(),
        error: "Failed to generate advanced feedback"
      });
    }
  };
