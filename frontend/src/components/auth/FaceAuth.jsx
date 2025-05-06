import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Camera } from 'lucide-react';

const FaceAuth = ({
  emailOrPhone,
  darkMode,
  isSetup = false, //to differentiate login vs signup
  onFaceDetected,  //callback prop to send face data to parent
  onStatusChange,  //callback to send status messages to parent
  onProgressChange //callback to send progress percentage to parent
}) => {
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [webcamInitialized, setWebcamInitialized] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanAttempted, setScanAttempted] = useState(0);
 
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
  const frameHistory = useRef([]);
  const eyeStateHistory = useRef([]);
  const videoReadyChecker = useRef(null);
 
  // Send status messages to parent when they change
  useEffect(() => {
    if (onStatusChange && statusMessage) {
      onStatusChange(statusMessage);
    }
  }, [statusMessage, onStatusChange]);

  // Send progress updates to parent
  useEffect(() => {
    if (onProgressChange) {
      // Calculate progress percentage based on blinks and texture score
      const progressPercentage = livenessCheck.passed ?
        100 : // Always 100% when passed
        Math.min(95, // Cap at 95% until fully passed
          livenessCheck.blinksDetected * 40 +
          (livenessCheck.textureScore > 60 ? 55 : livenessCheck.textureScore * 0.55)
        );
      onProgressChange(progressPercentage);
    }
  }, [livenessCheck, onProgressChange]);
 
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("Loading face-api models...");
        setStatusMessage("Getting ready for you...");
       
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
       
        console.log("Face-api models loaded successfully");
        setModelsLoaded(true);
        setStatusMessage(webcamInitialized ? "Ready to scan your face" : "Models loaded, waiting for camera...");
       
        if (webcamInitialized) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading face-api models:", error);
        setStatusMessage("Error loading face detection models");
        setIsLoading(false);
      }
    };

    loadModels();
   
    return () => {
      // Clean up interval on component unmount
      if (faceDetectionInterval.current) {
        clearInterval(faceDetectionInterval.current);
      }
     
      if (videoReadyChecker.current) {
        clearInterval(videoReadyChecker.current);
      }
    };
  }, []);
 
  // Effect to update loading state when both webcam and models are ready
  useEffect(() => {
    if (webcamInitialized && modelsLoaded) {
      console.log("Both webcam and models are ready");
      setIsLoading(false);
      setStatusMessage("Ready to scan your face");
    }
  }, [webcamInitialized, modelsLoaded]);

  // Clean up interval when component unmounts or on re-renders
  useEffect(() => {
    return () => {
      if (faceDetectionInterval.current) {
        clearInterval(faceDetectionInterval.current);
        faceDetectionInterval.current = null;
      }
     
      if (videoReadyChecker.current) {
        clearInterval(videoReadyChecker.current);
        videoReadyChecker.current = null;
      }
    };
  }, [scanAttempted]);

  // Helper function to verify webcam is fully ready
  const isWebcamFullyReady = () => {
    const isReady = webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4;
   
    // For debugging
    if (isReady) {
      console.log("Webcam ready check passed, dimensions:",
        webcamRef.current.video.videoWidth,
        webcamRef.current.video.videoHeight);
    }
   
    return isReady;
  };

  const startFaceScanning = () => {
    

    if (!webcamRef.current || !webcamRef.current.video) {
        setStatusMessage("⚠️ Webcam not available.");
        return;
    }

 

    setIsScanning(true);
    setFaceDetected(false);
    setStatusMessage("👀 Looking for face...");

    // Reset liveness check
    setLivenessCheck({
        inProgress: true,
        passed: false,
        blinksDetected: 0,
        headMovementsDetected: 0,
        eyeStateHistory: [],
        headPositionHistory: [],
        textureScore: 0
    });

    // Start face detection loop
    faceDetectionInterval.current = setInterval(async () => {
        try {
            const detection = await detectFace();

            if (!detection) {
                if (!faceDetected) {
                    setStatusMessage("⚠️ No face detected. Adjust your camera. Place yourself against light.");
                }
                return;
            }

            setFaceDetected(true);
            setStatusMessage("👍 Face detected! Verifying...");

            // Process detection for liveness checks
            const livenessResult = await detectFaceAndLiveness(detection);

            if (livenessResult.isLivenessConfirmed) {
                clearInterval(faceDetectionInterval.current); // Stop detection loop
                setLivenessCheck({
                    inProgress: false,
                    passed: true,
                    textureScore: livenessResult.textureScore || 100
                });
                setStatusMessage("✅ Liveness check passed! Logging in...");

                // Auto-login after liveness check passes
                onFaceDetected(Array.from(detection.descriptor));

            } else if (livenessResult.isSpoofingDetected) {
                setStatusMessage("❌ Possible spoofing detected. Please try again.");
                resetLivenessCheck();
            } else {
                // Update liveness check progress
                setLivenessCheck(prev => ({
                    ...prev,
                    blinksDetected: livenessResult.isBlinkDetected ? prev.blinksDetected + 1 : prev.blinksDetected,
                    textureScore: livenessResult.textureScore || prev.textureScore
                }));

                // Update status message based on progress
                if (livenessResult.textureScore < 50) {
                    setStatusMessage("⚠️ Please face the camera directly with good lighting.");
                } else if (!livenessResult.isBlinkDetected && livenessCheck.blinksDetected < 2) {
                    setStatusMessage("👁️ Please blink normally to confirm liveness.");
                } else {
                    setStatusMessage("👍 Verifying... please remain still.");
                }
            }
        } catch (error) {
            console.error("Error during face detection interval:", error);
            setStatusMessage("⚠️ Face detection error. Please try again.");
        }
    }, 1000);
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
    console.log("Stopping face scanning");
    setIsScanning(false);
    setStatusMessage("Face scanning stopped");
   
    if (faceDetectionInterval.current) {
      clearInterval(faceDetectionInterval.current);
      faceDetectionInterval.current = null;
    }
   
    if (videoReadyChecker.current) {
      clearInterval(videoReadyChecker.current);
      videoReadyChecker.current = null;
    }
  };

  const detectFace = async () => {

    
    if (!webcamRef.current || !webcamRef.current.video) {
      setStatusMessage("⚠️ Webcam not available.");
      return null;
    }

    try {
      const video = webcamRef.current.video;
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setFaceDetected(false);
        return null;
      }

      // Face detected
      setFaceDetected(true);
      
      // Extract face descriptor for later use
      setFaceDescriptor(Array.from(detection.descriptor));

      return detection;
    } catch (error) {
      console.error("Face detection error:", error);
      setFaceDetected(false);
      setStatusMessage("⚠️ Error during face detection");
      return null;
    }
  };


  const EAR_THRESHOLD = 0.25; // Adjusted to detect actual blinks
  const MAX_HISTORY = 10;  // Keep track of last 10 eye states

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
      if (eyeStateHistory.current.length >= MAX_HISTORY) {
        eyeStateHistory.current.shift(); // Remove oldest entry
      }
      eyeStateHistory.current.push({ state: currentEyeState, ear: avgEAR });
     
      // Check for blink pattern (open -> closed -> open)
      // Need at least 3 frames of history
      if (eyeStateHistory.current.length >= 3) {
        const recentHistory = eyeStateHistory.current.slice(-5); // Look at last 5 frames
       
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
          eyeHistory: eyeStateHistory.current,
          earValue: avgEAR
        };
      }
     
      return {
        blinkDetected: false,
        eyeState: currentEyeState,
        eyeHistory: eyeStateHistory.current,
        earValue: avgEAR
      };
    } catch (error) {
      console.error("Error in blink detection:", error);
      return { blinkDetected: false, eyeState: null, eyeHistory: eyeStateHistory.current };
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
    if (!canvasRef.current) return false;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Match canvas to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the detected face on canvas
      const box = detection.detection.box;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Extract face region
      const faceImageData = ctx.getImageData(box.x, box.y, box.width, box.height);
      const data = faceImageData.data;

      let brightnessSum = 0;
      let sharpnessSum = 0;
      let colorVariance = 0;
      let count = 0;
      let brightnessSquaredSum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];     // Red channel
        const g = data[i + 1]; // Green channel
        const b = data[i + 2]; // Blue channel

        // Convert to grayscale
        const brightness = (r + g + b) / 3;
        brightnessSum += brightness;
        brightnessSquaredSum += brightness ** 2;
        // Calculate color variation
        colorVariance += Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);

        // Compute sharpness using Laplacian filter (edge detection)
        if (i > 4 && i < data.length - 4) {
          sharpnessSum += Math.abs(brightness - ((data[i - 4] + data[i + 4]) / 2));
        }

        count++;
      }

      // Compute averages (avoid division by zero)
      if (count === 0) return false;
      
      const avgBrightness = brightnessSum / count;
      const avgSharpness = sharpnessSum / count;
      const avgColorVariance = colorVariance / count;
      const brightnessVariance = (brightnessSquaredSum / count) - (avgBrightness ** 2);

      // Adjusted thresholds for more reliable detection
      const BRIGHTNESS_THRESHOLD = 180;  // Lowered to flag screens that are too bright
const BRIGHTNESS_VARIANCE_THRESHOLD = 40;  // Increased for better detection
const SHARPNESS_THRESHOLD = 25;  // Lowered to catch sharp screens
const COLOR_VARIANCE_THRESHOLD = 80; // Increased to avoid false positives

const isUniformBrightness = brightnessVariance < BRIGHTNESS_VARIANCE_THRESHOLD;
const isScreenGlare = avgBrightness > BRIGHTNESS_THRESHOLD;
const isHighSharpness = avgSharpness > SHARPNESS_THRESHOLD;  // Reversed condition
const isFakeColor = avgColorVariance > COLOR_VARIANCE_THRESHOLD;  // Reversed condition

const isSpoofingDetected = isScreenGlare || isHighSharpness || isFakeColor || isUniformBrightness;

console.log(`🧐 Spoof Check -> Brightness: ${avgBrightness.toFixed(2)}, Variance: ${brightnessVariance.toFixed(2)}, Sharpness: ${avgSharpness.toFixed(2)}, Color Variance: ${avgColorVariance.toFixed(2)}, Spoofing: ${isSpoofingDetected}`);

      console.log(`📏 Thresholds -> Brightness: ${BRIGHTNESS_THRESHOLD}, Sharpness: ${SHARPNESS_THRESHOLD}, Color Variance: ${COLOR_VARIANCE_THRESHOLD}`);
      return isSpoofingDetected;
    } catch (error) {
      console.error("Error in spoof detection:", error);
      return false; // Default to no spoofing on error
    }
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
      console.log("Texture score:", textureScore, "Blinks detected:", totalBlinksDetected);
      // 3. Spoofing detection
      const isSpoofingDetected = await detectSpoofing(webcamRef.current.video, detection);
     
      // Combined liveness determination
      // Criteria: At least one blink detected, good texture score, and no spoofing
      const isTextureValid = textureScore > 45;
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

  // Calculate current progress percentage for the progress bar display
  const calculateProgressPercentage = () => {
    // Always return 100% when verification is complete
    if (livenessCheck.passed) {
      return 100;
    }
   
    // Otherwise calculate based on blinks and texture score (max 95% until passed)
    return Math.min(95,
      livenessCheck.blinksDetected * 40 +
      (livenessCheck.textureScore > 60 ? 55 : livenessCheck.textureScore * 0.55)
    );
  };

  // Handle webcam ready state
  const handleUserMedia = () => {
    console.log("Webcam ready and initialized");
    setWebcamInitialized(true);
   
    if (modelsLoaded) {
      setIsLoading(false);
      setStatusMessage("Ready to scan your face");
    } else {
      setStatusMessage("Camera ready, loading models...");
    }
  };
 
  // Handle webcam errors
  const handleWebcamError = (error) => {
    console.error("Webcam error:", error);
    setStatusMessage("Camera error. Please check permissions and try again.");
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full h-40 md:h-52 mb-4">
        {/* Placeholder while loading */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700 rounded flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
       
        {/* Webcam with fixed dimensions */}
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className={`w-full h-full object-cover rounded ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          mirrored={true}
          videoConstraints={{
            width: 420,
            height: 240,
            facingMode: "user"
          }}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleWebcamError}
        />
       
        {isScanning && !isLoading && (
          <div className={`absolute inset-0 border-4 ${
            livenessCheck.passed ? 'border-green-700' :
            faceDetected ? 'border-green-500 animate-pulse' : 'border-red-500 animate-pulse'
          } rounded`}></div>
        )}
       
        {/* Hidden canvas for texture analysis */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
     
      {!livenessCheck.passed && (!isScanning ? (
         <button
           onClick={startFaceScanning}
           disabled={isLoading}
           className={`flex items-center px-4 py-2 rounded-lg ${
             darkMode
               ? 'bg-blue-600 hover:bg-blue-700 text-white'
               : 'bg-blue-500 hover:bg-blue-600 text-white'
           } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} transition duration-200`}
         >
           <Camera size={18} className="mr-2" />
           {isLoading ? 'Preparing...' : 'Start Face Scan'}
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
      ))}
     
      {/* Progress bar is now always visible when scanning to show the verification progress */}
      {isScanning && (
        <div className="mt-2 flex items-center text-xs w-full">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className={`${livenessCheck.passed ? "bg-green-500" : darkMode ? "bg-blue-500" : "bg-blue-600"} h-2.5 rounded-full transition-all duration-300`}
              style={{ width: `${calculateProgressPercentage()}%` }}
            ></div>
          </div>
          <span className={`ml-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            {livenessCheck.passed ? "Complete" : "Verifying"}
          </span>
        </div>
      )}
     
      {/* Status message display - only shown when not complete */}
      {(!livenessCheck.passed || !isScanning) && (
        <div className={`mt-3 text-sm ${darkMode ? "text-blue-400" : "text-blue-600"} text-center min-h-6`}>
          {statusMessage}
        </div>
      )}
     
      {/* Success message - shown when verification is complete */}
      {livenessCheck.passed && (
        <div className={`mt-3 ${darkMode ? "text-green-400" : "text-green-600"} text-sm flex items-center justify-center`}>
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          {isSetup ? 'Face setup complete!' : 'Face scanned successfully'}
        </div>
      )}
    </div>
  );
};

export default FaceAuth;