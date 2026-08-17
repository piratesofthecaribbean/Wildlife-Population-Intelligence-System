import React, { useState } from "react";
import { TreePine, Lock, Mail, Shield, ArrowRight, Eye, EyeOff, User, Sparkles, AlertCircle, Building2, Globe } from "lucide-react";

interface SignInProps {
  onSignIn: (email: string, password?: string) => Promise<void>;
  onRegister: (registerData: any) => Promise<void>;
}

export default function SignIn({ onSignIn, onRegister }: SignInProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  
  // Login Fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Register Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [department, setDepartment] = useState("");
  const [country, setCountry] = useState("");
  const [role, setRole] = useState("Wildlife Researcher");
  
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleTabChange = (tab: "signin" | "signup") => {
    setActiveTab(tab);
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setInfoMsg("For password recovery, please contact system support at admin@wildlife.gov.");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (activeTab === "signin") {
        if (!loginEmail.trim() || !loginPassword) {
          throw new Error("Email and Password are required.");
        }
        await onSignIn(loginEmail.trim(), loginPassword);
      } else {
        // Registering a new account
        if (!name.trim()) throw new Error("Full Name is required.");
        if (!email.trim()) throw new Error("Work Email is required.");
        if (!password) throw new Error("Password is required.");
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (!organization.trim()) throw new Error("Organization is required.");
        if (!role) throw new Error("Please select an authorized role.");

        await onRegister({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          organization: organization.trim(),
          department: department.trim() || undefined,
          country: country.trim() || undefined,
          role: role
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 relative z-10 space-y-6 shadow-2xl">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <TreePine className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Wildlife Population Intelligence
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Production Operations & Analytics Portal
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => handleTabChange("signin")}
            className={`py-2 text-xs font-bold rounded-md transition cursor-pointer ${
              activeTab === "signin"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("signup")}
            className={`py-2 text-xs font-bold rounded-md transition cursor-pointer ${
              activeTab === "signup"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Errors display */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Informational Alerts */}
        {infoMsg && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-lg flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {activeTab === "signin" ? (
            /* ================= LOGIN FORM ================= */
            <div className="space-y-4">
              
              {/* Quick Select Preset Demo Accounts */}
              <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Quick Demo Accounts (1-Click Fill)
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("elena.r@wildlife.gov");
                      setLoginPassword("password123");
                    }}
                    className="p-1.5 bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 rounded text-[10px] text-slate-300 hover:text-emerald-300 transition text-left cursor-pointer"
                  >
                    <div className="font-bold truncate">Dr. Elena</div>
                    <div className="text-[9px] text-slate-500 truncate">Researcher</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("j.mpata@wildlife.gov");
                      setLoginPassword("password123");
                    }}
                    className="p-1.5 bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 rounded text-[10px] text-slate-300 hover:text-emerald-300 transition text-left cursor-pointer"
                  >
                    <div className="font-bold truncate">Officer Mpata</div>
                    <div className="text-[9px] text-slate-500 truncate">Forest Officer</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("admin@wildlife.gov");
                      setLoginPassword("password123");
                    }}
                    className="p-1.5 bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 rounded text-[10px] text-slate-300 hover:text-emerald-300 transition text-left cursor-pointer"
                  >
                    <div className="font-bold truncate">Admin User</div>
                    <div className="text-[9px] text-slate-500 truncate">System Admin</div>
                  </button>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Work Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="name@wildlife.gov"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                  />
                  <span>Remember Me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-emerald-400 hover:text-emerald-300 cursor-pointer hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          ) : (
            /* ================= REGISTER FORM ================= */
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jane Goodall"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Work Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="name@wildlife.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-10 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Organization
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wildlife Research Institute"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Department (Optional) */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Department <span className="text-slate-600 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Biodiversity Informatics"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Country (Optional) */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Country <span className="text-slate-600 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <Globe className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Kenya"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Authorized Role Selection
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Wildlife Researcher">Wildlife Researcher</option>
                  <option value="Forest Officer">Forest Officer</option>
                  <option value="Conservation Officer">Conservation Officer</option>
                  <option value="NGO Partner">NGO Partner</option>
                  <option value="Student / Research Intern">Student / Research Intern</option>
                </select>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-lg border border-emerald-500 hover:border-emerald-400 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Shield className="h-4 w-4 animate-spin" />
                Processing Session...
              </>
            ) : (
              <>
                {activeTab === "signin" ? "Initialize Control Panel" : "Register Authorized Profile"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Disclaimers */}
        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Authorized personnel only. Access attempt trails are monitored and logged to system database.
        </p>

      </div>
    </div>
  );
}
