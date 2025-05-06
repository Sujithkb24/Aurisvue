import React,{ useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, MessageSquare, ChevronUp, ChevronDown, Pause, Play, 
  RefreshCcw, Clock, Share2, Video, Save, BarChart2, Hand, Users,
  VideoIcon, Settings, PenTool, ArrowLeft, X, HelpCircle
} from 'lucide-react';
import ISLViewer from '../ISL_viewer';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate, useParams } from 'react-router-dom';
import FloatingActionButton from '../ActionButton';
import FeedbackComponent from '../Feedback';

const ClassMode = ({ darkMode = true, onBack, navigateToMode, navigateToHome, activeMode }) => {
  const navigate = useNavigate();
  const { teacherId } = useParams();
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
  
  // State for video/accessibility features
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showStudentsList, setShowStudentsList] = useState(false);
  const [activeStudents, setActiveStudents] = useState([]);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  
  // Refs
  const recognitionRef = useRef(null);
  const sessionTimeRef = useRef(0);
  const sessionTimerRef = useRef(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  
  // Primary UI colors based on role
  const primaryColor = isTeacher ? 
    (darkMode ? 'bg-purple-600' : 'bg-purple-500') : 
    (darkMode ? 'bg-blue-600' : 'bg-blue-500');
    
  const primaryHoverColor = isTeacher ? 
    (darkMode ? 'hover:bg-purple-700' : 'hover:bg-purple-600') : 
    (darkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-600');
    
  const primaryTextColor = isTeacher ? 
    (darkMode ? 'text-purple-400' : 'text-purple-600') : 
    (darkMode ? 'text-blue-400' : 'text-blue-600');

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
    
    // Simulate fetching active students (for demonstration)
    setActiveStudents([
      { id: "user1", name: "Alex Johnson", handRaised: true },
      { id: "user2", name: "Jamie Lee", handRaised: false },
      { id: "user3", name: "Morgan Chen", handRaised: true },
      { id: "user4", name: "Taylor Smith", handRaised: false },
    ]);
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
      } else if (update.type === 'hand_raised') {
        // Update students list with hand raised status
        setActiveStudents(prev => 
          prev.map(student => 
            student.id === update.userId 
              ? { ...student, handRaised: update.value } 
              : student
          )
        );
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
      
      // Stop camera if active
      stopCamera();
    };
  }, [isTeacher, isPaused, socket, classSession]);
  
  // Check for active session (teacher only)
  const checkForActiveSession = async () => { 
    if (userRole !== 'teacher') return;
    
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`{import.meta.env.VITE_API_URL}/classes/active`, {
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
          title: "New ISL Learning Session",
          description: "Interactive sign language learning session"
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
    
    // Stop camera if active
    stopCamera();
    
    // Clear session data
    setClassSession(null);
    setClassCode('');
    
    // Show summary or redirect to dashboard
    navigate('/dashboard');
  };
  
  // Toggle hand raise (student only)
  const toggleHand = () => {
    if (userRole !== 'student') return;
    
    const newHandState = !handRaised;
    setHandRaised(newHandState);
    
    // Notify teacher about hand raised status
    if (socket && classSession) {
      socket.emit('session_update', {
        type: 'hand_raised',
        value: newHandState,
        userId: currentUser.id,
        userName: currentUser.name,
        sessionId: classSession.id
      });
    }
  };
  
  // Toggle video capture functionality
  const toggleVideo = async () => {
    if (videoEnabled) {
      stopCamera();
    } else {
      startCamera();
    }
  };
  
  // Start camera for video capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Store stream reference for cleanup
      mediaStreamRef.current = stream;
      
      // Attach stream to video element if available
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setVideoEnabled(true);
      
      // In the future, this would connect to ISL recognition service
      console.log("Video capture started - no ISL recognition implemented yet");
      
    } catch (error) {
      console.error("Error accessing camera:", error);
      setError("Unable to access camera. Please check permissions.");
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    // Stop all tracks in the media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setVideoEnabled(false);
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
      senderName: currentUser.name || currentUser.displayName,
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
        alert('Class code copied to clipboard: ' + classCode);
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
        alert('Session saved successfully');
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Join ISL Class</h2>
            <button onClick={() => setShowJoinModal(false)} className="p-1 rounded-full hover:bg-gray-700">
              <X size={20} />
            </button>
          </div>
          
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
              onClick={onBack || goToDashboard}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Cancel
            </button>
            <button
              onClick={joinClassSession}
              disabled={isLoading || !classCode.trim()}
              className={`px-4 py-2 rounded-lg ${primaryColor} ${primaryHoverColor} text-white ${(isLoading || !classCode.trim()) && 'opacity-50 cursor-not-allowed'}`}
            >
              {isLoading ? 'Joining...' : 'Join Class'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render help panel
  const renderHelpPanel = () => {
    if (!showHelpPanel) return null;
    
    return (
      <div className={`fixed inset-y-0 right-0 w-80 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg p-4 z-40 overflow-y-auto transform transition-transform duration-300`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Help & Tips</h2>
          <button onClick={() => setShowHelpPanel(false)} className="p-1 rounded-full hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-bold mb-2">For Teachers</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Click "Start Teaching" to begin the class session</li>
              <li>Use the pause button to take breaks</li>
              <li>Adjust speed to help students follow along</li>
              <li>Monitor student questions in the chat</li>
              <li>Save the session for future reference</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-2">For Students</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use "Raise Hand" to signal questions</li>
              <li>Toggle video to practice signs</li>
              <li>Check transcript history if you missed something</li>
              <li>Use the feedback panel if you're having trouble</li>
              <li>Ask questions in the chat for clarification</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-2">Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Space</div><div>Toggle pause</div>
              <div className="font-medium">M</div><div>Toggle mic (teachers)</div>
              <div className="font-medium">V</div><div>Toggle video</div>
              <div className="font-medium">H</div><div>Raise/lower hand</div>
            </div>
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
      {/* Custom Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md p-4`}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={onBack || goToDashboard}
              className={`p-2 rounded-full mr-3 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {isTeacher ? 'ISL Teaching Mode' : 'ISL Learning Session'}
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {isTeacher 
                  ? classSession ? `Class Code: ${classCode}` : 'Start teaching to generate class code'
                  : classSession ? 'Connected to live session' : 'Please join a class session'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isTeacher && classSession && (
              <button 
                onClick={shareClassCode}
                className={`flex items-center px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                <Share2 size={16} className="mr-2" />
                <span className="hidden sm:inline">Share Code</span>
              </button>
            )}
            
            <button 
              onClick={() => setShowStudentsList(!showStudentsList)}
              className={`flex items-center px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              <Users size={16} className="mr-2" />
              <span className="hidden sm:inline">Students</span>
              {activeStudents.length > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${primaryColor} text-white`}>
                  {activeStudents.length}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => setShowHelpPanel(!showHelpPanel)}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main teaching/learning area */}
        <div className="flex-1 flex flex-col">
          {/* ISL Visualization and Speech Recognition Area */}
          <div className={`flex-1 p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex flex-col md:flex-row gap-4`}>
            {/* Left side: ISL Visualization */}
            <div className={`flex-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex flex-col`}>
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold">ISL Visualization</h2>
              </div>
              
              <div className="flex-1 p-4 flex items-center justify-center">
                <ISLViewer 
                  text={detectedSpeech}
                  speed={sessionSpeed}
                  paused={isPaused}
                />
              </div>
              
              {/* Speech detection display */}
              <div className={`p-4 ${darkMode ? 'bg-gray-750' : 'bg-gray-50'} rounded-b-xl`}>
                <p className="text-sm font-medium mb-1">
                  {isTeacher ? 'Your Speech' : 'Teacher\'s Speech'}:
                </p>
                <div className={`p-3 rounded-lg min-h-12 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {detectedSpeech || 'No speech detected...'}
                </div>
              </div>
            </div>
            
            {/* Right side: Video Capture (for ISL practice) */}
            <div className={`md:w-96 w-full rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex flex-col`}>
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Video Capture</h2>
                <button 
                  onClick={toggleVideo}
                  className={`px-3 py-1 rounded-lg text-sm ${videoEnabled ? 'bg-red-500 hover:bg-red-600' : `${primaryColor} ${primaryHoverColor}`} text-white`}
                >
                  {videoEnabled ? 'Stop Camera' : 'Start Camera'}
                </button>
              </div>
              
              <div className="flex-1 p-4 flex items-center justify-center bg-black bg-opacity-20 rounded-lg m-4">
                {videoEnabled ? (
                  <video 
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-h-full rounded-lg"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <VideoIcon size={48} className="mx-auto mb-2 opacity-40" />
                    <p>{isTeacher ? 'Enable camera to demonstrate signs' : 'Enable camera to practice signs'}</p>
                  </div>
                )}
              </div>
              
              {/* Student feedback component (only for students) */}
              {!isTeacher && (
                <div className="p-4 border-t border-gray-700">
                  <FeedbackComponent
                    currentTranscript={detectedSpeech}
                    sessionId={classSession?.id}
                    socket={socket}
                    darkMode={darkMode}
                    primaryColor={primaryColor}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Controls and transcript section */}
          <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Teaching/Learning controls */}
            <div className="flex justify-between items-center mb-4">
              {/* Left side controls */}
              <div className="flex items-center space-x-3">
                {isTeacher ? (
                  <button
                    onClick={isMicActive ? stopMic : startMic}
                    className={`px-4 py-2 rounded-lg flex items-center ${
                      isMicActive 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : `${primaryColor} ${primaryHoverColor} text-white`
                    }`}
                  >
                    {isMicActive ? (
                      <>
                        <MicOff size={16} className="mr-2" />
                        <span>Stop Teaching</span>
                      </>
                    ) : (
                      <>
                        <Mic size={16} className="mr-2" />
                        <span>Start Teaching</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={toggleHand}
                    className={`px-4 py-2 rounded-lg flex items-center ${
                      handRaised
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : `${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`
                    }`}
                  >
                    <Hand size={16} className="mr-2" />
                    <span>{handRaised ? 'Lower Hand' : 'Raise Hand'}</span>
                  </button>
                )}
                
                {/* Play/Pause button */}
                {(isTeacher || isMicActive) && (
                  <button
                    onClick={togglePause}
                    className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  </button>
                )}
                
                {/* Speed control (teacher only) */}
                {isTeacher && (
                  <div className="flex items-center">
                    <span className="text-sm mx-2">Speed:</span>
                    <select
                      value={sessionSpeed}
                      onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                      className={`rounded-lg px-2 py-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                    >
                      <option value="0.5">0.5x</option>
                      <option value="0.75">0.75x</option>
                      <option value="1">1x</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                    </select>
                  </div>
                )}
              </div>
              
              {/* Right side controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleHistory}
                  className={`p-3 rounded-lg flex items-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  <Clock size={18} className="mr-2" />
                  <span className="hidden sm:inline">Transcript</span>
                  {showHistory ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
                
                {isTeacher && classSession && (
                  <button
                    onClick={saveSessionRecording}
                    className={`p-3 rounded-lg flex items-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    <Save size={18} className="mr-2" />
                    <span className="hidden sm:inline">Save</span>
                  </button>
                )}
                
                {isTeacher && classSession && (
                  <button
                    onClick={endSession}
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center"
                  >
                    <X size={16} className="mr-2" />
                    <span>End Session</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Transcript history (conditionally rendered) */}
            {showHistory && (
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-100'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Transcript History</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={clearHistory}
                      className={`p-2 rounded-lg text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      <RefreshCcw size={14} />
                    </button>
                    <button
                      onClick={toggleHistory}
                      className={`p-2 rounded-lg text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {transcriptHistory.length > 0 ? (
                    <ul className="space-y-2">
                      {transcriptHistory.map((item, index) => (
                        <li key={index} className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} flex justify-between`}>
                          <span className="flex-1">{item.text}</span>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} ml-2`}>{item.timestamp}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No transcript history yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Chat and student list sidebar */}
        {showStudentsList && (
          <div className={`w-80 border-l ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} flex flex-col`}>
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">
                {isTeacher ? 'Students' : 'Participants'}
              </h2>
            </div>
            
            {/* Students list */}
            <div className="flex-1 overflow-y-auto p-2">
              {activeStudents.map(student => (
                <div 
                  key={student.id}
                  className={`p-3 mb-2 rounded-lg flex items-center justify-between ${
                    darkMode ? 'bg-gray-750' : 'bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${primaryColor} text-white`}>
                      {student.name.substring(0, 1)}
                    </div>
                    <span className="ml-2">{student.name}</span>
                  </div>
                  {student.handRaised && (
                    <span className="p-1 rounded-full bg-yellow-500">
                      <Hand size={14} className="text-white" />
                    </span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Chat section */}
            <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="font-medium mb-2">Class Chat</h3>
              <div className={`h-60 overflow-y-auto mb-2 p-2 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-100'}`}>
                {messages.length > 0 ? (
                  <div className="space-y-2">
                    {messages.map((msg, index) => (
                      <div key={index} className={`p-2 rounded-lg ${
                        msg.sender === currentUser.id
                          ? `${primaryColor} text-white`
                          : darkMode ? 'bg-gray-700' : 'bg-white'
                      }`}>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className={msg.sender === currentUser.id ? 'text-white' : darkMode ? 'text-gray-400' : 'text-gray-500'}>
                            {msg.senderName} ({msg.senderRole})
                          </span>
                          <span className={msg.sender === currentUser.id ? 'text-white' : darkMode ? 'text-gray-400' : 'text-gray-500'}>
                            {msg.timestamp}
                          </span>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-6">No messages yet.</p>
                )}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className={`flex-1 px-3 py-2 rounded-l-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} focus:outline-none`}
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className={`px-3 py-2 rounded-r-lg ${primaryColor} ${primaryHoverColor} text-white ${!message.trim() && 'opacity-50 cursor-not-allowed'}`}
                >
                  <MessageSquare size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Join modal for students */}
      {renderJoinModal()}
      
      {/* Help panel */}
      {renderHelpPanel()}
      
      {/* Floating action button for students */}
      {!isTeacher && classSession && (
        <FloatingActionButton
          darkMode={darkMode}
          primaryColor={primaryColor}
          toggleHand={toggleHand}
          handRaised={handRaised}
        />
      )}
    </div>
  );
}

export default ClassMode;