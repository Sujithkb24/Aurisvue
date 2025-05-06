import React, {useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, Camera, Mail, Lock } from 'lucide-react';
import FaceAuth from './FaceAuth';

const Login = ({ darkMode=true }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [useFaceAuth, setUseFaceAuth] = useState(true); // Default to Face Authentication
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [role, setUserRole] = useState(null); 
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [waitingForFace, setWaitingForFace] = useState(false);
  // Add these state variables to your Login component
const [faceAuthStatus, setFaceAuthStatus] = useState("");
const [faceAuthProgress, setFaceAuthProgress] = useState(0);
  const timeoutRef = useRef(null);

  const auth = useAuth(); // Store the entire auth object
  
  // Now extract methods and properties from auth object with null checks
  const login = auth?.login;
  const hasFaceAuthEnabled = auth?.hasFaceAuthEnabled;
  const navigate = useNavigate();
  
  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Clear validation errors when switching auth methods
  useEffect(() => {
    setError('');
    setIsEmailValid(true);
    setFaceDescriptor(null); // Clear face data when switching
    setWaitingForFace(false);
    
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [useFaceAuth]);

  // Set up automatic face auth after timeout
  useEffect(() => {
    if (useFaceAuth && waitingForFace && !faceDescriptor) {
      // Start a timeout to auto-proceed with face auth setup
      timeoutRef.current = setTimeout(() => {
        if (!faceDescriptor) {
          setError("Face detection is taking longer than expected. Please ensure your face is visible to the camera.");
        }
      }, 5000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [useFaceAuth, waitingForFace, faceDescriptor]);

  // Handle face detection callback from FaceAuth component
  const handleFaceDetected = (descriptor) => {
    setFaceDescriptor(descriptor);
    setWaitingForFace(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Automatically submit the form when face is detected and verified
    if (descriptor) {
      handleSubmitWithFace(descriptor);
    }
  };

  // Separate function to handle face login
  const handleSubmitWithFace = async (descriptor) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Login with face authentication - passing null for email as it's not needed
      const user = await login(null, null, descriptor);
      
      // Handle user navigation based on role
      if (user && user.role) {
        setUserRole(user.role);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Face login error:', err);
      
      // Check for specific error messages from the backend
      if (err.message?.includes('No users found with face auth enabled')) {
        setError('No accounts with face authentication were found. Please use password login or set up face authentication first.');
      } else if (err.message?.includes('Face authentication failed')) {
        setError('No matching face found. You may need to set up face authentication or use password login instead.');
      } else {
        setError(err.message || 'Face authentication failed. Please try again or use password login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    if (!useFaceAuth) {
      // Password authentication validation
      if (!emailOrPhone) {
        return setError(`Please provide an email address`);
      }
      
      if (!validateEmail(emailOrPhone)) {
        setIsEmailValid(false);
        return setError('Please enter a valid email address for password authentication');
      }
  
      if (!password) {
        return setError('Please enter your password');
      }
      
      try {
        setLoading(true);
        const user = await login(emailOrPhone, password);
        
        if (user && user.role) {
          setUserRole(user.role);
        }
        navigate('/dashboard'); 
      } catch (err) {
        console.error('Login error:', err);
        setError(err.message || 'Failed to log in');
      } finally {
        setLoading(false);
      }
    } else {
     setError('')
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Add this method to your Login component
const handleFaceAuthStatusChange = (status) => {
  setFaceAuthStatus(status);
};

// Add this method to receive progress updates
const handleFaceAuthProgressChange = (progress) => {
  setFaceAuthProgress(progress);
};

  const toggleAuthMethod = () => {
    setUseFaceAuth(!useFaceAuth);
    setPassword(''); // Clear password field when switching
    setEmailOrPhone(''); // Clear input field when switching
    setFaceDescriptor(null); // Clear face data when switching
    setWaitingForFace(false);
  };
  
  // Color scheme based on dark/light mode
  const colorScheme = {
    background: darkMode ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: darkMode ? 'bg-gray-800' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-900',
    inputBg: darkMode ? 'bg-gray-700' : 'bg-gray-100',
    inputText: darkMode ? 'text-white' : 'text-gray-900',
    inputBorder: darkMode ? 'border-gray-600' : 'border-gray-300',
    primaryBtn: darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600',
    secondaryBtn: darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300',
    accent: darkMode ? 'text-blue-400' : 'text-blue-600',
    error: darkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-800',
  };
  
  return (
    <div className={`flex overflow-y-hidden min-h-screen ${colorScheme.background} ${colorScheme.text}`}>
      {/* Left side - branding area */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-800 justify-center items-center">
        <div className="px-12 max-w-lg">
          <h1 className="text-4xl font-bold text-white mb-6">ISL Translator</h1>
          <p className="text-blue-100 text-xl mb-8">
            Access your account to translate Indian Sign Language with our AI-powered tools.
          </p>
          <div className="flex space-x-3 mb-12">
            <div className="w-3 h-3 rounded-full bg-white opacity-50"></div>
            <div className="w-3 h-3 rounded-full bg-white"></div>
            <div className="w-3 h-3 rounded-full bg-white opacity-50"></div>
          </div>
          
          <div className="space-y-4 text-center">
            <p className="text-blue-100">
              Don't have an account?{' '}
              <Link to="/signup" className="text-white font-medium hover:underline">
                Sign Up
              </Link>
            </p>
            <p className="text-blue-100">
              <Link to="/set-face" className="text-white font-medium hover:underline">
                Set up face authentication if you haven't
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Right side - login form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6">
        <div className={`w-full max-w-xl p-8 rounded-xl shadow-lg ${colorScheme.cardBg}`}>
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-6">Sign In</h1>
            <div className="flex justify-center mb-4">
              <div className="inline-flex p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <button
                  onClick={() => !useFaceAuth && toggleAuthMethod()}
                  className={`px-6 py-2 rounded-md transition-all duration-200 text-base font-medium ${
                    useFaceAuth 
                      ? `${colorScheme.primaryBtn} text-white shadow-md` 
                      : 'bg-transparent text-gray-500'
                  }`}
                >
                  Face Auth
                </button>
                <button
                  onClick={() => useFaceAuth && toggleAuthMethod()}
                  className={`px-6 py-2 rounded-md transition-all duration-200 text-base font-medium ${
                    !useFaceAuth 
                      ? `${colorScheme.primaryBtn} text-white shadow-md` 
                      : 'bg-transparent text-gray-500'
                  }`}
                >
                  Password
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className={`mb-6 p-3 rounded-lg flex items-center gap-2 ${colorScheme.error}`}>
              <AlertCircle size={18} />
              <span className="flex-1">{error}</span>
              {error.includes('set up face authentication') && (
                <Link to="/set-face" className={`${colorScheme.accent} whitespace-nowrap hover:underline`}>
                  Set up now
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Only show email field in password mode */}
            {!useFaceAuth ? (
              <>
                <div>
                  <label htmlFor="emailOrPhone" className="block mb-2 font-medium">
                    Email or Phone
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <Mail size={18} />
                    </span>
                    <input
                      id="emailOrPhone"
                      type="email"
                      value={emailOrPhone}
                      onChange={(e) => {
                        setEmailOrPhone(e.target.value);
                        setIsEmailValid(validateEmail(e.target.value) || e.target.value === '');
                      }}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !isEmailValid ? 'border-2 border-red-500' : colorScheme.inputBorder
                      } ${colorScheme.inputBg} ${colorScheme.inputText}`}
                      placeholder="email@example.com or phone number"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block mb-2 font-medium">Password</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <Lock size={18} />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${colorScheme.inputBorder} ${colorScheme.inputBg} ${colorScheme.inputText}`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link to="/forgot-password" className={`${colorScheme.accent} text-sm hover:underline`}>
                    Forgot password?
                  </Link>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-4 py-3 rounded-lg font-medium ${colorScheme.primaryBtn} text-white transition duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <p className="mb-4 text-center text-lg">
                  Position your face in front of the camera
                </p>
                <div className="border-4 border-blue-500 rounded-xl p-2 bg-gray-200 dark:bg-gray-700 mb-4">
                  <FaceAuth 
                    darkMode={darkMode} 
                    onFaceDetected={handleFaceDetected}
                    onStatusChange={(status) => {
                      // This prop would update the parent component with FaceAuth status messages
                      setFaceAuthStatus(status);
                    }}
                  />
                </div>
              </div>
            )}
          </form>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">
              Need help? <a href="/help" className={`${colorScheme.accent} hover:underline`}>Contact support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;