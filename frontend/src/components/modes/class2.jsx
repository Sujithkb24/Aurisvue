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
  const { socket } = useSocket();
  
  const { joinRoom } = useSocket();
  
  // State for class session
  const [classSession, setClassSession] = useState(null);
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
  
  // State for student feedback
  const [understanding, setUnderstanding] = useState(null);
  
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
      checkForActiveSession();
    } else {
      // If student, show join modal if not in a session
      if (!classSession) {
        setShowJoinModal(true);
      }
    }
  }, [currentUser, userRole, navigate]);

  // Initialize Jitsi Meet when session is ready
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
  // Add this after initializing Jitsi API
if (isTeacher) {
    // For teachers, set up own speech transcription
    setupTeacherTranscription();
    
    // Automatically unmute for teachers
    setTimeout(() => {
      jitsiApiRef.current.executeCommand('toggleAudio');
      setIsMicActive(true);
    }, 2000);
  }
    return () => {
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
    };
  }, [classSession, jitsiMeetLink]);
  
  // Set up socket events
  useEffect(() => {
    if (!socket || !currentUser) return;
    
    // Listen for speech updates from teacher
    socket.on('teacher_speech', (speech) => {
      setDetectedSpeech(speech.text);
      
      // Add to transcript history if not empty
      if (speech.text.trim()) {
        setTranscriptHistory(prev => [...prev, {
          timestamp: new Date(),
          text: speech.text
        }]);
      }
      
      // Log transcript being sent to ISL viewer
      if (speech.text.trim()) {
        console.log('Transcript sent to ISL viewer:', speech.text);
      }
      
      // Trigger ISL translation
      if (speech.isFinal) {
        setShouldTranslate(true);
      }
    });
    
    // Listen for session updates
    socket.on('session_update', (update) => {
      if (update.type === 'ended') {
        handleSessionEnded();
      }
    });
    
    return () => {
      socket.off('teacher_speech');
      socket.off('session_update');
    };
  }, [socket, currentUser]);

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
          // Enable audio levels for remote participants
          enableNoAudioDetection: true,
          enableNoisyMicDetection: true,
          // Enable statistics for audio levels
          disableAudioLevels: false,
          enableStatsID: true
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'settings', 'hangup'
          ],
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          // Show audio level indicators
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
        audioMuteStatusChanged: (status) => {
          setIsMicActive(!status.muted);
        },
        readyToClose: () => {
          if (isTeacher) {
            endSession();
          } else {
            leaveSession();
          }
        },
        participantJoined: (participant) => {
          console.log('Participant joined:', participant);
          // If student, enable audio reception and start transcription when teacher joins
          if (!isTeacher) {
            // Allow a moment for the tracks to be added
            setTimeout(() => {
              setupAudioTranscription();
            }, 3000);
          }
        },
        audioAvailabilityChanged: (available) => {
          console.log('Audio availability changed:', available);
        },
        incomingMessage: (message) => {
          console.log('Incoming message:', message);
        },
        // Track when new audio tracks become available
        trackAdded: (track) => {
          console.log('Track added:', track);
          if (!isTeacher && track.isAudioTrack()) {
            // Setup audio transcription for incoming teacher audio
            setupAudioTranscription();
          }
        }
      });
      
      // For teachers, automatically unmute
      if (isTeacher) {
        setTimeout(() => {
          jitsiApiRef.current.executeCommand('toggleAudio');
          setIsMicActive(true);
        }, 2000);
      }
      
    } catch (error) {
      console.error('Jitsi initialization error:', error);
      setError('Failed to connect to video conference.');
    }
  };
  
  // Setup audio transcription from Jitsi audio source
 // Setup audio transcription from Jitsi audio output
const setupAudioTranscription = () => {
    if (isTeacher || !jitsiApiRef.current) return;
    
    try {
      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Find the Jitsi audio element - this targets the remote audio output
      const jitsiFrame = jitsiContainerRef.current.querySelector('iframe');
      if (!jitsiFrame) {
        console.error('Jitsi iframe not found');
        return;
      }
      
      // Access the document inside the iframe
      const iframeDoc = jitsiFrame.contentWindow.document;
      const remoteAudioElements = iframeDoc.querySelectorAll('audio');
      
      if (remoteAudioElements.length === 0) {
        console.log('No remote audio elements found yet, will retry in 2 seconds');
        setTimeout(setupAudioTranscription, 2000);
        return;
      }
      
      console.log(`Found ${remoteAudioElements.length} remote audio elements`);
      
      // Create a media stream destination to collect all audio
      const mediaStreamDest = audioContextRef.current.createMediaStreamDestination();
      
      // For each remote audio element, create a media element source and connect to our processor
      remoteAudioElements.forEach((audioEl, index) => {
        try {
          const source = audioContextRef.current.createMediaElementSource(audioEl);
          source.connect(mediaStreamDest);
          source.connect(audioContextRef.current.destination); // To ensure audio still plays normally
          console.log(`Connected remote audio element ${index} to processing`);
        } catch (e) {
          console.error(`Failed to process remote audio element ${index}:`, e);
        }
      });
      
      // Set up speech recognition with the combined audio stream
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech recognition not supported in this browser');
        return;
      }
      
      // Create speech recognition instance
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
      console.log('Transcription service started with Jitsi audio output');
      
      // Set up audio processing observer to reconnect if audio sources change
      const jitsiObserver = new MutationObserver(() => {
        const currentAudioCount = iframeDoc.querySelectorAll('audio').length;
        if (currentAudioCount > remoteAudioElements.length) {
          console.log('New audio elements detected, reconnecting...');
          setupAudioTranscription(); // Reconnect with new elements
        }
      });
      
      // Observe the document body for changes to audio elements
      jitsiObserver.observe(iframeDoc.body, { 
        childList: true, 
        subtree: true 
      });
      
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
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech recognition not supported in this browser');
        return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      transcriptionServiceRef.current = new SpeechRecognition();
      
      transcriptionServiceRef.current.continuous = true;
      transcriptionServiceRef.current.interimResults = true;
      transcriptionServiceRef.current.lang = 'en-US';
      
      // Handle transcription results
      transcriptionServiceRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        const isFinal = event.results[0].isFinal;
        
        // Update state with transcription
        setDetectedSpeech(transcript);
        
        // If final result, add to transcript history
        if (isFinal && transcript.trim()) {
          const newTranscriptItem = {
            timestamp: new Date(),
            text: transcript
          };
          
          setTranscriptHistory(prev => [...prev, newTranscriptItem]);
          
          // Broadcast to students via socket
          if (socket) {
            socket.emit('teacher_speech', {
              sessionId: classSession._id,
              text: transcript,
              isFinal: true,
              timestamp: new Date()
            });
          }
        } else {
          // Send interim results too
          if (socket) {
            socket.emit('teacher_speech', {
              sessionId: classSession._id,
              text: transcript,
              isFinal: false,
              timestamp: new Date()
            });
          }
        }
      };
      
      // Error and end handlers
      transcriptionServiceRef.current.onerror = (event) => {
        console.error('Teacher transcription error:', event.error);
        setTimeout(() => {
          if (transcriptionServiceRef.current) transcriptionServiceRef.current.start();
        }, 1000);
      };
      
      transcriptionServiceRef.current.onend = () => {
        if (isMicActive) {
          setTimeout(() => {
            if (transcriptionServiceRef.current) transcriptionServiceRef.current.start();
          }, 1000);
        }
      };
      
      // Start the transcription service
      transcriptionServiceRef.current.start();
      console.log('Teacher transcription service started');
      
    } catch (error) {
      console.error('Error setting up teacher transcription:', error);
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

  // Render transcript panel
  const renderTranscriptPanel = () => {
    if (!classSession || transcriptHistory.length === 0) return null;
    
    return (
      <div className={`w-full h-1/4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-inner overflow-y-auto p-3`}>
        <h3 className="text-sm font-medium mb-2">Transcript</h3>
        <div className="space-y-2">
          {transcriptHistory.map((item, index) => (
            <div key={index} className="text-sm">
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mr-2`}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:
              </span>
              <span>{item.text}</span>
            </div>
          ))}
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
      <div className="flex flex-1 overflow-hidden">
        {/* Main teaching/learning area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Conference Area with ISL view side-by-side */}
         {/* Video Conference Area with ISL view side-by-side */}
<div className={`flex-1 relative flex ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
  {/* Jitsi Meet container - full width for teacher, 75% for students */}
  <div className={`${isTeacher ? 'w-full' : 'w-3/4'} h-full`}>
    <div 
      ref={jitsiContainerRef} 
      className="w-full h-full"
    />
  </div>
  
  {/* ISL viewer for students only - 25% width */}
  {!isTeacher && classSession && (
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
</div>

{/* Show transcript panel for teachers as a floating panel */}
{isTeacher && classSession && (
  <div className={`absolute bottom-24 right-4 w-1/3 h-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-lg overflow-y-auto p-3`}>
    <h3 className="text-sm font-medium mb-2 flex justify-between">
      <span>Live Transcript</span>
      <button className={`text-sm ${primaryTextColor} hover:underline`}>
        Clear
      </button>
    </h3>
    <div className="space-y-2 max-h-52 overflow-y-auto">
      {transcriptHistory.map((item, index) => (
        <div key={index} className="text-sm">
          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mr-2`}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:
          </span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  </div>
)}
          
          {/* Bottom controls */}
          <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center">
              {/* Left side - Session status */}
              <div>
                {classSession ? (
                  <div className={`flex items-center space-x-2 ${primaryTextColor}`}>
                    <Monitor size={16} />
                    <span>Live Session</span>
                    {isTeacher && (
                      <span className="ml-2 flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${isMicActive ? 'bg-green-500' : 'bg-red-500'} mr-1`}></span>
                        <span className="text-sm">{isMicActive ? 'Mic On' : 'Mic Off'}</span>
                      </span>
                    )}
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