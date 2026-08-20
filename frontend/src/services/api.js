import axios from "axios";

// Determine API URL: Use environment variable if present; in browser on Vercel, fallback to deployed backend
const getDefaultApiUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
    return "https://wpis-backend.onrender.com/api/v1";
  }
  return "http://localhost:8000/api/v1";
};

const API_BASE_URL = getDefaultApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
  },
});

// ---- Request interceptor: attach JWT access token to every request ----
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wpis_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Response interceptor: handle expired/invalid tokens globally ----
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token invalid/expired - clear session so user is redirected to login
      localStorage.removeItem("wpis_access_token");
      localStorage.removeItem("wpis_user");
    }
    return Promise.reject(error);
  }
);

export default api;
