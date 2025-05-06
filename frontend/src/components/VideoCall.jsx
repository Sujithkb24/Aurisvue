import React, { useState, useEffect, useRef } from 'react';
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

const VideoCall = ({ 
  isTeacher, 
  handRaised, 
  videoEnabled, 
  darkMode, 
  primaryColor, 
  primaryHoverColor,
  classSession,
  videoRef,
  toggleVideo,
  activeStudents
}) => {
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

  // References for media elements
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  
  // Auto-join room when class session is available
  useEffect(() => {
    if (classSession && isConnected && classSession.id) {
      joinRoom(classSession.id);
    }
    
    return () => {
      if (classSession && classSession.id) {
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
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: stream
      }));
    };

    const handleUserLeft = (userId) => {
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
    };

    if (currentRoom) {
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
        remoteVideoRefs.current[userId].srcObject = stream;
      }
    });
  }, [remoteStreams]);

  // Start video call
  const handleStartCall = async () => {
    try {
      const stream = await startVideoCall();
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      if (videoRef && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsInCall(true);
      toggleVideo(true);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  // End video call
  const handleEndCall = () => {
    stopVideoCall();
    setIsInCall(false);
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (videoRef && videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    toggleVideo(false);
  };

  // Toggle audio
  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  // Start screen sharing (teacher only)
  const handleStartScreenShare = async () => {
    try {
      const stream = await startScreenSharing();
      
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      
      setIsScreenSharing(true);
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
    }
  };

  // Stop screen sharing
  const handleStopScreenShare = () => {
    stopScreenSharing();
    
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    
    setIsScreenSharing(false);
  };

  // Approve student's request to enable video
  const approveStudentVideo = (studentId) => {
    // In a real implementation, you would emit an event to allow the student
    setApprovedStudents(prev => [...prev, studentId]);
    
    // Remove from pending list
    setPendingHandRaises(prev => prev.filter(student => student.id !== studentId));
    
    // Emit socket event to notify the student they can turn on video
    // socket.emit('approve-student-video', { studentId, roomId: currentRoom });
  };

  // Deny student's request to enable video
  const denyStudentVideo = (studentId) => {
    // Remove from pending list
    setPendingHandRaises(prev => prev.filter(student => student.id !== studentId));
    
    // Emit socket event to notify the student their request was denied
    // socket.emit('deny-student-video', { studentId, roomId: currentRoom });
  };

  // Student can check if they're approved to turn on video
  const canStudentEnableVideo = () => {
    return isTeacher || approvedStudents.includes(currentUser?.id);
  };

  // Render video controls
  const renderVideoControls = () => {
    return (
      <div className={`flex items-center justify-center gap-2 mt-2`}>
        {/* Audio toggle button */}
        <button
          onClick={handleToggleAudio}
          className={`p-2 rounded-full ${
            darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        
        {/* Video toggle button */}
        <button
          onClick={isInCall ? handleEndCall : handleStartCall}
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
              key={student.id}
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
                  className="p-1 rounded-full bg-green-500 hover:bg-green-600 text-white"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  onClick={() => denyStudentVideo(student.id)}
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

  // Main component render
  return (
    <div className="flex flex-col">
      {/* Main video display remains the same as in your original component */}
      {isTeacher && isScreenSharing && (
        <div className={`mt-2 p-2 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-100'}`}>
          <h4 className="text-sm font-medium mb-1">Screen Share</h4>
          <div className="relative aspect-video bg-black bg-opacity-30 rounded-lg overflow-hidden">
            <video 
              ref={screenVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
      
      {/* Video controls */}
      {renderVideoControls()}
      
      {/* Hand raises approval (for teachers) */}
      {renderHandRaises()}
      
      {/* Hidden elements for internal use */}
      <video ref={localVideoRef} className="hidden" autoPlay playsInline muted />
      
      {/* Container for remote video elements */}
      <div className="hidden">
        {Object.keys(remoteStreams).map(userId => (
          <video
            key={userId}
            ref={el => remoteVideoRefs.current[userId] = el}
            autoPlay
            playsInline
          />
        ))}
      </div>
    </div>
  );
};

export default VideoCall;