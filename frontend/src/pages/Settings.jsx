import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { FaSlidersH, FaShieldAlt } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function Settings() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [autoAnalysis, setAutoAnalysis] = useState(true);

  const handleSave = () => {
    toast.success("Station preferences saved successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Identity Card */}
        <div className="md:col-span-1 space-y-6">
          <GlassCard variant="prominent" className="flex flex-col items-center text-center space-y-3">
            <div className="h-20 w-20 bg-[#155e3b] rounded-3xl flex items-center justify-center font-display font-black text-white text-3xl uppercase shadow-sm mb-2">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#0d261b] leading-tight">
              {user?.full_name || "Field Officer"}
            </h3>
            <span className="badge-forest font-mono uppercase text-[10px] tracking-wider">
              {user?.role || "Wildlife Researcher"}
            </span>

            <div className="w-full mt-4 pt-4 border-t border-[#e5efe8] space-y-3 text-xs font-mono text-left text-[#0d261b]">
              <div className="flex justify-between items-center">
                <span className="text-[#355344]">Email:</span>
                <span className="truncate max-w-[170px] font-bold">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#355344]">Access:</span>
                <StatusBadge status="Authorized" size="sm" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Configurations Area */}
        <div className="md:col-span-2 space-y-6">
          <GlassCard variant="standard" className="p-6 md:p-8 space-y-6">
            <h3 className="font-display font-bold text-lg text-[#0d261b] flex items-center gap-2">
              <FaSlidersH className="text-[#155e3b]" />
              <span>Operational Preferences & Configuration</span>
            </h3>

            <div className="divide-y divide-[#e5efe8] space-y-6">
              {/* Email Alert Toggle */}
              <div className="flex justify-between items-center pt-2">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm text-[#0d261b]">High-Urgency Alert Dispatches</h4>
                  <p className="text-xs text-[#355344]">Trigger automated emails for Critically Endangered detections.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={() => setNotifications(!notifications)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#d6e4dc] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#155e3b]"></div>
                </label>
              </div>

              {/* Auto Inference Toggle */}
              <div className="flex justify-between items-center pt-6">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm text-[#0d261b]">Auto-Inference on Drag & Drop</h4>
                  <p className="text-xs text-[#355344]">Execute YOLO and BirdNET immediately upon frame ingestion.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAnalysis}
                    onChange={() => setAutoAnalysis(!autoAnalysis)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#d6e4dc] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#155e3b]"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-[#e5efe8] flex justify-end">
              <button onClick={handleSave} className="btn-forest-primary text-xs">
                Save Operational Preferences
              </button>
            </div>
          </GlassCard>

          {/* Security Note */}
          <div className="p-5 bg-white rounded-2xl border border-[#d6e4dc] flex gap-3 items-start border-l-4 border-l-[#155e3b]">
            <FaShieldAlt className="text-[#155e3b] text-base mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#10482e] font-mono">
                RBAC Access Security Policy
              </h4>
              <p className="text-xs text-[#355344] leading-relaxed">
                System permissions are cryptographically verified via JWT tokens. Role elevations must be granted by a system Administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
