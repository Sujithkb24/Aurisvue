import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, HelpCircle } from 'lucide-react';

const FeedbackComponent = ({ darkMode, currentUser, classSession, detectedSpeech, setUnderstanding, understanding, studentFeedback, setStudentFeedback }) => {
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const [specificFeedback, setSpecificFeedback] = useState('');
  const [problematicWords, setProblematicWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { socket } = useSocket();
  const { getToken } = useAuth();

  // Parse transcript into individual words for selection
  useEffect(() => {
    if (detectedSpeech) {
      // Filter out empty strings and common punctuation
      setProblematicWords(
        detectedSpeech
          .split(/\s+/)
          .map(word => word.trim().replace(/[,.!?;:'"()]/g, ''))
          .filter(word => word.length > 0)
      );
    }
  }, [detectedSpeech]);

  // Toggle word selection for problematic words
  const toggleWordSelection = (word) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(prev => prev.filter(w => w !== word));
    } else {
      setSelectedWords(prev => [...prev, word]);
    }
  };

  // Send enhanced feedback to backend
  const sendFeedback = async (understood) => {
  if (!classSession || !classSession._id) {
    setError("Class session information is missing");
    return;
  }

  setUnderstanding(understood);

  const feedbackData = {
    sessionId: classSession._id,
    understood,
    timestamp: new Date().toISOString(),
    transcript: detectedSpeech || "",
    conversionResult: "ISL_CONVERSION_RESULT", // Placeholder
    specificFeedback: specificFeedback || null,
    problematicWords: understood ? [] : selectedWords,
  };

  try {
    setIsSubmitting(true);
    setError(null);

    const token = await getToken();
    const response = await fetch('http://localhost:5000/api/analytics/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(feedbackData),
    });

    const responseData = await response.json();

    if (response.ok) {
      // Emit feedback to teacher via socket
      socket.emit('student_feedback', {

        studentId: currentUser.uid,
        studentName: currentUser.name,
        understood,
        sessionId: classSession.code,
        specificFeedback: specificFeedback || null,
        problematicWords: understood ? [] : selectedWords,
      });

      console.log(responseData);

      // Add a delay before updating studentFeedback
      setTimeout(() => {
        setStudentFeedback(responseData); // Update studentFeedback after delay
      }, 500); // 500ms delay to allow backend processing

      // Reset form
      setSpecificFeedback('');
      setSelectedWords([]);
      setShowDetailedFeedback(false);

      // Reset understanding indication after a delay
      setTimeout(() => setUnderstanding(null), 3000);
    } else {
      setError(responseData.message || "Failed to submit feedback");
    }
  } catch (error) {
    console.error("Error sending feedback:", error);
    setError("Network error. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};
  return (
    <div className="p-4 border-t border-gray-700">
      {error && (
        <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      
      {/* Basic feedback buttons */}
   <div className="flex justify-center space-x-4">
  <button
    onClick={() => {
      sendFeedback(true);
      navigate('/teacher-analytics'); // Navigate to teacher analytics
    }}
    disabled={isSubmitting}
    className={`px-4 py-2 rounded-lg flex items-center ${
      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
    } ${
      understanding === true 
        ? 'bg-green-600 text-white' 
        : `bg-green-500 hover:bg-green-600 text-white`
    }`}
  >
    <CheckCircle size={16} className="mr-2" />
    <span>I Understand</span>
  </button>
  <button
    onClick={() => {
      setShowDetailedFeedback(true);
      setUnderstanding(false);
    }}
    disabled={isSubmitting}
    className={`px-4 py-2 rounded-lg flex items-center ${
      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
    } ${
      understanding === false 
        ? 'bg-yellow-600 text-white' 
        : `bg-yellow-500 hover:bg-yellow-600 text-white`
    }`}
  >
    <HelpCircle size={16} className="mr-2" />
    <span>Need Clarification</span>
  </button>
</div>
      {/* Detailed feedback form */}
      {showDetailedFeedback && (
        <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h4 className="font-medium text-sm mb-2">What was unclear?</h4>
          
          {/* Word selection for problematic words */}
          <div className="mb-2">
            <p className="text-xs mb-1">Select unclear words:</p>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {problematicWords.map((word, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleWordSelection(word)}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedWords.includes(word)
                      ? (darkMode ? 'bg-red-700' : 'bg-red-200')
                      : (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                  }`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
          
          {/* Specific feedback text area */}
          <textarea
            value={specificFeedback}
            onChange={(e) => setSpecificFeedback(e.target.value)}
            placeholder="Additional feedback (optional)"
            className={`w-full px-2 py-1 text-sm rounded ${
              darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
            } mb-2`}
            rows={2}
          />
          
          {/* Submit buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => {
                setShowDetailedFeedback(false);
                setUnderstanding(null);
              }}
              disabled={isSubmitting}
              className={`px-2 py-1 text-xs rounded ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                darkMode ? 'bg-gray-700' : 'bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={() => sendFeedback(false)}
              disabled={isSubmitting}
              className={`px-2 py-1 text-xs rounded ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                darkMode ? 'bg-red-600' : 'bg-red-500'
              } text-white`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackComponent;