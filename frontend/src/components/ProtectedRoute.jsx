import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, requiredRoles }) {
  const { isAuthenticated, loading, user, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-forest-dark text-gray-800 dark:text-gray-200">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          <p className="text-sm font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !hasRole(...requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-forest-dark text-gray-800 dark:text-gray-200 px-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Access Denied</h2>
          <p className="text-sm opacity-80 mb-6">
            Your account role ({user?.role}) does not have permission to view this section.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  return children;
}
