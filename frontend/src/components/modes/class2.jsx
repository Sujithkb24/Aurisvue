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

const ClassMode = ({ darkMode = true, onBack, navigateToMode, navigateToHome, activeMode }) => {
  const navigate = useNavigate();
  const { teacherId } = useParams();
  const { currentUser, userRole, getToken } = useAuth();
  const { socket, joinRoom, broadcastTeacherSpeech } = useSocket();
  
  
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
  const [studentFeedback, setStudentFeedback] = useState(null); // New state for student feedback

  // State for student feedback
  const [understanding, setUnderstanding] = useState(null);
  const [problemWords, setProblemWords] = useState([]);
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

      // Flatten problematicWords from all feedback entries
      const feedbackWords = data.data.flatMap((feedback) => 
        (feedback.problematicWords || []).map((word) => ({
          word,
          studentId: feedback.studentId,
          studentName: feedback.studentName || 'Unknown', // Fallback if studentName is missing
          timestamp: new Date(feedback.timestamp),
        }))
      );

      console.log('Mapped feedback words:', feedbackWords);
      setProblemWords(feedbackWords);
    } else {
      console.error('Failed to fetch feedback:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
  }
};

  // Polling mechanism
  const intervalId = setInterval(fetchFeedback, 2000); // Poll every 2 seconds

  return () => clearInterval(intervalId); // Cleanup interval on unmount
}, [classJoined, transcriptHistory, studentFeedback]);

    // Add this to an existing useEffect or create a new one
useEffect(() => {
  // Only for teachers who have joined a session
  if (isTeacher && classSession && isMicActive && !transcriptionServiceRef.current) {
    console.log('Teacher has active mic but no transcription service, starting one');
    setupTeacherTranscription();
  }
}, [isTeacher, classSession, isMicActive]);
    useEffect(() => {
      console.log('Transcript history updated:', transcriptHistory);
    }, [transcriptHistory]);
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

  useEffect(() => {
    if (!classSession || !jitsiMeetLink || !jitsiContainerRef.current) return;
  
    // First load the script, then init
    loadJitsiScript()
      .then(() => {
        initJitsiMeet();
      })
      .catch(err => {
        setError('Could not load video conferencing library.');
      });
  
    return () => {
      // Thorough cleanup
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      
      if (transcriptionServiceRef.current) {
        transcriptionServiceRef.current.stop();
        transcriptionServiceRef.current = null;
      }
      
      // Reset states
      setIsMicActive(false);
      setDetectedSpeech('');
    };
  }, [classSession, jitsiMeetLink]);
  

  // Set up socket events
  useEffect(() => {
    if (!socket || !currentUser) return;
    
    console.log('Setting up socket listeners, user is', isTeacher ? 'teacher' : 'student');
    
    // Clean up previous listeners first
    socket.off('teacher_speech');
    socket.off('session_update');
    
    // Listen for speech updates from teacher
    socket.on('teacher_speech', (speech) => {
      console.log('TEACHER SPEECH EVENT RECEIVED:', {
        text: speech.text,
        isFinal: speech.isFinal,
        receivedBy: isTeacher ? 'teacher' : 'student'
      });
      
      // For students, this is the primary source of transcription
      if (!isTeacher) {
        console.log('Student processing teacher speech', speech.text);
        setDetectedSpeech(speech.text);
        
        // Add to transcript history if not empty
        if (speech.text.trim() && speech.isFinal) {
          setTranscriptHistory(prev => [...prev, {
            timestamp: new Date(),
            text: speech.text
          }]);
          
          // Trigger ISL translation for students
          setShouldTranslate(true);
        }
      }
    });

    // Listen for session updates
    socket.on('session_update', (update) => {
      console.log('Session update received:', update);
      if (update.type === 'ended') {
        handleSessionEnded();
      }
    });
    
    // Verify socket connection
    socket.emit('ping_connection', { status: 'checking connection' });
    
    return () => {
      socket.off('teacher_speech');
      socket.off('session_update');
    };
  }, [socket, currentUser, isTeacher, classSession]);

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
      
      const displayName = currentUser.displayName || currentUser.name || 'User';
      
      const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: !isTeacher, // Students join muted
          startWithVideoMuted: true, // Start with video off
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
      // Add event listeners
jitsiApiRef.current.addEventListeners({
  // Critical: Handle mic state changes properly 
  audioMuteStatusChanged: (status) => {
    console.log('Audio mute status changed:', {
      muted: status.muted,
      wasActive: isMicActive,
      willBeActive: !status.muted,
      isTeacher
    });
    const newMicState = !status.muted;
    setIsMicActive(newMicState);
    
    // Only for teachers: start or stop transcription based on mic state
    if (isTeacher) {
      if (newMicState) {
        console.log('Teacher mic activated, starting transcription');
        // Force a complete reset and restart of the transcription service
        if (transcriptionServiceRef.current) {
          try {
            transcriptionServiceRef.current.stop();
          } catch (e) {
            console.error('Error stopping existing transcription service:', e);
          }
          transcriptionServiceRef.current = null;
        }
        // Small delay to ensure microphone permissions are properly initialized
        setTimeout(() => {
          setupTeacherTranscription();
        }, 500);
      } else {
        console.log('Teacher mic deactivated, stopping transcription');
        if (transcriptionServiceRef.current) {
          transcriptionServiceRef.current.stop();
          transcriptionServiceRef.current = null;
        }
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
              // Add a check to verify mic was actually unmuted
              setTimeout(() => {
                if (!isMicActive) {
                  console.log('Forced mic check - starting transcription directly');
                  setIsMicActive(true);
                  setupTeacherTranscription();
                }
              }, 3000); // Additional check after toggleAudio has had time to take effect
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
  
  // Setup audio transcription from Jitsi audio source
  const setupAudioTranscription = () => {
    if (isTeacher || !jitsiApiRef.current) return;
    
    try {
      console.log('Setting up student audio transcription with WebRTC approach');
      
      // Use Speech Recognition API directly without trying to capture Jitsi audio
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech recognition not supported in this browser');
        return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      transcriptionServiceRef.current = new SpeechRecognition();
      
      transcriptionServiceRef.current.continuous = true;
      transcriptionServiceRef.current.interimResults = true;
      transcriptionServiceRef.current.lang = 'en-US';
      
      // Configure speech recognition event handlers
      transcriptionServiceRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        const isFinal = event.results[0].isFinal;
        
        // Update state with transcription
        setDetectedSpeech(transcript);
        
        // If final result, add to transcript and trigger ISL translation
        if (isFinal && transcript.trim()) {
          setTranscriptHistory(prev => [...prev, {
            timestamp: new Date(),
            text: transcript
          }]);
          setShouldTranslate(true);
          
          // Send transcript to teacher via socket
          if (socket) {
            socket.emit('student_transcript', {
              sessionId: classSession._id,
              text: transcript,
              timestamp: new Date()
            });
          }
        }
      };
      
      // Error and end handlers
      transcriptionServiceRef.current.onerror = (event) => {
        console.error('Transcription error:', event.error);
        // Restart on error
        setTimeout(() => {
          if (transcriptionServiceRef.current) transcriptionServiceRef.current.start();
        }, 1000);
      };
      
      transcriptionServiceRef.current.onend = () => {
        // Restart if ended unexpectedly
        if (jitsiApiRef.current) {
          setTimeout(() => {
            if (transcriptionServiceRef.current) transcriptionServiceRef.current.start();
          }, 1000);
        }
      };
      
      // Start recognition
      transcriptionServiceRef.current.start();
      console.log('Transcription service started for student');
      
    } catch (error) {
      console.error('Error setting up audio transcription:', error);
      // Retry setup after error
      setTimeout(setupAudioTranscription, 3000);
    }
  };
  // Setup WebSpeech API for teacher's own transcription
  const setupTeacherTranscription = () => {
    if (!isTeacher) return;
    
    try {
      console.log('Setting up teacher transcription, mic active state:', isMicActive);
      
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech recognition not supported in this browser');
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
      
      // Create a fresh instance every time
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
        
        const isFinal = event.results[0].isFinal;
        
        // Debug logging
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
          
          // Use the broadcastTeacherSpeech function from SocketContext
          if (classSession) {
            broadcastTeacherSpeech(classSession.code, transcript, true);
          }
        } else if (transcript.trim()) {
          // Send interim results too using the SocketContext function
          if (classSession) {
            broadcastTeacherSpeech(classSession.code, transcript, false);
          }
        }
      };
      
      // Error handler with better logging
      transcriptionServiceRef.current.onerror = (event) => {
        console.error('Teacher transcription error:', event.error, 'Error details:', event);
        
        // Don't automatically restart for aborted or network errors
        if (event.error === 'aborted' || event.error === 'network') {
          console.log('Transcription aborted or network error, will not restart automatically');
          return;
        }
        
        // Otherwise restart if the mic is still active
        if (isMicActive) {
          console.log('Scheduling transcription restart after error...');
          setTimeout(() => {
            console.log('Restarting transcription after error');
            setupTeacherTranscription(); // Complete reset and restart
          }, 1000);
        }
      };
      
      // Handle end event
      transcriptionServiceRef.current.onend = () => {
        console.log('Teacher transcription ended, mic active:', isMicActive);
        if (isMicActive) {
          console.log('Transcription ended but mic still active. Restarting...');
          // Don't try to restart the same instance, create a fresh one
          transcriptionServiceRef.current = null;
          setTimeout(() => {
            setupTeacherTranscription();
          }, 1000);
        }
      };
      
      // Extra logging for start
      console.log('About to start teacher transcription service...');
      
      // Start the transcription service with error handling
      try {
        transcriptionServiceRef.current.start();
        console.log('Teacher transcription service started successfully');
      } catch (err) {
        console.error('Failed to start teacher transcription:', err);
        // Clear the service reference to allow future attempts
        transcriptionServiceRef.current = null;
        
        // Try one more time after a delay
        if (isMicActive) {
          console.log('Retrying transcription setup after start failure...');
          setTimeout(() => {
            setupTeacherTranscription();
          }, 2000);
        }
      }
      
    } catch (error) {
      console.error('Error in setupTeacherTranscription:', error);
      // Always clean up on error
      transcriptionServiceRef.current = null;
    }
  };
  
  // Check for active session (teacher only)
  const checkForActiveSession = async () => { 
    if (userRole !== 'teacher') return;
    
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/classes/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.activeSession) {
          setClassSession(data.activeSession);
          setClassCode(data.activeSession.code);
          setJitsiMeetLink(data.activeSession.jitsiLink);
          
          // Join the session room
          joinRoom(data.activeSession.code);
        }
      }
    } catch (error) {
      setError("Error checking for active session");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create new class session (teacher only)
  const createClassSession = async () => {
    if (userRole !== 'teacher') return;
  
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/classes`, {
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
        setJitsiMeetLink(data.session.jitsiMeetLink);
        setClassJoined(data.session);
        // Join the session room
        joinRoom(data.session.code);
  
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create class session');
      }
    } catch (error) {
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
        setClassSession(data.session);
        setJitsiMeetLink(data.session.jitsiLink);
        
        console.log('Class joined:', classJoined);
        setShowJoinModal(false);
  
        // Join the session room
        joinRoom(data.session.code);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Invalid class code');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle continuing session
  const handleContinueSession = (session) => {
    // Join the room with the session code
    joinRoom(session.code);
    setClassJoined(session);
    console.log('Continuing session:', session);
    setJitsiMeetLink(session.jitsiLink);
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
      
      // Clean up Jitsi
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
      
      // Clean up audio processing resources
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
      
      // Reset state
      setClassSession(null);
      setClassCode('');
      setJitsiMeetLink('');
      setIsMicActive(false);
      setTranscriptHistory([]);
      
      // Notify all users in the room that the session ended
      if (socket) {
        socket.emit('session_update', {
          type: 'ended',
          sessionId: classSession._id
        });
      }
      
    } catch (error) {
      setError("Error ending session");
    }
  };
  
  // Leave session (student only)
  const leaveSession = () => {
    // Clean up Jitsi
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }
    
    // Clean up audio processing resources
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
    
    // Reset state
    setClassSession(null);
    setClassCode('');
    setJitsiMeetLink('');
    setDetectedSpeech('');
    setTranscriptHistory([]);
  };
  
  // Session ended handler
  const handleSessionEnded = () => {
    // Clean up Jitsi
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }
    
    // Clean up audio processing resources
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
    
    alert('The session has ended.');
    
    // Reset state
    setClassSession(null);
    setClassCode('');
    setJitsiMeetLink('');
    setDetectedSpeech('');
    setTranscriptHistory([]);
    
    // For students, show join modal again
    if (!isTeacher) {
      setShowJoinModal(true);
    }
  };
  
  // Share class code
  const shareClassCode = async () => {
    if (!classCode) return;
    
    try {
      await navigator.clipboard.writeText(classCode);
      alert(`Class code ${classCode} copied to clipboard!`);
    } catch (err) {
      alert(`Class code: ${classCode}`);
    }
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


  // Main component render
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
              onClick={onBack || (() => navigate('/'))}
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
  
      {renderJoinModal()}
      
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