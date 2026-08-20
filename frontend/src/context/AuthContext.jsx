import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../services/api";

// AuthContext - stores the logged-in user, JWT token, and role,
// and exposes login/logout functions used across the whole app.
// Full login/register API wiring will be completed in the
// Authentication module; this provides the shared state shell.

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("wpis_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("wpis_access_token"));
  const [loading, setLoading] = useState(true);

  // On mount, validate any stored token (check expiry) before trusting it
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
          logout();
        }
      } catch {
        logout();
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    // Backend auth router (to be built in the Authentication module) will
    // expose POST /auth/login returning { access_token, user }.
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("wpis_access_token", data.access_token);
    localStorage.setItem("wpis_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("wpis_access_token");
    localStorage.removeItem("wpis_user");
    setToken(null);
    setUser(null);
  };

  const hasRole = (...roles) => user && roles.includes(user.role);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, isAuthenticated: !!token, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for consuming auth state in any component
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
