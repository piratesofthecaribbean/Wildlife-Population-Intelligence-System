import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import { FaLeaf, FaEnvelope, FaLock, FaArrowRight } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back to Wildlife Intelligence!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f7f4] text-[#0d261b] px-4">
      <GlassCard variant="prominent" className="max-w-md w-full my-8 shadow-panel">
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 bg-[#155e3b] rounded-2xl flex items-center justify-center text-white text-xl shadow-sm mb-3">
            <FaLeaf />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-[#0d261b] tracking-tight">
            WPIS Terminal
          </h1>
          <p className="text-xs text-[#355344] mt-1">
            Sign in to access real-time conservation telemetry
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="researcher@wpis.org"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-forest-primary py-3 font-bold text-sm shadow-sm mt-2"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Station</span>
                <FaArrowRight className="text-xs" />
              </>
            )}
          </button>
        </form>

        <div className="pt-5 mt-5 border-t border-[#d6e4dc] text-center">
          <p className="text-xs text-[#355344]">
            Need an operational account?{" "}
            <Link
              to="/register"
              className="text-[#155e3b] font-bold hover:underline ml-1"
            >
              Create Account
            </Link>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
