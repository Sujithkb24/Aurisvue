import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

// Create context
const SocketContext = createContext();

// Socket configuration
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
const RECONNECTION_ATTEMPTS = 3;
const RECONNECTION_DELAY = 2000;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [usingFallbackMode, setUsingFallbackMode] = useState(false);
  const [islResponse, setIslResponse] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Function to initialize socket connection
  const initializeSocket = useCallback(() => {
    console.log("Initializing socket connection to:", SOCKET_URL);
    
    // Clear any previous socket
    if (socket) {
      socket.disconnect();
    }
    
    // Create new socket connection with improved options
    const newSocket = io(SOCKET_URL, {
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      timeout: 10000,
      autoConnect: true,
      transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
    });

    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('Socket connected!', newSocket.id);
      setIsConnected(true);
      setConnectError(null);
      setReconnectAttempts(0);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      // If the server closed the connection, don't attempt to reconnect automatically
      if (reason === 'io server disconnect') {
        console.log('Server disconnected the socket - will not auto-reconnect');
        // But we can still try manually
        setTimeout(() => {
          if (reconnectAttempts < RECONNECTION_ATTEMPTS) {
            console.log(`Manual reconnection attempt ${reconnectAttempts + 1}/${RECONNECTION_ATTEMPTS}`);
            newSocket.connect();
            setReconnectAttempts(prev => prev + 1);
          } else {
            console.log('Max reconnection attempts reached, switching to fallback mode');
            setUsingFallbackMode(true);
          }
        }, RECONNECTION_DELAY);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectError(`Connection error: ${error.message}`);
      
      // After max reconnection attempts, switch to fallback mode
      if (reconnectAttempts >= RECONNECTION_ATTEMPTS - 1) {
        console.log('Max reconnection attempts reached after error, switching to fallback mode');
        setUsingFallbackMode(true);
      }
    });

    newSocket.on('isl_response', (data) => {
      console.log('Received ISL response:', data);
      setIslResponse(data);
    });

    // Store the socket in state
    setSocket(newSocket);

    // Clean up function
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
      setSocket(null);
    };
  }, [socket, reconnectAttempts]);

  // Initialize socket on component mount
  useEffect(() => {
    initializeSocket();
    
    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Handle reconnection attempts
  useEffect(() => {
    if (!isConnected && !usingFallbackMode && reconnectAttempts < RECONNECTION_ATTEMPTS) {
      const timer = setTimeout(() => {
        console.log(`Reconnection attempt ${reconnectAttempts + 1}/${RECONNECTION_ATTEMPTS}`);
        if (socket) {
          socket.connect();
        } else {
          initializeSocket();
        }
        setReconnectAttempts(prev => prev + 1);
      }, RECONNECTION_DELAY);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, usingFallbackMode, reconnectAttempts, socket, initializeSocket]);

  // Function to send speech transcript
  const sendSpeechTranscript = useCallback(async (transcript) => {
    if (!transcript || transcript.trim() === '') {
      console.log('Empty transcript, not sending');
      return;
    }
    
    console.log('Sending speech transcript:', transcript);
    
    if (isConnected && socket) {
      // Use a Promise to handle the response
      return new Promise((resolve, reject) => {
        // Set a timeout to handle cases where the server doesn't respond
        const timeoutId = setTimeout(() => {
          reject(new Error('Server response timeout'));
        }, 10000);
        
        socket.emit('speech_transcript', { transcript }, (response) => {
          clearTimeout(timeoutId);
          
          if (response && response.error) {
            console.error('Error from server:', response.error);
            reject(new Error(response.error));
          } else {
            console.log('Server acknowledged transcript');
            resolve(response);
          }
        });
      });
    } else if (usingFallbackMode) {
      // Fallback to direct API call
      try {
        console.log('Using fallback mode for processing transcript');
        // Simulate API processing in fallback mode with mock response
        // In real implementation, you would make a fetch call to your API endpoint
        return new Promise((resolve) => {
          setTimeout(() => {
            const mockResponse = {
              success: true,
              message: 'Processed in fallback mode'
            };
            console.log('Fallback API response:', mockResponse);
            
            // Generate a simple ISL response in fallback mode
            setIslResponse({
              gestures: ['BASIC_GESTURE_PLACEHOLDER'],
              timing: [1000],
              text: transcript
            });
            
            resolve(mockResponse);
          }, 1000);
        });
      } catch (error) {
        console.error('Fallback API error:', error);
        throw error;
      }
    } else {
      throw new Error('Not connected to server and fallback mode not active');
    }
  }, [isConnected, socket, usingFallbackMode]);

  const resetIslResponse = useCallback(() => {
    setIslResponse(null);
  }, []);

  // Force fallback mode for testing
  const forceFallbackMode = useCallback(() => {
    setUsingFallbackMode(true);
    setIsConnected(false);
    if (socket) {
      socket.disconnect();
    }
  }, [socket]);

  // Force reconnection attempt
  const forceReconnect = useCallback(() => {
    console.log('Forcing reconnection...');
    setUsingFallbackMode(false);
    setReconnectAttempts(0);
    initializeSocket();
  }, [initializeSocket]);

  const value = {
    socket,
    isConnected,
    connectError,
    usingFallbackMode,
    islResponse,
    sendSpeechTranscript,
    resetIslResponse,
    forceFallbackMode,
    forceReconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};