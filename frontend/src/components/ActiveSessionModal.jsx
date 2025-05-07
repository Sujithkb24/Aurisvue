import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const ActiveSessionModal = ({ 
  userRole, 
  activeSession, 
  onContinueSession, 
  onCreateNewClass, 
  isLoading,
  darkMode = false
}) => {
  const [showModal, setShowModal] = useState(false);
  
  // Show modal when active session is detected and user is a teacher
  useEffect(() => {
    if (userRole === 'teacher' && activeSession && !isLoading) {
      setShowModal(true);
    }
  }, [userRole, activeSession, isLoading]);
  
  const handleContinueSession = () => {
    if (activeSession) {
      onContinueSession(activeSession);
      setShowModal(false);
    }
  };
  
  const handleCreateNewClass = () => {
    onCreateNewClass();
    setShowModal(false);
  };
  
  // If not showing modal or not a teacher, don't render anything
  if (!showModal || userRole !== 'teacher') {
    return null;
  }
  
  // Dynamic styles based on dark mode
  const modalBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const secondaryBtnClass = darkMode 
    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
    : 'bg-gray-200 hover:bg-gray-300 text-gray-800';
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${modalBgClass} rounded-lg p-6 w-full max-w-md`}>
        <h2 className={`text-xl font-bold mb-4 ${textClass}`}>Active Class Session Found</h2>
        
        <p className={`mb-6 ${textClass}`}>
          You have an active class session: <span className="font-semibold">{activeSession?.name || 'Unnamed Class'}</span> 
          with code <span className="font-semibold">{activeSession?.code}</span>.
        </p>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleContinueSession}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex-1"
          >
            Continue Session
          </button>
          
          <button
            onClick={handleCreateNewClass}
            className={`${secondaryBtnClass} py-2 px-4 rounded-md flex-1`}
          >
            Create New Class
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveSessionModal;