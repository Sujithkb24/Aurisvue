import React,{ useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, MessageSquare, ChevronUp, ChevronDown, Pause, Play, 
  RefreshCcw, Clock, Share2, Video, Save, BarChart2, Hand, Users,
  VideoIcon, Settings, PenTool, ArrowLeft, X, HelpCircle, Monitor, CheckCircle, StopCircle
} from 'lucide-react';
import ISLViewer from '../ISL_viewer';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate, useParams } from 'react-router-dom';
import FloatingActionButton from '../ActionButton';
import FeedbackComponent from '../Feedback';
import VideoCall from '../VideoCall';
import ActiveSessionModal from '../ActiveSessionModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const ClassMode = ({ darkMode = true, onBack, navigateToMode, navigateToHome, activeMode }) => {
  const navigate = useNavigate();
  const { teacherId } = useParams();
  const { currentUser, userRole, getToken } = useAuth();
  const { socket } = useSocket();
  
  const { joinRoom, isConnected, currentRoom } = useSocket();
  // State for class session
  const [classSession, setClassSession] = useState(null);
  const [classCode, setClassCode] = useState('');
  const [isTeacher, setIsTeacher] = useState(true);
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
  const videoCallRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenShareRef = useRef(null);
  const [screenShareDebug, setScreenShareDebug] = useState({
    isConnected: false,
    hasStream: false,
    trackCount: 0
  });
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
    console.log(currentUser)
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
      
    // Listen for speech updates from teacher
    socket.on('teacher_speech', (speech) => {
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
      socket.off('teacher_speech');
      socket.off('session_update');
      if (userRole === 'teacher') {
        socket.off('student_feedback');
      }
    };
  }, [socket, currentUser, userRole]);
  const addToTranscriptHistory = (text) => {
    setTranscriptHistory(prev => [
      { text, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49) // Keep only the last 50 entries
    ]);
  };

  const startSessionTimer = () => {
    sessionTimerRef.current = setInterval(() => {
      sessionTimeRef.current += 1;
      // Could update a UI element showing session time
    }, 1000);
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

  const saveTranscriptToBackend = async (transcript) => {
    if (!classSession) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/classes/${classSession._id}/append`, {
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
  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser doesn't support speech recognition. Please use Chrome or Edge.");
      return null;
    }
      
    // Create a new recognition instance
    const rec = new SpeechRecognition();
      
    // Configuration for better speech detection
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 3; // Try to get more alternatives for better detection
      
    // Set shorter timeout for periodic restart to avoid detection issues
    const RESTART_INTERVAL = 10000; // 10 seconds
    let restartTimer = null;
      
    // Track no-speech errors
    let noSpeechCount = 0;
    const MAX_NO_SPEECH_ERRORS = 3;
    
    rec.onstart = () => {
      console.log('Speech recognition started');
      setIsMicActive(true);
      setError(null);
      noSpeechCount = 0;
          
      // Set up periodic restart to avoid detection issues
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (isMicActive && !isPaused) {
          console.log('Periodic recognition restart for better detection');
          try {
            rec.stop(); // Gracefully stop to trigger clean restart
          } catch (e) {
            console.warn('Error during periodic restart:', e);
          }
        }
      }, RESTART_INTERVAL);
    };
    
    rec.onresult = (event) => {
      if (isPaused) return;
          
      // Reset no-speech counter when we get results
      noSpeechCount = 0;
          
      const lastResult = event.results[event.results.length - 1];
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
          
      setDetectedSpeech(transcript);
      
      // If teacher is speaking, emit to all students in the room
      if (isTeacher && socket && currentRoom) {
        // Emit the speech to all users in the room
        socket.emit('teacher_speech', {
          text: transcript,
          isFinal: lastResult.isFinal,
          sessionId: classSession?.id || classSession?._id,
        });
      }
      
      if (lastResult.isFinal) {
        addToTranscriptHistory(transcript);
        if (isTeacher) saveTranscriptToBackend(transcript);
      }
    };
    
    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
          
      switch (event.error) {
        case 'network':
          setError('Network error: Checking connection...');
          try {
            rec.stop(); // Gracefully stop to allow restart
          } catch (e) {
            console.warn('Failed to stop recognition after network error:', e);
          }
          break;
                
        case 'not-allowed':
          setError('Microphone access denied. Please allow microphone access.');
          setIsMicActive(false);
          break;
                
        case 'no-speech':
          noSpeechCount++;
          console.log(`No speech detected (${noSpeechCount}/${MAX_NO_SPEECH_ERRORS})`);
                  
          if (noSpeechCount >= MAX_NO_SPEECH_ERRORS) {
            setError('No speech detected. Please check your microphone settings or speak louder.');
                      
            // After multiple no-speech errors, let's try to restart with new settings
            try {
              rec.stop();
            } catch (e) {
              console.warn('Failed to stop recognition after no-speech error:', e);
            }
          } else {
            // Don't show error for occasional no-speech events
            // They're normal and expected
          }
          break;
                
        case 'aborted':
          // Ignore aborted event during cleanup
          break;
                
        default:
          setError(`Recognition error: ${event.error}`);
          setIsMicActive(false);
      }
    };
    
    rec.onend = () => {
      console.log('Speech recognition ended');
      clearTimeout(restartTimer);
          
      // Only auto-restart if we're still supposed to be active
      if (!isPaused && isMicActive) {
        console.log('Attempting to restart speech recognition...');
              
        setTimeout(() => {
          try {
            rec.start();
            console.log('Successfully restarted speech recognition');
          } catch (e) {
            console.error('Failed to restart recognition after end:', e);
            setError('Failed to restart speech recognition. Please try again manually.');
            setIsMicActive(false);
          }
        }, 300); // Short delay to ensure complete cleanup
      } else {
        setIsMicActive(false);
      }
    };
    
    return rec;
  }, [isTeacher, socket, classSession, isPaused, isMicActive, currentRoom]);
  
  
  // Check for active session (teacher only)
  const checkForActiveSession = async () => { 
    if (userRole !== 'teacher') return;
    
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/classes/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      
      if (response.ok) {
        const data = await response.json();
        if (data.activeSession) {
          setClassSession(data.activeSession);
          setClassCode(data.activeSession.code);
          // Load session data
          loadSessionData(data.activeSession._id);
        }
      }
    } catch (error) {
      console.error("Error checking for active session:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
 
  // Add this effect to check for active sessions when the component mounts
  useEffect(() => {
    // Check for active sessions when the component mounts
    checkForActiveSession();
    
    // Set up socket listeners for comprehension feedback
    if (socket) {
      socket.on('comprehension_update', (data) => {
        // Update the student's comprehension status in the activeStudents array
        setActiveStudents(prevStudents => 
          prevStudents.map(student => 
            student.id === data.studentId 
              ? { ...student, comprehensionStatus: data.status }
              : student
          )
        );
        
        // For teachers, optionally show a notification
        if (isTeacher) {
          const student = activeStudents.find(s => s.id === data.studentId);
          const studentName = student ? student.name : 'A student';
          
          toast({
            title: data.status === 'understand' 
              ? `${studentName} understands` 
              : `${studentName} needs clarification`,
            status: data.status === 'understand' ? 'success' : 'warning',
            duration: 3000,
            isClosable: true,
          });
        }
      });
      
      // Clean up the listener when the component unmounts
      return () => {
        socket.off('comprehension_update');
      };
    }
  }, [socket, isTeacher]);
 
  const handleScreenShareChange = (isSharing, stream) => {
    setIsScreenSharing(isSharing);
    
    // Use the passed stream directly
    if (isSharing && stream) {
      console.log("Screen share change detected with stream:", stream);
      
      // Update the screen share ref with the stream
      if (screenShareRef && screenShareRef.current) {
        console.log("Assigning stream to screenShareRef");
        screenShareRef.current.srcObject = stream;
        
        // Ensure video plays by forcing play after a small delay
        setTimeout(() => {
          if (screenShareRef.current) {
            screenShareRef.current.play().catch(err => {
              console.warn(`Failed to play screen share: ${err.message}`);
            });
          }
        }, 100);
      } else {
        console.warn("screenShareRef or screenShareRef.current is null in parent component");
      }
      
      // Update debug info
      setScreenShareDebug({
        isConnected: true,
        hasStream: !!stream,
        trackCount: stream ? stream.getVideoTracks().length : 0
      });
    } else {
      // Clear the screen share ref
      if (screenShareRef && screenShareRef.current) {
        screenShareRef.current.srcObject = null;
      }
      
      setScreenShareDebug({
        isConnected: false,
        hasStream: false,
        trackCount: 0
      });
    }
  };
  
  // Load session data
  const loadSessionData = async (sessionId) => {
    try {
      const token = await getToken();
      
      // Get transcripts
      const transcriptsResponse = await fetch(`${API_URL}/classes/${sessionId}/transcripts`, {
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
      const messagesResponse = await fetch(`${API_URL}/classes/${sessionId}/messages`, {
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
  
  const handleContinueSession = (session) => {
    // Join the room with the session code
    joinRoom(session.code);
    
    // Load session data
    loadSessionData(session._id);
    
    console.log(`Continuing session: ${session.name} with code: ${session.code}`);
  };
  // Create new class session (teacher only)
  const createClassSession = async () => {
    if (userRole !== 'teacher') return;
  
    setIsLoading(true);
    try {
      const token = await getToken();
      console.log(token)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/classes`, {
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
  
        // Join the session room
        joinRoom(data.session.code);
  
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
      console.log(currentUser._id)
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/classes/join`, {
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
  
        // Join the session room
        joinRoom(data.session.code);
  
        // Load session data
        loadSessionData(data.session._id);
  
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
  
  
  // Save transcript to backend
  
  const stopMic = useCallback(() => {
    setIsPaused(true);
    setError(null);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Stop failed, trying abort:', e);
        try {
          recognitionRef.current.abort();
        } catch (e2) {
          console.warn('Abort also failed:', e2);
        }
      }
      setIsMicActive(false);
      recognitionRef.current = null;
    }
    
    // Notify students that teaching has stopped
    if (isTeacher && socket && classSession) {
      socket.emit('session_update', {
        type: 'stopped',
        sessionId: classSession._id,
      });
    }
    
    // Stop session timer
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    // Stop camera stream
    stopCamera();
  }, [stopCamera, isTeacher, socket, classSession]);
  // Start speech recognition
  const startMic = useCallback(async () => {
    // First, check if microphone is accessible
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check if audio is actually working by creating an analyzer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      // We don't need to keep this stream - just testing mic access
      stream.getTracks().forEach(track => track.stop());
      microphone.disconnect();
      audioContext.close();
      
      console.log('Microphone check successful');
    } catch (err) {
      console.error('Microphone check failed:', err);
      setError(`Microphone access error: ${err.message}. Please check browser permissions.`);
      return;
    }
    
    // Clean up any existing recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping existing recognition:', e);
        try {
          recognitionRef.current.abort();
        } catch (e2) {
          console.warn('Error aborting existing recognition:', e2);
        }
      }
      recognitionRef.current = null;
    }
    
    // Create a fresh recognition instance
    recognitionRef.current = initRecognition();
    if (!recognitionRef.current) {
      setError('Could not initialize speech recognition');
      return;
    }
    // Ensure class session exists
    if (isTeacher && !classSession) {
      try {
        await createClassSession();
      } catch (e) {
        setError('Failed to create class session.');
        return;
      }
    }
    
    // Network connectivity check before starting
    if (!navigator.onLine) {
      setError('No internet connection detected. Please check your network and try again.');
      return;
    }
    
    try {
      // Start recognition with fresh instance
      recognitionRef.current.start();
      setIsMicActive(true);
      setIsPaused(false);
      setError(null);
      
      if (isTeacher && socket && classSession) {
        socket.emit('session_update', { type: 'started', sessionId: classSession._id });
      }
      
      if (!sessionTimerRef.current) startSessionTimer();
    } catch (e) {
      console.error('Speech recognition start failed:', e);
      setError(`Failed to start speech recognition: ${e.message}`);
      setIsMicActive(false);
    }
  }, [initRecognition, isTeacher, socket, classSession, createClassSession, startSessionTimer]);
  
  const emitSpeechText = (text, isFinal = true) => {
    if (isTeacher && socket && currentRoom) {
      socket.emit('teacher_speech', {
        text: text,
        isFinal: isFinal,
        sessionId: classSession?.id || classSession?._id,
      });
      
      if (isFinal) {
        addToTranscriptHistory(text);
        saveTranscriptToBackend(text);
      }
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
      const response = await fetch(`${API_URL}/classes/${classSession._id}`, {
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
          sessionId: classSession._id
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
        userId: currentUser._id,
        userName: currentUser.name,
        sessionId: classSession._id
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
      sender: currentUser._id,
      senderName: currentUser.name || currentUser.displayName,
      senderRole: userRole,
      text: message,
      timestamp: new Date().toISOString(),
      sessionId: classSession._id
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
      const response = await fetch(`/api/sessions/${classSession._id}/messages`, {
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
      const response = await fetch(`/api/sessions/${classSession._id}/save`, {
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
          
          <ActiveSessionModal
        userRole={userRole}
        activeSession={classSession}
        onContinueSession={handleContinueSession}
        onCreateNewClass={createClassSession}
        isLoading={isLoading}
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
      <ActiveSessionModal
        userRole={userRole}
        activeSession={classSession}
        onContinueSession={handleContinueSession}
        onCreateNewClass={createClassSession}
        isLoading={isLoading}
        // Make modal automatically visible for teachers based on session check
        isOpen={userRole === 'teacher' && !classSession}
      />
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
  
      {renderJoinModal()}
      
      {/* Help panel */}
      {renderHelpPanel()}
  
      {/* Main content area - Added overflow-y-auto to enable vertical scrolling */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main teaching/learning area - Added overflow-y-auto here */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* ISL Visualization and Speech Recognition Area */}
          <div className={`p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex flex-col md:flex-row gap-4`}>
            {/* Left side: ISL Visualization with Screen Share Support */}
            <div className={`flex-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex flex-col`}>
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold">ISL Visualization</h2>
                {isScreenSharing && (
                  <span className={`px-2 py-1 text-xs rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <Monitor size={14} className="inline mr-1" />
                    Screen Sharing Active
                  </span>
                )}
              </div>
              
              <div className="flex-1 p-4 relative">
                {/* Screen Share Layer - Displayed on top when active */}
                {isScreenSharing && (
      <div className="absolute inset-0 z-10 flex flex-col bg-black bg-opacity-80">
        <div className="flex-1 flex">
          {/* Screen Share takes primary space */}
          <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
            <video 
              ref={screenShareRef} // This is okay because we're using the same ref
              autoPlay 
              playsInline 
              className="w-full h-full object-contain max-h-screen" 
              style={{ display: 'block' }} // Force display block
            />
            
            {/* Debug overlay */}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs p-1 rounded">
              Screen Share: {screenShareDebug.isConnected ? 'Connected' : 'Disconnected'} | 
              Stream: {screenShareDebug.hasStream ? 'Yes' : 'No'} | 
              Tracks: {screenShareDebug.trackCount}
            </div>
          </div>
          
          {/* ISL Viewer in smaller size */}
          <div className="w-1/3 p-2">
            <div className={`h-full rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-100'} flex items-center justify-center p-2`}>
              <ISLViewer text={detectedSpeech} speed={sessionSpeed} paused={isPaused} compact={true} />
            </div>
          </div>
        </div>
      </div>
    )}
     
                {/* Default ISL Viewer - Hidden when screen sharing is active */}
                <div className={`flex items-center justify-center ${isScreenSharing ? 'invisible' : ''}`}>
                  <ISLViewer 
                    text={detectedSpeech}
                    speed={sessionSpeed}
                    paused={isPaused}
                  />
                </div>
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
                      
            {/* Right side: Video Capture */}
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
                    <p>{isTeacher ? 'Enable camera to conduct a virtual session' : 'Enable camera to ask doubts'}</p>
                  </div>
                )}
              </div>
              <video 
      ref={screenShareRef} 
      autoPlay 
      playsInline 
      style={{ display: 'none', width: 0, height: 0 }} 
    />
              {/* Video call component integration */}
              {(isTeacher || handRaised) && (
                <div className="px-4 pb-4">
              <VideoCall 
      ref={videoCallRef} 
      isTeacher={isTeacher} 
      handRaised={handRaised} 
      videoEnabled={videoEnabled} 
      darkMode={darkMode} 
      primaryColor={primaryColor} 
      primaryHoverColor={primaryHoverColor} 
      classSession={classSession} 
      videoRef={videoRef} 
      screenShareRef={screenShareRef}  // Passing the reference correctly
      toggleVideo={toggleVideo} 
      activeStudents={activeStudents} 
      onScreenShareChange={handleScreenShareChange} 
      currentUser={currentUser} 
    />
                </div>
              )}
            </div>
          </div>
          
          {/* Controls and transcript section */}
          <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Teaching/Learning controls */}
            <div className="flex flex-wrap justify-between items-center mb-4">
              {/* Left side controls */}
              {/* Left side controls */}
<div className="flex items-center space-x-3 mb-2 sm:mb-0">
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
    <>
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
      
       {/* Add Feedback Component for students - moved here from the nested location */}
       {!isTeacher && classSession && (
                <div className="relative">
                  <FeedbackComponent
                    darkMode={darkMode}
                    currentUser={currentUser}
                    classSession={classSession}
                    detectedSpeech={detectedSpeech}
                    setUnderstanding={setUnderstanding}
                    understanding={understanding}
                  />
                </div>
              )}
    </>
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
        
        {/* Chat and student list sidebar - Added overflow-y-auto */}
        {showStudentsList && (
          <div className={`w-80 border-l ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} flex flex-col`}>
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">
                {isTeacher ? 'Students' : 'Participants'}
              </h2>
            </div>
            
            {/* Students list - Added overflow-y-auto here too */}
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
                  <div className="flex items-center space-x-1">
                    {student.comprehensionStatus === 'understand' && (
                      <span className="p-1 rounded-full bg-green-500">
                        <CheckCircle size={14} className="text-white" />
                      </span>
                    )}
                    {student.comprehensionStatus === 'need_clarification' && (
                      <span className="p-1 rounded-full bg-yellow-500">
                        <HelpCircle size={14} className="text-white" />
                      </span>
                    )}
                    {student.handRaised && (
                      <span className="p-1 rounded-full bg-yellow-500">
                        <Hand size={14} className="text-white" />
                      </span>
                    )}
                  </div>
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
                        msg.sender === currentUser._id
                          ? `${primaryColor} text-white`
                          : darkMode ? 'bg-gray-700' : 'bg-white'
                      }`}>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className={msg.sender === currentUser._id ? 'text-white' : darkMode ? 'text-gray-400' : 'text-gray-500'}>
                            {msg.senderName} ({msg.senderRole})
                          </span>
                          <span className={msg.sender === currentUser._id ? 'text-white' : darkMode ? 'text-gray-400' : 'text-gray-500'}>
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