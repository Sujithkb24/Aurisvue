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
  const isTeacher = currentUser?.role === 'teacher'; // Adjust based on your user model
  
  // WebRTC related state
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const peerConnections = useRef(new Map());
  const screenPeerConnections = useRef(new Map());
  const localStream = useRef(null);
  const screenStream = useRef(null);
  // Buffer for ICE candidates that arrive before remote description is set
  const iceCandidateBuffer = useRef(new Map());
  const remoteStreamsRef = useRef({});
  // Keep track of which peer connections are fully established
  const establishedConnections = useRef(new Set());
  const [remoteStreams, setRemoteStreams] = useState({});
const [remoteScreens, setRemoteScreens] = useState({});

// Add these two refs to track remote streams and screens

const remoteScreensRef = useRef({});
  
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
    console.log('Cleaning up peer connections...');
    peerConnections.current.forEach((pc, userId) => {
      console.log(`Closing peer connection for ${userId}`);
      pc.close();
    });
    peerConnections.current.clear();
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
      handleVideoAnswer(answer, sender, socketInstance);
    });

    socketInstance.on('ice-candidate', ({ candidate, sender, targetType }) => {
  console.log(`Received ICE candidate from: ${sender}, type: ${targetType}`);
  try {
    const isScreenConnection = targetType === 'screen';
    const connectionId = isScreenConnection ? `screen-${sender}` : sender;

    const pc = isScreenConnection
      ? screenPeerConnections.current.get(sender)
      : peerConnections.current.get(sender);

    if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) =>
        console.error(`Error adding ICE candidate to ${connectionId}:`, error)
      );
    } else {
      if (!iceCandidateBuffer.current.has(connectionId)) {
        iceCandidateBuffer.current.set(connectionId, []);
      }
      console.log(`Buffering ICE candidate for ${connectionId}`);
      iceCandidateBuffer.current.get(connectionId).push(candidate);
    }
  } catch (error) {
    console.error('Error handling ICE candidate:', error);
  }
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
      const pc = isScreenConnection
        ? screenPeerConnections.current.get(peerId.replace('screen-', ''))
        : peerConnections.current.get(peerId);
  
      if (pc && pc.remoteDescription) {
        console.log(`Processing ${candidates.length} buffered ICE candidates for ${peerId}`);
        candidates.forEach((candidate) => {
          try {
            // Add more robust error handling for ICE candidates
            pc.addIceCandidate(new RTCIceCandidate(candidate))
              .then(() => console.log(`ICE candidate added successfully for ${peerId}`))
              .catch((error) => console.error('Error adding buffered ICE candidate:', error));
          } catch (e) {
            console.error(`Exception while adding ICE candidate: ${e.message}`);
          }
        });
        iceCandidateBuffer.current.delete(peerId);
      } else {
        console.warn(`Cannot process ICE candidates for ${peerId} - ${pc ? 'no remote description' : 'no peer connection'}`);
      }
    }
  };
  const getRemoteStreams = useCallback(() => {
    return { ...remoteStreamsRef.current };
  }, []);
  // Create a peer connection for video
  const createPeerConnection = (userId, socketInstance, type = 'video') => {
    try {
      console.log(`Creating ${type} peer connection for ${userId}`);
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }, // Add more STUN servers
        ],
        iceCandidatePoolSize: 10, // Increase candidate pool size
      });
  
      pc.ontrack = (event) => {
        console.log(`Track received from ${userId}:`, event.track.kind);
      
        // CRITICAL FIX: Ensure we're using the right stream key format for screen sharing
        const streamKey = type === 'screen' ? `screen-${userId}` : userId;
        
        // Create a new stream if needed
        let stream;
        if (type === 'screen') {
          stream = remoteScreensRef.current[userId] || new MediaStream();
          remoteScreensRef.current[userId] = stream;
        } else {
          stream = remoteStreamsRef.current[userId] || new MediaStream();
          remoteStreamsRef.current[userId] = stream;
        }
      
        // Check if this track is already in the stream
        const trackExists = stream.getTracks().some(
          (t) => t.id === event.track.id
        );
      
        if (!trackExists) {
          stream.addTrack(event.track);
          console.log(`Added ${event.track.kind} track to stream for ${userId}, type: ${type}`);
        } else {
          console.log(`Track ${event.track.kind} already exists in stream for ${userId}`);
        }
      
        // Update the appropriate state based on stream type
        if (type === 'screen') {
          // Update screen sharing state
          setRemoteScreens(prev => {
            const newScreens = { ...prev };
            newScreens[userId] = stream;
            return newScreens;
          });
        } else {
          // Update video state
          setRemoteStreams(prev => {
            const newStreams = { ...prev };
            newStreams[userId] = stream;
            return newStreams;
          });
        }
      
        // Emit an event to notify components
        socketInstance.emit('stream-updated', {
          userId: streamKey,
          hasAudio: stream.getAudioTracks().length > 0,
          hasVideo: stream.getVideoTracks().length > 0,
          streamType: type
        });
      };
  
      // Use our improved ICE candidate handler
      pc.onicecandidate = (event) => handleIceCandidate(event, userId, socketInstance, type);
  
      // Add more connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log(`Connection state for ${userId} (${type}):`, pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          console.log(`Removing ${type} connection for ${userId} due to state: ${pc.connectionState}`);
          
          if (type === 'screen') {
            setRemoteScreens((prev) => {
              const newScreens = { ...prev };
              delete newScreens[userId];
              return newScreens;
            });
            screenPeerConnections.current.delete(userId);
          } else {
            setRemoteStreams((prev) => {
              const newStreams = { ...prev };
              delete newStreams[userId];
              return newStreams;
            });
            peerConnections.current.delete(userId);
          }
        }
      };
      
      // Add signaling state change monitoring
      pc.onsignalingstatechange = () => {
        console.log(`Signaling state for ${userId} (${type}):`, pc.signalingState);
      };
      
      // Add ICE connection state monitoring
      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state for ${userId} (${type}):`, pc.iceConnectionState);
        
        // Handle failed ICE connections
        if (pc.iceConnectionState === 'failed') {
          console.log(`Attempting to restart ICE for ${userId}`);
          pc.restartIce();
        }
      };
  
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
    
      // Close any existing connection to ensure a clean state
      if (peerConnections.current.has(sender)) {
        console.log(`Closing existing peer connection with ${sender} before creating a new one`);
        peerConnections.current.get(sender).close();
        peerConnections.current.delete(sender);
        establishedConnections.current.delete(sender);
      }
    
      // Create a new peer connection
      const pc = createPeerConnection(sender, socketInstance, 'video');
      if (!pc) {
        throw new Error(`Failed to create peer connection for ${sender}`);
      }
      
      // Add to peerConnections map before proceeding
      peerConnections.current.set(sender, pc);
      
      // Add local tracks if we have them
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => {
          try {
            pc.addTrack(track, localStream.current);
          } catch (e) {
            console.error(`Error adding track to peer connection: ${e.message}`);
          }
        });
      }
    
      // Set the remote description with improved error handling
      console.log('Setting remote description:', offer);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log(`Remote description set for ${sender}, signaling state: ${pc.signalingState}`);
      } catch (e) {
        console.error(`Error setting remote description: ${e.message}`);
        throw e;
      }
    
      // Process any buffered ICE candidates
      processBufferedCandidates(sender, false);
    
      // Create an answer
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
    
      // Set the local description
      console.log('Setting local description...');
      await pc.setLocalDescription(answer);
    
      // Send the answer back to the sender
      console.log('Sending video answer...');
      socketInstance.emit('video_answer', {
        answer: pc.localDescription,
        roomId: currentRoom,
        target: sender,
      });
      
      // Mark this connection as established
      establishedConnections.current.add(sender);
    } catch (error) {
      console.error('Error handling video offer:', error);
    }
  };
  
  // Handle incoming video answer
// Handle incoming video answer
const handleVideoAnswer = async (answer, sender, socketInstance) => {
  try {
    const pc = peerConnections.current.get(sender);
    
    if (!pc) {
      console.warn(`Received video answer from ${sender} but no peer connection exists. Ignoring answer.`);
      return;
    }
    
    console.log(`Processing video answer from ${sender}, signaling state: ${pc.signalingState}`);
    
    // Check if we can set the remote description based on signaling state
    if (pc.signalingState === 'closed') {
      console.warn('Cannot set remote description in closed state');
      return;
    }
    
    // Only set remote description if we're in have-local-offer state
    if (pc.signalingState !== 'have-local-offer') {
      console.warn(`Cannot set remote description in ${pc.signalingState} state, expected 'have-local-offer'. Ignoring answer.`);
      return;
    }
    
    // Set the remote description
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    console.log(`Remote description set successfully for ${sender}`);
    
    // Add this peer to established connections
    establishedConnections.current.add(sender);
    
    // Process any buffered ICE candidates
    processBufferedCandidates(sender, false);
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
      
      // Add to screen peer connections map
      screenPeerConnections.current.set(sender, pc);
      
      // Set remote description with improved error handling
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log(`Remote description set for screen from ${sender}, signaling state: ${pc.signalingState}`);
      } catch (e) {
        console.error(`Error setting remote description for screen: ${e.message}`);
        throw e;
      }
      
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
      
      // Mark this connection as established
      establishedConnections.current.add(`screen-${sender}`);
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
  const handleIceCandidate = (event, userId, socketInstance, type = 'video') => {
    if (event.candidate) {
      console.log(`Sending ICE candidate for ${userId}, type: ${type}, state: ${event.target.iceConnectionState}`);
      
      // Add more details about the ICE candidate for debugging
      const candidate = event.candidate;
      console.log(`ICE candidate details - type: ${candidate.type}, protocol: ${candidate.protocol}, address: ${candidate.address}`);
      
      socketInstance.emit('ice-candidate', {
        candidate: event.candidate,
        target: userId,
        type
      });
    } else {
      console.log(`ICE candidate gathering completed for ${userId}, type: ${type}`);
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
      
      // Add local tracks to all peer connections
      const addTracksToConnection = (pc) => {
        if (localStream.current) {
          const tracks = localStream.current.getTracks();
          tracks.forEach(track => {
            pc.addTrack(track, localStream.current);
          });
        }
      };
      
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
          
          // Add to peerConnections map
          peerConnections.current.set(userId, pc);
          
          // Add local tracks to the connection
          addTracksToConnection(pc);
          
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
    remoteStreams, // Add this
  remoteScreens,
    // Socket methods
    sendSpeechTranscript,
    resetIslResponse,
    reconnect,
    joinRoom,
    leaveRoom,
    subscribe,
    unsubscribe,
    emit,
    getRemoteStreams
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