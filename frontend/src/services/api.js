import axios from 'axios';

// Resolve API base URL dynamically for local dev, reverse proxy, or cloud production
const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

export const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach JWT Bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract rate-limit headers and standardize error envelopes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token expired or unauthorized on private route, optionally clean up
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      // Don't auto-redirect immediately to allow graceful UI messaging
    }
    return Promise.reject(error);
  }
);

export default api;
