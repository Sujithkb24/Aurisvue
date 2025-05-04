// src/contexts/AuthContext.jsx
import React,{ createContext, useState, useEffect, useContext } from 'react';
import AuthService from '../services/AuthService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userSchool, setUserSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        const role = AuthService.getUserRole(user.uid);
        const school = AuthService.getUserSchool(user.uid);
        setUserRole(role);
        setUserSchool(school);
      } else {
        setUserRole(null);
        setUserSchool(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  const register = async (email, password, role, useFaceAuth = false, faceDescriptor = null, schoolId = null) => {
    try {
      const result = await AuthService.register(email, password, role, useFaceAuth, faceDescriptor, schoolId);
      
      // Update state after successful registration
      setCurrentUser(result.user);
      setUserRole(role);
      setUserSchool(schoolId);
      
      return result;
    } catch (error) {
      console.error('Registration error in context:', error);
      throw error;
    }
  };
  
  const login = async (emailOrPhone, password = null, faceDescriptor = null) => {
    try {
      // Determine if we're using face auth based on whether a faceDescriptor is provided
      const useFaceAuth = faceDescriptor !== null;
      
      const user = await AuthService.login(emailOrPhone, password, useFaceAuth, faceDescriptor);
      if (user && user.uid) {
        const role = AuthService.getUserRole(user.uid);
        const school = AuthService.getUserSchool(user.uid);
        setUserRole(role);
        setUserSchool(school);
      }
      return user;
    } catch (error) {
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      await AuthService.logout();
      setCurrentUser(null);
      setUserRole(null);
      setUserSchool(null);
      return true;
    } catch (error) {
      throw error;
    }
  };
  
  const getToken = async () => {
    try {
      return await AuthService.getIdToken();
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  };
  
  // Add a method to update face descriptor
  const updateFaceDescriptor = async (userId, faceDescriptor) => {
    try {
      return await AuthService.updateFaceDescriptor(userId, faceDescriptor);
    } catch (error) {
      console.error("Error updating face descriptor:", error);
      throw error;
    }
  };
  
  // Add a method to check if face auth is enabled for a user
  // const hasFaceAuthEnabled = async (emailOrPhone) => {
  //   try {
  //     return await AuthService.hasFaceAuthEnabled(emailOrPhone);
  //   } catch (error) {
  //     console.error("Error checking face auth status:", error);
  //     return false;
  //   }
  // };
  
  // Get school information
  const getSchoolInfo = async (schoolId) => {
    try {
      return await AuthService.getSchoolInfo(schoolId);
    } catch (error) {
      console.error("Error getting school info:", error);
      return null;
    }
  };
  
  // Get all schools
  const getSchools = async () => {
    try {
      return await AuthService.getSchools();
    } catch (error) {
      console.error("Error getting schools:", error);
      return [];
    }
  };
  
  // Create a new school
  const createSchool = async (name, createdByEmail) => {
    try {
      return await AuthService.createSchool(name, createdByEmail);
    } catch (error) {
      throw error;
    }
  };
  
  // Verify teacher code
  const verifyTeacherCode = async (schoolId, code) => {
    try {
      return await AuthService.verifyTeacherCode(schoolId, code);
    } catch (error) {
      throw error;
    }
  };
  
  const value = {
    currentUser,
    userRole,
    userSchool,
    register,
    login,
    logout,
    getToken,
    loading,
    updateFaceDescriptor,
    //hasFaceAuthEnabled,
    getSchoolInfo,
    getSchools, 
    createSchool,
    verifyTeacherCode
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};