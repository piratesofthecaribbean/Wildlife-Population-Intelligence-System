import axios from "axios";

// Base URL comes from Vite env variable so it can differ between
// local development and the deployed Render backend (set in Vercel env vars).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
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
