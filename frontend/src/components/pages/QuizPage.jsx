import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, ChevronLeft, Clock, Award, HelpCircle, Check, X, RefreshCw } from 'lucide-react';

const Quiz = ({ darkMode = true }) => {
  // State management
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(6);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [userId, setUserId] = useState(''); // Should come from authentication

  // API base URL - should be moved to environment variable in production
  const API_BASE_URL = 'http://localhost:5000/api/quizzes';

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimer(seconds => seconds + 1);
      }, 1000);
    } else if (!timerActive && timer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  // Set user ID from localStorage or generate a temporary one
  useEffect(() => {
    const storedUserId = localStorage.getItem('quizUserId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const tempId = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('quizUserId', tempId);
      setUserId(tempId);
    }
  }, []);

  // Fetch questions based on difficulty and count
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
  
      const response = await axios.get(`${API_BASE_URL}/questions`, {
        params: { difficulty, count: questionCount },
      });
  
      console.log("API Response:", JSON.stringify(response.data, null, 2));
  
      // Extract quiz data (some APIs wrap it in a 'quiz' object, some don't)
      const quizData = response.data?.quiz || response.data;
  
      if (
        !quizData ||
        !Array.isArray(quizData.questions) ||
        !Array.isArray(quizData.answers)
      ) {
        throw new Error("Invalid quiz data structure: 'questions' or 'answers' missing or not arrays.");
      }
  
      const parsedQuestions = quizData.questions.map((question, index) => {
        const answerData = quizData.answers[index];
  
        if (!answerData) {
          throw new Error(`No answer found for question ${index + 1}`);
        }
  
        return {
          question: question.text,
          options: question.options,
          answerIndex: answerData.correctIndex,
          correctAnswer: answerData.correctAnswer,
        };
      });
  
      setQuestions(parsedQuestions);
      setLoading(false);
      setTimerActive(true);
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError(err.message || "Failed to load quiz. Please try again.");
      setLoading(false);
    }
  };
  
  // Initialize quiz on component mount
  useEffect(() => {
    fetchQuestions();
    
    // Cleanup function to stop timer when component unmounts
    return () => {
      setTimerActive(false);
    };
  }, [difficulty, questionCount]); // Re-fetch when difficulty or question count changes

  // Handle answer selection
  const handleAnswerSelect = (answerIndex) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = {
      questionIndex: currentQuestion,
      selectedAnswer: answerIndex,
      isCorrect: answerIndex === questions[currentQuestion].answerIndex
    };
    
    setUserAnswers(newAnswers);
  };

  // Navigate to next question
  const goToNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate final score
      const finalScore = userAnswers.filter(answer => answer.isCorrect).length;
      setScore(finalScore);
      submitQuiz(finalScore);
    }
  };

  // Navigate to previous question
  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Submit quiz results
  const submitQuiz = async (finalScore) => {
    setTimerActive(false); // Stop timer
    
    try {
      await axios.post(`${API_BASE_URL}/submit`, {
        userId,
        score: finalScore,
        totalQuestions: questions.length,
        difficulty,
        timeSpent: timer
      });
      
      setQuizCompleted(true);
      // Get feedback after submitting
      getFeedback(finalScore);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz results. Your score: ' + finalScore);
      setQuizCompleted(true);
    }
  };

  // Get personalized feedback from Gemini AI
  const getFeedback = async (finalScore) => {
    setFeedbackLoading(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/feedback`, {
        userId,
        score: finalScore,
        totalQuestions: questions.length,
        difficulty,
        answers: userAnswers.map(answer => ({
          question: questions[answer.questionIndex].question,
          selectedAnswer: questions[answer.questionIndex].options[answer.selectedAnswer],
          correctAnswer: questions[answer.questionIndex].options[questions[answer.questionIndex].answerIndex],
          isCorrect: answer.isCorrect
        }))
      });
      
      setFeedback(response.data);
    } catch (err) {
      console.error('Error getting feedback:', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Restart quiz
  const restartQuiz = () => {
    fetchQuestions();
  };

  // Format time from seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className={`max-w-3xl mx-auto p-6 rounded-lg shadow-lg min-h-screen ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg">Loading ISL quiz questions from Gemini AI...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`max-w-3xl mx-auto p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center py-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${darkMode ? 'bg-red-900' : 'bg-red-100'}`}>
            <X size={24} className="text-red-500" />
          </div>
          <h2 className="te   xt-xl font-semibold mb-4">Oops! Something went wrong</h2>
          <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <button 
            onClick={fetchQuestions}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center mx-auto"
          >
            <RefreshCw size={18} className="mr-2" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // Quiz completed state
  if (quizCompleted) {
    return (
      <div className={`max-w-3xl mx-auto p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center py-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${darkMode ? 'bg-green-900' : 'bg-green-100'}`}>
            <Award size={24} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
          <p className={`text-lg mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            You scored <span className="font-bold text-blue-500">{score}</span> out of {questions.length}
          </p>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Time taken: {formatTime(timer)}
          </p>
          
          {/* AI-Generated Feedback Section */}
          <div className={`mt-8 mb-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className="text-lg font-semibold mb-3">Your Personalized Feedback</h3>
            
            {feedbackLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : feedback ? (
              <div className="text-left">
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feedback.feedback}</p>
                
                <h4 className="font-medium mb-2">Areas to Improve:</h4>
                <ul className="list-disc pl-5 mb-4">
                  {feedback.areasToImprove.map((area, index) => (
                    <li key={index} className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{area}</li>
                  ))}
                </ul>
                
                <h4 className="font-medium mb-2">Practical Tip:</h4>
                <p className={`pl-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feedback.practicalTip}</p>
              </div>
            ) : (
              <p>No feedback available</p>
            )}
          </div>
          
          {/* Quiz Review */}
          <div className={`mt-6 mb-8 p-4 rounded-lg text-left ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className="text-lg font-semibold mb-3 text-center">Quiz Review</h3>
            
            {questions.map((question, index) => {
              const userAnswer = userAnswers[index];
              const isCorrect = userAnswer?.isCorrect;
              
              return (
                <div key={index} className={`mb-4 p-3 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-start">
                    <div className={`min-w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isCorrect ? 
                        <Check size={14} className="text-white" /> : 
                        <X size={14} className="text-white" />
                      }
                    </div>
                    <div>
                      <p className="font-medium">{question.question}</p>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Your answer: {userAnswer ? question.options[userAnswer.selectedAnswer] : 'Not answered'}
                      </p>
                      {!isCorrect && (
                        <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          Correct answer: {question.options[question.answerIndex]}
                        </p>
                      )}
                      {question.explanation && (
                        <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="font-medium">Explanation:</span> {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
            <button
              onClick={restartQuiz}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
            >
              <RefreshCw size={18} className="mr-2" /> Take Another Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active quiz state
  return (
    <div className={`min-h-screen w-full p-8 flex flex-col items-center justify-center transition-all duration-500 ${darkMode ? 'bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white' : 'bg-gradient-to-br from-white via-slate-100 to-gray-200 text-gray-800'}`}>
      <div className={`w-full max-w-5xl p-8 rounded-3xl shadow-xl backdrop-blur-xl bg-opacity-50 border border-gray-700 ${darkMode ? 'bg-gray-900/60 text-white' : 'bg-white/60 text-gray-900'}`}>
        
        {/* Quiz Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-extrabold tracking-wide neon-text">⚡ ISL Quiz</h2>
            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty
            </p>
          </div>
  
          <div className="flex gap-6 items-center">
            <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Clock size={20} />
              <span>{formatTime(timer)}</span>
            </div>
            <div className={`px-4 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-gray-800' : 'bg-gray-300'}`}>
              Q{currentQuestion + 1}/{questions.length}
            </div>
          </div>
        </div>
  
        {/* Progress Bar */}
        <div className={`w-full h-3 rounded-full overflow-hidden mb-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-300'}`}>
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
  
        {/* Question */}
        {questions.length > 0 && (
          <div>
            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-6">{questions[currentQuestion].question}</h3>
  
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {questions[currentQuestion].options.map((option, index) => {
                  const isSelected = userAnswers[currentQuestion]?.selectedAnswer === index;
  
                  return (
                    <div 
                      key={index}
                      className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 shadow-md hover:scale-105 ${
                        isSelected
                          ? (darkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-100 border-blue-500')
                          : (darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-300 hover:bg-gray-100')
                      }`}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 text-sm font-bold flex items-center justify-center rounded-full ${
                          isSelected ? 'bg-blue-500 text-white' : (darkMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-black')
                        }`}>
                          {['A', 'B', 'C', 'D'][index]}
                        </div>
                        <span>{option}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
  
            {/* Navigation */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={goToPreviousQuestion}
                disabled={currentQuestion === 0}
                className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition ${
                  currentQuestion === 0
                    ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'bg-gray-700' : 'bg-gray-300')
                    : (darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')
                }`}
              >
                <ChevronLeft size={20} /> Previous
              </button>
  
              <button
                onClick={goToNextQuestion}
                disabled={userAnswers[currentQuestion] === undefined}
                className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition ${
                  userAnswers[currentQuestion] === undefined
                    ? 'opacity-50 cursor-not-allowed ' + (darkMode ? 'bg-blue-800' : 'bg-blue-300')
                    : 'bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white'
                }`}
              >
                {currentQuestion < questions.length - 1 ? (
                  <>Next <ChevronRight size={20} /></>
                ) : (
                  <>Submit <Check size={20} /></>
                )}
              </button>
            </div>
  
            {/* Hint */}
            {userAnswers[currentQuestion] === undefined && (
              <div className="text-center mt-4 text-sm text-gray-400 flex justify-center items-center">
                <HelpCircle size={16} className="mr-2" />
                Select an answer to continue
              </div>
            )}
          </div>
        )}
  
        {/* Settings */}
        <div className={`mt-12 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            {/* Difficulty */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Difficulty
              </label>
              <select
                value={difficulty}
                onClick={(e) => setDifficulty(e.target.value)}
                disabled={timerActive}
                className={`px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                } ${timerActive ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
  
            {/* Question Count */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                disabled={timerActive}
                className={`px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                } ${timerActive ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value={3}>3 Questions</option>
                <option value={6}>6 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
              </select>
            </div>
  
            {/* Restart */}
            {timerActive && (
              <button
                onClick={restartQuiz}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition ${
                  darkMode ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-800'
                }`}
              >
                <RefreshCw size={18} /> Restart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  
};

export default Quiz;