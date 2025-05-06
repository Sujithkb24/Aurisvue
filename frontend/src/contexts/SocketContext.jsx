import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

// Create the context
const SocketContext = createContext();

// Socket Provider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [islResponse, setIslResponse] = useState(null);
  const { currentUser, getToken } = useAuth();
  
  // WebRTC related state
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const peerConnections = useRef(new Map());
  const localStream = useRef(null);
  const screenStream = useRef(null);
  
  useEffect(() => {
    // Only attempt to connect socket if user is authenticated
    if (!currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const initializeSocket = async () => {
      try {
        const token = await getToken();
        
        // Create socket connection with auth token
        const socketInstance = io(import.meta.env.VITE_BACKEND_URL, {
          auth: {
            token
          },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        // Socket event handlers
        socketInstance.on('connect', () => {
          console.log('Socket connected');
          setIsConnected(true);
          setConnectionError(null);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          setIsConnected(false);
          
          // Clean up WebRTC on disconnect
          if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
            localStream.current = null;
          }
          
          if (screenStream.current) {
            screenStream.current.getTracks().forEach(track => track.stop());
            screenStream.current = null;
          }
          
          closePeerConnections();
          setRoomUsers([]);
          setCurrentRoom(null);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setConnectionError(error.message);
          setIsConnected(false);
        });

        socketInstance.on('error', (error) => {
          console.error('Socket error:', error);
          setConnectionError(error.message);
        });

        // Set up listener for ISL responses
        socketInstance.on('isl_response', (data) => {
          console.log('Received ISL response:', data);
          setIslResponse(data);
        });
        
        // WebRTC related listeners
        setupWebRTCListeners(socketInstance);

        // Store socket in state
        setSocket(socketInstance);

        // Clean up on unmount
        return () => {
          if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
          }
          
          if (screenStream.current) {
            screenStream.current.getTracks().forEach(track => track.stop());
          }
          
          closePeerConnections();
          socketInstance.disconnect();
          setSocket(null);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
        setConnectionError(error.message);
      }
    };

    // Initialize socket connection
    initializeSocket();

  }, [currentUser, getToken]);
  
  // Setup WebRTC listeners
  const setupWebRTCListeners = (socketInstance) => {
    // Get existing users when joining a room
    socketInstance.on('room_users', ({ users }) => {
      console.log('Room users:', users);
      setRoomUsers(users);
    });
    
    // Handle new user joining
    socketInstance.on('user_joined', ({ userId }) => {
      console.log('User joined:', userId);
      // Add user to roomUsers state
      setRoomUsers(prev => [...prev, userId]);
    });
    
    // Handle user leaving
    socketInstance.on('user_left', ({ userId }) => {
      console.log('User left:', userId);
      // Remove user from roomUsers state
      setRoomUsers(prev => prev.filter(id => id !== userId));
      
      // Close peer connection
      if (peerConnections.current.has(userId)) {
        peerConnections.current.get(userId).close();
        peerConnections.current.delete(userId);
      }
    });
    
    // Handle incoming video call offer
    socketInstance.on('video_offer', async ({ offer, sender }) => {
      console.log('Received video offer from:', sender);
      await handleVideoOffer(offer, sender, socketInstance);
    });
    
    // Handle incoming video call answer
    socketInstance.on('video_answer', ({ answer, sender }) => {
      console.log('Received video answer from:', sender);
      handleVideoAnswer(answer, sender);
    });
    
    // Handle incoming screen sharing offer
    socketInstance.on('screen_offer', async ({ offer, sender }) => {
      console.log('Received screen sharing offer from:', sender);
      await handleScreenOffer(offer, sender, socketInstance);
    });
    
    // Handle incoming screen sharing answer
    socketInstance.on('screen_answer', ({ answer, sender }) => {
      console.log('Received screen sharing answer from:', sender);
      handleScreenAnswer(answer, sender);
    });
    
    // Handle ICE candidate
    socketInstance.on('ice_candidate', ({ candidate, sender }) => {
      console.log('Received ICE candidate from:', sender);
      handleIceCandidate(candidate, sender);
    });
    
    // Handle media toggle events
    socketInstance.on('user_toggle_media', ({ userId, type, enabled }) => {
      console.log(`User ${userId} ${type} is now ${enabled ? 'enabled' : 'disabled'}`);
      // This can be used to update UI showing muted/video off states
    });
  };
  
  // Send speech transcript to the server
  const sendSpeechTranscript = useCallback((text) => {
    if (socket && isConnected) {
      socket.emit('speech_transcript', { text, timestamp: Date.now() });
    }
  }, [socket, isConnected]);

  // Reset ISL response
  const resetIslResponse = useCallback(() => {
    setIslResponse(null);
  }, []);

  // Reconnect function
  const reconnect = async () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    } else if (currentUser) {
      const token = await getToken();
      const socketInstance = io(import.meta.env.VITE_BACKEND_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      });
      setSocket(socketInstance);
    }
  };

  // Join a specific room
  const joinRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('join_room', roomId);
      setCurrentRoom(roomId);
    }
  };

  // Leave a specific room
  const leaveRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('leave_room', roomId);
      setCurrentRoom(null);
      setRoomUsers([]);
      
      // Close all peer connections
      closePeerConnections();
      
      // Stop local streams
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
        localStream.current = null;
      }
      
      if (screenStream.current) {
        screenStream.current.getTracks().forEach(track => track.stop());
        screenStream.current = null;
      }
    }
  };
  
  // Close all peer connections
  const closePeerConnections = () => {
    peerConnections.current.forEach((pc) => {
      pc.close();
    });
    peerConnections.current.clear();
  };

  // Subscribe to an event
  const subscribe = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  // Unsubscribe from an event
  const unsubscribe = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  // Emit an event
  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };
  
  // Create a peer connection
  const createPeerConnection = (userId) => {
    try {
      // ICE servers configuration (STUN/TURN)
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          // Add TURN servers here if needed
        ]
      };
      
      const pc = new RTCPeerConnection(configuration);
      
      // Add local tracks to peer connection
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => {
          pc.addTrack(track, localStream.current);
        });
      }
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            candidate: event.candidate,
            roomId: currentRoom,
            target: userId
          });
        }
      };
      
      // Log state changes
      pc.onconnectionstatechange = () => {
        console.log(`Connection state for ${userId}: ${pc.connectionState}`);
      };
      
      // Store the peer connection
      peerConnections.current.set(userId, pc);
      
      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      return null;
    }
  };
  
  // Handle incoming video offer
  const handleVideoOffer = async (offer, sender, socketInstance) => {
    try {
      // Get or create peer connection
      let pc = peerConnections.current.get(sender);
      if (!pc) {
        pc = createPeerConnection(sender);
      }
      
      // If no local stream exists, get user media
      if (!localStream.current) {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
      }
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer
      socketInstance.emit('video_answer', {
        answer,
        roomId: currentRoom,
        target: sender
      });
    } catch (error) {
      console.error('Error handling video offer:', error);
    }
  };
  
  // Handle incoming video answer
  const handleVideoAnswer = async (answer, sender) => {
    try {
      const pc = peerConnections.current.get(sender);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling video answer:', error);
    }
  };
  
  // Handle incoming screen sharing offer
  const handleScreenOffer = async (offer, sender, socketInstance) => {
    try {
      // Create a new peer connection for screen sharing
      let pc = peerConnections.current.get(`screen-${sender}`);
      if (!pc) {
        pc = createPeerConnection(`screen-${sender}`);
      }
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer
      socketInstance.emit('screen_answer', {
        answer,
        roomId: currentRoom,
        target: sender
      });
    } catch (error) {
      console.error('Error handling screen offer:', error);
    }
  };
  
  // Handle incoming screen sharing answer
  const handleScreenAnswer = async (answer, sender) => {
    try {
      const pc = peerConnections.current.get(`screen-${sender}`);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling screen answer:', error);
    }
  };
  
  // Handle ICE candidate
  const handleIceCandidate = (candidate, sender) => {
    try {
      // Check if it's a screen sharing connection
      const isScreenConnection = sender.startsWith('screen-');
      const connectionId = isScreenConnection ? sender : sender;
      
      const pc = peerConnections.current.get(connectionId);
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };
  
  // Start video call
  const startVideoCall = async () => {
    try {
      if (!currentRoom) {
        throw new Error('Must join a room before starting a call');
      }
      
      // Get user media
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      // Create peer connections for each user in the room
      for (const userId of roomUsers) {
        const pc = createPeerConnection(userId);
        
        // Create offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        
        // Send offer to remote peer
        socket.emit('video_offer', {
          offer,
          roomId: currentRoom,
          target: userId
        });
      }
      
      return localStream.current;
    } catch (error) {
      console.error('Error starting video call:', error);
      throw error;
    }
  };
  
  // Start screen sharing
  const startScreenSharing = async () => {
    try {
      if (!currentRoom) {
        throw new Error('Must join a room before sharing screen');
      }
      
      // Get screen sharing media
      screenStream.current = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Create peer connections for screen sharing
      for (const userId of roomUsers) {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        });
        
        // Add screen tracks to the connection
        screenStream.current.getTracks().forEach(track => {
          pc.addTrack(track, screenStream.current);
        });
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice_candidate', {
              candidate: event.candidate,
              roomId: currentRoom,
              target: userId
            });
          }
        };
        
        // Store peer connection
        peerConnections.current.set(`screen-${userId}`, pc);
        
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Send offer to remote peer
        socket.emit('screen_offer', {
          offer,
          roomId: currentRoom,
          target: userId
        });
      }
      
      // Handle the end of screen sharing
      screenStream.current.getVideoTracks()[0].onended = () => {
        stopScreenSharing();
      };
      
      return screenStream.current;
    } catch (error) {
      console.error('Error starting screen sharing:', error);
      throw error;
    }
  };
  
  // Stop video call
  const stopVideoCall = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    
    // Close video call peer connections
    roomUsers.forEach(userId => {
      if (peerConnections.current.has(userId)) {
        peerConnections.current.get(userId).close();
        peerConnections.current.delete(userId);
      }
    });
    
    // Notify other users
    if (socket && currentRoom) {
      socket.emit('toggle_media', {
        type: 'video',
        enabled: false,
        roomId: currentRoom
      });
    }
  };
  
  // Stop screen sharing
  const stopScreenSharing = () => {
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    
    // Close screen sharing peer connections
    roomUsers.forEach(userId => {
      const screenPeerId = `screen-${userId}`;
      if (peerConnections.current.has(screenPeerId)) {
        peerConnections.current.get(screenPeerId).close();
        peerConnections.current.delete(screenPeerId);
      }
    });
  };
  
  // Toggle audio
  const toggleAudio = (enabled) => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      
      // Notify other users
      if (socket && currentRoom) {
        socket.emit('toggle_media', {
          type: 'audio',
          enabled,
          roomId: currentRoom
        });
      }
    }
  };
  
  // Toggle video
  const toggleVideo = (enabled) => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      
      // Notify other users
      if (socket && currentRoom) {
        socket.emit('toggle_media', {
          type: 'video',
          enabled,
          roomId: currentRoom
        });
      }
    }
  };

  // Create context value
  const value = {
    socket,
    isConnected,
    connectionError,
    islResponse,
    currentRoom,
    roomUsers,
    localStream: localStream.current,
    screenStream: screenStream.current,
    
    // WebRTC methods
    startVideoCall,
    stopVideoCall,
    startScreenSharing,
    stopScreenSharing,
    toggleAudio,
    toggleVideo,
    
    // Socket methods
    sendSpeechTranscript,
    resetIslResponse,
    reconnect,
    joinRoom,
    leaveRoom,
    subscribe,
    unsubscribe,
    emit
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Custom hook to use socket events
export const useSocketEvent = (event, callback) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Add event listener
    socket.on(event, callback);

    // Clean up
    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);
};

// Custom hook for WebRTC remote streams
export const useRemoteStreams = () => {
  const { roomUsers } = useSocket();
  const [remoteStreams, setRemoteStreams] = useState({});
  
  // This hook can be implemented to track and manage remote streams
  // from peers for both video calls and screen sharing
  
  return remoteStreams;
};

export default SocketContext;