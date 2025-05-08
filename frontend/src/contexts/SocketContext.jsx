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
  const screenPeerConnections = useRef(new Map());
  const localStream = useRef(null);
  const screenStream = useRef(null);
  // Buffer for ICE candidates that arrive before remote description is set
  const iceCandidateBuffer = useRef(new Map());
  
  // Keep track of which peer connections are fully established
  const establishedConnections = useRef(new Set());
  
  // Track pending offers to prevent duplicates
  const pendingOffers = useRef(new Set());
  
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
          cleanupMediaStreams();
          cleanupPeerConnections();
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
          cleanupMediaStreams();
          cleanupPeerConnections();
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
  
  // Cleanup media streams
  const cleanupMediaStreams = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
  };
  
  // Cleanup peer connections
  const cleanupPeerConnections = () => {
    // Close all video peer connections
    peerConnections.current.forEach((pc) => {
      pc.close();
    });
    peerConnections.current.clear();
    
    // Close all screen sharing peer connections
    screenPeerConnections.current.forEach((pc) => {
      pc.close();
    });
    screenPeerConnections.current.clear();
    
    // Clear established connections set
    establishedConnections.current.clear();
    
    // Clear ICE candidate buffer
    iceCandidateBuffer.current.clear();
    
    // Clear pending offers
    pendingOffers.current.clear();
  };
  
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
      
      // Close video peer connection
      if (peerConnections.current.has(userId)) {
        peerConnections.current.get(userId).close();
        peerConnections.current.delete(userId);
      }
      
      // Close screen sharing peer connection
      if (screenPeerConnections.current.has(userId)) {
        screenPeerConnections.current.get(userId).close();
        screenPeerConnections.current.delete(userId);
      }
      
      // Remove from established connections
      establishedConnections.current.delete(userId);
      establishedConnections.current.delete(`screen-${userId}`);
      
      // Clear buffered ICE candidates
      iceCandidateBuffer.current.delete(userId);
      iceCandidateBuffer.current.delete(`screen-${userId}`);
      
      // Remove from pending offers
      pendingOffers.current.delete(`video-${userId}`);
      pendingOffers.current.delete(`screen-${userId}`);
    });
    
    // Handle incoming video call offer
    socketInstance.on('video_offer', async ({ offer, sender }) => {
      console.log('Received video offer from:', sender);
      
      // If we're already processing an offer from this peer, ignore duplicate
      const offerKey = `video-${sender}`;
      if (pendingOffers.current.has(offerKey)) {
        console.log(`Already processing a video offer from ${sender}, ignoring duplicate`);
        return;
      }
      
      // Mark this offer as being processed
      pendingOffers.current.add(offerKey);
      
      try {
        await handleVideoOffer(offer, sender, socketInstance);
      } catch (error) {
        console.error('Error handling video offer:', error);
      } finally {
        // Remove from pending offers after processing (either success or failure)
        pendingOffers.current.delete(offerKey);
      }
    });
    
    // Handle incoming video call answer
    socketInstance.on('video_answer', ({ answer, sender }) => {
      console.log('Received video answer from:', sender);
      handleVideoAnswer(answer, sender);
    });
    
    // Handle incoming screen sharing offer
    socketInstance.on('screen_offer', async ({ offer, sender }) => {
      console.log('Received screen sharing offer from:', sender);
      
      // If we're already processing an offer from this peer, ignore duplicate
      const offerKey = `screen-${sender}`;
      if (pendingOffers.current.has(offerKey)) {
        console.log(`Already processing a screen offer from ${sender}, ignoring duplicate`);
        return;
      }
      
      // Mark this offer as being processed
      pendingOffers.current.add(offerKey);
      
      try {
        await handleScreenOffer(offer, sender, socketInstance);
      } catch (error) {
        console.error('Error handling screen offer:', error);
      } finally {
        // Remove from pending offers after processing
        pendingOffers.current.delete(offerKey);
      }
    });
    
    // Handle incoming screen sharing answer
    socketInstance.on('screen_answer', ({ answer, sender }) => {
      console.log('Received screen sharing answer from:', sender);
      handleScreenAnswer(answer, sender);
    });
    
    // Handle ICE candidate
    socketInstance.on('ice_candidate', ({ candidate, sender, targetType }) => {
      console.log(`Received ICE candidate from: ${sender}, type: ${targetType}`);
      try {
        handleIceCandidate(candidate, sender, targetType);
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
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
      console.log('Joining room:', roomId);
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
      
      cleanupMediaStreams();
      cleanupPeerConnections();
    }
  };
  
  // Process buffered ICE candidates
  const processBufferedCandidates = (peerId, isScreenConnection = false) => {
    if (iceCandidateBuffer.current.has(peerId)) {
      const candidates = iceCandidateBuffer.current.get(peerId);
      const pc = isScreenConnection ? 
                screenPeerConnections.current.get(peerId.replace('screen-', '')) : 
                peerConnections.current.get(peerId);
      
      if (pc && pc.remoteDescription) {
        console.log(`Processing ${candidates.length} buffered ICE candidates for ${peerId}`);
        candidates.forEach(candidate => {
          pc.addIceCandidate(new RTCIceCandidate(candidate))
            .catch(error => console.error('Error adding buffered ICE candidate:', error));
        });
        iceCandidateBuffer.current.delete(peerId);
      }
    }
  };
  
  // Create a peer connection for video
  const createPeerConnection = (userId, socketInstance, type = 'video') => {
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
      const isScreenConnection = type === 'screen';
      const connectionLabel = isScreenConnection ? `screen-${userId}` : userId;
      
      // Add tracks to peer connection based on connection type
      if (isScreenConnection && screenStream.current) {
        screenStream.current.getTracks().forEach(track => {
          pc.addTrack(track, screenStream.current);
        });
      } else if (!isScreenConnection && localStream.current) {
        localStream.current.getTracks().forEach(track => {
          pc.addTrack(track, localStream.current);
        });
      }
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketInstance && currentRoom) {
          socketInstance.emit('ice_candidate', {
            candidate: event.candidate,
            roomId: currentRoom,
            target: userId,
            targetType: isScreenConnection ? 'screen' : 'video'
          });
        }
      };
      
      // Handle tracks received from remote peers
      pc.ontrack = (event) => {
        console.log(`Track received from ${connectionLabel}:`, event.track.kind);
        
        // Emit an event that can be subscribed to
        if (socketInstance) {
          const streamType = isScreenConnection ? 'screen' : 'video';
          socketInstance.emit('user-joined', userId, event.streams[0], streamType);
        }
      };
      
      // Log state changes
      pc.onconnectionstatechange = () => {
        console.log(`Connection state for ${connectionLabel}: ${pc.connectionState}`);
        
        if (pc.connectionState === 'connected') {
          console.log(`Connection fully established for ${connectionLabel}`);
          establishedConnections.current.add(connectionLabel);
        } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          console.log(`Connection ${pc.connectionState} for ${connectionLabel}`);
          establishedConnections.current.delete(connectionLabel);
        }
      };
      
      // Store the peer connection in the appropriate map
      if (isScreenConnection) {
        screenPeerConnections.current.set(userId, pc);
      } else {
        peerConnections.current.set(userId, pc);
      }
      
      return pc;
    } catch (error) {
      console.error(`Error creating ${type} peer connection:`, error);
      return null;
    }
  };
  
  // Handle incoming video offer
  const handleVideoOffer = async (offer, sender, socketInstance) => {
    try {
      console.log(`Processing video offer from ${sender}, creating answer...`);
      
      // Close any existing connection to ensure clean state
      if (peerConnections.current.has(sender)) {
        console.log(`Closing existing peer connection with ${sender} before creating new one`);
        peerConnections.current.get(sender).close();
        peerConnections.current.delete(sender);
        establishedConnections.current.delete(sender);
      }
      
      // Create new peer connection
      const pc = createPeerConnection(sender, socketInstance, 'video');
      
      if (!pc) {
        throw new Error('Failed to create peer connection');
      }
      
      // If no local stream exists, get user media
      if (!localStream.current) {
        try {
          console.log('Requesting user media with video...');
          localStream.current = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
          });
        } catch (mediaError) {
          console.warn('Failed to get video. Trying audio only:', mediaError);
          // Fallback to audio only
          try {
            localStream.current = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false
            });
          } catch (audioError) {
            console.error('Failed to get audio too:', audioError);
            throw new Error('Could not access any media devices');
          }
        }
        
        // Add tracks to peer connection after acquiring media
        localStream.current.getTracks().forEach(track => {
          pc.addTrack(track, localStream.current);
        });
      } else {
        // Add existing tracks to the new connection
        localStream.current.getTracks().forEach(track => {
          pc.addTrack(track, localStream.current);
        });
      }
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any buffered ICE candidates
      processBufferedCandidates(sender);
      
      // Create answer
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
      
      console.log('Setting local description...');
      await pc.setLocalDescription(answer);
      
      // Send answer
      console.log('Sending video answer...');
      socketInstance.emit('video_answer', {
        answer: pc.localDescription,
        roomId: currentRoom,
        target: sender
      });
    } catch (error) {
      console.error('Error handling video offer:', error);
      throw error;
    }
  };
  
  // Handle incoming video answer
  const handleVideoAnswer = async (answer, sender) => {
    try {
      const pc = peerConnections.current.get(sender);
      if (pc) {
        console.log(`Processing video answer from ${sender}`);
        
        // Check signaling state before applying remote description
        if (pc.signalingState !== 'have-local-offer') {
          console.warn(`Unexpected signaling state: ${pc.signalingState} for video answer`);
          
          // If we're not in the correct state, we might need to reset the connection
          if (['closed', 'stable', 'have-remote-offer', 'have-local-pranswer', 'have-remote-pranswer'].includes(pc.signalingState)) {
            console.log(`Ignoring video answer due to incompatible signaling state`);
            return;
          }
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Process any buffered ICE candidates
        processBufferedCandidates(sender);
      } else {
        console.warn(`Received video answer from ${sender} but no peer connection exists`);
      }
    } catch (error) {
      console.error('Error handling video answer:', error);
    }
  };
  
  // Handle incoming screen sharing offer
  const handleScreenOffer = async (offer, sender, socketInstance) => {
    try {
      console.log(`Processing screen offer from ${sender}, creating answer...`);
      
      // Close any existing screen connection for clean state
      if (screenPeerConnections.current.has(sender)) {
        console.log(`Closing existing screen connection with ${sender} before creating new one`);
        screenPeerConnections.current.get(sender).close();
        screenPeerConnections.current.delete(sender);
        establishedConnections.current.delete(`screen-${sender}`);
      }
      
      // Create a peer connection for screen sharing
      const pc = createPeerConnection(sender, socketInstance, 'screen');
      
      if (!pc) {
        throw new Error('Failed to create peer connection for screen sharing');
      }
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any buffered ICE candidates
      processBufferedCandidates(`screen-${sender}`, true);
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer
      socketInstance.emit('screen_answer', {
        answer: pc.localDescription,
        roomId: currentRoom,
        target: sender
      });
    } catch (error) {
      console.error('Error handling screen offer:', error);
      throw error;
    }
  };
  
  // Handle incoming screen sharing answer
  const handleScreenAnswer = async (answer, sender) => {
    try {
      const pc = screenPeerConnections.current.get(sender);
      
      if (pc) {
        console.log(`Processing screen answer from ${sender}`);
        
        // Check signaling state before applying remote description
        if (pc.signalingState !== 'have-local-offer') {
          console.warn(`Unexpected signaling state: ${pc.signalingState} for screen answer`);
          
          // If we're not in the correct state, ignore this answer
          if (['closed', 'stable', 'have-remote-offer', 'have-local-pranswer', 'have-remote-pranswer'].includes(pc.signalingState)) {
            console.log(`Ignoring screen answer due to incompatible signaling state`);
            return;
          }
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Process any buffered ICE candidates
        processBufferedCandidates(`screen-${sender}`, true);
      } else {
        console.warn(`Received screen answer from ${sender} but no peer connection exists`);
      }
    } catch (error) {
      console.error('Error handling screen answer:', error);
    }
  };
  
  // Handle ICE candidate
  const handleIceCandidate = (candidate, sender, targetType) => {
    try {
      const isScreenConnection = targetType === 'screen';
      const connectionId = isScreenConnection ? `screen-${sender}` : sender;
      
      const pc = isScreenConnection ? 
                screenPeerConnections.current.get(sender) : 
                peerConnections.current.get(sender);
      
      if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
        // If remote description is set and connection isn't closed, add the candidate directly
        pc.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(error => console.error(`Error adding ICE candidate to ${connectionId}:`, error));
      } else {
        // Otherwise buffer the candidate for later
        if (!iceCandidateBuffer.current.has(connectionId)) {
          iceCandidateBuffer.current.set(connectionId, []);
        }
        console.log(`Buffering ICE candidate for ${connectionId}`);
        iceCandidateBuffer.current.get(connectionId).push(candidate);
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
      
      if (!socket) {
        throw new Error('Socket connection not established');
      }
      
      // Get user media if not already available
      if (!localStream.current) {
        try {
          console.log('Requesting user media with video...');
          localStream.current = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
          });
        } catch (mediaError) {
          console.warn('Failed to get video. Trying audio only:', mediaError);
          // Fallback to audio only
          localStream.current = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
        }
      }
      
      // Create peer connections for each user in the room
      for (const userId of roomUsers) {
        // Skip if we already have an established connection with this user
        if (establishedConnections.current.has(userId)) {
          console.log(`Already have an established connection with ${userId}, skipping`);
          continue;
        }
        
        // Skip if a connection attempt is already in progress
        if (pendingOffers.current.has(`video-${userId}`)) {
          console.log(`Connection attempt already in progress for ${userId}, skipping`);
          continue;
        }
        
        // Mark as pending
        pendingOffers.current.add(`video-${userId}`);
        
        try {
          // Close any existing connection before creating a new one
          if (peerConnections.current.has(userId)) {
            console.log(`Closing existing connection with ${userId} before starting call`);
            peerConnections.current.get(userId).close();
            peerConnections.current.delete(userId);
            establishedConnections.current.delete(userId);
          }
          
          const pc = createPeerConnection(userId, socket, 'video');
          
          if (!pc) {
            console.error(`Failed to create peer connection for user ${userId}`);
            continue;
          }
          
          // Create offer
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);
          
          // Send offer to remote peer
          console.log(`Sending video offer to ${userId}`);
          socket.emit('video_offer', {
            offer: pc.localDescription,
            roomId: currentRoom,
            target: userId
          });
        } catch (error) {
          console.error(`Error creating offer for ${userId}:`, error);
        } finally {
          // Remove from pending after attempt (whether successful or not)
          setTimeout(() => {
            pendingOffers.current.delete(`video-${userId}`);
          }, 5000); // Give it some time to complete
        }
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
      
      if (!socket) {
        throw new Error('Socket connection not established');
      }
      
      // Get screen sharing media
      try {
        screenStream.current = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
      } catch (mediaError) {
        console.warn('Failed to get audio with screen. Trying video only:', mediaError);
        // Fallback to video only
        screenStream.current = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
      }
      
      // Create peer connections for screen sharing
      for (const userId of roomUsers) {
        // Skip if we already have an established screen connection with this user
        if (establishedConnections.current.has(`screen-${userId}`)) {
          console.log(`Already have an established screen connection with ${userId}, skipping`);
          continue;
        }
        
        // Skip if a connection attempt is already in progress
        if (pendingOffers.current.has(`screen-${userId}`)) {
          console.log(`Screen sharing connection attempt already in progress for ${userId}, skipping`);
          continue;
        }
        
        // Mark as pending
        pendingOffers.current.add(`screen-${userId}`);
        
        try {
          // Close any existing screen connection before creating a new one
          if (screenPeerConnections.current.has(userId)) {
            console.log(`Closing existing screen connection with ${userId} before starting screen sharing`);
            screenPeerConnections.current.get(userId).close();
            screenPeerConnections.current.delete(userId);
            establishedConnections.current.delete(`screen-${userId}`);
          }
          
          const pc = createPeerConnection(userId, socket, 'screen');
          
          if (!pc) {
            console.error(`Failed to create peer connection for screen sharing with user ${userId}`);
            continue;
          }
          
          // Create offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          // Send offer to remote peer
          console.log(`Sending screen offer to ${userId}`);
          socket.emit('screen_offer', {
            offer: pc.localDescription,
            roomId: currentRoom,
            target: userId
          });
        } catch (error) {
          console.error(`Error creating screen offer for ${userId}:`, error);
        } finally {
          // Remove from pending after attempt (whether successful or not)
          setTimeout(() => {
            pendingOffers.current.delete(`screen-${userId}`);
          }, 5000); // Give it some time to complete
        }
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
    peerConnections.current.forEach((pc, userId) => {
      pc.close();
      establishedConnections.current.delete(userId);
      pendingOffers.current.delete(`video-${userId}`);
    });
    peerConnections.current.clear();
    
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
    screenPeerConnections.current.forEach((pc, userId) => {
      pc.close();
      establishedConnections.current.delete(`screen-${userId}`);
      pendingOffers.current.delete(`screen-${userId}`);
    });
    screenPeerConnections.current.clear();
    
    // Notify other users if needed
    if (socket && currentRoom) {
      socket.emit('toggle_media', {
        type: 'screen',
        enabled: false,
        roomId: currentRoom
      });
    }
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