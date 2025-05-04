// controllers/quiz.controller.js
import Leaderboard from '../models/leaderboard.model.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get ISL quiz questions from Gemini AI
export const getQuestions = async (req, res) => {
    try {
      // First check if API key exists
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Google Generative AI API key is missing from environment variables');
      }
  
      // Validate and parse parameters
      const difficulty = ['easy', 'medium', 'hard'].includes(req.query.difficulty) 
        ? req.query.difficulty 
        : 'medium';
      
      const count = Math.min(Math.max(parseInt(req.query.count) || 10, 1), 20); // Allow 1-20 questions
      
      // Initialize with API key verification
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          }
        ]
      });
  
      const prompt = `Generate exactly ${count} multiple-choice questions about Indian Sign Language (ISL) at ${difficulty} difficulty level.
      Follow these rules STRICTLY:
      1. Each question must have 4 options
      2. Only one correct answer per question
      3. Include clear explanations
      4. Cover these ISL aspects: hand shapes, movements, facial expressions, grammar, culture
      5. For difficulty levels:
         - Easy: Basic signs and common phrases
         - Medium: Grammar and compound signs
         - Hard: Regional variations and nuanced expressions
      
      Format as VALID JSON array:
      [
        {
          "question": "What does this ISL sign mean?",
          "options": ["Hello", "Thank you", "Goodbye", "Help"],
          "answerIndex": 1,
          "explanation": "The sign described represents 'Thank you' in ISL"
        }
      ]`;
  
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
  
      try {
        // More robust JSON extraction
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```|\[\s*\{[\s\S]*?\}\s*\]/);
        if (!jsonMatch) throw new Error("No JSON found in response");
  
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const questions = JSON.parse(jsonStr);
  
        // Validation
        if (!Array.isArray(questions) || questions.length !== count) {
          throw new Error(`Expected ${count} questions, got ${questions.length}`);
        }
  
        const validatedQuestions = questions.map((q, i) => {
          if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
              typeof q.answerIndex !== 'number' || q.answerIndex < 0 || q.answerIndex > 3) {
            throw new Error(`Invalid format in question ${i + 1}`);
          }
          return {
            question: q.question.trim(),
            options: q.options.map(opt => opt.trim()),
            answerIndex: q.answerIndex,
            explanation: q.explanation?.trim() || "No explanation provided",
            difficulty: difficulty // Add difficulty level to each question
          };
        });
  
        res.status(200).json(validatedQuestions);
        
      } catch (parseError) {
        console.error("Parsing error:", parseError);
        const Question = (await import('../models/question.model.js')).default;
        const dbQuestions = await Question.aggregate([
          { $match: { difficulty } },
          { $sample: { size: count } }
        ]);
        res.status(200).json(dbQuestions);
      }
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({ 
        message: error.message,
        fallback: "Using database questions",
        errorDetails: error.response?.data || null
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
        // Removed explicit apiKey parameter as it's passed in constructor
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
