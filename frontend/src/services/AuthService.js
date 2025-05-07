// src/services/AuthService.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import axios from 'axios';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const API_URL = import.meta.env.VITE_API_URL || '/api';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

class AuthService {
  // Register with email and password or face auth
  async register(name, email, password, role, useFaceAuth = false, faceDescriptor = null, schoolId = null) {
    try {
      let userData = null;
      let token = null;
      
      if (useFaceAuth && faceDescriptor) {
        // Registration with face authentication
        const response = await axios.post(`${API_URL}/auth/register-face`, {
          name,
          email,
          role,
          faceDescriptor: Array.from(faceDescriptor), // Convert to regular array for JSON
          useFaceAuth: true,
          schoolId
        });
        
        if (response.data && response.data.user) {
          userData = response.data.user;
          token = response.data.token;
          
          // Save auth data in local storage
          localStorage.setItem('auth_user', JSON.stringify(userData));
          localStorage.setItem('auth_token', token);
          localStorage.setItem(`user_role_${userData.uid}`, role);
          
          if (schoolId) {
            localStorage.setItem(`user_school_${userData.uid}`, schoolId);
          }
          
          localStorage.setItem(`face_auth_${userData.uid}`, 'true');
        } else {
          throw new Error('Registration failed');
        }
      } else {
        // Traditional Firebase auth registration
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        userData = userCredential.user;
        token = await userData.getIdToken();
        
        // Store auth data in localStorage
        localStorage.setItem('auth_user', JSON.stringify(userData));
        localStorage.setItem('auth_token', token);
        localStorage.setItem(`user_role_${userData.uid}`, role);
        
        if (schoolId) {
          localStorage.setItem(`user_school_${userData.uid}`, schoolId);
        }
        
        // Update backend with user data
        await axios.post(`${API_URL}/auth/register`, {
          name,
          uid: userData.uid,
          email: userData.email,
          role,
          schoolId
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
      localStorage.setItem('user_name', name);
      return { user: userData, token };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
  
  // Login with email/password or face descriptor
  async login(emailOrPhone= null, password = null, useFaceAuth = false, faceDescriptor = null) {
    let user;
  
    if (useFaceAuth && faceDescriptor) {
      // Login with face auth
      try {
        const response = await axios.post(`${API_URL}/auth/login-face`, {
          faceDescriptor: Array.from(faceDescriptor)
        });
  
        if (response.data && response.data.user) {
          user = response.data.user;
  
          // Save user data in local storage for persistence
          localStorage.setItem('auth_user', JSON.stringify(user));
  
          // Save user role in local storage
          if (response.data.user.role) {
            localStorage.setItem(`user_role_${user.uid}`, response.data.user.role);
          }
  
          // Get school info from the login response if available
          if (response.data.schoolId) {
            localStorage.setItem(`user_school_${user.uid}`, response.data.schoolId);
          }
  
          // Emulate auth state change
          this._notifyAuthStateChange(user);
  
          // Log success message
          console.log('Login successful:', user);
        } else {
          throw new Error('Face authentication failed');
        }
      } catch (error) {
        console.error("Face auth login error:", error);
        throw new Error(error.response?.data?.message || 'Face authentication failed');
      }
    } else if (emailOrPhone && password) {
      // Traditional Firebase auth login
      const userCredential = await signInWithEmailAndPassword(auth, emailOrPhone, password);
      user = userCredential.user;
  
      // Fetch additional user data from backend if needed
      try {
        const response = await axios.get(`${API_URL}/auth/user-info/${user.uid}`, {
          headers: {
                        Authorization: `Bearer ${await user.getIdToken()}`
          }
        });
        console.log('User info:', response.data);
        localStorage.setItem('user_name', response.data.name);
        if (response.data) {
          // Save user role in local storage
          if (response.data.role) {
            localStorage.setItem(`user_role_${user.uid}`, response.data.role);
          }
  
          // Save school info in local storage if available
          if (response.data.schoolId) {
            localStorage.setItem(`user_school_${user.uid}`, response.data.schoolId);
          }
        }
  
        // Log success message
        console.log('Login successful:', user);
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    } else {
      throw new Error('Invalid login method. Provide either password or face descriptor');
    }
  
    return user;
  }

  // Get the school associated with the current user
async getUserSchool() {
  const user = this.getCurrentUser();

  if (!user) {
    throw new Error('No authenticated user found');
  }

  // Check local storage for the school ID
  const schoolId = localStorage.getItem(`user_school_${user.uid}`);
  if (schoolId) {
    try {
      // Fetch school information from the backend
      const response = await axios.get(`${API_URL}/schools/${schoolId}`);
      localStorage.setItem('user_school', JSON.stringify(response.data)); // Store in local storage for quick access
      return response.data; // Return the school details
    } catch (error) {
      console.error('Error fetching school information:', error);
      throw new Error('Failed to fetch school information');
    }
  }

  console.warn('No school associated with the current user');
}

  // Get the school associated with the current user
async getUserSchool() {
  const user = this.getCurrentUser();

  if (!user) {
    throw new Error('No authenticated user found');
  }

  // Check local storage for the school ID
  const schoolId = localStorage.getItem(`user_school_${user.uid}`);
  if (schoolId) {
    try {
      // Fetch school information from the backend
      const response = await axios.get(`${API_URL}/schools/${schoolId}`);
      localStorage.setItem('user_school', JSON.stringify(response.data)); // Store in local storage for quick access
      return response.data; // Return the school details
    } catch (error) {
      console.error('Error fetching school information:', error);
      throw new Error('Failed to fetch school information');
    }
  }

  console.warn('No school associated with the current user');
}
  
  // Logout
  async logout() {
    const user = this.getCurrentUser();
    
    if (user && localStorage.getItem(`face_auth_${user.uid}`) === 'true') {
      // For face auth users, clear local storage
      localStorage.removeItem('auth_user');
      localStorage.removeItem(`face_auth_${user.uid}`);
      localStorage.removeItem(`user_role_${user.uid}`);
      localStorage.removeItem(`user_school_${user.uid}`);
      
      // Emulate auth state change
      this._notifyAuthStateChange(null);
      
      return true;
    } else {
      // For Firebase auth users
      await signOut(auth);
      
      // Also clear role and school data
      if (user) {
        localStorage.removeItem(`user_role_${user.uid}`);
        localStorage.removeItem(`user_school_${user.uid}`);
      }
      
      return true;
    }
  }
  
  // Get current user
  getCurrentUser() {
    // First check Firebase auth
    const firebaseUser = auth.currentUser;
    if (firebaseUser) return firebaseUser;
    
    // Then check local storage for face auth user
    const localUser = localStorage.getItem('auth_user');
    return localUser ? JSON.parse(localUser) : null;
  }
  
  // Get user role
  getUserRole(userId) {
    return localStorage.getItem(`user_role_${userId}`);
  }
  
  async getSchoolInfo(schoolId) {
    if (!schoolId) return null;
    
    try {
      const response = await axios.get(`${API_URL}/schools/${schoolId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching school info:", error);
      return null;
    }
  }

  // Add these functions to your AuthService class

// Fetch all available schools
async getSchools() {
  try {
    const response = await axios.get(`${API_URL}/schools`);
    return response.data;
  } catch (error) {
    console.error("Error fetching schools:", error);
    throw new Error(error.response?.data?.message || 'Failed to fetch schools');
  }
}

// Create a new school with automatic teacher code generation
async createSchool(name, createdByEmail) {
  try {
    const response = await axios.post(`${API_URL}/schools`, {
      name,
      createdByEmail
    });
    
    return response.data;
  } catch (error) {
    console.error("Error creating school:", error);
    throw new Error(error.response?.data?.message || 'Failed to create school');
  }
}
// Verify if a teacher code is valid for a school
async verifyTeacherCode(schoolId, teacherCode) {
  try {
    const response = await axios.post(`${API_URL}/schools/verify-code`, {
      schoolId,
      teacherCode
    });
    
    return response.data.valid === true;
  } catch (error) {
    console.error("Error verifying teacher code:", error);
    return false;
  }
}

  // Get auth token - works for both Firebase and custom auth
  async getIdToken() {
    const user = auth.currentUser;
    console.log(user);
    if (user) {
      return await user.getIdToken();
    }
    
    // For face auth users, get token from user object or backend
    const localUser = localStorage.getItem('auth_user');
    if (localUser) {
      const parsedUser = JSON.parse(localUser);
      if (parsedUser && parsedUser.token) {
        return parsedUser.token;
      }
      
      // If no token in storage, try to refresh from API
      try {
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          uid: parsedUser.uid
        });
        
        if (response.data && response.data.token) {
          // Update stored user with new token
          parsedUser.token = response.data.token;
          localStorage.setItem('auth_user', JSON.stringify(parsedUser));
          return response.data.token;
        }
      } catch (error) {
        console.error("Error refreshing token:", error);
      }
    }
    
    return null;
  }
  
  // Update face descriptor for existing user
  async updateFaceDescriptor(userId, faceDescriptor) {
    const token = await this.getIdToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const response = await axios.post(`${API_URL}/auth/update-face`, {
      uid: userId,
      faceDescriptor: Array.from(faceDescriptor)
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.success) {
      // Mark user as having face auth enabled
      localStorage.setItem(`face_auth_${userId}`, 'true');
      return true;
    }
    
    throw new Error('Failed to update face descriptor');
  }
  
  // Check if face auth is enabled for a user
  async hasFaceAuthEnabled(emailOrPhone) {
    try {
      const response = await axios.get(`${API_URL}/auth/check-face-auth`, {
        params: { emailOrPhone }
      });
      
      return response.data && response.data.hasFaceAuth === true;
    } catch (error) {
      console.error("Error checking face auth status:", error);
      return false;
    }
  }
  
  // Listen for auth state changes - handles both Firebase and face auth
  onAuthStateChanged(callback) {
    // Create a wrapper function that handles both auth types
    const wrappedCallback = (firebaseUser) => {
      if (firebaseUser) {
        // Firebase auth is active
        callback(firebaseUser);
      } else {
        // Check for face auth user in localStorage
        const localUser = localStorage.getItem('auth_user');
        if (localUser) {
          callback(JSON.parse(localUser));
        } else {
          callback(null);
        }
      }
    };
    
    // Store the callback for face auth state changes
    this._authStateCallback = wrappedCallback;
    
    // Subscribe to Firebase auth changes
    return onAuthStateChanged(auth, wrappedCallback);
  }
  
  // Helper method to notify about auth state changes for face auth
  _notifyAuthStateChange(user) {
    if (this._authStateCallback) {
      this._authStateCallback(user);
    }
  }
}

export default new AuthService();