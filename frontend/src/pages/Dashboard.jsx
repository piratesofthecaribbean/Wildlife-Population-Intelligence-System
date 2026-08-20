import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import CountUp from "../components/CountUp.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  FaPaw,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaHeartbeat,
  FaUserShield,
  FaMicrophone,
  FaLeaf,
  FaMapMarkerAlt,
} from "react-icons/fa";

// Leaflet default icon fix
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [roleData, setRoleData] = useState(null);
  const [selectedRole, setSelectedRole] = useState(
    localStorage.getItem("wpis_active_role") || user?.role || "Wildlife Researcher"
  );
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const hotspots = [
    { id: 1, name: "Sunderbans Mangrove Sector 3", lat: 21.9497, lng: 89.1833, info: "Bengal Tiger observation zone. 42 detections.", health: "Healthy", score: 81 },
    { id: 2, name: "Western Ghats Corridor #4", lat: 11.5389, lng: 76.5828, info: "Elephant & Leopard migration pass. 28 detections.", health: "Excellent", score: 82 },
    { id: 3, name: "Kaziranga North Perimeter", lat: 26.5775, lng: 93.1706, info: "Rhino & Peafowl sanctuary zone. 12 detections.", health: "Healthy", score: 74 },
    { id: 4, name: "Sariska Scrublands Block B", lat: 27.3275, lng: 76.4326, info: "Scrubland habitat. Degradation warning active.", health: "Critical", score: 45 },
  ];

  const fetchRoleData = async (role) => {
    try {
      const res = await api.get(`/dashboard/roles/${encodeURIComponent(role)}`);
      setRoleData(res.data);
      if (role.toLowerCase().includes("admin")) {
        const uRes = await api.get("/admin/users");
        setUsersList(uRes.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch role metrics", err);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, trendsRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/dashboard/trends"),
        ]);
        setStats(statsRes.data);
        setTrends(trendsRes.data);
      } catch (err) {
        toast.error("Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    fetchRoleData(selectedRole);

    const handleRoleChanged = () => {
      const active = localStorage.getItem("wpis_active_role") || "Wildlife Researcher";
      setSelectedRole(active);
      fetchRoleData(active);
    };

    window.addEventListener("roleChanged", handleRoleChanged);
    return () => window.removeEventListener("roleChanged", handleRoleChanged);
  }, [selectedRole]);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    localStorage.setItem("wpis_active_role", role);
    fetchRoleData(role);
  };

  const handleRoleUpdateInAdmin = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role?role=${encodeURIComponent(newRole)}`);
      toast.success("User role updated successfully");
      const uRes = await api.get("/admin/users");
      setUsersList(uRes.data || []);
    } catch (err) {
      toast.error("Failed to update user role");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-10 w-10 border-4 border-[#155e3b] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#355344] font-bold">
          Connecting to Sensor Arrays...
        </p>
      </div>
    );
  }

  const statCards = [
    { title: "Total Observations", value: stats?.total_detections || 56, icon: FaPaw, suffix: "", color: "text-[#155e3b] bg-[#e8f4ed]" },
    { title: "Camera-Trap Vision", value: stats?.image_detections || 54, icon: FaPaw, suffix: "", color: "text-[#155e3b] bg-[#e8f4ed]" },
    { title: "Bioacoustic Calls", value: stats?.audio_detections || 2, icon: FaMicrophone, suffix: "", color: "text-[#0284c7] bg-[#e0f2fe]" },
    { title: "Active Surveys", value: stats?.active_surveys || 3, icon: FaClipboardCheck, suffix: "", color: "text-[#0f766e] bg-[#ccfbf1]" },
    { title: "Endangered Sightings", value: stats?.endangered_species || 4, icon: FaExclamationTriangle, suffix: "", color: "text-[#b45309] bg-[#fef3c7]" },
    { title: "Reserve Health Index", value: Math.round((stats?.average_habitat_health || 0.76) * 100), icon: FaHeartbeat, suffix: "%", color: "text-[#be123c] bg-[#ffe4e6]" },
  ];

  const roles = [
    "Wildlife Researcher",
    "Conservation Officer",
    "Forest Department Officer",
    "Administrator",
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-white border border-[#d6e4dc] p-6 sm:p-8 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#e8f4ed] border border-[#c2e2d0] text-xs font-mono text-[#10482e] font-bold">
            <FaLeaf className="text-[#155e3b]" />
            <span>WPIS Conservation Command Hub</span>
          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0d261b] tracking-tight">
            Welcome back, {user?.full_name || "Field Officer"}
          </h2>
          <p className="text-xs sm:text-sm text-[#355344] max-w-2xl">
            Live telemetry stream active across 4 reserve blocks. Computer vision inference and acoustic classification models online.
          </p>
        </div>

        {/* Role Perspective Selector Tabs */}
        <div className="flex-shrink-0 bg-[#f3f7f4] p-1.5 rounded-xl border border-[#d6e4dc] flex flex-wrap gap-1">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => handleRoleSelect(r)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedRole === r
                  ? "bg-[#155e3b] text-white shadow-sm"
                  : "text-[#355344] hover:text-[#0d261b] hover:bg-[#e5efe8]"
                }`}
            >
              {r.replace(" Officer", "").replace(" Department", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <GlassCard key={idx} variant="interactive" className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-[#355344] uppercase tracking-wider font-mono truncate">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl flex-shrink-0 ${card.color}`}>
                  <Icon className="text-xs" />
                </div>
              </div>
              <div className="font-display font-extrabold text-2xl lg:text-3xl text-[#0d261b] tracking-tight">
                <CountUp end={card.value} suffix={card.suffix} />
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Role-Based Intelligence Panel */}
      <GlassCard variant="prominent" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e5efe8] gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#e8f4ed] text-[#155e3b] flex items-center justify-center text-lg border border-[#c2e2d0]">
              <FaUserShield />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#0d261b]">
                {roleData?.role || selectedRole} Operations Hub
              </h3>
              <p className="text-xs text-[#355344]">
                Operational Focus: <span className="font-semibold text-[#155e3b]">{roleData?.primary_focus}</span>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#e8f4ed] text-[#10482e] border border-[#c2e2d0] self-start sm:self-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-[#155e3b]" /> Live Stream Active
          </span>
        </div>

        {/* Role Widget Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {roleData?.widgets?.map((w, i) => (
            <div key={i} className="p-4 bg-[#f7faf8] rounded-xl border border-[#d6e4dc] space-y-1">
              <p className="text-xs text-[#355344] font-semibold font-mono">{w.title}</p>
              <h4 className="font-display font-extrabold text-xl text-[#0d261b]">{w.value}</h4>
              <p className="text-[11px] font-bold text-[#155e3b]">{w.change || w.status}</p>
            </div>
          ))}
        </div>

        {/* Researcher Perspective: Observation Log */}
        {selectedRole === "Wildlife Researcher" && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d261b] font-mono">
              Recent Vision & Bioacoustic Telemetry Log
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#d6e4dc] bg-white">
              <table className="w-full text-xs text-left text-[#0d261b]">
                <thead className="bg-[#ebf3ed] text-[#0d261b] uppercase font-bold text-[10px] tracking-wider font-mono border-b border-[#d6e4dc]">
                  <tr>
                    <th className="p-3.5">Species Observation</th>
                    <th className="p-3.5">Telemetry Source</th>
                    <th className="p-3.5 text-center">Confidence</th>
                    <th className="p-3.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5efe8]">
                  {roleData?.recent_observations?.map((obs, idx) => (
                    <tr key={idx} className="hover:bg-[#f3f7f4] transition-colors">
                      <td className="p-3.5 font-bold text-[#0d261b] flex items-center gap-2">
                        <FaPaw className="text-[#155e3b] text-xs" /> {obs.species}
                      </td>
                      <td className="p-3.5 text-[#355344]">{obs.type}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#155e3b]">
                        {obs.confidence}
                      </td>
                      <td className="p-3.5 text-right text-[#4e6b5c] font-mono text-[11px]">{obs.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Conservation Officer: Threat Matrix */}
        {selectedRole === "Conservation Officer" && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d261b] font-mono">
              High-Priority Conservation & Corridor Matrix
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roleData?.conservation_priorities?.map((p, idx) => (
                <div key={idx} className="p-4 bg-[#fef9c3] rounded-xl border border-[#fef08a] space-y-2">
                  <div className="flex justify-between items-center">
                    <StatusBadge status={p.urgency} size="sm" />
                    <span className="text-[10px] text-[#854d0e] font-mono font-bold">Zone Priority</span>
                  </div>
                  <h5 className="font-bold text-[#0d261b] text-sm">{p.area}</h5>
                  <p className="text-xs text-[#355344]">
                    <span className="font-semibold text-[#854d0e]">Threat:</span> {p.threat}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forest Dept: Patrol Schedule */}
        {selectedRole === "Forest Department Officer" && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d261b] font-mono">
              Active Ranger Patrol & Sector Deployments
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#d6e4dc] bg-white">
              <table className="w-full text-xs text-left text-[#0d261b]">
                <thead className="bg-[#ebf3ed] text-[#0d261b] uppercase font-bold text-[10px] tracking-wider font-mono border-b border-[#d6e4dc]">
                  <tr>
                    <th className="p-3.5">Patrol Unit</th>
                    <th className="p-3.5">Monitored Passage</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Shift Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5efe8]">
                  {roleData?.patrol_schedule?.map((pat, idx) => (
                    <tr key={idx} className="hover:bg-[#f3f7f4] transition-colors">
                      <td className="p-3.5 font-bold text-[#0d261b]">{pat.unit}</td>
                      <td className="p-3.5 text-[#355344]">{pat.zone}</td>
                      <td className="p-3.5 text-center">
                        <StatusBadge status={pat.status} size="sm" />
                      </td>
                      <td className="p-3.5 text-right font-mono text-[#4e6b5c]">{pat.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Administrator: User Roles */}
        {selectedRole === "Administrator" && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d261b] font-mono">
              User Access Governance
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#d6e4dc] bg-white">
              <table className="w-full text-xs text-left text-[#0d261b]">
                <thead className="bg-[#ebf3ed] text-[#0d261b] uppercase font-bold text-[10px] tracking-wider font-mono border-b border-[#d6e4dc]">
                  <tr>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Active Role</th>
                    <th className="p-3.5 text-right">Update Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5efe8]">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-[#f3f7f4] transition-colors">
                      <td className="p-3.5 font-bold text-[#0d261b]">{u.full_name}</td>
                      <td className="p-3.5 font-mono text-xs text-[#355344]">{u.email}</td>
                      <td className="p-3.5">
                        <span className="font-semibold text-[#155e3b]">{u.role}</span>
                      </td>
                      <td className="p-3.5 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleUpdateInAdmin(u.id, e.target.value)}
                          className="bg-white border border-[#d6e4dc] rounded-lg px-2.5 py-1 text-xs text-[#0d261b] focus:outline-none focus:border-[#155e3b]"
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Population Trends */}
        <GlassCard variant="standard" className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-base text-[#0d261b]">
                Multi-Year Species Population Growth Trends
              </h3>
              <p className="text-xs text-[#355344]">
                Longitudinal population model estimates (2020–2026) · Lincoln-Petersen demographic counts
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#e8f4ed] text-[#10482e] border border-[#c2e2d0] self-start sm:self-auto">
              Confidence: 87–92%
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends?.population_trends || []}>
                <defs>
                  <linearGradient id="gradDashTiger" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#155e3b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#155e3b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradDashElephant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradDashLeopard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b45309" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#b45309" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5efe8" />
                <XAxis dataKey="year" stroke="#355344" tick={{ fontSize: 11 }} />
                <YAxis stroke="#355344" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#d6e4dc",
                    borderRadius: "10px",
                    color: "#0d261b",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value, name) => [value?.toLocaleString(), name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                <Area
                  type="monotone"
                  dataKey="Bengal Tiger"
                  stroke="#155e3b"
                  fill="url(#gradDashTiger)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#155e3b" }}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="Asian Elephant"
                  stroke="#0284c7"
                  fill="url(#gradDashElephant)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0284c7" }}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="Indian Leopard"
                  stroke="#b45309"
                  fill="url(#gradDashLeopard)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#b45309" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Monthly Activity */}
        <GlassCard variant="standard" className="p-6 space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-[#0d261b]">
              Monthly Sensor Ingestion Volume
            </h3>
            <p className="text-xs text-[#355344]">Camera-trap images vs audio vocalizations</p>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends?.monthly_activity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5efe8" />
                <XAxis dataKey="month" stroke="#355344" tick={{ fontSize: 11 }} />
                <YAxis stroke="#355344" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#d6e4dc",
                    borderRadius: "10px",
                    color: "#0d261b",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend />
                <Bar dataKey="detections" fill="#155e3b" radius={[4, 4, 0, 0]} name="Vision Detections" />
                <Bar dataKey="audio" fill="#0284c7" radius={[4, 4, 0, 0]} name="Bioacoustic Calls" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* GIS Spatial Reserve Map */}
      <GlassCard variant="prominent" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-lg text-[#0d261b] flex items-center gap-2">
              <FaMapMarkerAlt className="text-[#155e3b]" /> GIS Spatial Sanctuary Nodes & Sensor Arrays
            </h3>
            <p className="text-xs text-[#355344]">
              Live telemetry markers for camera trap nodes and acoustic arrays across protected sectors.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 bg-[#e8f4ed] text-[#10482e] rounded-full border border-[#c2e2d0] self-start sm:self-auto">
            Live Telemetry Active
          </span>
        </div>

        <div className="h-96 rounded-xl overflow-hidden border border-[#d6e4dc]">
          <MapContainer center={[21.0, 80.0]} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hotspots.map((h) => (
              <Marker key={h.id} position={[h.lat, h.lng]}>
                <Popup>
                  <div className="p-2 font-sans space-y-1">
                    <h4 className="font-bold text-sm text-[#0d261b]">{h.name}</h4>
                    <p className="text-xs text-[#355344]">{h.info}</p>
                    <div className="pt-1">
                      <StatusBadge status={h.health} size="sm" />
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </GlassCard>
    </div>
  );
}
