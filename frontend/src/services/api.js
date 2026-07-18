import axios from 'axios';

// Create an instance of axios with default configuration
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach authorization token if present
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally (like 401 Unauthorized)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized, clear local storage and redirect to login if appropriate
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Option: redirect to login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
