import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Camera } from 'lucide-react';

const FaceAuth = ({ emailOrPhone, darkMode }) => {
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Loading face model...");
  const [isScanning, setIsScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);
  
  // Liveness detection states
  const [livenessCheck, setLivenessCheck] = useState({
    inProgress: false,
    passed: false,
    blinksDetected: 0,
    lastEyeState: null,
    eyeStateHistory: [],
    textureScore: 0
  });
  
  const webcamRef = useRef(null);
  const faceDetectionInterval = useRef(null);
  const canvasRef = useRef(null);
  
  // Store frame history for movement analysis
  const frameHistory = useRef([]);
  
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setStatusMessage("Ready to scan. Click the button to start.");
      } catch (error) {
        console.error("Error loading face-api models:", error);
        setStatusMessage("Error loading face models. Please refresh.");
      }
    };

    loadModels();
    
    return () => {
      // Clean up interval on component unmount
      if (faceDetectionInterval.current) {
        clearInterval(faceDetectionInterval.current);
      }
    };
  }, []);

  const startFaceScanning = () => {
    if (isScanning || !emailOrPhone) return;
    
    if (!emailOrPhone.trim()) {
      setStatusMessage("⚠️ Please enter your email or phone first");
      return;
    }
    
    setIsScanning(true);
    setStatusMessage("🔍 Looking for your face...");
    resetLivenessCheck();
    
    // Start continuous face detection
    faceDetectionInterval.current = setInterval(detectFace, 150);
  };

  const resetLivenessCheck = () => {
    setLivenessCheck({
      inProgress: true,
      passed: false,
      blinksDetected: 0,
      lastEyeState: null,
      eyeStateHistory: [],
      textureScore: 0
    });
  };

  const stopFaceScanning = () => {
    setIsScanning(false);
    if (faceDetectionInterval.current) {
      clearInterval(faceDetectionInterval.current);
      faceDetectionInterval.current = null;
    }
  };

  const detectFace = async () => {
    if (!webcamRef.current || !webcamRef.current.video || 
        webcamRef.current.video.readyState !== 4) {
      return;
    }
    
    try {
      const video = webcamRef.current.video;
      
      // Detect face
      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (detection) {
        setFaceDetected(true);
        
        // Check liveness if a face is detected
        if (livenessCheck.inProgress && !livenessCheck.passed) {
          const livenessResult = await detectFaceAndLiveness(detection);
          
          // Update liveness texture score
          setLivenessCheck(prev => ({
            ...prev,
            textureScore: livenessResult.textureScore
          }));
          
          if (livenessResult.isLivenessConfirmed) {
            setLivenessCheck(prev => ({
              ...prev,
              passed: true,
              inProgress: false
            }));
            
            setStatusMessage("👍 Face verification complete!");
            
            // Save face descriptor for login
            setFaceDescriptor(detection.descriptor);
          } else {
            if (livenessResult.isBlinkDetected) {
              setStatusMessage("👁️ Blink detected! Completing verification...");
            } else if (livenessCheck.blinksDetected > 0) {
              setStatusMessage("👁️ Blink again to verify...");
            } else {
              setStatusMessage("Please blink for verification");
            }
          }
        } else if (livenessCheck.passed) {
          // If liveness already passed, just update descriptor
          setFaceDescriptor(detection.descriptor);
        }
      } else {
        setFaceDetected(false);
        setStatusMessage("🔍 Position your face in the camera");
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
  };

  const EAR_THRESHOLD = 0.29; // Adjusted to detect actual blinks
  const MAX_HISTORY = 10;  // Keep track of last 10 eye states

  let eyeStateHistory = [];  // Persistent history storage

  const detectBlink = (landmarks) => {
    if (!landmarks) return { blinkDetected: false, eyeState: null, eyeHistory: [] };
    
    try {
      // Get eye landmarks
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      // Calculate EAR for both eyes
      const leftEAR = calculateEyeAspectRatio(leftEye);
      const rightEAR = calculateEyeAspectRatio(rightEye);
      
      // Average of both eyes
      const avgEAR = (leftEAR + rightEAR) / 2;
      
      // Current eye state (open or closed)
      const currentEyeState = avgEAR < EAR_THRESHOLD ? 'closed' : 'open';
      
      // Add to history
      if (eyeStateHistory.length >= MAX_HISTORY) {
        eyeStateHistory.shift(); // Remove oldest entry
      }
      eyeStateHistory.push({ state: currentEyeState, ear: avgEAR });
      
      // Check for blink pattern (open -> closed -> open)
      // Need at least 3 frames of history
      if (eyeStateHistory.length >= 3) {
        const recentHistory = eyeStateHistory.slice(-5); // Look at last 5 frames
        
        // Find sequences that have eyes closed in the middle
        let blinkDetected = false;
        
        for (let i = 1; i < recentHistory.length - 1; i++) {
          const prevState = recentHistory[i-1].state;
          const currentState = recentHistory[i].state;
          const nextState = recentHistory[i+1].state;
          
          if (prevState === 'open' && currentState === 'closed' && nextState === 'open') {
            blinkDetected = true;
            break;
          }
        }
        
        return { 
          blinkDetected, 
          eyeState: currentEyeState, 
          eyeHistory: eyeStateHistory,
          earValue: avgEAR 
        };
      }
      
      return { 
        blinkDetected: false, 
        eyeState: currentEyeState, 
        eyeHistory: eyeStateHistory,
        earValue: avgEAR 
      };
    } catch (error) {
      console.error("Error in blink detection:", error);
      return { blinkDetected: false, eyeState: null, eyeHistory: eyeStateHistory };
    }
  };

  // Helper function to calculate Eye Aspect Ratio
  const calculateEyeAspectRatio = (eyePoints) => {
    try {
      // Vertical eye landmarks
      const p2_p6 = calculateDistance(eyePoints[1], eyePoints[5]);
      const p3_p5 = calculateDistance(eyePoints[2], eyePoints[4]);
      
      // Horizontal eye landmark
      const p1_p4 = calculateDistance(eyePoints[0], eyePoints[3]);
      
      // Eye Aspect Ratio
      return (p2_p6 + p3_p5) / (2.0 * p1_p4);
    } catch (error) {
      console.error("Error calculating EAR:", error);
      return 0.3; // Default value (eyes open)
    }
  };

  // Euclidean distance function
  const calculateDistance = (point1, point2) => {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + 
      Math.pow(point2.y - point1.y, 2)
    );
  };
  
  const detectSpoofing = async (video, detection) => {
    // Basic spoofing detection logic
    // (In a production app, this would be more sophisticated)
    return false; // Return true if spoofing is detected
  };
  
  // Function to perform texture analysis to detect real skin vs photo
  const checkFaceTexture = async (video, detection) => {
    if (!canvasRef.current) return 0;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Make sure canvas dimensions match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Extract face region
      const box = detection.detection.box;
      const faceImageData = ctx.getImageData(
        box.x, box.y, box.width, box.height
      );
      
      // Calculate standard deviation of pixel values as a texture measure
      const data = faceImageData.data;
      let sum = 0;
      let sumSquared = 0;
      let count = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const gray = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
        sum += gray;
        sumSquared += gray * gray;
        count++;
      }
      
      if (count === 0) return 0;
      
      const mean = sum / count;
      const variance = (sumSquared / count) - (mean * mean);
      const stdDev = Math.sqrt(Math.max(0, variance)); // Avoid negative under sqrt
      
      // Adjusted thresholds for more reliability
      const MIN_EXPECTED_STDDEV = 8;  // Typical for flat images
      const MAX_EXPECTED_STDDEV = 45; // Typical for real faces with natural texture
      
      const normalizedScore = Math.min(100, Math.max(0, 
        ((stdDev - MIN_EXPECTED_STDDEV) / (MAX_EXPECTED_STDDEV - MIN_EXPECTED_STDDEV)) * 100
      ));
      
      return normalizedScore;
    } catch (error) {
      console.error("Error in texture analysis:", error);
      return 0;
    }
  };

  // Function to perform comprehensive liveness detection
  const detectFaceAndLiveness = async (detection) => {
    if (!detection || !webcamRef.current || !webcamRef.current.video) {
      return { 
        isLivenessConfirmed: false,
        isBlinkDetected: false,
        textureScore: 0,
        isSpoofingDetected: false
      };
    }

    try {
      // 1. Eye blink detection
      const blinkResult = detectBlink(detection.landmarks);
    
      // Check if a new blink was detected
      const newBlinkDetected = blinkResult.blinkDetected;
      
      // Calculate total blinks detected
      const totalBlinksDetected = newBlinkDetected 
        ? (livenessCheck.blinksDetected || 0) + 1 
        : (livenessCheck.blinksDetected || 0);
      
      // Update state with new eye state history and blink count
      setLivenessCheck(prev => ({
        ...prev,
        eyeStateHistory: blinkResult.eyeHistory,
        lastEyeState: blinkResult.eyeState,
        blinksDetected: totalBlinksDetected
      }));
      
      // Use the updated blink count for further checks
      const isBlinkDetected = newBlinkDetected || totalBlinksDetected >= 2;
      
      // 2. Texture analysis
      const textureScore = await checkFaceTexture(webcamRef.current.video, detection);
      
      // 3. Spoofing detection
      const isSpoofingDetected = await detectSpoofing(webcamRef.current.video, detection);
      
      // Combined liveness determination
      // Criteria: At least one blink detected, good texture score, and no spoofing
      const isTextureValid = textureScore > 55;
      const isLivenessConfirmed = (isBlinkDetected || totalBlinksDetected >= 2) && 
                               isTextureValid && 
                               !isSpoofingDetected;
      
      return {
        isBlinkDetected,
        textureScore,
        isSpoofingDetected,
        isTextureValid,
        isLivenessConfirmed
      };
    } catch (error) {
      console.error("Error in liveness detection:", error);
      return { 
        isLivenessConfirmed: false,
        isBlinkDetected: false,
        textureScore: 0,
        isSpoofingDetected: false,
        error: error.message
      };
    }
  };

  return (
    <div className="flex flex-col items-center">
      <p className="mb-4 text-center">
        Please ensure your face is visible in the camera for authentication.
      </p>
      
      <div className="relative w-full mb-4">
        <Webcam 
          ref={webcamRef} 
          screenshotFormat="image/jpeg" 
          className="w-full rounded"
          mirrored={true}
        />
        {isScanning && (
          <div className={`absolute inset-0 border-4 ${
            faceDetected ? 'border-green-500' : 'border-red-500'
          } ${livenessCheck.passed ? 'border-green-700' : 'animate-pulse'} rounded`}></div>
        )}
        
        {/* Hidden canvas for texture analysis */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      {!isScanning ? (
        <button
          onClick={startFaceScanning}
          className={`flex items-center px-4 py-2 rounded-lg ${
            darkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } transition duration-200`}
          disabled={authInProgress || !emailOrPhone}
        >
          <Camera size={18} className="mr-2" />
          Authenticate with Face
        </button>
      ) : (
        <button 
          onClick={stopFaceScanning}
          className={`px-4 py-2 rounded-lg ${
            darkMode
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          } transition duration-200`}
        >
          Cancel Face Scan
        </button>
      )}
      
      <p className={`mt-2 text-sm ${
        statusMessage.includes("✅") || statusMessage.includes("👍") ? 
          (darkMode ? "text-green-400" : "text-green-600") : 
        statusMessage.includes("❌") ? 
          (darkMode ? "text-red-400" : "text-red-600") : 
        statusMessage.includes("⚠️") ? 
          (darkMode ? "text-yellow-400" : "text-yellow-600") : 
          (darkMode ? "text-gray-300" : "text-gray-600")
      }`}>
        {statusMessage}
      </p>
      
      {isScanning && livenessCheck.inProgress && !livenessCheck.passed && (
        <div className="mt-2 flex items-center text-xs w-full">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className={`${darkMode ? "bg-blue-500" : "bg-blue-600"} h-2.5 rounded-full`} style={{ 
              width: `${Math.min(100, 
                livenessCheck.blinksDetected * 40 + 
                (livenessCheck.textureScore > 60 ? 60 : livenessCheck.textureScore * 0.6)
              )}%` 
            }}></div>
          </div>
          <span className={`ml-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Verifying</span>
        </div>
      )}
      
      {livenessCheck.passed && (
        <div className={`mt-2 ${darkMode ? "text-green-400" : "text-green-600"} text-xs flex items-center`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Face authentication verified
        </div>
      )}
    </div>
  );
};

export default FaceAuth;