import React, {useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, Camera } from 'lucide-react';
import FaceAuth from './FaceAuth';
import TeacherSelectionModal from '../TeacherSelection';

const Login = ({ darkMode=true }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [useFaceAuth, setUseFaceAuth] = useState(true); // Default to Face Authentication
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [userRole, setUserRole] = useState(null); // Renamed role to userRole for clarity
  const [faceDescriptor, setFaceDescriptor] = useState(null); // Add state for face descriptor

  const auth = useAuth(); // Store the entire auth object
  
  // Now extract methods and properties from auth object with null checks
  const login = auth?.login;
  const hasFaceAuthEnabled = auth?.hasFaceAuthEnabled;
  const navigate = useNavigate();
  console.log(darkMode)
  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if the user has face auth enabled when they input their email
  // useEffect(() => {
  //   const checkFaceAuth = async () => {
  //     if (emailOrPhone && validateEmail(emailOrPhone)) {
  //       try {
  //         const hasFace = await hasFaceAuthEnabled(emailOrPhone);
  //         if (hasFace) {
  //           setUseFaceAuth(true);
  //         }
  //       } catch (err) {
  //         console.error("Error checking face auth status:", err);
  //       }
  //     }
  //   };

  //   if (emailOrPhone && emailOrPhone.length > 5) {
  //     checkFaceAuth();
  //   }
  // }, [emailOrPhone, hasFaceAuthEnabled]);

  // Clear validation errors when switching auth methods
  useEffect(() => {
    setError('');
    setIsEmailValid(true);
    setFaceDescriptor(null); // Clear face data when switching
  }, [useFaceAuth]);

  // Handle face detection callback from FaceAuth component
  const handleFaceDetected = (descriptor) => {
    setFaceDescriptor(descriptor);
    // Automatically submit the form when face is detected and verified
    if (descriptor && emailOrPhone) {
      handleSubmitWithFace(descriptor);
    }
  };

  // Separate function to handle face login
  const handleSubmitWithFace = async (descriptor) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Login with face authentication
      const user = await login(emailOrPhone, null, descriptor);
      
      // Handle user navigation based on role
      if (user && user.role) {
        setUserRole(user.role);
        
        if (user.role === 'teacher') {
          // If teacher, navigate directly to their class page
          navigate(`/class/${user._id}`);
        } else if (user.role === 'student') {
          // Only show the teacher selection modal if the user is a student
          setShowTeacherModal(true);
        } else {
          // Handle any other roles if needed
          navigate('/dashboard'); // Default navigation
        }
      }
    } catch (err) {
      console.error('Face login error:', err);
      setError(err.message || 'Face authentication failed. Please try again or use password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailOrPhone) {
      return setError(`Please provide ${useFaceAuth ? 'an email or phone number' : 'an email address'}`);
    }

    // For password auth, validate email format
    if (!useFaceAuth) {
      if (!validateEmail(emailOrPhone)) {
        setIsEmailValid(false);
        return setError('Please enter a valid email address for password authentication');
      }
      
      if (!password) {
        return setError('Please enter your password');
      }
    }

    try {
      setLoading(true);
      
      // Authenticate the user
      let user;
      if (!useFaceAuth) {
        // Password Authentication
        user = await login(emailOrPhone, password);
      } else if (faceDescriptor) {
        // Face Authentication with already captured descriptor
        user = await login(emailOrPhone, null, faceDescriptor);
      } else {
        // Face auth selected but no face detected yet
        setError('Please complete the setup of face authentication first.');
        setLoading(false);
        return;
      }
      
      // Check user role and handle navigation accordingly
      if (user && user.role) {
        setUserRole(user.role);
        
        if (user.role === 'teacher') {
          // If teacher, navigate directly to their class page
          navigate(`/class/${user._id}`);
        } else if (user.role === 'student') {
          // Only show the teacher selection modal if the user is a student
          setShowTeacherModal(true);
        } else {
          // Handle any other roles if needed
          navigate('/dashboard'); // Default navigation
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleAuthMethod = () => {
    setUseFaceAuth(!useFaceAuth);
    setPassword(''); // Clear password field when switching
    setEmailOrPhone(''); // Clear input field when switching
    setFaceDescriptor(null); // Clear face data when switching
  };
  
  const handleTeacherSelect = (teacher) => {
    setShowTeacherModal(false);
    // Handle the selected teacher
    console.log('Selected teacher:', teacher);
    // Navigate to dashboard/home after teacher selection
    navigate(`/class/${teacher._id}`); // Fixed: Changed teacherId to teacher._id
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen px-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In to ISL Translator</h1>

        {error && (
          <div className={`mb-4 p-3 rounded flex items-center space-x-2 ${darkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-800'}`}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="emailOrPhone" className="block mb-1 font-medium">
              {useFaceAuth ? 'Email or Phone' : 'Email Address'}
            </label>
            <input
              id="emailOrPhone"
              type={useFaceAuth ? 'text' : 'email'}
              value={emailOrPhone}
              onChange={(e) => {
                setEmailOrPhone(e.target.value);
                if (!useFaceAuth) {
                  setIsEmailValid(validateEmail(e.target.value) || e.target.value === '');
                }
              }}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !isEmailValid ? 'border-2 border-red-500' : ''
              } ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              placeholder={useFaceAuth ? "email@example.com or +1234567890" : "email@example.com"}
              required
            />
          </div>

          {!useFaceAuth && (
            <div>
              <label htmlFor="password" className="block mb-1 font-medium">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                  placeholder="••••••••"
                  required={!useFaceAuth}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {useFaceAuth && (
            <div>
              <FaceAuth 
                emailOrPhone={emailOrPhone} 
                darkMode={darkMode} 
                onFaceDetected={handleFaceDetected}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (useFaceAuth && !faceDescriptor)}
            className={`w-full px-4 py-2 rounded-lg ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } transition duration-200 ${loading || (useFaceAuth && !faceDescriptor) ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={toggleAuthMethod}
            className="text-blue-500 hover:underline"
          >
            {useFaceAuth ? 'Switch to Password Authentication' : 'Switch to Face Authentication'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-500 hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
      
      {/* Only show TeacherSelectionModal if userRole is student */}
      {showTeacherModal && userRole === 'student' && (
        <TeacherSelectionModal 
          darkMode={darkMode}
          onClose={() => setShowTeacherModal(false)}
          onSelect={handleTeacherSelect}
        />
      )}
    </div>
  );
};

export default Login;