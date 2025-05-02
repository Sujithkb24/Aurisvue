import React,{ useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, ChevronUp, Smartphone, Tablet, Monitor, 
         PlayCircle, Download, X, Info, HelpCircle, CheckCircle } from 'lucide-react';
import Header from '../header';

const PluginActivation = ({ darkMode = true, onContinue }) => {
  const [platform, setPlatform] = useState('android'); // android, ios, other
  const [setupStep, setSetupStep] = useState(1);
  const [permissionsGranted, setPermissionsGranted] = useState({
    microphone: false,
    accessibility: false,
    overlay: false, // Android specific
    screenRecording: false, // iOS specific
  });
  const [installedApp, setInstalledApp] = useState(false);
  const [showInstructions, setShowInstructions] = useState({
    android: true,
    ios: true,
    other: true
  });

  // Check for existing permissions
  useEffect(() => {
    // Check if microphone permission is already granted
    navigator.permissions?.query({ name: 'microphone' })
      .then(result => {
        if (result.state === 'granted') {
          setPermissionsGranted(prev => ({ ...prev, microphone: true }));
        }
      })
      .catch(err => console.log('Permission API not supported'));
      
    // Check if app is installed (PWA detection)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalledApp(true);
    }
  }, []);

  // Detect platform
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // iOS detection
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setPlatform('ios');
      return;
    }
    
    // Android detection
    if (/android/i.test(userAgent)) {
      setPlatform('android');
      return;
    }
    
    // Default to other
    setPlatform('other');
  }, []);

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop tracks after permission check
      setPermissionsGranted(prev => ({ ...prev, microphone: true }));
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  };

  // Simulate accessibility service enabling
  const enableAccessibilityService = () => {
    // In a real app, we would direct users to the accessibility settings
    // For this demo, we'll just simulate it with a confirmation
    const confirmed = window.confirm(
      'This will open your device settings. Please enable "ISL Translator" in the Accessibility Services section. Press OK to continue.'
    );
    
    if (confirmed) {
      // In a real app, we'd use deep linking to open settings
      // For Android: window.location.href = 'android-app://com.android.settings/accessibility';
      // For iOS: window.location.href = 'app-settings:';
      
      // Simulate successful enabling after timeout
      setTimeout(() => {
        setPermissionsGranted(prev => ({ ...prev, accessibility: true }));
      }, 1000);
    }
  };

  // Request overlay permission (Android)
  const requestOverlayPermission = () => {
    // In a real app, we would direct users to the overlay settings
    const confirmed = window.confirm(
      'This will open your device settings. Please enable "Display over other apps" for ISL Translator. Press OK to continue.'
    );
    
    if (confirmed) {
      // In a real app: window.location.href = 'package:com.android.settings';
      
      // Simulate successful enabling
      setTimeout(() => {
        setPermissionsGranted(prev => ({ ...prev, overlay: true }));
      }, 1000);
    }
  };

  // Request screen recording permission (iOS)
  const requestScreenRecordingPermission = () => {
    // In a real app, we would use the ReplayKit framework via a native bridge
    const confirmed = window.confirm(
      'ISL Translator needs to capture your screen to provide real-time translation. You\'ll be prompted to start screen recording when you begin translation. Press OK to continue.'
    );
    
    if (confirmed) {
      // Simulate successful permission
      setPermissionsGranted(prev => ({ ...prev, screenRecording: true }));
    }
  };

  // Install as PWA
  const installApp = () => {
    // Check if we can install as PWA
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setInstalledApp(true);
        }
        window.deferredPrompt = null;
      });
    } else {
      // Otherwise show manual installation instructions
      const confirmed = window.confirm(
        'To install: Tap the share button and select "Add to Home Screen". Would you like to see detailed instructions?'
      );
      
      if (confirmed) {
        // Show detailed instructions (not implemented in this demo)
        console.log('Show detailed installation instructions');
      }
    }
  };

  // Move to next setup step
  const nextStep = () => {
    if (setupStep < getTotalSteps()) {
      setSetupStep(setupStep + 1);
    } else {
      // All steps completed, continue to the plugin
      onContinue();
    }
  };

  // Go back to previous setup step
  const prevStep = () => {
    if (setupStep > 1) {
      setSetupStep(setupStep - 1);
    }
  };

  // Get total number of setup steps based on platform
  const getTotalSteps = () => {
    switch (platform) {
      case 'android':
        return 3; // Microphone, Accessibility, Overlay
      case 'ios':
        return 3; // Microphone, Accessibility, Screen Recording
      default:
        return 2; // Microphone, Installation
    }
  };

  // Toggle platform-specific instructions
  const toggleInstructions = (platform) => {
    setShowInstructions(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  // Check if current step is complete
  const isCurrentStepComplete = () => {
    switch (platform) {
      case 'android':
        if (setupStep === 1) return permissionsGranted.microphone;
        if (setupStep === 2) return permissionsGranted.accessibility;
        if (setupStep === 3) return permissionsGranted.overlay;
        return false;
      case 'ios':
        if (setupStep === 1) return permissionsGranted.microphone;
        if (setupStep === 2) return permissionsGranted.accessibility;
        if (setupStep === 3) return permissionsGranted.screenRecording;
        return false;
      default:
        if (setupStep === 1) return permissionsGranted.microphone;
        if (setupStep === 2) return installedApp;
        return false;
    }
  };

  // Get current step action
  const getCurrentStepAction = () => {
    switch (platform) {
      case 'android':
        if (setupStep === 1) return requestMicrophonePermission;
        if (setupStep === 2) return enableAccessibilityService;
        if (setupStep === 3) return requestOverlayPermission;
        return () => {};
      case 'ios':
        if (setupStep === 1) return requestMicrophonePermission;
        if (setupStep === 2) return enableAccessibilityService;
        if (setupStep === 3) return requestScreenRecordingPermission;
        return () => {};
      default:
        if (setupStep === 1) return requestMicrophonePermission;
        if (setupStep === 2) return installApp;
        return () => {};
    }
  };

  // Get current step title
  const getCurrentStepTitle = () => {
    switch (platform) {
      case 'android':
        if (setupStep === 1) return "Enable Microphone";
        if (setupStep === 2) return "Enable Accessibility Service";
        if (setupStep === 3) return "Allow Display Over Apps";
        return "";
      case 'ios':
        if (setupStep === 1) return "Enable Microphone";
        if (setupStep === 2) return "Enable Accessibility Features";
        if (setupStep === 3) return "Enable Screen Recording";
        return "";
      default:
        if (setupStep === 1) return "Enable Microphone";
        if (setupStep === 2) return "Install Application";
        return "";
    }
  };

  // Get current step description
  const getCurrentStepDescription = () => {
    switch (platform) {
      case 'android':
        if (setupStep === 1) return "We need microphone access to capture audio from videos for ISL translation.";
        if (setupStep === 2) return "The accessibility service allows us to detect video content and provide real-time translation without requiring specific app integrations.";
        if (setupStep === 3) return "This allows the ISL avatar to appear over your videos in any app.";
        return "";
      case 'ios':
        if (setupStep === 1) return "We need microphone access to capture audio from videos for ISL translation.";
        if (setupStep === 2) return "Adding ISL Translator to accessibility features allows it to work with system videos.";
        if (setupStep === 3) return "Screen recording permission is needed to capture video content for translation.";
        return "";
      default:
        if (setupStep === 1) return "We need microphone access to capture audio from videos for ISL translation.";
        if (setupStep === 2) return "Installing as an app provides better performance and allows us to run in the background.";
        return "";
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Header title="Set Up ISL Plugin" showBackButton={false} darkMode={darkMode} />
      
      <div className="flex flex-col flex-1 overflow-auto p-4">
        {/* Platform Selection */}
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h2 className="text-lg font-semibold mb-3">Select Your Device</h2>
          
          <div className="flex justify-around">
            <button 
              onClick={() => setPlatform('android')} 
              className={`p-3 rounded-lg flex flex-col items-center ${platform === 'android' ? (darkMode ? 'bg-blue-900' : 'bg-blue-100') : (darkMode ? 'bg-gray-700' : 'bg-gray-200')}`}
            >
              <Smartphone size={32} className={platform === 'android' ? 'text-blue-500' : ''} />
              <span className="mt-1">Android</span>
            </button>
            
            <button 
              onClick={() => setPlatform('ios')} 
              className={`p-3 rounded-lg flex flex-col items-center ${platform === 'ios' ? (darkMode ? 'bg-blue-900' : 'bg-blue-100') : (darkMode ? 'bg-gray-700' : 'bg-gray-200')}`}
            >
              <Smartphone size={32} className={platform === 'ios' ? 'text-blue-500' : ''} />
              <span className="mt-1">iOS</span>
            </button>
            
            <button 
              onClick={() => setPlatform('other')} 
              className={`p-3 rounded-lg flex flex-col items-center ${platform === 'other' ? (darkMode ? 'bg-blue-900' : 'bg-blue-100') : (darkMode ? 'bg-gray-700' : 'bg-gray-200')}`}
            >
              <Monitor size={32} className={platform === 'other' ? 'text-blue-500' : ''} />
              <span className="mt-1">Other</span>
            </button>
          </div>
        </div>
        
        {/* Platform-specific Instructions */}
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">How It Works</h2>
            <button 
              onClick={() => toggleInstructions(platform)}
              className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              {showInstructions[platform] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {showInstructions[platform] && (
            <div className="mt-3">
              {platform === 'android' && (
                <div className="space-y-3">
                  <p>The ISL Plugin for Android works by creating an overlay on top of your video applications:</p>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Grant necessary permissions (microphone, accessibility, overlay)</li>
                    <li>Open any video app (YouTube, Netflix, etc.)</li>
                    <li>Tap the floating ISL button to activate translation</li>
                    <li>Position the ISL avatar where you want it on screen</li>
                    <li>The plugin will translate audio to ISL in real-time</li>
                  </ol>
                </div>
              )}
              
              {platform === 'ios' && (
                <div className="space-y-3">
                  <p>The ISL Plugin for iOS works through screen recording and accessibility features:</p>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Grant necessary permissions (microphone, accessibility)</li>
                    <li>Open any video app (YouTube, Netflix, etc.)</li>
                    <li>Start a screen recording when prompted</li>
                    <li>The ISL translation will appear in Picture-in-Picture mode</li>
                    <li>You can resize and move the ISL avatar as needed</li>
                  </ol>
                </div>
              )}
              
              {platform === 'other' && (
                <div className="space-y-3">
                  <p>The ISL Plugin for other devices works as a browser extension or standalone app:</p>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Install the plugin as a web app or browser extension</li>
                    <li>Grant microphone permission when prompted</li>
                    <li>Open any video site in your browser</li>
                    <li>Click the ISL button in your browser to activate translation</li>
                    <li>The video and ISL translation will appear side-by-side</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Setup Process - Step by Step */}
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h2 className="text-lg font-semibold mb-4">Setup Process: Step {setupStep} of {getTotalSteps()}</h2>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-start">
              <div className={`mr-3 p-2 rounded-full ${isCurrentStepComplete() ? 'bg-green-500' : (darkMode ? 'bg-blue-600' : 'bg-blue-500')}`}>
                {isCurrentStepComplete() ? <CheckCircle size={24} /> : <Info size={24} />}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{getCurrentStepTitle()}</h3>
                <p className="text-sm opacity-80 mt-1">{getCurrentStepDescription()}</p>
                
                <button
                  onClick={getCurrentStepAction()}
                  className={`mt-4 px-4 py-2 rounded-lg text-white ${isCurrentStepComplete() 
                    ? (darkMode ? 'bg-green-600' : 'bg-green-500')
                    : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')}`}
                >
                  {isCurrentStepComplete() ? "Completed" : `Enable ${getCurrentStepTitle()}`}
                </button>
              </div>
            </div>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={setupStep === 1}
              className={`px-4 py-2 rounded-lg ${setupStep === 1 
                ? (darkMode ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-gray-300 opacity-50 cursor-not-allowed') 
                : (darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400')}`}
            >
              Previous
            </button>
            
            <button
              onClick={nextStep}
              disabled={!isCurrentStepComplete()}
              className={`px-4 py-2 rounded-lg text-white ${!isCurrentStepComplete() 
                ? (darkMode ? 'bg-gray-600 opacity-50 cursor-not-allowed' : 'bg-gray-500 opacity-50 cursor-not-allowed')
                : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')}`}
            >
              {setupStep === getTotalSteps() ? "Finish" : "Next"}
            </button>
          </div>
        </div>
        
        {/* Help & Support */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-start">
            <HelpCircle size={24} className="mr-3 text-blue-500" />
            <div>
              <h3 className="font-semibold">Need Help?</h3>
              <p className="text-sm opacity-80 mt-1">
                If you're having trouble setting up the ISL Plugin, please visit our support page or contact us for assistance.
              </p>
              <button className={`mt-2 text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                View Setup FAQs
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Skip setup for testing - In production this would be removed */}
      <div className="p-4 text-center">
        <button 
          onClick={onContinue}
          className={`text-sm ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}
        >
          Skip setup for testing
        </button>
      </div>
    </div>
  );
};

export default PluginActivation;