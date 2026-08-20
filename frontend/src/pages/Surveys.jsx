import React, { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  FaClipboardList,
  FaPlus,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaTimes,
  FaCamera,
  FaMicrophone,
} from "react-icons/fa";

export default function Surveys() {
  const [surveys, setSurveys] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("surveys");
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    // Load surveys first — open endpoint, no auth needed
    try {
      const survRes = await api.get("/surveys");
      setSurveys(survRes.data || []);
    } catch (err) {
      toast.error("Failed to load survey campaigns.");
    }

    // Load devices separately — requires auth; silently ignore 401/403
    try {
      const devRes = await api.get("/admin/devices");
      setDevices(devRes.data || []);
    } catch (err) {
      // Non-admin users may not have access — show empty device list gracefully
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error("Failed to load telemetry devices.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post("/surveys", {
        title,
        description,
        location_name: locationName,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
      });
      toast.success("Survey campaign registered successfully!");
      setModalOpen(false);
      setTitle("");
      setDescription("");
      setLocationName("");
      setStartDate("");
      setEndDate("");
      loadData();
    } catch (err) {
      toast.error("Failed to register survey.");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-10 w-10 border-4 border-[#155e3b] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#355344] font-bold">
          Loading Active Field Surveys...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0d261b] flex items-center gap-2.5">
            <FaClipboardList className="text-[#155e3b]" /> Field Surveys & Telemetry Fleet
          </h2>
          <p className="text-xs text-[#355344] mt-1">
            Coordinate field transect surveys, track camera-trap hardware health, and manage remote telemetry stations.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-forest-primary text-xs shadow-sm">
          <FaPlus />
          <span>Launch Survey Campaign</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[#d6e4dc] pb-2">
        <button
          onClick={() => setActiveTab("surveys")}
          className={`px-4 py-2 text-xs font-bold font-mono rounded-xl transition-all ${
            activeTab === "surveys"
              ? "bg-[#155e3b] text-white shadow-sm"
              : "bg-[#f3f7f4] text-[#355344] hover:text-[#0d261b] hover:bg-[#e5efe8]"
          }`}
        >
          Active Survey Campaigns ({surveys.length})
        </button>
        <button
          onClick={() => setActiveTab("devices")}
          className={`px-4 py-2 text-xs font-bold font-mono rounded-xl transition-all ${
            activeTab === "devices"
              ? "bg-[#155e3b] text-white shadow-sm"
              : "bg-[#f3f7f4] text-[#355344] hover:text-[#0d261b] hover:bg-[#e5efe8]"
          }`}
        >
          Camera Traps & Sensor Nodes ({devices.length})
        </button>
      </div>

      {/* Surveys Tab */}
      {activeTab === "surveys" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => (
            <GlassCard
              key={survey.id}
              variant="interactive"
              className="p-6 flex flex-col justify-between space-y-4 border-t-4 border-t-[#155e3b]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#355344] uppercase tracking-widest">
                    Campaign #{survey.id}
                  </span>
                  <StatusBadge status="Healthy" size="sm" />
                </div>
                <h4 className="font-display font-extrabold text-lg text-[#0d261b]">
                  {survey.title}
                </h4>
                <p className="text-xs text-[#0d261b] leading-relaxed">
                  {survey.description || "Field research monitoring campaign."}
                </p>

                <div className="space-y-1.5 text-xs font-medium text-[#355344] pt-3 border-t border-[#e5efe8] font-mono">
                  <div className="flex items-center space-x-2">
                    <FaMapMarkerAlt className="text-[#155e3b]" />
                    <span>Location: {survey.location_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FaCalendarAlt className="text-[#155e3b]" />
                    <span>Duration: {(survey.start_date || "").slice(0, 10)} → {(survey.end_date || "").slice(0, 10)}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === "devices" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {devices.map((dev) => (
            <GlassCard key={dev.id} variant="standard" className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#355344] uppercase">{dev.device_id || dev.id}</span>
                <StatusBadge status={dev.status} size="sm" />
              </div>
              <h5 className="font-display font-bold text-sm text-[#0d261b]">{dev.name}</h5>
              <p className="text-xs text-[#355344] font-mono">{dev.device_type || dev.type}</p>

              <div className="pt-2 border-t border-[#e5efe8] text-[11px] text-[#355344] font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span>Battery:</span>
                  <b className={dev.battery_level < 20 ? "text-[#b91c1c]" : "text-[#155e3b]"}>
                    {dev.battery_level}%
                  </b>
                </div>
                <div className="flex items-center justify-between">
                  <span>Coords:</span>
                  <b>{dev.latitude && dev.longitude ? `${dev.latitude}, ${dev.longitude}` : dev.location || "Online"}</b>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Register Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#d6e4dc] relative">
            <div className="flex justify-between items-center pb-4 border-b border-[#e5efe8]">
              <h3 className="font-display font-bold text-lg text-[#0d261b]">
                Launch Survey Campaign
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#4e6b5c] hover:text-[#0d261b] p-1">
                <FaTimes className="text-base" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">Survey Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Kaziranga Rhino Transect 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-forest text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">Location Sector</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Kaziranga Central Sector"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="input-forest text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#0d261b] font-mono">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-forest text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#0d261b] font-mono">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-forest text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">Research Objectives</label>
                <textarea
                  rows="3"
                  placeholder="Describe camera-trap layout and transects..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-forest text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full btn-forest-primary py-3 font-bold text-sm shadow-sm"
                >
                  {formLoading ? "Registering..." : "Launch Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
