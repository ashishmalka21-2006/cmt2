import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      
      // Save token and user details in localStorage
      localStorage.setItem('token', data.token);
      
      const userProfile = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
      };
      localStorage.setItem('user', JSON.stringify(userProfile));
      setUser(userProfile);
      
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const register = async (userData) => {
    return await authService.register(userData);
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'Admin',
        isAgent: user?.role === 'Agent',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to consume AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
