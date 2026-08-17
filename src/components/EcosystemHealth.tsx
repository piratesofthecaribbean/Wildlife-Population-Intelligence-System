import { useState, useEffect } from "react";
import { Activity, ShieldCheck, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { EcosystemHealthReport } from "../types.js";

export default function EcosystemHealth() {
  const [reports, setReports] = useState<EcosystemHealthReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ecosystem/reports");
      if (res.ok) {
        const json = await res.json();
        setReports(json);
      }
    } catch (err) {
      console.error("Failed to fetch ecosystem reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/ecosystem/recalculate", { method: "POST" });
      if (res.ok) {
        await fetchReports();
      }
    } catch (err) {
      console.error("Recalculation error:", err);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400 font-sans">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-sm font-medium">Computing Multi-Factor Ecosystem Health Index...</span>
        </div>
      </div>
    );
  }

  const avgHealth = reports.length > 0
    ? Math.round(reports.reduce((acc, r) => acc + r.overallHealthScore, 0) / reports.length)
    : 0;

  const chartData = reports.map(r => ({
    name: r.monitoringSiteName || "Site",
    diversity: r.diversityScore,
    habitat: r.habitatScore,
    stability: r.populationStabilityScore,
    water: r.waterScore,
    overall: r.overallHealthScore
  }));

  return (
    <div className="p-6 md:p-8 space-y-8 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-1">
            <Activity className="h-4 w-4" />
            Milestone 3 — Ecosystem Health Analytics
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Ecosystem Health Index & Analytics</h1>
          <p className="text-slate-400 text-xs mt-1">
            Integrated composite scoring combining biodiversity richness, habitat quality, stability, and human impacts.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
          <span>{recalculating ? "Running Analytics Engine..." : "Recalculate Health Index"}</span>
        </button>
      </div>

      {/* Main Health Metric Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl text-center md:text-left">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            Regional Composite Status
          </span>
          <h2 className="text-2xl font-black text-white">Overall Ecosystem Health: {avgHealth}/100</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The regional ecosystem is classified as <strong className="text-emerald-400 font-bold">Good / Moderate</strong> based on stable mammal observation frequency, high canopy preservation, and moderate water availability.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950 p-6 rounded-xl border border-slate-800 shrink-0">
          <div className="relative flex items-center justify-center">
            <div className="text-4xl font-black text-emerald-400 font-mono">{avgHealth}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block">Category</span>
            <span className="text-sm font-bold text-white px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 block text-center">
              {avgHealth >= 85 ? "Excellent" : avgHealth >= 70 ? "Good" : avgHealth >= 50 ? "Moderate" : "Critical"}
            </span>
          </div>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Multi-Site Ecological Factor Comparison
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Breakdown of individual ecological drivers across monitored sectors.
            </p>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Bar dataKey="diversity" name="Species Diversity" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="habitat" name="Habitat Quality" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="stability" name="Pop Stability" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="water" name="Water Score" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sector Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((rep) => (
          <div key={rep.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-lg font-bold text-white">{rep.monitoringSiteName}</h4>
                <span className="text-xs text-slate-400">Sector Health Report</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400 font-mono block">{rep.overallHealthScore}/100</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  rep.healthCategory === "Excellent" || rep.healthCategory === "Good"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  {rep.healthCategory}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Diversity Score</span>
                <span className="text-base font-bold text-white">{rep.diversityScore}/100</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Habitat Quality</span>
                <span className="text-base font-bold text-white">{rep.habitatScore}/100</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Population Stability</span>
                <span className="text-base font-bold text-white">{rep.populationStabilityScore}/100</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Water Availability</span>
                <span className="text-base font-bold text-white">{rep.waterScore}/100</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
