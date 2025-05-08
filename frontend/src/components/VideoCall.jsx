// Modified VideoCall component with React.forwardRef
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { 
  Video as VideoIcon, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  StopCircle, 
  Users, 
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
    unsubscribe
  } = useSocket();

  // State management
  const [isInCall, setIsInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [pendingHandRaises, setPendingHandRaises] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [tooltipText, setTooltipText] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [streamDebugInfo, setStreamDebugInfo] = useState({
    hasVideoStream: false,
    hasScreenStream: false,
    videoTracks: 0,
    screenTracks: 0
  });

  // References for media elements
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  
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
  }, [classSession, isConnected]);

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

  // Subscribe to video streams of users in the room
  useEffect(() => {
    const handleUserJoined = (userId, stream) => {
      console.log(`User joined: ${userId} with stream`, stream);
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: stream
      }));
    };

    const handleUserLeft = (userId) => {
      console.log(`User left: ${userId}`);
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
    };

    if (currentRoom) {
      console.log(`Setting up event listeners for room: ${currentRoom}`);
      subscribe('user-joined', handleUserJoined);
      subscribe('user-left', handleUserLeft);
    }

    return () => {
      unsubscribe('user-joined', handleUserJoined);
      unsubscribe('user-left', handleUserLeft);
    };
  }, [currentRoom, subscribe, unsubscribe]);

  // Update video elements when remote streams change
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      if (remoteVideoRefs.current[userId] && stream) {
        console.log(`Assigning stream for user ${userId} to video element`);
        remoteVideoRefs.current[userId].srcObject = stream;
        
        // Ensure the video plays
        remoteVideoRefs.current[userId].play().catch(err => {
          console.warn(`Failed to play remote video: ${err.message}`);
        });
      }
    });
  }, [remoteStreams]);

  // Synchronize isInCall state with videoEnabled prop from parent
  useEffect(() => {
    console.log(`videoEnabled changed: ${videoEnabled}, isInCall: ${isInCall}`);
    
    // If the parent component enables video but we're not in a call
    if (videoEnabled && !isInCall) {
      // Start a video call to match the parent state
      handleStartCall();
    } 
    // If the parent component disables video but we're in a call
    else if (!videoEnabled && isInCall) {
      // End the call to match the parent state
      handleEndCall();
    }
  }, [videoEnabled]);

  // Start video call
  const handleStartCall = async () => {
    try {
      console.log("Starting video call...");
      const stream = await startVideoCall();
      console.log("Video call started, stream received:", stream);
      
      // Update debug info
      setStreamDebugInfo(prev => ({
        ...prev,
        hasVideoStream: !!stream,
        videoTracks: stream ? stream.getVideoTracks().length : 0
      }));
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("Stream assigned to localVideoRef");
        
        // Ensure the video plays
        localVideoRef.current.play().catch(err => {
          console.warn(`Failed to play local video: ${err.message}`);
        });
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
      // We don't call toggleVideo here because the parent already controls this
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  // End video call
  const handleEndCall = () => {
    console.log("Ending video call...");
    stopVideoCall();
    setIsInCall(false);
    
    // Update debug info
    setStreamDebugInfo(prev => ({
      ...prev,
      hasVideoStream: false,
      videoTracks: 0
    }));
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (videoRef && videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Don't call toggleVideo here, let the parent handle it
  };

  // Toggle video call based on current state
  const handleToggleVideoCall = () => {
    if (isInCall) {
      handleEndCall();
      toggleVideo(false); // Update parent's state
    } else {
      handleStartCall();
      toggleVideo(true); // Update parent's state
    }
  };

  // Toggle audio
  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  // Start screen sharing (teacher only)
 // Start screen sharing (teacher only)
const handleStartScreenShare = async () => {
  try {
    console.log("Starting screen sharing...");
    const stream = await startScreenSharing();
    console.log("Screen sharing started, stream received:", stream);
    
    // Update debug info
    setStreamDebugInfo(prev => ({
      ...prev,
      hasScreenStream: !!stream,
      screenTracks: stream ? stream.getVideoTracks().length : 0
    }));
    
    // First check if parent's ref exists and is assigned to a DOM element
    if (screenShareRef && screenShareRef.current) {
      screenShareRef.current.srcObject = stream;
      console.log("Stream assigned to parent screenShareRef");
      
      // Try to force play with a small delay to ensure DOM is ready
      setTimeout(() => {
        if (screenShareRef.current) {
          screenShareRef.current.play().catch(err => {
            console.warn(`Failed to play screen share video: ${err.message}`);
          });
        }
      }, 100);
    } else {
      console.warn("No screenShareRef provided from parent component or ref.current is null");
      
      // Even if parent ref doesn't work, still continue with local ref as fallback
      console.log("Falling back to local screen video reference");
    }
    
    // Also keep a local reference 
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = stream;
      console.log("Stream assigned to local screenVideoRef");
    }
    
    setIsScreenSharing(true);
    
    // Notify parent component about screen sharing state AND pass the stream
    // Even if the ref didn't work, the parent can still use this stream
    if (onScreenShareChange) {
      console.log("Notifying parent component about screen sharing with stream");
      onScreenShareChange(true, stream);  // Pass the stream to parent
    }
  } catch (error) {
    console.error('Failed to start screen sharing:', error);
  }
};
  
  // Handle stopping screen share
  const handleStopScreenShare = () => {
    console.log("Stopping screen sharing...");
    stopScreenSharing();
    
    // Update debug info
    setStreamDebugInfo(prev => ({
      ...prev,
      hasScreenStream: false,
      screenTracks: 0
    }));
    
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    
    // Clear parent's ref if available
    if (screenShareRef && screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }
    
    setIsScreenSharing(false);
    
    // Notify parent component about screen sharing state with null stream
    if (onScreenShareChange) {
      onScreenShareChange(false, null);
    }
  };

  // Approve student's request to enable video
  const approveStudentVideo = (studentId) => {
    console.log(`Approving student ${studentId} for video`);
    // In a real implementation, you would emit an event to allow the student
    setApprovedStudents(prev => [...prev, studentId]);
    
    // Remove from pending list
    setPendingHandRaises(prev => prev.filter(student => student.id !== studentId));
    
    // Emit socket event to notify the student they can turn on video
    // socket.emit('approve-student-video', { studentId, roomId: currentRoom });
  };

  // Deny student's request to enable video
  const denyStudentVideo = (studentId) => {
    console.log(`Denying student ${studentId} for video`);
    // Remove from pending list
    setPendingHandRaises(prev => prev.filter(student => student.id !== studentId));
    
    // Emit socket event to notify the student their request was denied
    // socket.emit('deny-student-video', { studentId, roomId: currentRoom });
  };

  // Student can check if they're approved to turn on video
  const canStudentEnableVideo = () => {
    return isTeacher || approvedStudents.includes(currentUser?._id);
  };

  // Handle tooltip visibility
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

  // Render debug info panel
  const renderDebugInfo = () => {
    return (
      <div className={`mt-2 text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
        <div>Video: {streamDebugInfo.hasVideoStream ? 'Yes' : 'No'} ({streamDebugInfo.videoTracks} tracks)</div>
        <div>Screen: {streamDebugInfo.hasScreenStream ? 'Yes' : 'No'} ({streamDebugInfo.screenTracks} tracks)</div>
        <div>Room: {currentRoom || 'None'} • Users: {Object.keys(remoteStreams).length}</div>
      </div>
    );
  };

  // Main component render
  return (
    <div className="flex flex-col">
      {/* Status Debug Info */}
      <div 
        className={`px-2 py-1 text-xs mb-2 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
      >
        Video State: {isInCall ? 'Active' : 'Inactive'} • 
        Parent State: {videoEnabled ? 'Enabled' : 'Disabled'}
        {isScreenSharing && ' • Screen Sharing: Active'}
      </div>
      
      {/* Video controls */}
      {renderVideoControls()}
      
      {/* Debug Info - Useful for troubleshooting */}
      {renderDebugInfo()}
      
      {/* Hand raises approval (for teachers) */}
      {renderHandRaises()}
      
      {/* Hidden elements for internal use - Modified to be visible for debug purposes */}
      <div className={`mt-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} p-2 rounded-lg`}>
        <p className="text-xs mb-1">Debug Video Elements:</p>
        <div className="flex gap-2">
          <div className="w-20 h-20 bg-black bg-opacity-20 rounded">
            <video 
              ref={localVideoRef} 
              className="w-full h-full object-cover" 
              autoPlay 
              playsInline 
              muted 
            />
            <p className="text-xs text-center">Local</p>
          </div>
          <div className="w-20 h-20 bg-black bg-opacity-20 rounded">
            <video 
              ref={screenVideoRef} 
              className="w-full h-full object-contain" 
              autoPlay 
              playsInline 
            />
            <p className="text-xs text-center">Screen</p>
          </div>
        </div>
      </div>
      
      {/* Container for remote video elements */}
      <div className="mt-2">
        {Object.keys(remoteStreams).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.keys(remoteStreams).map(userId => (
              <div key={userId} className="w-20 h-20 bg-black bg-opacity-20 rounded">
                <video
                  ref={el => remoteVideoRefs.current[userId] = el}
                  className="w-full h-full object-cover" 
                  autoPlay
                  playsInline
                />
                <p className="text-xs text-center">{userId.substring(0, 4)}...</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// Add display name for better debugging
VideoCall.displayName = 'VideoCall';

export default VideoCall;