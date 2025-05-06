import React, { useState, useEffect } from 'react';
import ISLModel from './ISL_model';

// This component handles the 3D model rendering and animation based on speech input
const ISLViewer = ({ darkMode, mode, speechInput, isListening, islResponse }) => {
  const [currentAnimation, setCurrentAnimation] = useState(null);
  
  // Process incoming ISL response from the socket context
  useEffect(() => {
    if (islResponse && islResponse.animationName) {
      setCurrentAnimation(islResponse.animationName);
    }
  }, [islResponse]);
  
  // Visual indicator for listening state
  const listeningIndicator = isListening && (
    <div className="absolute top-4 right-4 flex items-center">
      <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
      <span className="text-sm font-medium">Listening</span>
    </div>
  );

  return (
    <div className="h-full w-full relative">
      {/* 3D Model rendering */}
      <ISLModel darkMode={darkMode} animationToPlay={currentAnimation} />
      
      {/* Listening indicator */}
      {listeningIndicator}
      
      {/* Current speech being processed - moved to parent component */}
    </div>
  );
};

export default ISLViewer;