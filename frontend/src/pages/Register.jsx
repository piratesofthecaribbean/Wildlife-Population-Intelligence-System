import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard.jsx";
import { FaLeaf, FaUser, FaEnvelope, FaLock, FaUserShield, FaArrowRight } from "react-icons/fa";
import { toast } from "react-hot-toast";
import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Wildlife Researcher");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/register", {
        full_name: fullName,
        email,
        password,
        role,
      });
      toast.success("Account created successfully! Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed. Try a different email.");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: "Wildlife Researcher", desc: "AI detection, telemetry & species studies" },
    { value: "Conservation Officer", desc: "Threat management, corridors & quotas" },
    { value: "Forest Department Officer", desc: "Ranger dispatch, camera traps & patrols" },
    { value: "Administrator", desc: "Full system config & user permission control" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f7f4] text-[#0d261b] px-4">
      <GlassCard variant="prominent" className="max-w-md w-full my-8 shadow-panel">
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 bg-[#155e3b] rounded-2xl flex items-center justify-center text-white text-xl shadow-sm mb-3">
            <FaLeaf />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-[#0d261b] tracking-tight">
            Create WPIS Account
          </h1>
          <p className="text-xs text-[#355344] mt-1">
            Join the wildlife intelligence & monitoring network
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0d261b] font-mono">
              Full Name
            </label>
            <div className="relative">
              <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6c8a7b] text-xs" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Elena Rostova"
                className="input-forest pl-10 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0d261b] font-mono">
              Email Address
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6c8a7b] text-xs" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena.rostova@wpis.org"
                className="input-forest pl-10 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0d261b] font-mono">
              Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6c8a7b] text-xs" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-forest pl-10 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0d261b] font-mono">
              Operational Role
            </label>
            <div className="relative">
              <FaUserShield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6c8a7b] text-xs pointer-events-none" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-forest pl-10 text-xs cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-forest-primary py-3 font-bold text-sm shadow-sm mt-2"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Complete Registration</span>
                <FaArrowRight className="text-xs" />
              </>
            )}
          </button>
        </form>

        <div className="pt-5 mt-5 border-t border-[#d6e4dc] text-center">
          <p className="text-xs text-[#355344]">
            Already have an active account?{" "}
            <Link to="/login" className="text-[#155e3b] font-bold hover:underline ml-1">
              Sign In
            </Link>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
