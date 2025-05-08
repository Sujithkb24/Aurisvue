import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentRooms, setCurrentRooms] = useState([]);
  const { currentUser, getToken } = useAuth();
  
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || '';

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    const initializeSocket = async () => {
      if (!currentUser) return;
      
      try {
        const token = await getToken();
        
        // Close any existing socket
        if (socket) {
          socket.disconnect();
        }
        
        // Create new socket connection with auth token
        const newSocket = io(SOCKET_URL, {
          auth: {
            token
          },
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          autoConnect: true
        });
        
        // Set up event listeners
        newSocket.on('connect', () => {
          console.log('Socket connected:', newSocket.id);
          setConnected(true);
          
          // Rejoin any existing rooms
          currentRooms.forEach(room => {
            console.log('Rejoining room:', room);
            newSocket.emit('join_room', { room });
          });
        });
        
        newSocket.on('disconnect', () => {
          console.log('Socket disconnected');
          setConnected(false);
        });
        
        newSocket.on('error', (error) => {
          console.error('Socket error:', error);
        });
        
        // Listen for specific events
        newSocket.on('teacher_speech', (data) => {
          console.log('Received teacher speech:', data);
          // This will be handled in the component
        });
        
        newSocket.on('student_transcript', (data) => {
          console.log('Received student transcript:', data);
          // This will be handled in the component
        });
        
        newSocket.on('session_update', (data) => {
          console.log('Received session update:', data);
          // This will be handled in the component
        });
        
        // Set socket in state
        setSocket(newSocket);
        
        // Clean up on unmount
        return () => {
          console.log('Cleaning up socket connection');
          newSocket.disconnect();
        };
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };
    
    initializeSocket();
  }, [currentUser]);
  
  // Join a room
  const joinRoom = (room) => {
    if (!socket || !room) return;
    
    console.log('Joining room:', room);
    socket.emit('join_room', { room });
    
    // Update current rooms
    setCurrentRooms(prev => {
      if (!prev.includes(room)) {
        return [...prev, room];
      }
      return prev;
    });
  };
  
  // Leave a room
  const leaveRoom = (room) => {
    if (!socket || !room) return;
    
    console.log('Leaving room:', room);
    socket.emit('leave_room', { room });
    
    // Update current rooms
    setCurrentRooms(prev => prev.filter(r => r !== room));
  };
  
  // Send a message to a room
  const sendToRoom = (room, eventName, data) => {
    if (!socket || !room) return;
    
    console.log(`Sending ${eventName} to room ${room}:`, data);
    socket.emit(eventName, { ...data, room });
  };
  
  // Broadcast teacher speech to all students in the session
  const broadcastTeacherSpeech = (sessionId, text, isFinal = false) => {
    if (!socket || !sessionId) return;
    
    const speechData = {
      sessionId,
      text,
      isFinal,
      timestamp: new Date()
    };
    
    console.log('Broadcasting teacher speech:', speechData);
    socket.emit('teacher_speech', speechData);
  };
  
  // Send student transcript to teacher
  const sendStudentTranscript = (sessionId, text) => {
    if (!socket || !sessionId) return;
    
    const transcriptData = {
      sessionId,
      text,
      timestamp: new Date()
    };
    
    console.log('Sending student transcript:', transcriptData);
    socket.emit('student_transcript', transcriptData);
  };

  const value = {
    socket,
    connected,
    joinRoom,
    leaveRoom,
    sendToRoom,
    broadcastTeacherSpeech,
    sendStudentTranscript,
    currentRooms
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};