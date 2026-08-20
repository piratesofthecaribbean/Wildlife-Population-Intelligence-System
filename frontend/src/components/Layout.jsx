import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import StatusBadge from "./StatusBadge.jsx";
import {
  FaChartPie,
  FaUpload,
  FaClipboardList,
  FaDna,
  FaSeedling,
  FaCog,
  FaSignOutAlt,
  FaBars,

  FaTimes,
  FaMicrophone,
  FaLeaf,
  FaBell,
  FaExclamationTriangle,
  FaUserShield,
  FaChartLine,
  FaShieldAlt,
  FaFileAlt,
  FaCompass,
} from "react-icons/fa";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [activeRole, setActiveRole] = useState(
    localStorage.getItem("wpis_active_role") || user?.role || "Wildlife Researcher"
  );

  useEffect(() => {
    if (user?.role) {
      setActiveRole(user.role);
    }
  }, [user]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get("/conservation/alerts");
        setAlerts(res.data || []);
      } catch (err) {
        console.error("Failed to fetch alerts", err);
      }
    };
    fetchAlerts();
  }, []);

  const menuItems = [
    { name: "Executive Hub", path: "/", icon: FaChartPie, section: "Core" },
    { name: "AI Vision Detection", path: "/detections", icon: FaUpload, section: "Intelligence" },
    { name: "Bioacoustic Sensor", path: "/audio", icon: FaMicrophone, section: "Intelligence" },
    { name: "Biodiversity Analytics", path: "/biodiversity", icon: FaLeaf, section: "Analytics" },
    { name: "Population Engine", path: "/population", icon: FaChartLine, section: "Analytics" },
    { name: "Habitat Monitoring", path: "/habitat", icon: FaSeedling, section: "Analytics" },
    { name: "Field Surveys", path: "/surveys", icon: FaClipboardList, section: "Field Operations" },
    { name: "Species Registry", path: "/species", icon: FaDna, section: "Field Operations" },
    { name: "Reports & Export", path: "/reports", icon: FaFileAlt, section: "Outputs" },
    { name: "Admin Terminal", path: "/admin", icon: FaShieldAlt, section: "System" },
    { name: "Settings", path: "/settings", icon: FaCog, section: "System" },
  ];

  const rolesList = [
    "Wildlife Researcher",
    "Conservation Officer",
    "Forest Department Officer",
    "Administrator",
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleRoleChange = (newRole) => {
    setActiveRole(newRole);
    localStorage.setItem("wpis_active_role", newRole);
    window.dispatchEvent(new Event("roleChanged"));
  };

  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0c2419] text-[#f0fdf4] w-64 shadow-lg border-r border-[#153f2c]">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-6 py-5 border-b border-[#1b4b35] bg-[#091e14]">
        <div className="h-10 w-10 rounded-xl bg-[#155e3b] flex items-center justify-center text-white shadow-sm border border-[#2a7a51]">
          <FaLeaf className="text-lg" />
        </div>
        <div>
          <span className="font-display font-extrabold text-base tracking-tight text-white block">
            WPIS <span className="text-[#68cb98]">System</span>
          </span>
          <span className="text-[10px] text-[#a1d7ba] font-mono tracking-wider uppercase block">
            Wildlife Intelligence
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const showSection = idx === 0 || menuItems[idx - 1].section !== item.section;

          return (
            <React.Fragment key={item.name}>
              {showSection && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#6cb38e] font-mono">
                  {item.section}
                </div>
              )}
              <Link
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#155e3b] text-white font-bold shadow-sm"
                    : "text-[#c2e2d0] hover:bg-[#123624] hover:text-white"
                }`}
              >
                <Icon className={`text-base ${isActive ? "text-[#86efac]" : "text-[#78b394]"}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </div>

      {/* User Context & Role Switcher */}
      <div className="p-3 border-t border-[#1b4b35] bg-[#091e14]">
        <div className="p-3 bg-[#0d2a1c] rounded-xl border border-[#1b4b35]">
          <div className="flex items-center space-x-2.5 mb-2">
            <div className="h-8 w-8 bg-[#155e3b] rounded-full flex items-center justify-center font-bold text-xs text-white uppercase border border-[#2a7a51]">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || "Field Officer"}</p>
              <p className="text-[10px] text-[#86efac] font-mono truncate">{user?.email || "online"}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1b4b35]">
            <label className="text-[9px] uppercase tracking-wider text-[#a1d7ba] font-bold block mb-1 flex items-center gap-1">
              <FaUserShield className="text-[#86efac]" /> Active Perspective:
            </label>
            <select
              value={activeRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full bg-[#06150e] text-xs text-white rounded-lg px-2 py-1.5 border border-[#1b4b35] focus:outline-none focus:border-[#2a7a51]"
            >
              {rolesList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-2 flex items-center justify-center space-x-2 px-3 py-2 bg-[#2d1212] hover:bg-[#401818] text-[#fca5a5] rounded-xl transition-all text-xs font-semibold border border-[#521c1c]"
        >
          <FaSignOutAlt className="text-xs" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f3f7f4] text-[#0d261b] overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/50 transition-opacity duration-200">
          <div className="relative h-full">
            <SidebarContent />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 -right-12 p-2 bg-[#0c2419] text-white rounded-r-xl"
              aria-label="Close menu"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navbar (Solid White, Clean) */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[#d6e4dc] z-20 sticky top-0 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-[#0d261b] hover:bg-[#f3f7f4] rounded-xl transition-colors"
              aria-label="Open menu"
            >
              <FaBars className="text-lg" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-display font-extrabold text-[#0d261b] tracking-tight">
                  {menuItems.find((item) => item.path === location.pathname)?.name || "Intelligence Hub"}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#e8f4ed] text-[#10482e] border border-[#c2e2d0]">
                  <FaCompass className="text-[10px]" /> {activeRole.replace(" Officer", "").replace(" Department", "")}
                </span>
              </div>
              <p className="text-[11px] text-[#355344] font-medium">
                Wildlife Conservation & Population Monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setAlertsOpen(!alertsOpen)}
                className="p-2.5 relative bg-[#f3f7f4] hover:bg-[#e5efe8] text-[#0d261b] rounded-xl transition-all border border-[#d6e4dc]"
                aria-label="Notifications"
              >
                <FaBell className="text-base text-[#155e3b]" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#b45309] text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>

              {/* Alerts Dropdown Drawer */}
              {alertsOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-[#d6e4dc] z-50 overflow-hidden">
                  <div className="p-4 bg-[#155e3b] text-white flex justify-between items-center">
                    <div className="flex items-center gap-2 font-display font-bold text-sm">
                      <FaExclamationTriangle className="text-[#fde68a]" /> System Alerts & Threats
                    </div>
                    <span className="text-[11px] font-mono bg-[#0d261b] text-[#f0fdf4] px-2 py-0.5 rounded-full">
                      {alerts.length} active
                    </span>
                  </div>

                  <div className="max-h-84 overflow-y-auto divide-y divide-[#e5efe8]">
                    {alerts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#355344] font-medium">
                        No active conservation alerts.
                      </div>
                    ) : (
                      alerts.map((alt) => (
                        <div key={alt.id} className="p-3.5 hover:bg-[#f3f7f4] transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <StatusBadge status={alt.severity || "info"} size="sm" />
                            <span className="text-[10px] text-[#355344] font-mono">
                              {alt.timestamp?.slice(11, 16) || "recent"}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#0d261b]">{alt.title}</h4>
                          <p className="text-[11px] text-[#355344] mt-0.5 leading-snug">
                            {alt.message}
                          </p>
                          <p className="text-[10px] text-[#155e3b] mt-1 font-mono">
                            📍 {alt.location}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Workspace */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 bg-[#f3f7f4]">
          <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
