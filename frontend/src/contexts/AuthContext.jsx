// src/contexts/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import AuthService from '../services/AuthService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        const role = AuthService.getUserRole(user.uid);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  const register = async (email, password, role) => {
    try {
      const user = await AuthService.register(email, password, role);
      setUserRole(role);
      return user;
    } catch (error) {
      throw error;
    }
  };
  
  const login = async (email, password) => {
    try {
      const user = await AuthService.login(email, password);
      const role = AuthService.getUserRole(user.uid);
      setUserRole(role);
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
  
  const value = {
    currentUser,
    userRole,
    register,
    login,
    logout,
    getToken,
    loading
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