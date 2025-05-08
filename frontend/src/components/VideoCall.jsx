// Main fix in the VideoCall component - improved remote track rendering
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { 
  Video as VideoIcon, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  StopCircle, 
  Hand,
  CheckCircle,
  XCircle
} from 'lucide-react';

const VideoCall = forwardRef(({ 
  isTeacher, 
  handRaised, 
  videoEnabled, 
  darkMode, 
  primaryColor, 
  primaryHoverColor,
  classSession,
  videoRef,
  screenShareRef,
  toggleVideo,
  activeStudents,
  onScreenShareChange,
  currentUser
}, ref) => {
  const {
    isConnected,
    currentRoom,
    roomUsers,
    startVideoCall,
    stopVideoCall,
    startScreenSharing,
    stopScreenSharing,
    toggleAudio,
    toggleVideo: toggleSocketVideo,
    joinRoom,
    leaveRoom,
    subscribe,
    unsubscribe,
    getRemoteStreams,
  } = useSocket();

  // State management
  const [isInCall, setIsInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [remoteScreens, setRemoteScreens] = useState({});
  const [pendingHandRaises, setPendingHandRaises] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [tooltipText, setTooltipText] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // References for media elements
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const remoteScreenRefs = useRef({});
  const remoteStreamsDebug = useRef({});

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    handleStopScreenShare: () => handleStopScreenShare(),
    handleStartScreenShare: () => handleStartScreenShare(),
    isScreenSharing: () => isScreenSharing
  }));
  
  // Auto-join room when class session is available
  useEffect(() => {
    if (classSession && isConnected && classSession.id) {
      console.log(`Joining room: ${classSession.id}`);
      joinRoom(classSession.id);
    }
    
    return () => {
      if (classSession && classSession.id) {
        console.log(`Leaving room: ${classSession.id}`);
        leaveRoom(classSession.id);
      }
    };
  }, [classSession, isConnected, joinRoom, leaveRoom]);

  // Handle students with raised hands
  useEffect(() => {
    if (isTeacher && activeStudents) {
      const handRaisedStudents = activeStudents.filter(student => student.handRaised);
      const newPendingStudents = handRaisedStudents.filter(
        student => !approvedStudents.includes(student.id)
      );
      setPendingHandRaises(newPendingStudents);
    }
  }, [activeStudents, isTeacher, approvedStudents]);

  // IMPROVED: Remote streams handling
  useEffect(() => {
    const handleUserJoined = (userId, stream, streamType = 'video') => {
      console.log(`User joined: ${userId} with ${streamType} stream:`, stream);
      
      if (!stream) {
        console.warn(`Received null or undefined stream for user ${userId}`);
        return;
      }
      
      // Debug logging
      console.log(`Tracks in stream:`, stream.getTracks().map(t => t.kind));
      
      // Store stream in debug reference
      remoteStreamsDebug.current[`${userId}-${streamType}`] = stream;
      
      // Update state based on stream type
      if (streamType === 'screen') {
        setRemoteScreens(prev => ({
          ...prev,
          [userId]: stream
        }));
      } else {
        setRemoteStreams(prev => ({
          ...prev,
          [userId]: stream
        }));
      }
    };

    const handleUserLeft = (userId) => {
      console.log(`User left: ${userId}`);
      
      // Clean up streams
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
      
      setRemoteScreens(prev => {
        const newScreens = { ...prev };
        delete newScreens[userId];
        return newScreens;
      });
      
      // Clean up references
      if (remoteVideoRefs.current[userId]) {
        if (remoteVideoRefs.current[userId].srcObject) {
          const tracks = remoteVideoRefs.current[userId].srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }
        remoteVideoRefs.current[userId].srcObject = null;
        delete remoteVideoRefs.current[userId];
      }
      
      if (remoteScreenRefs.current[userId]) {
        if (remoteScreenRefs.current[userId].srcObject) {
          const tracks = remoteScreenRefs.current[userId].srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }
        remoteScreenRefs.current[userId].srcObject = null;
        delete remoteScreenRefs.current[userId];
      }
    };

    // FIXED: Improved initial fetching of remote streams
    const fetchExistingStreams = () => {
      if (typeof getRemoteStreams === 'function') {
        const existingStreams = getRemoteStreams();
        console.log('Fetched existing remote streams:', existingStreams);
        
        if (existingStreams && Object.keys(existingStreams).length > 0) {
          // Process existing streams and separate video from screen sharing
          const videoStreams = {};
          const screenStreams = {};
          
          Object.entries(existingStreams).forEach(([key, stream]) => {
            if (key.includes('screen-')) {
              // Extract the user ID from the key (remove 'screen-' prefix)
              const userId = key.replace('screen-', '');
              screenStreams[userId] = stream;
            } else {
              videoStreams[key] = stream;
            }
          });
          
          if (Object.keys(videoStreams).length > 0) {
            setRemoteStreams(videoStreams);
          }
          
          if (Object.keys(screenStreams).length > 0) {
            setRemoteScreens(screenStreams);
          }
        }
      }
    };

    // Subscribe to events when room is available
    if (currentRoom) {
      console.log(`Setting up event listeners for room: ${currentRoom}`);
      subscribe('user-joined', handleUserJoined);
      subscribe('user-left', handleUserLeft);
      subscribe('remote-stream-ready', handleUserJoined);
      
      // Get any existing streams
      fetchExistingStreams();
    }

    return () => {
      unsubscribe('user-joined', handleUserJoined);
      unsubscribe('user-left', handleUserLeft);
      unsubscribe('remote-stream-ready', handleUserJoined);
    };
  }, [currentRoom, subscribe, unsubscribe, getRemoteStreams]);

  // FIXED: Improved handling of remote video streams
  useEffect(() => {
  console.log('Remote video streams updated:', Object.keys(remoteStreams));
  
  // Process each remote stream
  Object.entries(remoteStreams).forEach(([userId, stream]) => {
    if (!stream) {
      console.warn(`Stream for user ${userId} is null or undefined`);
      return;
    }
    
    // Log and debug
    console.log(`Processing video stream for user ${userId}:`, stream.id, 
                `with ${stream.getTracks().length} tracks:`, 
                stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
    
    // Force create a new video element if none exists to ensure proper rendering
    if (!remoteVideoRefs.current[userId]) {
      remoteVideoRefs.current[userId] = document.createElement('video');
      remoteVideoRefs.current[userId].autoplay = true;
      remoteVideoRefs.current[userId].playsInline = true;
      remoteVideoRefs.current[userId].muted = false; // Ensure audio is unmuted
    }
    
    // Get video element
    const videoEl = remoteVideoRefs.current[userId];
    
    // Only update if stream is new or different
    if (videoEl.srcObject !== stream) {
      console.log(`Setting stream for user ${userId} to video element`);
      
      // Detach any existing stream to prevent memory leaks
      if (videoEl.srcObject) {
        try {
          videoEl.srcObject.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn(`Error stopping tracks: ${e.message}`);
        }
        videoEl.srcObject = null;
      }
      
      // Set the new stream with a small delay to allow browser to process
      setTimeout(() => {
        videoEl.srcObject = stream;
        
        // Ensure playback starts with aggressive retry
        const playWithRetry = (videoElement, retries = 3) => {
          if (retries <= 0) return;
        
          videoElement.play().catch(err => {
            console.warn(`Play attempt failed: ${err.message}`);
            setTimeout(() => playWithRetry(videoElement, retries - 1), 500);
          });
        };
        
        // Use this function when attempting to play the video
        playWithRetry(videoEl);
      }, 50);
    }
  });
}, [remoteStreams]);

  // Handle screen sharing streams
  useEffect(() => {
    console.log('Remote screen streams updated:', Object.keys(remoteScreens));
    
    Object.entries(remoteScreens).forEach(([userId, stream]) => {
      if (!stream) {
        console.warn(`Screen stream for user ${userId} is null or undefined`);
        return;
      }
      
      console.log(`Processing screen stream for ${userId}:`, stream.id, 
                  `with ${stream.getTracks().length} tracks:`, 
                  stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      
      // Always create a fresh video element to avoid stale reference issues
      const screenEl = document.createElement('video');
      screenEl.autoplay = true;
      screenEl.playsInline = true;
      screenEl.muted = false;
      
      // Store the reference
      remoteScreenRefs.current[userId] = screenEl;
      
      // Set the stream and play with retry
      screenEl.srcObject = stream;
      
      // Aggressive play retry for screen sharing
      const playScreenWithRetry = (attempts = 5) => {
        if (attempts <= 0) return;
        
        screenEl.play().then(() => {
          console.log(`Screen share playing for user ${userId}`);
        }).catch(err => {
          console.warn(`Failed to play remote screen for user ${userId}: ${err.message}`);
          setTimeout(() => playScreenWithRetry(attempts - 1), 200);
        });
      };
      
      playScreenWithRetry();
    });
  }, [remoteScreens]);

  // Synchronize isInCall state with videoEnabled prop from parent
  useEffect(() => {
    console.log(`videoEnabled changed: ${videoEnabled}, isInCall: ${isInCall}`);
    
    if (videoEnabled && !isInCall) {
      handleStartCall();
    } 
    else if (!videoEnabled && isInCall) {
      handleEndCall();
    }
  }, [videoEnabled, isInCall]);

  // Start video call
  const handleStartCall = async () => {
    try {
      console.log("Starting video call...");
      const stream = await startVideoCall();
      console.log("Video call started, stream received:", stream);
      
      if (!stream) {
        console.error("Failed to get media stream");
        return;
      }
      
      // Store locally for internal component use
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Direct assignment to parent's videoRef with improved handling
      if (videoRef && videoRef.current) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
          console.log("Stream assigned to parent videoRef");
      
          // Ensure the video plays with retry logic
          const playWithRetry = (retries = 3) => {
            if (retries <= 0) return;
      
            videoRef.current.play().catch(err => {
              console.warn(`Play attempt failed: ${err.message}`);
              setTimeout(() => playWithRetry(retries - 1), 500);
            });
          };
      
          playWithRetry();
        } else {
          console.log("Stream already assigned to parent videoRef");
        }
      }
      setIsInCall(true);
      toggleSocketVideo(true);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  // End video call
  const handleEndCall = () => {
    console.log("Ending video call...");
    stopVideoCall();
    setIsInCall(false);
    toggleSocketVideo(false);
    
    // Clean up local video
    if (localVideoRef.current) {
      if (localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      localVideoRef.current.srcObject = null;
    }
    
    // Clean up parent video ref
    if (videoRef && videoRef.current) {
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      videoRef.current.srcObject = null;
    }
  };

  // Toggle video call based on current state
  const handleToggleVideoCall = () => {
    if (isInCall) {
      handleEndCall();
      toggleVideo(false);
    } else {
      handleStartCall();
      toggleVideo(true);
    }
  };

  // Toggle audio
  const handleToggleAudio = () => {
    toggleAudio(!isAudioEnabled);
    setIsAudioEnabled(!isAudioEnabled);
  };

  // Start screen sharing (teacher only)
  const handleStartScreenShare = async () => {
    try {
      console.log("Starting screen sharing...");
      const stream = await startScreenSharing();
      console.log("Screen sharing started, stream received:", stream);
      
      if (!stream) {
        console.error("Failed to get screen sharing stream");
        return;
      }
      
      // Store locally
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      
      // Improved assignment to parent's ref
      if (screenShareRef && screenShareRef.current) {
        console.log("Parent screenShareRef exists, assigning stream");
        
        // Clear existing stream first
        if (screenShareRef.current.srcObject) {
          screenShareRef.current.srcObject.getTracks().forEach(track => track.stop());
          screenShareRef.current.srcObject = null;
        }
        
        // Set new stream with delay for browser to process
        setTimeout(() => {
          if (screenShareRef.current) {
            screenShareRef.current.srcObject = stream;
            screenShareRef.current.load(); // Force reload
            console.log("Stream assigned to parent screenShareRef");
            
            // Ensure playback with retry
            const playWithRetry = (retries = 3) => {
              if (retries <= 0) return;
              
              screenShareRef.current.play().catch(err => {
                console.warn(`Play attempt ${3-retries+1} failed: ${err.message}`);
                setTimeout(() => playWithRetry(retries - 1), 500);
              });
            };
            
            playWithRetry();
          }
        }, 100);
      }
      
      setIsScreenSharing(true);
      
      // Create a clone of the stream for parent notification
      const streamClone = new MediaStream();
      stream.getVideoTracks().forEach(track => streamClone.addTrack(track));
      
      // Notify parent component
      if (onScreenShareChange) {
        console.log("Notifying parent about screen sharing");
        onScreenShareChange(true, streamClone);
      }
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
    }
  };

  // Handle stopping screen share
  const handleStopScreenShare = () => {
    console.log("Stopping screen sharing...");
    stopScreenSharing();
    
    // Clean up local screen ref
    if (screenVideoRef.current) {
      if (screenVideoRef.current.srcObject) {
        screenVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      screenVideoRef.current.srcObject = null;
    }
    
    // Clean up parent screen ref
    if (screenShareRef && screenShareRef.current) {
      if (screenShareRef.current.srcObject) {
        screenShareRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      screenShareRef.current.srcObject = null;
    }
    
    setIsScreenSharing(false);
    
    // Notify parent
    if (onScreenShareChange) {
      onScreenShareChange(false, null);
    }
  };

  // Approve student's request to enable video
  const approveStudentVideo = (studentId) => {
    console.log(`Approving student ${studentId} for video`);
    setApprovedStudents(prev => [...prev, studentId]);
    setPendingHandRaises(prev => prev.filter(student => student.id !== studentId));
    
    // Emit approval event if socket methods are available
    if (isConnected && currentRoom) {
      // Example: emit('approve-student-video', { studentId, roomId: currentRoom });
    }
  };

  // Deny student's request to enable video
  const denyStudentVideo = (studentId) => {
    console.log(`Denying student ${studentId} for video`);
    setPendingHandRaises(prev => prev.filter(student => student.id !== studentId));
  };

  // Student can check if they're approved to turn on video
  const canStudentEnableVideo = () => {
    return isTeacher || approvedStudents.includes(currentUser?._id);
  };

  // Tooltip handlers
  const handleShowTooltip = (text, e) => {
    setTooltipText(text);
    setShowTooltip(true);
    setTooltipPosition({ 
      x: e.currentTarget.offsetLeft + e.currentTarget.offsetWidth / 2, 
      y: e.currentTarget.offsetTop - 30
    });
  };

  const handleHideTooltip = () => {
    setShowTooltip(false);
  };

  // Render tooltip
  const renderTooltip = () => {
    if (!showTooltip) return null;
    
    return (
      <div 
        className={`absolute z-10 px-2 py-1 text-xs rounded ${
          darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
        }`}
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          transform: 'translate(-50%, -100%)'
        }}
      >
        {tooltipText}
      </div>
    );
  };

  // Render video controls
  const renderVideoControls = () => {
    return (
      <div className={`flex items-center justify-center gap-2 mt-2 relative`}>
        {renderTooltip()}
        
        {/* Audio toggle button */}
        <button
          onClick={handleToggleAudio}
          onMouseEnter={(e) => handleShowTooltip(isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone', e)}
          onMouseLeave={handleHideTooltip}
          className={`p-2 rounded-full ${
            darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        
        {/* Video toggle button */}
        <button
          onClick={handleToggleVideoCall}
          onMouseEnter={(e) => handleShowTooltip(isInCall ? 'End Video Call' : 'Start Video Call', e)}
          onMouseLeave={handleHideTooltip}
          className={`p-2 rounded-full ${
            isInCall 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : `${primaryColor} ${primaryHoverColor} text-white`
          }`}
        >
          {isInCall ? <VideoOff size={20} /> : <VideoIcon size={20} />}
        </button>
        
        {/* Screen sharing button (teacher only) */}
        {isTeacher && (
          <button
            onClick={isScreenSharing ? handleStopScreenShare : handleStartScreenShare}
            onMouseEnter={(e) => handleShowTooltip(isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing', e)}
            onMouseLeave={handleHideTooltip}
            className={`p-2 rounded-full ${
              isScreenSharing 
                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                : `${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`
            }`}
          >
            {isScreenSharing ? <StopCircle size={20} /> : <Monitor size={20} />}
          </button>
        )}
      </div>
    );
  };

  // Render hand raises for teacher approval
  const renderHandRaises = () => {
    if (!isTeacher || pendingHandRaises.length === 0) return null;
    
    return (
      <div className={`mt-3 p-2 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-100'}`}>
        <h4 className="text-sm font-medium mb-2">Hand Raises</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {pendingHandRaises.map(student => (
            <div 
              key={student._id || student.id}
              className={`p-2 flex items-center justify-between rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-white'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${primaryColor} text-white mr-2`}>
                  {student.name.substring(0, 1)}
                </div>
                <span className="text-sm">{student.name}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => approveStudentVideo(student.id)}
                  onMouseEnter={(e) => handleShowTooltip('Approve Request', e)}
                  onMouseLeave={handleHideTooltip}
                  className="p-1 rounded-full bg-green-500 hover:bg-green-600 text-white"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  onClick={() => denyStudentVideo(student.id)}
                  onMouseEnter={(e) => handleShowTooltip('Deny Request', e)}
                  onMouseLeave={handleHideTooltip}
                  className="p-1 rounded-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // FIXED: Improved rendering of remote videos with better ref management
  const renderRemoteVideos = () => {
    const videoStreamKeys = Object.keys(remoteStreams);
    const screenStreamKeys = Object.keys(remoteScreens);
    
    if (videoStreamKeys.length === 0 && screenStreamKeys.length === 0) {
      return (
        <div
          className={`mt-2 p-2 text-center rounded ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}
        >
          No remote participants
        </div>
      );
    }
    
    return (
      <div className="mt-2">
        {/* Show screen share first if available */}
        {screenStreamKeys.length > 0 && (
          <div className="mb-4">
            <h4
              className={`text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Screen Sharing
            </h4>
            <div className="flex flex-col gap-2">
              {screenStreamKeys.map((userId) => {
                const stream = remoteScreens[userId];
                console.log(`Rendering screen for ${userId} with ${stream ? stream.getTracks().length : 0} tracks`);
                
                // Generate a stable key for this element
                const streamKey = `screen-${userId}-${stream ? stream.id : 'no-stream'}`;
                
                return (
                  <div
                    key={streamKey}
                    className={`w-full h-48 relative overflow-hidden rounded-lg ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-200'
                    }`}
                  >
                    {/* Use a stable key here to prevent React from reusing element */}
                    <video
                      key={streamKey}
                      ref={(el) => {
                        if (el) {
                          // Always ensure this element receives the stream
                          if (stream && el.srcObject !== stream) {
                            console.log(`Setting screen stream for ${userId} to video element`);
                            el.srcObject = stream;
                            
                            // Try to play with improved retry logic
                            const attemptPlay = () => {
                              el.play().catch(err => {
                                console.warn(`Play failed for screen ${userId}: ${err.message}`);
                                
                                // Try again after a short delay
                                setTimeout(attemptPlay, 300);
                              });
                            };
                            
                            // Start playback attempt
                            attemptPlay();
                          }
                          
                          // Update our reference to this DOM element
                          remoteScreenRefs.current[userId] = el;
                        }
                      }}
                      className="w-full h-full object-contain"
                      autoPlay
                      playsInline
                    />
                    <div
                      className={`absolute bottom-0 left-0 right-0 px-2 py-1 text-xs ${
                        darkMode
                          ? 'bg-gray-900 bg-opacity-70 text-white'
                          : 'bg-white bg-opacity-70 text-gray-800'
                      }`}
                    >
                      Screen Share: {userId.substring(0, 6)}...
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Render participant videos */}
        {videoStreamKeys.length > 0 && (
          <>
            <h4
              className={`text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Remote Participants ({videoStreamKeys.length})
            </h4>
            <div className="flex gap-2 flex-wrap">
              {videoStreamKeys.map((userId) => {
                const stream = remoteStreams[userId];
                console.log(`Rendering video for ${userId} with ${stream ? stream.getTracks().length : 0} tracks`);
                
                // Generate a stable key for this element
                const streamKey = `video-${userId}-${stream ? stream.id : 'no-stream'}`;
                
                return (
                  <div
                    key={streamKey}
                    className={`w-32 h-24 relative overflow-hidden rounded-lg ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-200'
                    }`}
                  >
                    <video
                      key={streamKey}
                      ref={(el) => {
                        if (el) {
                          // Always ensure this element receives the stream
                          if (stream && el.srcObject !== stream) {
                            console.log(`Setting video stream for ${userId} to video element`);
                            el.srcObject = stream;
                            
                            // Try to play with improved retry logic
                            const attemptPlay = () => {
                              el.play().catch(err => {
                                console.warn(`Play failed for video ${userId}: ${err.message}`);
                                
                                // Try again after a short delay
                                setTimeout(attemptPlay, 300);
                              });
                            };
                            
                            // Start playback attempt
                            attemptPlay();
                          }
                          
                          // Update our reference
                          remoteVideoRefs.current[userId] = el;
                        }
                      }}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                    />
                    <div
                      className={`absolute bottom-0 left-0 right-0 px-1 py-0.5 text-xs text-center ${
                        darkMode
                          ? 'bg-gray-900 bg-opacity-70 text-white'
                          : 'bg-white bg-opacity-70 text-gray-800'
                      }`}
                    >
                      {userId.substring(0, 6)}...
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {/* Debug info displayed when we know we have streams but they're not visible */}
        {(videoStreamKeys.length === 0 && screenStreamKeys.length === 0 && 
          (Object.keys(remoteStreamsDebug.current).length > 0 || 
          Object.keys(peerConnections.current).length > 0)) && (
          <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
            <p className="text-sm">
              Connections established but no video visible. 
              Tracks received: {Object.entries(remoteStreamsDebug.current).map(([id, stream]) => (
                ` ${id} (${stream.getTracks().map((t) => t.kind).join(', ')})`
              ))}
              <br/>
              Peer connections: {Array.from(peerConnections.current.keys()).join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Main component render
  return (
    <div className="flex flex-col">
      {/* Status info */}
      <div 
        className={`px-2 py-1 text-xs mb-2 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
      >
        Video State: {isInCall ? 'Active' : 'Inactive'} • 
        Parent State: {videoEnabled ? 'Enabled' : 'Disabled'}
        {isScreenSharing && ' • Screen Sharing: Active'}
        {Object.keys(remoteStreams).length > 0 && ` • Remote Participants: ${Object.keys(remoteStreams).length}`}
        {Object.keys(remoteScreens).length > 0 && ` • Remote Screens: ${Object.keys(remoteScreens).length}`}
      </div>
      
      {/* Video controls */}
      {renderVideoControls()}
      
      {/* Hand raises approval (for teachers) */}
      {renderHandRaises()}
      
      {/* Remote videos display */}
      {renderRemoteVideos()}
      
      {/* Hidden elements for internal use */}
      <div className="hidden">
        <video ref={localVideoRef} autoPlay playsInline muted />
        <video ref={screenVideoRef} autoPlay playsInline />
      </div>
    </div>
  );
});

// Add display name for better debugging
VideoCall.displayName = 'VideoCall';

export default VideoCall;