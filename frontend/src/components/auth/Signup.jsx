// src/components/auth/Signup.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle, Camera, Search, Plus, School } from 'lucide-react';
import FaceAuth from './FaceAuth';
import axios from 'axios';

const Signup = ({ darkMode=true }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [setupFaceAuth, setSetupFaceAuth] = useState(true);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  
  // School-related states
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [isCreatingNewSchool, setIsCreatingNewSchool] = useState(false);
  const [generatedTeacherCode, setGeneratedTeacherCode] = useState('');
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const auth = useAuth(); // Store the entire auth object
  
  // Now extract methods and properties from auth object with null checks
  const register = auth?.register;
if (!register) {
  console.error('Register function is not available');
  return;
}
  const navigate = useNavigate();
  
  // Fetch schools when component mounts
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setSchoolsLoading(true);
        const response = await axios.get('http://localhost:5000/api/schools');
        setSchools(response.data);
      } catch (err) {
        console.error('Error fetching schools:', err);
        setError('Failed to load schools list. Please try again later.');
      } finally {
        setSchoolsLoading(false);
      }
    };
    
    fetchSchools();
  }, []);
  
  const validatePassword = () => {
    if (!setupFaceAuth && password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (!setupFaceAuth && password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleFaceDetected = (descriptor) => {
    setFaceDescriptor(descriptor);
  };
  
  const createNewSchool = async (userToken) => {
    if (!newSchoolName.trim()) {
      setError('Please enter a school name');
      return null;
    }
    
    try {
      const response = await axios.post(
        'http://localhost:5000/api/schools', 
        {
          name: newSchoolName.trim(),
          createdByEmail: email
        },
        {
          headers: { Authorization: `Bearer ${userToken}` }
        }
      );
      console.log('New school created:', response.data);
      
      if (response.data && response.data.id) {
        // Set the generated teacher code for display
        setGeneratedTeacherCode(response.data.teacherCode);
        return response.data;
      }
      
      throw new Error('Failed to create school');
    } catch (err) {
      console.error('Error creating school:', err);
      setError(err.response?.data?.message || 'Failed to create school');
      return null;
    }
  };
  
  const verifyTeacherCode = async (schoolId, code) => {
    try {
      const response = await axios.post('http://localhost:5000/api/schools/verify-code', {
        schoolId,
        teacherCode: code
      });
      
      return response.data && response.data.isValid;
    } catch (err) {
      console.error('Error verifying teacher code:', err);
      setError(err.response?.data?.message || 'Invalid teacher code');
      return false;
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      return setError('Please provide an email address');
    }
    
    // Validate password if not using face auth
    if (!setupFaceAuth) {
      const passwordError = validatePassword();
      if (passwordError) {
        return setError(passwordError);
      }
    } else if (!faceDescriptor) {
      return setError('Please complete the face verification setup first');
    }
    
    // School validation based on role
    let schoolId = null;
    let isValidTeacher = true;
    
    if (role === 'teacher' && !isCreatingNewSchool) {
      // Verify existing school's teacher code for teachers
      if (!selectedSchool) {
        return setError('Please select a school');
      }
      
      if (!teacherCode) {
        return setError('Please enter teacher code');
      }
      
      isValidTeacher = await verifyTeacherCode(selectedSchool, teacherCode);
      if (!isValidTeacher) {
        return setError('Invalid teacher code');
      }
      
      schoolId = selectedSchool;
    } else if (role === 'student') {
      // Student validation
      if (!selectedSchool) {
        return setError('Please select your school');
      }
      console.log('Selected school:', selectedSchool);
      schoolId = selectedSchool;
    }
    
    try {
      setLoading(true);
      
      // First, register the user
      let registrationResult;
      
      if (setupFaceAuth) {
        // Register with face authentication
        registrationResult = await register(
          name,
          email, 
          null, 
          role, 
          true, 
          faceDescriptor, 
          isCreatingNewSchool ? null : schoolId 
        );
      } else {
        // Register with password
        registrationResult = await register(
          name,
          email, 
          password, 
          role, 
          false, 
          null, 
          isCreatingNewSchool ? null : schoolId // Only include schoolId if joining existing school
        );
      }
      
      // If creating a new school and user is successfully registered
      if (role === 'teacher' && isCreatingNewSchool && registrationResult?.token) {
        //create the school with the authenticated user
        const newSchool = await createNewSchool(registrationResult.token);
        
        if (newSchool?._id) {
          // Update the user with the new school ID
          await axios.post(
            'http://localhost:5000/api/auth/update-school', 
            { schoolId: newSchool._id },
            { headers: { Authorization: `Bearer ${registrationResult.token}` } }
          );
        }
      }
      
      // Navigate to home page after all operations are complete
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create an account');
    } finally {
      setLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleAuthMethod = () => {
    setSetupFaceAuth(!setupFaceAuth);
    setPassword('');
    setConfirmPassword('');
    setFaceDescriptor(null);
  };
  
  const handleSchoolToggle = () => {
    setIsCreatingNewSchool(!isCreatingNewSchool);
    setSelectedSchool('');
    setNewSchoolName('');
    setTeacherCode('');
    setGeneratedTeacherCode('');
  };
  
  // Filter schools based on search term
  const filteredSchools = searchTerm
    ? schools.filter(school => 
        school.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : schools;
  
  return (
    <div className={`flex flex-col items-center justify-center min-h-screen px-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h1 className="text-2xl font-bold mb-6 text-center">Create Your Account</h1>
        
        {error && (
          <div className={`mb-4 p-3 rounded flex items-center space-x-2 ${darkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-800'}`}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {generatedTeacherCode && (
          <div className={`mb-4 p-3 rounded flex items-center space-x-2 ${darkMode ? 'bg-green-900/30 text-green-200' : 'bg-green-100 text-green-800'}`}>
            <CheckCircle size={18} />
            <div>
              <p className="font-medium">School created successfully!</p>
              <p>Your teacher code is: <span className="font-bold">{generatedTeacherCode}</span></p>
              <p className="text-xs mt-1">Keep this code safe - you'll need to share it with other teachers from your school.</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-1 font-medium">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              placeholder="email@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">Full Name</label>
            <input 
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              placeholder="John Doe"
              required
            />
          </div>  
          
          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block mb-1 font-medium">Role</label>
            <div className="flex space-x-4">
              <label className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer ${
                role === 'student' 
                  ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 border-2 border-blue-500') 
                  : (darkMode ? 'bg-gray-700' : 'bg-gray-100')
              }`}>
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === 'student'}
                  onChange={() => setRole('student')}
                  className="hidden"
                />
                {role === 'student' && <CheckCircle size={16} className={darkMode ? 'text-white' : 'text-blue-500'} />}
                <span>Student</span>
              </label>
              
              <label className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer ${
                role === 'teacher' 
                  ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 border-2 border-blue-500') 
                  : (darkMode ? 'bg-gray-700' : 'bg-gray-100')
              }`}>
                <input
                  type="radio"
                  name="role"
                  value="teacher"
                  checked={role === 'teacher'}
                  onChange={() => setRole('teacher')}
                  className="hidden"
                />
                {role === 'teacher' && <CheckCircle size={16} className={darkMode ? 'text-white' : 'text-blue-500'} />}
                <span>Teacher</span>
              </label>
            </div>
          </div>
          
          {/* School Selection Section */}
          <div className="pt-2 border-t border-gray-300 dark:border-gray-700">
            <label className="block mb-1 font-medium">
              {role === 'student' ? 'Select Your School' : 'School Information'}
            </label>
            
            {role === 'teacher' && (
              <div className="flex mb-3">
                <button
                  type="button"
                  onClick={handleSchoolToggle}
                  className={`flex-1 py-2 px-3 flex justify-center items-center ${
                    !isCreatingNewSchool 
                      ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') 
                      : (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                  } ${darkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-600'} rounded-l-lg transition-colors`}
                >
                  <School size={16} className="mr-2" />
                  Join Existing
                </button>
                <button
                  type="button"
                  onClick={handleSchoolToggle}
                  className={`flex-1 py-2 px-3 flex justify-center items-center ${
                    isCreatingNewSchool 
                      ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') 
                      : (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                  } ${darkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-600'} rounded-r-lg transition-colors`}
                >
                  <Plus size={16} className="mr-2" />
                  Create New
                </button>
              </div>
            )}
            
            {isCreatingNewSchool && role === 'teacher' ? (
              <div>
                <label htmlFor="newSchoolName" className="block mb-1 text-sm">School Name</label>
                <input
                  id="newSchoolName"
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                  placeholder="Enter your school name"
                  required={role === 'teacher' && isCreatingNewSchool}
                />
                <p className="text-xs mt-1 text-gray-400">
                  A unique teacher code will be generated for your school
                </p>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Search schools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full px-4 py-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  />
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                
                <div className={`max-h-40 overflow-y-auto rounded-lg mb-3 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                } ${schoolsLoading ? 'flex items-center justify-center p-4' : ''}`}>
                  {schoolsLoading ? (
                    <p className="text-gray-400">Loading schools...</p>
                  ) : filteredSchools.length > 0 ? (
                    filteredSchools.map(school => (
                      <div
                        key={school._id}
                        onClick={() => setSelectedSchool(school._id)}
                        className={`p-3 cursor-pointer hover:bg-opacity-80 ${
                          selectedSchool === school.id
                            ? (darkMode ? 'bg-blue-700' : 'bg-blue-100')
                            : ''
                        } ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                      >
                        <div className="flex items-center">
                          {selectedSchool === school._id && (
                            <CheckCircle size={16} className={`mr-2 ${darkMode ? 'text-blue-300' : 'text-blue-500'}`} />
                          )}
                          <span>{school.name}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400">
                      {searchTerm ? "No schools found matching your search" : "No schools available"}
                    </div>
                  )}
                </div>
                
                {role === 'teacher' && selectedSchool && (
                  <div>
                    <label htmlFor="teacherCode" className="block mb-1 text-sm">Teacher Code</label>
                    <input
                      id="teacherCode"
                      type="text"
                      value={teacherCode}
                      onChange={(e) => setTeacherCode(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                      }`}
                      placeholder="Enter teacher code"
                      required={role === 'teacher' && !isCreatingNewSchool}
                    />
                    <p className="text-xs mt-1 text-gray-400">
                      Ask your school administrator for the teacher code
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Authentication Method Toggle */}
          <div className="pt-2 border-t border-gray-300 dark:border-gray-700">
            <label className="block mb-1 font-medium">Authentication Method</label>
            <div className="flex justify-center mt-2 mb-2">
              <div className={`inline-flex rounded-md p-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setSetupFaceAuth(true)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    setupFaceAuth 
                      ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') 
                      : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Camera size={18} />
                    <span>Face Authentication</span> 
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupFaceAuth(false)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    !setupFaceAuth 
                      ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') 
                      : ''
                  }`}
                >
                  Password
                </button>
              </div>
            </div>
          </div>
          
          {setupFaceAuth ? (
            <div className="mb-4">
              <FaceAuth 
                emailOrPhone={email} 
                darkMode={darkMode} 
                isSetup={true}
                onFaceDetected={handleFaceDetected} 
              />
              <p className="text-sm mt-2 text-center text-gray-400">
                Set up face authentication for quick and secure login.
              </p>
              {faceDescriptor && (
                <div className={`mt-2 ${darkMode ? "text-green-400" : "text-green-600"} text-xs flex items-center justify-center`}>
                  <CheckCircle size={16} className="mr-1" />
                  Face setup complete! You can now register.
                </div>
              )}
            </div>
          ) : (
            <>
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
                    required={!setupFaceAuth}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs mt-1 text-gray-400">Must be at least 6 characters</p>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block mb-1 font-medium">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                  placeholder="••••••••"
                  required={!setupFaceAuth}
                />
              </div>
            </>
          )}
          
          <button
            type="submit"
            disabled={loading || 
              (setupFaceAuth && !faceDescriptor) || 
              (role === 'student' && !selectedSchool) ||
              (role === 'teacher' && isCreatingNewSchool && !newSchoolName) ||
              (role === 'teacher' && !isCreatingNewSchool && (!selectedSchool || !teacherCode))
            }
            className={`w-full px-4 py-2 rounded-lg ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } transition duration-200 ${loading || 
              (setupFaceAuth && !faceDescriptor) || 
              (role === 'student' && !selectedSchool) ||
              (role === 'teacher' && isCreatingNewSchool && !newSchoolName) ||
              (role === 'teacher' && !isCreatingNewSchool && (!selectedSchool || !teacherCode)) 
              ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-blue-500 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;