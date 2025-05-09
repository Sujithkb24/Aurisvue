import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import React from 'react';
export default function ChatbotIcon() {
  const [isHovered, setIsHovered] = useState(false);
const navigate = useNavigate();
  const handleClick = () => {
    // You can replace this with your navigation logic
    console.log("Navigating to chatbot route");
    // If you're using React Router, you would use:
    navigate('/chatbot');
    // or window.location.href = '/chatbot';
  };

  return (
    <div className="fixed left-8 bottom-8 z-50">
      <div
        className={`relative flex items-center justify-center w-16 h-16 rounded-full cursor-pointer shadow-lg transition-all duration-300 ${
          isHovered ? 'transform scale-110 bg-indigo-800 shadow-xl' : 'bg-indigo-900'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {/* Tooltip */}
        <div
          className={`absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900/50 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all duration-300 border border-gray-700 shadow-md pointer-events-none ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
        >
          AI chatbot: convert anything to ISL
        </div>

        {/* Robot Face */}
        <div className="flex flex-col items-center">
          <div className="relative w-7 h-6 bg-white rounded mb-1">
            {/* Antenna */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-white rounded-full"></div>
            <div
              className={`absolute -top-3 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                isHovered ? 'bg-orange-500 animate-pulse' : 'bg-white' 
              }`}
            ></div>
            
            {/* Eyes */}
            <div className="flex justify-around pt-1">
              <div 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isHovered ? 'bg-orange-500 animate-pulse' : 'bg-indigo-600'
                }`}
              ></div>
              <div 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isHovered ? 'bg-orange-500 animate-pulse' : 'bg-indigo-600'
                }`}
              ></div>
            </div>
            
            {/* Mouth */}
            <div 
              className={`mx-auto mt-1 rounded-sm transition-all duration-300 ${
                isHovered ? 'w-4 h-1 bg-orange-500' : 'w-3 h-1 bg-indigo-600'
              }`}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}