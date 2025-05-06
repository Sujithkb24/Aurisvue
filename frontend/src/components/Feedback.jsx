import React,{ useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

const FeedbackComponent = ({ darkMode, currentUser, classSession, detectedSpeech, setUnderstanding, understanding }) => {
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const [specificFeedback, setSpecificFeedback] = useState('');
  const [problematicWords, setProblematicWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
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
    if (!classSession) return;
    
    // Update the parent component's state
    setUnderstanding(understood);
    
    // Get the ISL conversion result from the ISL viewer component if available
    // This is a placeholder - you'll need to modify this to get the actual conversion result
    const islConversionResult = window.ISLConversionResult || "ISL_CONVERSION_RESULT";
    
    // Prepare feedback data
    const feedbackData = {
      studentId: currentUser.uid,
      sessionId: classSession._id,
      understood,
      timestamp: new Date().toISOString(),
      transcript: detectedSpeech,
      conversionResult: islConversionResult,
      specificFeedback: specificFeedback || null,
      problematicWords: understood ? [] : selectedWords
    };
    
    try {
      const token = await getToken();
      const response = await fetch('/api/analytics/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(feedbackData)
      });
      
      if (response.ok) {
        // Emit feedback to teacher
        socket.emit('student_feedback', {
          studentId: currentUser.uid,
          studentName: currentUser.name,
          understood,
          sessionId: classSession.id,
          specificFeedback: specificFeedback || null,
          problematicWords: understood ? [] : selectedWords
        });
        
        // Reset form
        setSpecificFeedback('');
        setSelectedWords([]);
        setShowDetailedFeedback(false);
        
        // Reset understanding indication after a delay
        setTimeout(() => setUnderstanding(null), 3000);
      }
    } catch (error) {
      console.error("Error sending feedback:", error);
    }
  };

  return (
    <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
      {/* Basic feedback buttons */}
      <div className="flex space-x-2">
        <button
          onClick={() => sendFeedback(true)}
          className={`px-3 py-1 rounded-lg text-sm ${understanding === true 
            ? 'bg-green-600 text-white' 
            : `${darkMode ? 'bg-gray-700 hover:bg-green-900' : 'bg-gray-200 hover:bg-green-100'}`}`}
        >
          I understand
        </button>
        <button
          onClick={() => {
            setShowDetailedFeedback(true);
            setUnderstanding(false);
          }}
          className={`px-3 py-1 rounded-lg text-sm ${understanding === false 
            ? 'bg-red-600 text-white' 
            : `${darkMode ? 'bg-gray-700 hover:bg-red-900' : 'bg-gray-200 hover:bg-red-100'}`}`}
        >
          Need clarification
        </button>
      </div>
      
      {/* Detailed feedback form */}
      {showDetailedFeedback && (
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg max-w-sm`}>
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
              className={`px-2 py-1 text-xs rounded ${
                darkMode ? 'bg-gray-700' : 'bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={() => sendFeedback(false)}
              className={`px-2 py-1 text-xs rounded ${
                darkMode ? 'bg-red-600' : 'bg-red-500'
              } text-white`}
            >
              Submit Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackComponent;