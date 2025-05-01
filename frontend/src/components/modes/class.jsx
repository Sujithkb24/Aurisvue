import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MessageSquare, ChevronUp, ChevronDown, Pause, Play, RefreshCcw, Clock, Share2, Video, Save, BarChart2 } from 'lucide-react';
import ISLViewer from '../ISL_viewer';
import Header from '../header';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import FeedbackComponent from '../Feedback';

const ClassMode = ({ darkMode = true, onBack }) => {
  const navigate = useNavigate();
  const { currentUser, userRole, getToken } = useAuth();
  const { socket } = useSocket();
  
  // State for class session
  const [classSession, setClassSession] = useState(null);
  const [classCode, setClassCode] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionSpeed, setSessionSpeed] = useState(1);
  
  // State for speech and transcripts
  const [detectedSpeech, setDetectedSpeech] = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // State for messaging
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  
  // State for UI
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [error, setError] = useState('');
  
  // State for student feedback
  const [understanding, setUnderstanding] = useState(null);
  
  // Refs
  const recognitionRef = useRef(null);
  const sessionTimeRef = useRef(0);
  const sessionTimerRef = useRef(null);
  
  // Check if user is authorized and set role
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { redirectTo: '/class' } });
      return;
    }
    
    setIsTeacher(userRole === 'teacher');
    
    // If teacher, check for active session or offer to create one
    if (userRole === 'teacher') {
      checkForActiveSession();
    } else {
      // If student, show join modal if not in a session
      if (!classSession) {
        setShowJoinModal(true);
      }
    }
  }, [currentUser, userRole, navigate]);
  
  // Set up socket events
  useEffect(() => {
    if (!socket || !currentUser) return;
    
    // Listen for new messages
    socket.on('new_message', (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
    });
    
    // Listen for speech updates
    socket.on('speech_update', (speech) => {
      setDetectedSpeech(speech.text);
      
      // Add to history if it's a final result
      if (speech.isFinal) {
        addToTranscriptHistory(speech.text);
      }
    });
    
    // Listen for session updates
    socket.on('session_update', (update) => {
      if (update.type === 'paused') {
        setIsPaused(update.value);
      } else if (update.type === 'speed') {
        setSessionSpeed(update.value);
      } else if (update.type === 'ended') {
        handleSessionEnded();
      }
    });
    
    // Listen for student feedback (teacher only)
    if (userRole === 'teacher') {
      socket.on('student_feedback', (feedback) => {
        // Enhanced feedback handler
        console.log('Student feedback received:', feedback);
        
        // Create a notification for the teacher with more detailed feedback
        if (!feedback.understood) {
          let notificationMessage = `${feedback.studentName} needs clarification`;
          
          if (feedback.problematicWords && feedback.problematicWords.length > 0) {
            notificationMessage += `. Problem words: ${feedback.problematicWords.join(', ')}`;
          }
          
          if (feedback.specificFeedback) {
            notificationMessage += `. Comment: ${feedback.specificFeedback}`;
          }
          
          // Show notification (implement your notification system here)
          alert(notificationMessage); // Replace with your notification system
        }
      });
    }
    
    return () => {
      socket.off('new_message');
      socket.off('speech_update');
      socket.off('session_update');
      if (userRole === 'teacher') {
        socket.off('student_feedback');
      }
    };
  }, [socket, currentUser, userRole]);
  
  // Initialize Web Speech API
  useEffect(() => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Your browser doesn't support speech recognition. Please use Chrome or Edge.");
      return;
    }
    
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US'; // Default language
    
    // Handle speech recognition results
    recognitionRef.current.onresult = (event) => {
      if (isPaused) return;
      
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      setDetectedSpeech(transcript);
      
      // Emit speech to all connected students
      if (isTeacher && socket) {
        socket.emit('teacher_speech', {
          text: transcript,
          isFinal: event.results[0].isFinal,
          sessionId: classSession?.id
        });
      }
      
      // Add to history when we have a final result
      if (event.results[0].isFinal) {
        addToTranscriptHistory(transcript);
        
        // Save transcript to backend
        if (isTeacher) {
          saveTranscriptToBackend(transcript);
        }
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access to use this feature.');
        setIsMicActive(false);
      }
    };
    
    return () => {
      // Clean up
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Clear session timer
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [isTeacher, isPaused, socket, classSession]);
  
  // Check for active session (teacher only)
  const checkForActiveSession = async () => {
    if (userRole !== 'teacher') return;
    
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/classes/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.activeSession) {
          setClassSession(data.activeSession);
          setClassCode(data.activeSession.code);
          // Load session data
          loadSessionData(data.activeSession.id);
        }
      }
    } catch (error) {
      console.error("Error checking for active session:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load session data
  const loadSessionData = async (sessionId) => {
    try {
      const token = await getToken();
      
      // Get transcripts
      const transcriptsResponse = await fetch(`/api/sessions/${sessionId}/transcripts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (transcriptsResponse.ok) {
        const transcriptData = await transcriptsResponse.json();
        setTranscriptHistory(transcriptData.transcripts.map(t => ({
          text: t.text,
          timestamp: new Date(t.timestamp).toLocaleTimeString()
        })));
      }
      
      // Get messages
      const messagesResponse = await fetch(`/api/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (messagesResponse.ok) {
        const messageData = await messagesResponse.json();
        setMessages(messageData.messages);
      }
      
    } catch (error) {
      console.error("Error loading session data:", error);
    }
  };
  
  // Create new class session (teacher only)
  const createClassSession = async () => {
    if (userRole !== 'teacher') return;
    
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "New Class Session",
          description: "ISL learning session"
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setClassSession(data.session);
        setClassCode(data.session.code);
        
        // Join the session room via socket
        socket.emit('join_session', {
          sessionId: data.session.id,
          userId: currentUser.id,
          role: 'teacher'
        });
        
        // Start session timer
        startSessionTimer();
        
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create class session');
      }
    } catch (error) {
      console.error("Error creating class session:", error);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Join class session (student only)
  const joinClassSession = async () => {
    if (userRole !== 'student' || !classCode.trim()) return;
    
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/classes/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: classCode })
      });
      
      if (response.ok) {
        const data = await response.json();
        setClassSession(data.session);
        setShowJoinModal(false);
        
        // Join the session room via socket
        socket.emit('join_session', {
          sessionId: data.session.id,
          userId: currentUser.id,
          role: 'student'
        });
        
        // Load session data
        loadSessionData(data.session.id);
        
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Invalid class code');
      }
    } catch (error) {
      console.error("Error joining class:", error);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add to transcript history
  const addToTranscriptHistory = (text) => {
    setTranscriptHistory(prev => [
      { text, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49) // Keep only the last 50 entries
    ]);
  };
  
  // Save transcript to backend
  const saveTranscriptToBackend = async (transcript) => {
    if (!classSession) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/sessions/${classSession.id}/transcripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: transcript,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.error("Error saving transcript:", await response.json());
      }
    } catch (error) {
      console.error("Error saving transcript:", error);
    }
  };
  
  // Start speech recognition
  const startMic = () => {
    if (!classSession && isTeacher) {
      createClassSession();
    }
    
    try {
      recognitionRef.current.start();
      setIsMicActive(true);
      setIsPaused(false);
      
      // Notify students that teaching has started
      if (isTeacher && socket) {
        socket.emit('session_update', {
          type: 'started',
          sessionId: classSession?.id
        });
      }
      
      // Start session timer if not already running
      if (!sessionTimerRef.current) {
        startSessionTimer();
      }
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  };
  
  // Stop speech recognition
  const stopMic = () => {
    recognitionRef.current.stop();
    setIsMicActive(false);
    
    // Notify students that teaching has stopped
    if (isTeacher && socket) {
      socket.emit('session_update', {
        type: 'stopped',
        sessionId: classSession?.id
      });
    }
    
    // Stop session timer
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  };
  
  // Toggle pause
  const togglePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    // Notify students about pause state
    if (isTeacher && socket) {
      socket.emit('session_update', {
        type: 'paused',
        value: newPausedState,
        sessionId: classSession?.id
      });
    }
    
    // Pause or resume session timer
    if (newPausedState && sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    } else if (!newPausedState && !sessionTimerRef.current) {
      startSessionTimer();
    }
  };
  
  // Start session timer
  const startSessionTimer = () => {
    sessionTimerRef.current = setInterval(() => {
      sessionTimeRef.current += 1;
      // Could update a UI element showing session time
    }, 1000);
  };
  
  // Change playback speed (teacher only)
  const changeSpeed = (speed) => {
    if (!isTeacher) return;
    
    setSessionSpeed(speed);
    
    // Notify students about speed change
    if (socket) {
      socket.emit('session_update', {
        type: 'speed',
        value: speed,
        sessionId: classSession?.id
      });
    }
  };
  
  // End session (teacher only)
  const endSession = async () => {
    if (!isTeacher || !classSession) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/sessions/${classSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'ended',
          endTime: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        // Notify students session has ended
        socket.emit('session_update', {
          type: 'ended',
          sessionId: classSession.id
        });
        
        handleSessionEnded();
      }
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };
  
  // Handle session ended (both teacher and student)
  const handleSessionEnded = () => {
    // Stop mic if active
    if (isMicActive) {
      stopMic();
    }
    
    // Clear session data
    setClassSession(null);
    setClassCode('');
    
    // Show summary or redirect to dashboard
    navigate('/dashboard');
  };
  
  // Toggle history panel
  const toggleHistory = () => {
    setShowHistory(prev => !prev);
  };
  
  // Clear history
  const clearHistory = () => {
    setTranscriptHistory([]);
  };
  
  // Send message in chat
  const sendMessage = async () => {
    if (!message.trim() || !classSession) return;
    
    const newMessage = {
      sender: currentUser.id,
      senderName: currentUser.name,
      senderRole: userRole,
      text: message,
      timestamp: new Date().toISOString(),
      sessionId: classSession.id
    };
    
    // Add to local state
    setMessages(prev => [...prev, {
      ...newMessage,
      timestamp: new Date().toLocaleTimeString() // Format for display
    }]);
    setMessage('');
    
    try {
      // Send to backend
      const token = await getToken();
      const response = await fetch(`/api/sessions/${classSession.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newMessage)
      });
      
      if (response.ok) {
        // Emit through socket to other participants
        socket.emit('new_message', newMessage);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
    
  // Share class code (teacher only)
  const shareClassCode = () => {
    if (!classCode) return;
    
    navigator.clipboard.writeText(classCode)
      .then(() => {
        // You could show a notification here
        console.log('Class code copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy class code:', err);
      });
  };
  
  // Navigate to dashboard
  const goToDashboard = () => {
    navigate('/dashboard');
  };
  
  // Save session recording (teacher only)
  const saveSessionRecording = async () => {
    if (!isTeacher || !classSession) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/sessions/${classSession.id}/save`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Show success message
        console.log('Session saved successfully');
      }
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };
  
  // Render join modal for students
  const renderJoinModal = () => {
    if (!showJoinModal) return null;
    
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50`}>
        <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} w-full max-w-md`}>
          <h2 className="text-xl font-bold mb-4">Join Class</h2>
          
          {error && (
            <div className={`p-3 mb-4 rounded ${darkMode ? 'bg-red-900' : 'bg-red-100'} ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
              {error}
            </div>
          )}
          
          <p className="mb-4">Enter the class code provided by your teacher:</p>
          
          <input
            type="text"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            placeholder="Enter class code"
            className={`w-full px-4 py-2 rounded-lg mb-4 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onBack}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Cancel
            </button>
            <button
              onClick={joinClassSession}
              disabled={isLoading || !classCode.trim()}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white ${(isLoading || !classCode.trim()) && 'opacity-50 cursor-not-allowed'}`}
            >
              {isLoading ? 'Joining...' : 'Join Class'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Handle keypress for message input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
  
  // Format timestamp for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Loading state
  if (isLoading && !classSession) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="mt-2">Loading class data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col h-screen w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Header 
        title={`Class Mode - ${isTeacher ? 'Teacher' : 'Student'}`} 
        showBackButton={true} 
        onBack={onBack} 
        darkMode={darkMode} 
      />
      
      {renderJoinModal()}
      
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* 3D Model View */}
        <div className="w-full md:w-2/3 h-1/2 md:h-full relative">
          <ISLViewer 
            darkMode={darkMode} 
            mode="class" 
            speechInput={detectedSpeech}
            isListening={isMicActive}
            playbackSpeed={sessionSpeed}
          />
          
          {/* Current transcript overlay */}
          {detectedSpeech && (
            <div className={`absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-opacity-75 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <p className="text-center">{detectedSpeech}</p>
            </div>
          )}
          
          {/* Student feedback component */}
{!isTeacher && classSession && (
  <FeedbackComponent 
  darkMode={darkMode}
  currentUser={currentUser}
  classSession={classSession}
  detectedSpeech={detectedSpeech}
  setUnderstanding={setUnderstanding}
  understanding={understanding}
/>
)}
        </div>
        
        {/* Class Interface */}
        <div className={`w-full md:w-1/3 h-1/2 md:h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold">{classSession?.title || "Start a Class"}</h2>
              
              <button
                onClick={goToDashboard}
                className={`px-3 py-1 rounded-lg text-sm ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white flex items-center space-x-1`}
              >
                <BarChart2 size={16} />
                <span>Dashboard</span>
              </button>
              {isTeacher && (
      <button
        onClick={() => navigate('/analytics')}
        className={`px-3 py-1 rounded-lg text-sm ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white flex items-center space-x-1`}
      >
        <BarChart2 size={16} />
        <span>View Analytics</span>
      </button>
    )}
            </div>
            
            {classSession && (
              <div className="flex items-center text-sm mb-2">
                <Clock size={16} className="mr-1" />
                <span className="mr-2">Session time: {formatTime(sessionTimeRef.current)}</span>
                
                {isTeacher && (
                  <div className="flex items-center ml-auto">
                    <span className="mr-2">Class code: {classCode}</span>
                    <button
                      onClick={shareClassCode}
                      className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {isTeacher && (
                <>
                  <button 
                    className={`px-4 py-2 rounded-lg ${isMicActive 
                      ? (darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600') 
                      : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')} text-white flex items-center space-x-2`}
                    onClick={isMicActive ? stopMic : startMic}
                  >
                    {isMicActive ? <MicOff size={18} /> : <Mic size={18} />}
                    <span>{isMicActive ? "Stop Teaching" : "Start Teaching"}</span>
                  </button>
                  
                  {/* Show pause/play button only when mic is active */}
                  {isMicActive && (
                    <button
                      className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'} text-white flex items-center space-x-2`}
                      onClick={togglePause}
                    >
                      {isPaused ? <Play size={18} /> : <Pause size={18} />}
                      <span>{isPaused ? "Resume" : "Pause"}</span>
                    </button>
                  )}
                  
                  {/* Speed control for teacher */}
                  {isMicActive && (
                    <select
                      value={sessionSpeed}
                      onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                      className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
                    >
                      <option value="0.5">0.5x Speed</option>
                      <option value="1">Normal Speed</option>
                      <option value="1.5">1.5x Speed</option>
                    </select>
                  )}
                  
                  {classSession && (
                    <>
                      <button
                        className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white flex items-center space-x-2`}
                        onClick={saveSessionRecording}
                      >
                        <Save size={18} />
                        <span>Save</span>
                      </button>
                      
                      <button
                        className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white flex items-center space-x-2`}
                        onClick={endSession}
                      >
                        <Video size={18} />
                        <span>End Session</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {/* Toggle for transcript history */}
            <div className="flex justify-between items-center mb-2">
              <button 
                onClick={toggleHistory}
                className="flex items-center space-x-1 text-sm"
              >
                {showHistory ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <span>Teaching History</span>
              </button>
              
              {transcriptHistory.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Clear
                </button>
              )}
            </div>
            
            {/* Transcript history panel */}
            {showHistory && (
              <div className={`mb-4 max-h-32 overflow-y-auto rounded-lg p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {transcriptHistory.length > 0 ? (
                  <ul className="space-y-2">
                    {transcriptHistory.map((item, index) => (
                      <li key={index} className="text-sm border-b border-gray-600 pb-1 last:border-b-0">
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.timestamp}</span>
                        <p>{item.text}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-sm text-gray-500">No history yet</p>
                )}
              </div>
            )}
            
            <h3 className="font-medium mb-2 mt-4">Class Chat</h3>
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg ${msg.senderRole === 'student' 
                    ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-100') 
                    : (darkMode ? 'bg-gray-700' : 'bg-gray-200')} ${
                      msg.sender === currentUser?.id ? 'ml-6' : 'mr-6'
                    }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">
                      {msg.sender === currentUser?.id ? 'You' : msg.senderName || (msg.senderRole === 'teacher' ? 'Teacher' : 'Student')}
                    </p>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {typeof msg.timestamp === 'string' ? msg.timestamp : new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..." 
                className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <button 
                onClick={sendMessage} 
                disabled={!message.trim() || !classSession}
                className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white ${(!message.trim() || !classSession) && 'opacity-50 cursor-not-allowed'}`}
              >
                <MessageSquare size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassMode;