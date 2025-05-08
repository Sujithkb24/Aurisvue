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
      handleVideoAnswer(answer, sender);
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
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) =>
            console.error('Error adding buffered ICE candidate:', error)
          );
        });
        iceCandidateBuffer.current.delete(peerId);
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
        ],
      });
  
      pc.ontrack = (event) => {
        console.log(`Track received from ${userId}:`, event.track.kind);
      
        // Create a new stream if needed
        const stream = remoteStreamsRef.current[userId] || new MediaStream();
      
        // Check if this track is already in the stream
        const trackExists = stream.getTracks().some(
          (t) =>
            t.id === event.track.id ||
            (t.kind === event.track.kind && t.label === event.track.label)
        );
      
        if (!trackExists) {
          stream.addTrack(event.track);
          console.log(`Added ${event.track.kind} track to stream for ${userId}`);
        } else {
          console.log(`Track ${event.track.kind} already exists in stream for ${userId}`);
        }
      
        // Update the remoteStreamsRef
        remoteStreamsRef.current[userId] = stream;
      
        // Emit an event to notify components about the new stream
        socketInstance.emit('stream-updated', {
          userId,
          hasAudio: stream.getAudioTracks().length > 0,
          hasVideo: stream.getVideoTracks().length > 0,
        });
      };
  
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Sending ICE candidate for ${userId}, connection state: ${pc.iceConnectionState}, gathering state: ${pc.iceGatheringState}`);
          socketInstance.emit('ice-candidate', {
            candidate: event.candidate,
            target: userId,
            type
          });
        } else {
          console.log(`ICE candidate gathering completed for ${userId}`);
        }
      };
  
      pc.onconnectionstatechange = () => {
        console.log(`Connection state for ${userId}:`, pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          console.log(`Removing user ${userId} due to connection state: ${pc.connectionState}`);
          setRemoteStreams((prev) => {
            const newStreams = { ...prev };
            delete newStreams[userId];
            return newStreams;
          });
          peerConnections.current.delete(userId);
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
      }
  
      // Create a new peer connection
      const pc = createPeerConnection(sender, socketInstance, 'video');
      if (!pc) {
        throw new Error(`Failed to create peer connection for ${sender}`);
      }
      peerConnections.current.set(sender, pc); // Add to peerConnections map
  
      // Set the remote description
      console.log('Setting remote description:', offer);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
  
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
    } catch (error) {
      console.error('Error handling video offer:', error);
    }
  };
  
  // Handle incoming video answer
  const handleVideoAnswer = async (answer, sender) => {
    try {
      const pc = peerConnections.current.get(sender);
      
      if (!pc) {
        console.warn(`Received video answer from ${sender} but no peer connection exists. Creating a new one.`);
        
        // Create a new peer connection on-the-fly
        const newPc = createPeerConnection(sender, socketInstance, 'video');
        if (newPc) {
          peerConnections.current.set(sender, newPc);
          
          // Set remote description on the new connection
          await newPc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`Created new peer connection for ${sender} and set remote description`);
          
          // Process buffered candidates after setting remote description
          processBufferedCandidates(sender, false);
          
          // Initiate a new offer since we just created this connection
          try {
            const offer = await newPc.createOffer();
            await newPc.setLocalDescription(offer);
            
            // Send the new offer to the remote peer
            socketInstance.emit('video_offer', {
              offer: newPc.localDescription,
              roomId: currentRoom,
              target: sender
            });
            console.log(`Sent new offer to ${sender} after creating connection on-the-fly`);
          } catch (offerError) {
            console.error("Error creating new offer:", offerError);
          }
        }
        return;
      }
      
      console.log(`Processing video answer from ${sender}, signaling state: ${pc.signalingState}`);
      
      // Simplified check for connection state
      if (pc.signalingState === 'closed') {
        console.warn('Cannot set remote description in closed state');
        return;
      }
      
      // Set the remote description
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`Remote description set successfully for ${sender}`);
      
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