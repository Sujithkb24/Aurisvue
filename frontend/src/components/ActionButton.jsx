import React, { useState } from 'react';
import { Mic, Info, Settings, X, BookOpen, ExternalLink, Home } from 'lucide-react';
import styled from 'styled-components';
import ModeSelector from './mode-select'; // Import the ModeSelector component

const FloatingActionButton = ({ darkMode, navigateToMode, activeMode, navigateToHome }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Close mode selector if open
    if (showModeSelector) setShowModeSelector(false);
  };

  const toggleActive = () => {
    setIsActive(!isActive);
  };

  const toggleModeSelector = () => {
    setShowModeSelector(!showModeSelector);
    // Close main menu if open
    if (isExpanded) setIsExpanded(false);
  };

  const handleModeChange = (mode) => {
    if (navigateToMode) {
      navigateToMode(mode);
    }
    setShowModeSelector(false);
  };

  const handleActionClick = (action) => {
    // Handle different actions
    switch (action) {
      case 'translate':
        toggleActive();
        // Implement translation activation logic here
        console.log('Translation toggled:', !isActive);
        break;
      case 'modes':
        toggleModeSelector();
        break;
      case 'home':
        if (navigateToHome) {
          navigateToHome();
        }
        break;
      case 'info':
        // Show information/help modal
        console.log('Info clicked');
        break;
      case 'settings':
        // Open settings
        console.log('Settings clicked');
        break;
      default:
        break;
    }
    
    // Collapse the menu after action (except for modes)
    if (action !== 'modes') {
      setIsExpanded(false);
    }
  };

  return (
    <StyledFAB darkMode={darkMode}>
      {/* Mode Selector Overlay */}
      {showModeSelector && (
        <div className="mode-selector">
          <h3 className="mode-title">Switch Mode</h3>
          <ModeSelector 
            activeMode={activeMode} 
            setActiveMode={(mode) => handleModeChange(mode)} 
            darkMode={darkMode} 
          />
          <CloseButton 
            onClick={() => setShowModeSelector(false)}
            darkMode={darkMode}
          >
            <X size={18} />
          </CloseButton>
        </div>
      )}
      
      {/* Main FAB Container */}
      <div className={`fab-container ${isExpanded ? 'expanded' : ''}`}>
        {isExpanded && (
          <div className="fab-options">
            <ActionButton 
              onClick={() => handleActionClick('translate')} 
              className={`action-button ${isActive ? 'active' : ''}`}
              darkMode={darkMode}
            >
              <Mic size={20} />
              <span className="tooltip">Start Translation</span>
            </ActionButton>
            
            <ActionButton 
              onClick={() => handleActionClick('modes')} 
              className="action-button"
              darkMode={darkMode}
            >
              <BookOpen size={20} />
              <span className="tooltip">Switch Mode</span>
            </ActionButton>

            <ActionButton 
              onClick={() => handleActionClick('home')} 
              className="action-button"
              darkMode={darkMode}
            >
              <Home size={20} />
              <span className="tooltip">Go Home</span>
            </ActionButton>
            
            <ActionButton 
              onClick={() => handleActionClick('info')} 
              className="action-button"
              darkMode={darkMode}
            >
              <Info size={20} />
              <span className="tooltip">Help</span>
            </ActionButton>
            
            <ActionButton 
              onClick={() => handleActionClick('settings')} 
              className="action-button"
              darkMode={darkMode}
            >
              <Settings size={20} />
              <span className="tooltip">Settings</span>
            </ActionButton>
          </div>
        )}
        
        <MainButton 
          onClick={toggleExpand} 
          className="main-button full-rounded"
          darkMode={darkMode}
        >
          {isExpanded ? <X size={24} /> : <Mic size={24} />}
          <div className="border full-rounded" />
        </MainButton>
      </div>
    </StyledFAB>
  );
};

// Styled components
const StyledFAB = styled.div`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 999;
  
  .fab-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .fab-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
    transition: all 0.3s ease;
  }

  .tooltip {
    position: absolute;
    right: 4rem;
    background: ${props => props.darkMode ? '#374151' : '#f3f4f6'};
    color: ${props => props.darkMode ? '#ffffff' : '#1f2937'};
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }
  
  .action-button:hover .tooltip {
    opacity: 1;
  }

  .active {
    background: #ef4444 !important;
    svg {
      color: white;
    }
  }
  
  /* Mode Selector Styling */
  .mode-selector {
    position: absolute;
    bottom: 5rem;
    right: 0;
    width: 16rem;
    padding: 1rem;
    background: ${props => props.darkMode ? '#1f2937' : '#ffffff'};
    border-radius: 1rem;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.2);
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .mode-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: ${props => props.darkMode ? '#e5e7eb' : '#374151'};
  }
`;

const MainButton = styled.button`
  font-size: 16px;
  position: relative;
  width: 3.5rem;
  height: 3.5rem;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.darkMode ? '#3b82f6' : '#60a5fa'};
  color: white;
  transition: all 0.1s linear;
  box-shadow: 0 0.4em 1em rgba(0, 0, 0, 0.2);
  cursor: pointer;
  
  &:active {
    transform: scale(0.95);
  }
  
  .border {
    position: absolute;
    border: 0.15em solid ${props => props.darkMode ? '#2563eb' : '#3b82f6'};
    transition: all 0.3s 0.08s linear;
    top: 50%;
    left: 50%;
    width: 3.5rem;
    height: 3.5rem;
    transform: translate(-50%, -50%);
  }
  
  &:hover .border {
    width: 4rem;
    height: 4rem;
  }
  
  &.full-rounded {
    border-radius: 50%;
  }
`;

const ActionButton = styled.button`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.darkMode ? '#1f2937' : '#ffffff'};
  color: ${props => props.darkMode ? '#ffffff' : '#4b5563'};
  border: none;
  box-shadow: 0 0.2em 0.5em rgba(0, 0, 0, 0.15);
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: ${props => props.darkMode ? '#9ca3af' : '#6b7280'};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.darkMode ? '#f3f4f6' : '#111827'};
  }
`;

export default FloatingActionButton;