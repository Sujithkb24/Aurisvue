// Improved VideoCall component with fixed remote track rendering
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
    getRemoteStreams // Function to get remote streams from context
  } = useSocket();

  // State management
  const [isInCall, setIsInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [remoteScreens, setRemoteScreens] = useState({});  // Add separate state for screen sharing
  const [pendingHandRaises, setPendingHandRaises] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [tooltipText, setTooltipText] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // References for media elements
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const remoteScreenRefs = useRef({});  // Add separate refs for screen sharing

  // Add debug reference to track all remote streams
  const remoteStreamsDebug = useRef({});
  useEffect(() => {
    const existingStreams = getRemoteStreams();
    console.log('Fetched existing remote streams:', existingStreams);
  
    if (existingStreams && Object.keys(existingStreams).length > 0) {
      setRemoteStreams(existingStreams); // Remove this line
    }
  }, [getRemoteStreams]);
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
      
      // Filter out students who are already approved
      const newPendingStudents = handRaisedStudents.filter(
        student => !approvedStudents.includes(student.id)
      );
      
      setPendingHandRaises(newPendingStudents);
    }
  }, [activeStudents, isTeacher, approvedStudents]);

  // IMPORTANT: Improved handler for remote streams from SocketContext
  useEffect(() => {
    const handleUserJoined = (userId, stream, streamType = 'video') => {
      console.log(`User joined: ${userId} with ${streamType} stream:`, stream);
      
      if (!stream) {
        console.warn(`Received null or undefined stream for user ${userId}`);
        return;
      }
      
      // Debug logging
      console.log(`Tracks in stream:`, stream.getTracks().map(t => t.kind));
      
      // Store this stream in our debug reference
      remoteStreamsDebug.current[`${userId}-${streamType}`] = stream;
      
      // Decide which state to update based on stream type
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
      
      // Remove from both states
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
      
      // Clean up the references
      if (remoteVideoRefs.current[userId]) {
        if (remoteVideoRefs.current[userId].srcObject) {
          remoteVideoRefs.current[userId].srcObject.getTracks().forEach(track => track.stop());
        }
        remoteVideoRefs.current[userId].srcObject = null;
        delete remoteVideoRefs.current[userId];
      }
      
      if (remoteScreenRefs.current[userId]) {
        if (remoteScreenRefs.current[userId].srcObject) {
          remoteScreenRefs.current[userId].srcObject.getTracks().forEach(track => track.stop());
        }
        remoteScreenRefs.current[userId].srcObject = null;
        delete remoteScreenRefs.current[userId];
      }
    };

    // Initial fetch of existing remote streams from context
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
      subscribe('remote-stream-ready', handleUserJoined); // Add this if your socket context emits this event
      
      // Get any existing streams
      fetchExistingStreams();
    }

    return () => {
      unsubscribe('user-joined', handleUserJoined);
      unsubscribe('user-left', handleUserLeft);
      unsubscribe('remote-stream-ready', handleUserJoined);
    };
  }, [currentRoom, subscribe, unsubscribe, getRemoteStreams]);

 

  // Separately handle screen sharing streams
  useEffect(() => {
    console.log('Remote screen streams updated:', Object.keys(remoteScreens));
    
    Object.entries(remoteScreens).forEach(([userId, stream]) => {
      if (!stream) {
        console.warn(`Screen stream for user ${userId} is null or undefined`);
        return;
      }
      
      // Get existing screen element or create one if it doesn't exist
      let screenElement = remoteScreenRefs.current[userId];
      
      if (!screenElement) {
        console.log(`Creating new screen element for user ${userId}`);
        screenElement = document.createElement('video');
        screenElement.autoplay = true;
        screenElement.playsInline = true;
        remoteScreenRefs.current[userId] = screenElement;
      }
      
      // Only update srcObject if it's different
      if (screenElement.srcObject !== stream) {
        console.log(`Assigning screen stream for user ${userId}`, stream);
        screenElement.srcObject = stream;
        
        // Ensure the video plays
        screenElement.play().catch(err => {
          console.warn(`Failed to play remote screen for user ${userId}: ${err.message}`);
        });
      }
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
      
      // Store locally for internal component use
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Direct assignment to parent's videoRef
      if (videoRef && videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log("Stream assigned to parent videoRef");
        
        // Ensure the video plays
        videoRef.current.play().catch(err => {
          console.warn(`Failed to play parent video: ${err.message}`);
        });
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
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (videoRef && videoRef.current) {
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
      
      // Store locally
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      
      // Then assign to parent's ref with improved handling
      if (screenShareRef && screenShareRef.current) {
        console.log("Parent screenShareRef exists, assigning stream");
        
        // A direct approach first - clear then set
        screenShareRef.current.srcObject = null;
        
        // Wait a moment for the browser to process
        setTimeout(() => {
          if (screenShareRef.current) {
            screenShareRef.current.srcObject = stream;
            console.log("Stream assigned to parent screenShareRef");
            
            // Force play with small delay
            setTimeout(() => {
              if (screenShareRef.current) {
                screenShareRef.current.play().catch(err => {
                  console.warn(`Failed to play screen share: ${err.message}`);
                  
                  // If autoplay fails, try again with user interaction
                  if (screenShareRef.current) {
                    const playPromise = screenShareRef.current.play();
                    if (playPromise !== undefined) {
                      playPromise.catch(e => {
                        console.log('Play prevented, waiting for user interaction');
                      });
                    }
                  }
                });
              }
            }, 100);
          }
        }, 100);
      }
      
      setIsScreenSharing(true);
      
      // Create a clone of the stream
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
    
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    
    if (screenShareRef && screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }
    
    setIsScreenSharing(false);
    
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

  // Improved remote video rendering with direct DOM refs and better visual feedback
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
            {screenStreamKeys.map((userId) => (
              <div
                key={`screen-${userId}`}
                className={`w-full h-48 relative overflow-hidden rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-200'
                }`}
              >
                <video
                  key={`screen-video-${userId}`}
                  ref={(el) => {
                    if (el) {
                      remoteScreenRefs.current[userId] = el;
                      const stream = remoteScreens[userId];
                      if (stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.play().catch((err) => {
                          console.warn(
                            `Failed to play screen share for ${userId}: ${err.message}`
                          );
                        });
                      }
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
            ))}
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
            {videoStreamKeys.map((userId) => (
              <div
                key={`video-${userId}`}
                className={`w-32 h-24 relative overflow-hidden rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-200'
                }`}
              >
                <video
                  key={`participant-video-${userId}`}
                  ref={(el) => {
                    if (el) {
                      remoteVideoRefs.current[userId] = el;
                      const stream = remoteStreams[userId];
                      if (stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.play().catch((err) => {
                          console.warn(
                            `Failed to play remote video for ${userId}: ${err.message}`
                          );
                        });
                      }
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
            ))}
          </div>
        </>
      )}

      {/* Debug information when no videos are visible but connections exist */}
      {videoStreamKeys.length === 0 &&
        screenStreamKeys.length === 0 &&
        Object.keys(remoteStreamsDebug.current).length > 0 && (
          <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
            <p className="text-sm">
              Connection established but no video visible. Tracks received:
              {Object.entries(remoteStreamsDebug.current).map(([id, stream]) => (
                ` ${id} (${stream
                  .getTracks()
                  .map((t) => t.kind)
                  .join(', ')})`
              ))}
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