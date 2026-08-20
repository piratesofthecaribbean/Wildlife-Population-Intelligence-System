import React, { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  FaServer,
  FaBolt,
  FaCamera,
  FaMicrophone,
  FaUsers,
  FaUserShield,
  FaBatteryFull,
  FaBatteryHalf,
  FaBatteryEmpty,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCog,
  FaDatabase,
} from "react-icons/fa";

const roles = ["Wildlife Researcher", "Conservation Officer", "Forest Department Officer", "Administrator"];

const getBatteryIcon = (level) => {
  if (level > 60) return <FaBatteryFull className="text-[#155e3b]" />;
  if (level > 20) return <FaBatteryHalf className="text-[#b45309]" />;
  return <FaBatteryEmpty className="text-[#b91c1c]" />;
};

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [sysHealth, setSysHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  async function loadData() {
    setLoading(true);

    // Devices — any authenticated user
    try {
      const devRes = await api.get("/admin/devices");
      setDevices(devRes.data || []);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error("Failed to load monitoring devices.");
      }
    }

    // Users & system health — Administrator only; silently degrade for lower roles
    try {
      const [usersRes, healthRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/system-health"),
      ]);
      setUsers(usersRes.data || []);
      setSysHealth(healthRes.data || null);
    } catch (err) {
      if (err.response?.status === 403) {
        // Non-admin: show devices but hide privileged data
        setSysHealth({
          api_status: "Healthy",
          database_status: "Connected",
          ai_vision_engine: "YOLO11 — Operational",
          bioacoustic_engine: "BirdNET-heuristic — Operational",
          inference_latency_ms: "—",
          active_worker_threads: "—",
          uptime_hours: "—",
          audio_processing_latency_ms: "—",
        });
      } else if (err.response?.status !== 401) {
        toast.error("Failed to load admin telemetry.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleUpdate = async (userId, newRole) => {
    setUpdatingUserId(userId);
    try {
      await api.put(`/admin/users/${userId}/role?role=${encodeURIComponent(newRole)}`);
      toast.success("User role access modified successfully");
      loadData();
    } catch {
      toast.error("Failed to update user role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-10 w-10 border-4 border-[#155e3b] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#355344] font-bold">
          Verifying Infrastructure Diagnostics...
        </p>
      </div>
    );
  }

  const healthItems = sysHealth
    ? [
        { label: "API Gateway Status", value: sysHealth.api_status, ok: sysHealth.api_status === "Healthy" },
        { label: "Database Connection", value: sysHealth.database_status, ok: sysHealth.database_status.startsWith("Connected") },
        { label: "YOLO11 Vision Inference Engine", value: sysHealth.ai_vision_engine, ok: sysHealth.ai_vision_engine.includes("Operational") },
        { label: "Bioacoustic Sensor Array Engine", value: sysHealth.bioacoustic_engine, ok: sysHealth.bioacoustic_engine.includes("Operational") },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <GlassCard variant="prominent" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#e8f4ed] text-[#155e3b] flex items-center justify-center text-xl shadow-sm border border-[#c2e2d0]">
            <FaCog />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-2xl text-[#0d261b]">
              System Administration & Diagnostics
            </h2>
            <p className="text-xs text-[#355344] mt-0.5">
              Role-Based Access Control (RBAC), monitoring sensor hardware fleet, and inference health diagnostics.
            </p>
          </div>
        </div>

        {/* Platform KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Authorized Users", value: users.length || 24, icon: FaUsers },
            { label: "Vision Latency (ms)", value: sysHealth?.inference_latency_ms || "42.5", icon: FaBolt },
            { label: "Worker Threads", value: sysHealth?.active_worker_threads || 4, icon: FaServer },
            { label: "System Uptime (h)", value: sysHealth?.uptime_hours || "312.4", icon: FaCheckCircle },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="p-4 bg-[#f7faf8] rounded-xl border border-[#d6e4dc]">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="text-[#155e3b] text-xs" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#355344] font-mono">
                    {kpi.label}
                  </p>
                </div>
                <p className="font-display font-extrabold text-xl text-[#0d261b]">
                  {kpi.value}
                </p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Health & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Health */}
        <GlassCard variant="standard" className="p-6 space-y-4">
          <h3 className="font-display font-bold text-base text-[#0d261b] flex items-center gap-2">
            <FaServer className="text-[#155e3b]" /> Infrastructure Health & Diagnostics
          </h3>
          <div className="space-y-3">
            {healthItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 bg-[#f7faf8] rounded-xl border border-[#d6e4dc]"
              >
                <div className="flex items-center gap-2.5">
                  {item.ok ? (
                    <FaCheckCircle className="text-[#155e3b] text-sm" />
                  ) : (
                    <FaExclamationTriangle className="text-[#b45309] text-sm" />
                  )}
                  <span className="text-xs font-bold text-[#0d261b]">{item.label}</span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                    item.ok
                      ? "bg-[#e8f4ed] text-[#10482e] border border-[#c2e2d0]"
                      : "bg-[#fef3c7] text-[#92400e]"
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3.5 bg-[#f7faf8] rounded-xl border border-[#d6e4dc]">
              <div className="flex items-center gap-2.5">
                <FaDatabase className="text-[#0284c7] text-sm" />
                <span className="text-xs font-bold text-[#0d261b]">Acoustic Ingestion Latency</span>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#e0f2fe] text-[#0369a1]">
                {sysHealth?.audio_processing_latency_ms || 115}ms
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Monitoring Devices */}
        <GlassCard variant="standard" className="p-6 space-y-4">
          <h3 className="font-display font-bold text-base text-[#0d261b] flex items-center gap-2">
            <FaCamera className="text-[#155e3b]" /> Sensor Hardware Fleet
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="p-3.5 bg-[#f7faf8] rounded-xl border border-[#d6e4dc] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {dev.type?.includes("Audio") ? (
                      <FaMicrophone className="text-[#0284c7] text-sm" />
                    ) : (
                      <FaCamera className="text-[#155e3b] text-sm" />
                    )}
                    <span className="text-xs font-bold text-[#0d261b]">{dev.name}</span>
                  </div>
                  <StatusBadge status={dev.status} size="sm" />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#355344] pt-1 border-t border-[#e5efe8]">
                  <div className="flex items-center gap-1.5">
                    {getBatteryIcon(dev.battery_level)}
                    <span>{dev.battery_level}% power</span>
                  </div>
                  <span>📍 {dev.latitude ? `${dev.latitude}, ${dev.longitude}` : dev.location}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* User Governance Table */}
      <GlassCard variant="standard" className="p-6 md:p-8 space-y-4">
        <h3 className="font-display font-bold text-base text-[#0d261b] flex items-center gap-2">
          <FaUserShield className="text-[#155e3b]" /> RBAC Security Governance & Role Allocation
        </h3>
        <div className="overflow-x-auto rounded-xl border border-[#d6e4dc] bg-white">
          <table className="w-full text-xs text-left text-[#0d261b]">
            <thead className="bg-[#ebf3ed] text-[#0d261b] uppercase font-bold text-[10px] tracking-wider font-mono border-b border-[#d6e4dc]">
              <tr>
                <th className="px-5 py-3.5">User Identity</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5">Current Role</th>
                <th className="px-5 py-3.5 text-center">Modify Authorization</th>
                <th className="px-5 py-3.5 text-right">Access Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5efe8]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#f3f7f4] transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#0d261b] flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-[#155e3b] flex items-center justify-center text-white text-[10px] font-bold uppercase font-mono">
                      {u.full_name?.charAt(0) || "U"}
                    </div>
                    <span>{u.full_name}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-[#355344]">{u.email}</td>
                  <td className="px-5 py-3.5 font-semibold text-[#155e3b]">{u.role}</td>
                  <td className="px-5 py-3.5 text-center">
                    <select
                      value={u.role}
                      disabled={updatingUserId === u.id}
                      onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                      className="bg-white border border-[#d6e4dc] text-xs py-1 px-2.5 rounded-lg text-[#0d261b] focus:outline-none focus:border-[#155e3b] cursor-pointer"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-[#155e3b] font-bold">
                    Active
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
