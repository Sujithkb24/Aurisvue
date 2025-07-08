import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Share2, Monitor, X, 
  HelpCircle, Mic, MicOff
} from 'lucide-react';
import ISLViewer from '../ISL_viewer';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate, useParams } from 'react-router-dom';
import FeedbackComponent from '../Feedback';
import ActiveSessionModal from '../ActiveSessionModal';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
let _jitsiScriptLoading = null;

function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve();
  }
  if (_jitsiScriptLoading) {
    return _jitsiScriptLoading;
  }

  _jitsiScriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Jitsi script'));
    document.head.appendChild(script);
  });

  return _jitsiScriptLoading;
}

const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // Stop immediately, we just needed permission
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};

const Toast = ({ message, actions = [], onClose, duration = 5000 }) => {
  React.useEffect(() => {
    if (duration === null) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-4 animate-fade-in">
      <span>{message}</span>
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={action.onClick}
          className="ml-2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          {action.label}
        </button>
      ))}
      <button onClick={onClose} className="ml-2 px-2 py-1 rounded bg-gray-700 hover:bg-gray-800 text-white text-xs">✕</button>
    </div>
  );
};

const ClassMode = ({ darkMode = true, onBack, navigateToMode, navigateToHome, activeMode }) => {
  const navigate = useNavigate();
  const { teacherId } = useParams();
  const { currentUser, userRole, getToken } = useAuth();
  const { socket, joinRoom, broadcastTeacherSpeech } = useSocket();
  const [className, setClassName] = useState('');
  const [showClassNameModal, setShowClassNameModal] = useState(false);
  
  // State for class session
  const [classSession, setClassSession] = useState(null);
  const [classJoined, setClassJoined] = useState(null);
  const [classCode, setClassCode] = useState('');
  const [isTeacher, setIsTeacher] = useState(true);
  const [isMicActive, setIsMicActive] = useState(false);
  const [jitsiMeetLink, setJitsiMeetLink] = useState('');
  
  // State for speech and ISL
  const [detectedSpeech, setDetectedSpeech] = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [islResponse, setIslResponse] = useState(null);
  const [shouldTranslate, setShouldTranslate] = useState(false);
  
  // State for UI
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [error, setError] = useState('');
  const [studentFeedback, setStudentFeedback] = useState(null);
  const [toast, setToast] = useState(null);

  // State for student feedback
  const [understanding, setUnderstanding] = useState(null);
  const [problemWords, setProblemWords] = useState([]);
  
  // State for continue session modal
  const [showContinueSessionModal, setShowContinueSessionModal] = useState(false);
  const [pendingActiveSession, setPendingActiveSession] = useState(null);
  
  // Refs
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const transcriptionServiceRef = useRef(null);
  
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
      (async () => {
        try {
          const token = await getToken();
          const response = await fetch(`${API_URL}/classes/active`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.activeSession) {
              setPendingActiveSession(data.activeSession);
              setShowContinueSessionModal(true);
              return;
            }
          }
        } catch (error) {
          console.error('Error checking active session:', error);
        }
        setShowClassNameModal(true);
      })();
    } else {
      // If student, show join modal if not in a session
      if (!classSession) {
        setShowJoinModal(true);
      }
    }
  }, [currentUser, userRole, navigate, getToken]);

  // Fetch feedback for teachers
  useEffect(() => {
    if (!classJoined) return;

    const fetchFeedback = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/analytics/feedback/${classJoined._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          const feedbackWords = data.data.flatMap((feedback) => 
            (feedback.problematicWords || []).map((word) => ({
              word,
              studentId: feedback.studentId,
              studentName: feedback.studentName || 'Unknown',
              timestamp: new Date(feedback.timestamp),
            }))
          );
          setProblemWords(feedbackWords);
        }
      } catch (error) {
        console.error('Error fetching feedback:', error);
      }
    };

    const intervalId = setInterval(fetchFeedback, 2000);
    return () => clearInterval(intervalId);
  }, [classJoined, getToken]);

  // Initialize Jitsi Meet when session and link are ready
  useEffect(() => {
    if (!classSession || !jitsiMeetLink || !jitsiContainerRef.current) return;
    
    console.log('Initializing Jitsi Meet with link:', jitsiMeetLink);
    
    loadJitsiScript()
      .then(() => {
        initJitsiMeet();
      })
      .catch(err => {
        console.error('Failed to load Jitsi script:', err);
        setError('Could not load video conferencing library.');
      });
  
    return () => {
      // Cleanup on unmount
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      
      if (transcriptionServiceRef.current) {
        transcriptionServiceRef.current.stop();
        transcriptionServiceRef.current = null;
      }
      
      setIsMicActive(false);
      setDetectedSpeech('');
    };
  }, [classSession, jitsiMeetLink]);

  // Set up socket events
  useEffect(() => {
  if (!socket || !currentUser) return;
  
  console.log('Setting up socket listeners, user is', isTeacher ? 'teacher' : 'student');
  
  // Clean up ALL previous listeners first
  socket.off('teacher_speech');
  socket.off('session_update');
  socket.off('room_joined');
  socket.off('room_users');
  socket.off('user_joined');
  socket.off('user_left');
  
  // Set up teacher_speech listener IMMEDIATELY for students
  if (!isTeacher) {
    console.log('Setting up teacher_speech listener for student');
    socket.on('teacher_speech', (speech) => {
      console.log('STUDENT RECEIVED teacher_speech:', {
        text: speech.text,
        isFinal: speech.isFinal,
        timestamp: speech.timestamp
      });
      
      // Update detected speech for students
      setDetectedSpeech(speech.text);
      
      // Trigger ISL translation for students
      if (speech.text.trim()) {
        setShouldTranslate(true);
      }
      
      // Add to transcript history if final
      if (speech.text.trim() && speech.isFinal) {
        setTranscriptHistory(prev => [...prev, {
          timestamp: new Date(speech.timestamp || Date.now()),
          text: speech.text
        }]);
      }
    });
  }
  
  // Listen for room join confirmation
  socket.on('room_joined', (data) => {
    console.log('Room joined confirmed:', data.roomId);
  });
  
  // Listen for session updates
  socket.on('session_update', (update) => {
    console.log('Session update received:', update);
    if (update.type === 'ended') {
      handleSessionEnded();
    }
  });
  
  // Debug room status
  socket.on('room_users', (data) => {
    console.log('Room users:', data.users);
  });
  
  socket.on('user_joined', (data) => {
    console.log('User joined room:', data.userId);
  });
  
  socket.on('user_left', (data) => {
    console.log('User left room:', data.userId);
  });
  
  return () => {
    console.log('Cleaning up socket listeners');
    socket.off('teacher_speech');
    socket.off('session_update');
    socket.off('room_joined');
    socket.off('room_users');
    socket.off('user_joined');
    socket.off('user_left');
  };
}, [socket, currentUser, isTeacher]);

  // Initialize Jitsi Meet with audio processing
  const initJitsiMeet = () => {
    if (typeof JitsiMeetExternalAPI === 'undefined') {
      setError("Jitsi Meet API not loaded!");
      return;
    }
    
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }
    
    try {
      // Extract domain and room from the jitsiMeetLink
      const url = new URL(jitsiMeetLink);
      const domain = url.hostname;
      const roomName = url.pathname.substring(1);
      
      console.log('Initializing Jitsi with domain:', domain, 'room:', roomName);
      
      const displayName = currentUser.displayName || currentUser.name || 'User';
      
      const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: !isTeacher,
          startWithVideoMuted: true,
          toolbarButtons: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'settings', 'hangup'
          ],
          prejoinPageEnabled: false,
          enableNoAudioDetection: true,
          enableNoisyMicDetection: true,
          disableAudioLevels: false,
          enableStatsID: true
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'settings', 'hangup'
          ],
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          SHOW_JITSI_WATERMARK: false
        },
        userInfo: {
          displayName: displayName
        }
      };
      
      // Create Jitsi Meet API instance
      jitsiApiRef.current = new JitsiMeetExternalAPI(domain, options);
      
      // Add event listeners
      jitsiApiRef.current.addEventListeners({
        audioMuteStatusChanged: async (status) => {
  console.log('Audio mute status changed:', status);
  const newMicState = !status.muted;
  setIsMicActive(newMicState);
  
  if (isTeacher && newMicState) {
    // Wait for Jitsi to fully activate the microphone
    setTimeout(() => {
      setupTeacherTranscription();
    }, 3000); // Increased from 2000ms
  } else if (isTeacher && !newMicState) {
    // Properly stop transcription
    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.stopping = true;
      transcriptionServiceRef.current.stop();
      transcriptionServiceRef.current = null;
    }
  }
},
        
        readyToClose: () => {
          if (isTeacher) {
            endSession();
          } else {
            leaveSession();
          }
        },
        
        videoConferenceJoined: (conference) => {
          console.log('Video conference joined:', conference);
          // For teachers: automatically unmute and start transcription
          if (isTeacher) {
            setTimeout(() => {
              console.log('Teacher joined conference, unmuting...');
              jitsiApiRef.current.executeCommand('toggleAudio');
              // Additional check to ensure transcription starts
              setTimeout(() => {
                if (!isMicActive) {
                  console.log('Forcing mic activation for teacher');
                  setIsMicActive(true);
                  setupTeacherTranscription();
                }
              }, 3000);
            }, 2000);
          }
        },
        
        participantJoined: (participant) => {
          console.log('Participant joined:', participant);
        }
      });
      
    } catch (error) {
      console.error('Jitsi initialization error:', error);
      setError('Failed to connect to video conference.');
    }
  };

  // Setup WebSpeech API for teacher's own transcription
  const setupTeacherTranscription = async() => {
    if (!isTeacher) return;
    
    try {
      console.log('Setting up teacher transcription');
      
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech recognition not supported in this browser');
        setError('Speech recognition not supported in this browser');
        return;
      }
      
      // Always ensure we clean up any existing service
      if (transcriptionServiceRef.current) {
        console.log('Stopping existing transcription service');
        try {
          transcriptionServiceRef.current.stop();
        } catch (e) {
          console.error('Error stopping transcription:', e);
        }
        transcriptionServiceRef.current = null;
      }
      // In setupTeacherTranscription, before stopping existing service:

if (transcriptionServiceRef.current) {
  console.log('Stopping existing transcription service');
  transcriptionServiceRef.current.stopping = true; // Add this flag
  transcriptionServiceRef.current.stop();
  transcriptionServiceRef.current = null;
  
  // Use setTimeout instead of await for delay
  setTimeout(() => {
    continueSetup();
  }, 500);
  return;
}
      // Create a fresh instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      transcriptionServiceRef.current = new SpeechRecognition();
      
      // Configure recognition settings
      transcriptionServiceRef.current.continuous = true;
      transcriptionServiceRef.current.interimResults = true;
      transcriptionServiceRef.current.lang = 'en-US';
      transcriptionServiceRef.current.maxAlternatives = 1;
      
      // Handle transcription results
     transcriptionServiceRef.current.onresult = (event) => {
  const transcript = Array.from(event.results)
    .map(result => result[0])
    .map(result => result.transcript)
    .join('');
  
  const isFinal = event.results[event.results.length - 1].isFinal;
  
  console.log('Teacher transcription received:', transcript, 'isFinal:', isFinal);
  
  // Update state with transcription
  setDetectedSpeech(transcript);
  
  // If final result, add to transcript history
  if (isFinal && transcript.trim()) {
    const newTranscriptItem = {
      timestamp: new Date(),
      text: transcript
    };
    
    setTranscriptHistory(prev => [...prev, newTranscriptItem]);
  }
  
  // Broadcast to students via socket - ONLY send if there's content
  if (classSession && socket && transcript.trim()) {
    const speechData = {
      sessionId: classSession._id,
      text: transcript.trim(),
      isFinal: isFinal,
      timestamp: new Date().toISOString()
    };
    
    console.log('Broadcasting teacher speech:', speechData);
    
    // Emit with error handling
    try {
      socket.emit('teacher_speech', speechData);
    } catch (error) {
      console.error('Error broadcasting teacher speech:', error);
    }
  }
};
      
      // Error handler
      transcriptionServiceRef.current.onerror = (event) => {
        console.error('Teacher transcription error:', event.error);
        
        // Don't automatically restart for certain errors
        if (event.error === 'aborted' || event.error === 'network') {
          console.log('Transcription aborted or network error');
          return;
        }
        
        // Restart if mic is still active
        if (isMicActive) {
          console.log('Restarting transcription after error...');
          setTimeout(() => {
            setupTeacherTranscription();
          }, 1000);
        }
      };
      
      // Handle end event
      transcriptionServiceRef.current.onend = () => {
  console.log('Teacher transcription ended');
  
  // Only restart if mic is still active and we're not manually stopping
  if (isMicActive && !transcriptionServiceRef.current?.stopping) {
    console.log('Auto-restarting transcription...');
    setTimeout(() => {
      setupTeacherTranscription();
    }, 2000);
  }
  
  transcriptionServiceRef.current = null;
};
      
      // Start the transcription service
      console.log('Starting teacher transcription service...');
      transcriptionServiceRef.current.start();
      console.log('Teacher transcription service started successfully');
      
    } catch (error) {
      console.error('Error in setupTeacherTranscription:', error);
      transcriptionServiceRef.current = null;
      setError('Failed to start speech recognition');
    }
  };

  // Create new class session (teacher only)
  const createClassSession = async () => {
  if (userRole !== 'teacher') return;
  setIsLoading(true);
  setError('');
  
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: className.trim() || "New ISL Learning Session",
        description: "Interactive sign language learning session"
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Class session created:', data.session);
      
      setClassSession(data.session);
      setClassCode(data.session.code);
      setJitsiMeetLink(data.session.jitsiMeetLink || data.session.jitsiLink);
      setClassJoined(data.session);
      
      // Join the session room (socket.io) - IMPORTANT: Use session._id
      if (socket && data.session._id) {
  const roomId = `session-${data.session._id}`;
  console.log('Teacher joining room:', roomId);
  
  // Add a small delay to ensure socket is ready
  setTimeout(() => {
    socket.emit('join_room', roomId);
  }, 100);
}
      
    } else {
      const errorData = await response.json();
      setError(errorData.message || 'Failed to create class session');
    }
  } catch (error) {
    console.error('Error creating class session:', error);
    setError('Failed to connect to server');
  } finally {
    setIsLoading(false);
  }
};

  // Join class session (student only)
 const joinClassSession = async () => {
  if (userRole !== 'student' || !classCode.trim()) return;
  setIsLoading(true);
  setError('');
  
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/classes/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ code: classCode })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Student joined session:', data.session);
      
      setClassSession(data.session);
      setJitsiMeetLink(data.session.jitsiLink || data.session.jitsiMeetLink);
      setShowJoinModal(false);
      
      // Join the session room (socket.io) - IMPORTANT: Use session._id
      if (socket && data.session._id) {
  const roomId = `session-${data.session._id}`;
  console.log('Student joining room:', roomId);
  
  // Add a small delay to ensure socket is ready
  setTimeout(() => {
    socket.emit('join_room', roomId);
  }, 100);
}

    } else {
      const errorData = await response.json();
      setError(errorData.message || 'Invalid class code');
    }
  } catch (error) {
    console.error('Error joining class session:', error);
    setError('Failed to connect to server');
  } finally {
    setIsLoading(false);
  }
};

  // Handle continuing session
  const handleContinueSession = (session) => {
    setClassSession(session);
    setClassCode(session.code);
    setJitsiMeetLink(session.jitsiLink || session.jitsiMeetLink);
    setClassJoined(session);
    
    if (socket && session._id) {
  const roomId = `session-${session._id}`;
  console.log('Continuing session, joining room:', roomId);
  
  setTimeout(() => {
    socket.emit('join_room', roomId);
  }, 100);
}
  };
  
  // End session (teacher only)
  const endSession = async () => {
    if (!isTeacher || !classSession) return;
    
    try {
      const token = await getToken();
      await fetch(`${API_URL}/classes/${classSession._id}/end`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Clean up resources
      cleanup();
      
      setToast({
        message: 'Session ended successfully!',
        actions: [
          {
            label: 'Start New Class',
            onClick: () => {
              setShowClassNameModal(true);
              setToast(null);
            }
          },
          {
            label: 'Go Home',
            onClick: () => {
              navigate('/');
              setToast(null);
            }
          }
        ],
        duration: null
      });
      
      // Reset state
      resetSessionState();
      
      // Notify all users in the room that the session ended
      if (socket) {
        socket.emit('session_update', {
          type: 'ended',
          sessionId: classSession._id
        });
      }
    } catch (error) {
      console.error('Error ending session:', error);
      setError("Error ending session");
    }
  };
  
  // Leave session (student only)
  const leaveSession = () => {
    cleanup();
    resetSessionState();
  };
  
  // Session ended handler
  const handleSessionEnded = () => {
    cleanup();
    
    setToast({
      message: 'The session has ended.',
      actions: [
        {
          label: 'OK',
          onClick: () => setToast(null)
        }
      ],
      duration: 7000
    });
    
    resetSessionState();
    
    // For students, show join modal again
    if (!isTeacher) {
      setShowJoinModal(true);
    }
  };
  
  // Cleanup function
  const cleanup = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.stop();
      transcriptionServiceRef.current = null;
    }
  };
  
  // Reset session state
  const resetSessionState = () => {
    setClassSession(null);
    setClassCode('');
    setJitsiMeetLink('');
    setIsMicActive(false);
    setDetectedSpeech('');
    setTranscriptHistory([]);
    setClassJoined(null);
  };
  
  // Share class code
  const shareClassCode = async () => {
    if (!classCode) return;
    try {
      await navigator.clipboard.writeText(classCode);
      setToast({
        message: `Class code ${classCode} copied to clipboard!`,
        actions: [],
        duration: 3000
      });
    } catch (err) {
      setToast({
        message: `Class code: ${classCode}`,
        actions: [
          {
            label: 'Copy',
            onClick: async () => {
              await navigator.clipboard.writeText(classCode);
              setToast({ message: 'Copied!', actions: [], duration: 2000 });
            }
          }
        ],
        duration: 7000
      });
    }
  };

  // Render continue session modal for teacher
  const renderContinueSessionModal = () => {
    if (!showContinueSessionModal || !pendingActiveSession) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl p-6 w-full max-w-md`}>
          <h2 className="text-xl font-bold mb-4">Continue Previous Session?</h2>
          <p className="mb-4 text-base">
            You have an active class session: <span className="font-semibold">{pendingActiveSession.title || 'Untitled Session'}</span>.<br/>
            Would you like to continue it?
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowContinueSessionModal(false);
                setShowClassNameModal(true);
                setPendingActiveSession(null);
              }}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
            >
              Create New
            </button>
            <button
              onClick={() => {
                handleContinueSession(pendingActiveSession);
                setShowContinueSessionModal(false);
                setPendingActiveSession(null);
              }}
              className={`px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render join modal for students
  const renderJoinModal = () => {
    if (!showJoinModal || userRole !== 'student') return null;
    
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl p-6 w-full max-w-md`}>
          <h2 className="text-xl font-bold mb-4">Join ISL Learning Session</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Enter Class Code</label>
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              } focus:outline-none`}
              placeholder="Enter class code provided by your teacher"
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500 bg-opacity-20 text-red-500 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => navigate('/')}
              className={`px-4 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            
            <button
              onClick={joinClassSession}
              disabled={!classCode.trim() || isLoading}
              className={`px-4 py-2 rounded-lg ${primaryColor} ${primaryHoverColor} text-white flex items-center ${
                (!classCode.trim() || isLoading) && 'opacity-50 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Joining...' : 'Join Class'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render class name modal for new session
const renderClassNameModal = () => {
  if (!showClassNameModal || userRole !== 'teacher') return null;
  
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl p-6 w-full max-w-md`}>
        <h2 className="text-xl font-bold mb-4">Create New ISL Session</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Class Name</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg ${
              darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            placeholder="Enter class name (e.g., Grade 5 ISL Basics)"
            maxLength={50}
          />
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            This will help students identify your session
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-20 text-red-500 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowClassNameModal(false);
              setClassName('');
              setError('');
            }}
            className={`px-4 py-2 rounded-lg ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            } transition-colors`}
            disabled={isLoading}
          >
            Cancel
          </button>
          
          <button
            onClick={async () => {
              if (!className.trim()) {
                setError('Please enter a class name');
                return;
              }
              setShowClassNameModal(false);
              await createClassSession();
            }}
            disabled={!className.trim() || isLoading}
            className={`px-4 py-2 rounded-lg ${primaryColor} ${primaryHoverColor} text-white flex items-center transition-colors ${
              (!className.trim() || isLoading) && 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Session'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

  // Main component render
  return (
    <div className={`flex flex-col h-screen w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/*
        ActiveSessionModal is not needed after creating a class.
        Only show for teachers if there is no active session and not just after creating one.
      */}
      {userRole === 'teacher' && !classSession && !isLoading && (
        <ActiveSessionModal
          userRole={userRole}
          activeSession={classSession}
          onContinueSession={handleContinueSession}
          onCreateNewClass={() => setShowClassNameModal(true)}
          isLoading={isLoading}
          isOpen={true}
        />
      )}
      
      {/* Custom Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md p-4`}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={onBack || (() => navigate('/dashboard'))}
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
              onClick={() => { /* Toggle help panel */ }}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </div>
      </div>
  
      {renderContinueSessionModal()}
      {renderJoinModal()}
      {renderClassNameModal()}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Main teaching/learning area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Video Conference Area with ISL view side-by-side */}
          <div className={`flex-1 relative flex ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Teacher Layout - 75% Jitsi, 25% Transcript and Problem Words */}
            {isTeacher ? (
              <>
                <div className="w-3/4 h-full">
                  <div 
                    ref={jitsiContainerRef} 
                    className="w-full h-full"
                  />
                </div>
                <div className="w-1/4 h-full border-l border-gray-700 flex flex-col">
                  {/* Problematic Words Section - Only visible to teachers when words exist */}
                  {isTeacher && problemWords.length > 0 && (
                    <div className={`p-3 ${darkMode ? 'bg-gray-700' : 'bg-orange-50'} border-b ${darkMode ? 'border-gray-600' : 'border-orange-200'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className={`font-medium ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                          Unclear Terms ({problemWords.length})
                        </h3>
                        <button 
                          onClick={() => setProblemWords([])}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {problemWords.map((item, index) => (
                          <div key={index} className={`text-sm p-1 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                            <div className="flex justify-between">
                              <span className="font-medium">{item.word}</span>
                              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {item.studentName}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Live Transcript (unchanged) */}
                  <div className={`p-3 ${darkMode ? 'bg-gray-800' : 'bg-white'} h-full overflow-y-auto flex-1`}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Live Transcript</h3>
                      <button 
                        onClick={() => setTranscriptHistory([])}
                        className={`text-xs ${primaryTextColor} hover:underline`}
                      >
                        Clear
                      </button>
                    </div>
                    <div className="space-y-2">
                    {transcriptHistory.length > 0 ? (
  transcriptHistory.slice(-10).map((item, index) => (
    <div key={index} className="text-sm">
      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:
      </span>
      <p>{item.text}</p>
    </div>
  ))
) : (
  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
    {isMicActive ? 'Speak to see transcript here...' : 'Mic is muted'}
  </p>
)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Student Layout - 75% Jitsi, 25% ISL Viewer (unchanged) */
              <>
                <div className="w-3/4 h-full">
                  <div 
                    ref={jitsiContainerRef} 
                    className="w-full h-full"
                  />
                </div>
                {classSession && (
                  <div className="w-1/4 h-full p-2">
                    <div className={`w-full h-full rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex flex-col`}>
                      <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="text-sm font-medium">ISL Translation</h3>
                        {isMicActive ? (
                          <Mic size={16} className="text-green-500" />
                        ) : (
                          <MicOff size={16} className="text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 flex items-center justify-center p-2">
                        <ISLViewer 
                          darkMode={darkMode} 
                          mode="public" 
                          speechInput={detectedSpeech} 
                          isListening={true} 
                          islResponse={islResponse} 
                          shouldTranslate={shouldTranslate} 
                          onTranslationDone={() => setShouldTranslate(false)} 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom controls (unchanged) */}
          <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center">
              {/* Left side - Session status */}
              <div>
                {classSession ? (
                  <div className={`flex items-center space-x-2 ${primaryTextColor}`}>
                    <Monitor size={16} />
                    <span>Live Session</span>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <span>No active session</span>
                  </div>
                )}
              </div>
              
              {/* Right side - End session button for teacher */}
              <div>
                {isTeacher && classSession && (
                  <button
                    onClick={endSession}
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center"
                  >
                    <X size={16} className="mr-2" />
                    <span>End Session</span>
                  </button>
                )}
                
                {/* Feedback component for students */}
                {!isTeacher && classSession && (
                  <div className="absolute bottom-full mb-2 right-0">
                  <FeedbackComponent
    darkMode={darkMode}
    currentUser={currentUser}
    classSession={classSession}
    detectedSpeech={detectedSpeech}
    setUnderstanding={setUnderstanding}
    understanding={understanding}
    studentFeedback={studentFeedback} // Pass as prop
    setStudentFeedback={setStudentFeedback} // Pass setter as prop
  />
  </div>

                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassMode;