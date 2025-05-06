import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
        const socketInstance = io(process.env.REACT_APP_SOCKET_URL || '', {
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

        // Store socket in state
        setSocket(socketInstance);

        // Clean up on unmount
        return () => {
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
      const socketInstance = io(process.env.REACT_APP_SOCKET_URL || '', {
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
    }
  };

  // Leave a specific room
  const leaveRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('leave_room', roomId);
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

export default SocketContext;