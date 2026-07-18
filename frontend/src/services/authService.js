import API from './api';

const authService = {
  // Register user
  register: async (userData) => {
    const response = await API.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await API.post('/auth/login', credentials);
    return response.data;
  },

  // Verify email token
  verifyEmail: async (token) => {
    const response = await API.get(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  // Forgot password request
  forgotPassword: async (email) => {
    const response = await API.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password request
  resetPassword: async (token, password) => {
    const response = await API.post('/auth/reset-password', { token, password });
    return response.data;
  },
};

export default authService;
