import React from "react";
import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Pages
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DetectionUpload from "./pages/DetectionUpload.jsx";
import AudioAnalysis from "./pages/AudioAnalysis.jsx";
import BiodiversityAnalytics from "./pages/BiodiversityAnalytics.jsx";
import Surveys from "./pages/Surveys.jsx";
import SpeciesDatabase from "./pages/SpeciesDatabase.jsx";
import HabitatMonitoring from "./pages/HabitatMonitoring.jsx";
import PopulationIntelligence from "./pages/PopulationIntelligence.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";

const ProtectedPage = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Application Pages */}
      <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
      <Route path="/detections" element={<ProtectedPage><DetectionUpload /></ProtectedPage>} />
      <Route path="/audio" element={<ProtectedPage><AudioAnalysis /></ProtectedPage>} />
      <Route path="/biodiversity" element={<ProtectedPage><BiodiversityAnalytics /></ProtectedPage>} />
      <Route path="/surveys" element={<ProtectedPage><Surveys /></ProtectedPage>} />
      <Route path="/species" element={<ProtectedPage><SpeciesDatabase /></ProtectedPage>} />
      <Route path="/habitat" element={<ProtectedPage><HabitatMonitoring /></ProtectedPage>} />
      <Route path="/population" element={<ProtectedPage><PopulationIntelligence /></ProtectedPage>} />
      <Route path="/admin" element={<ProtectedPage><AdminPanel /></ProtectedPage>} />
      <Route path="/reports" element={<ProtectedPage><Reports /></ProtectedPage>} />
      <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
    </Routes>
  );
}
