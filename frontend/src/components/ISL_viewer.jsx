import React,{ useEffect, useRef, useState } from 'react';
import ISLModel from './ISL_model';

// This component handles the connection between backend signals and the 3D model
const ISLViewer = ({ darkMode, mode, speechInput, isListening }) => {
  const [currentAnimation, setCurrentAnimation] = useState(null);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  
  // Initialize WebSocket connection for receiving ISL translation signals
  useEffect(() => {
    // Create WebSocket connection
    socketRef.current = new WebSocket('ws://your-backend-url/ws');
    
    socketRef.current.onopen = () => {
      console.log('Connected to backend');
      // Send mode information to backend
      socketRef.current.send(JSON.stringify({ mode }));
    };
    
    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle incoming ISL translation data
        if (data.type === 'translation') {
          console.log('Received translation:', data);
          // Set the animation to play based on the translation
          setCurrentAnimation(data.animationName);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
    
    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socketRef.current.onclose = () => {
      console.log('Disconnected from backend');
      // Attempt to reconnect 
      setTimeout(() => {
        if (socketRef.current.readyState === WebSocket.CLOSED) {
          console.log('Attempting to reconnect...');
          setupWebSocket();
        }
      }, 3000);
    };
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [mode]);
  
  // Handle initialization of WebSocket connection
  const setupWebSocket = () => {
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      socketRef.current.close();
    }
    
    socketRef.current = new WebSocket('ws://your-backend-url/ws');
    
    // Add the same event handlers as in the useEffect
    socketRef.current.onopen = () => {
      console.log('Reconnected to backend');
      socketRef.current.send(JSON.stringify({ mode }));
    };
    
    // ... other handlers (same as in useEffect)
  };
  
  // Process incoming speech input from parent component
  useEffect(() => {
    if (!speechInput || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    
    // Send the speech input to backend for processing
    socketRef.current.send(JSON.stringify({
      type: 'transcript',
      text: speechInput,
      timestamp: Date.now()
    }));
  }, [speechInput]);
  
  // Handle microphone access and audio streaming for direct audio mode
  useEffect(() => {
    // Only handle audio if in 'direct' audio mode (as opposed to transcript mode)
    // and if listening is active
    if (mode !== 'direct' || !isListening) {
      stopAudioStream();
      return;
    }
    
    startAudioStream();
    
    return () => {
      stopAudioStream();
    };
  }, [mode, isListening]);
  
  const startAudioStream = async () => {
    try {
      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Create processor to handle audio data
      const audioSource = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(1024, 1, 1);
      
      // Process audio data
      processor.onaudioprocess = (e) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
        
        // Get audio data
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Send audio data to backend for processing
        socketRef.current.send(JSON.stringify({
          type: 'audio',
          data: Array.from(inputData) // Convert to regular array for JSON serialization
        }));
      };
      
      // Connect the nodes
      audioSource.connect(processor);
      processor.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };
  
  const stopAudioStream = () => {
    // Stop all audio tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };
  
  return (
    <div className="h-full w-full">
      <ISLModel darkMode={darkMode} animationToPlay={currentAnimation} />
    </div>
  );
};

export default ISLViewer;