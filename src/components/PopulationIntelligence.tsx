import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, RefreshCw, Users, Activity, BarChart3, ChevronRight, Layers, Award } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { PopulationEstimate } from "../types.js";

export default function PopulationIntelligence() {
  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<"species" | "sites">("species");

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/population/trends");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch population trends:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/population/recalculate", { method: "POST" });
      if (res.ok) {
        await fetchTrends();
      }
    } catch (err) {
      console.error("Recalculation error:", err);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400 font-sans">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-sm font-medium">Computing Population Intelligence Models...</span>
        </div>
      </div>
    );
  }

  const speciesList: PopulationEstimate[] = data?.speciesEstimates || [];
  const siteList: PopulationEstimate[] = data?.siteEstimates || [];

  return (
    <div className="p-6 md:p-8 space-y-8 font-sans max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-1">
            <TrendingUp className="h-4 w-4" />
            Milestone 3 — Population Estimation Engine
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Wildlife Population Intelligence</h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time species abundance estimation, detection frequency models, and growth timeline forecasting.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
          <span>{recalculating ? "Recalculating Engine..." : "Recalculate Estimates"}</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Estimated Population</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {data?.totalEstimatedPopulation?.toLocaleString() || "0"}
          </div>
          <div className="text-[11px] text-slate-500">Across all monitored sectors</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Avg Population Growth Rate</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className={`text-3xl font-black tracking-tight ${data?.avgGrowthRate >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
            {data?.avgGrowthRate >= 0 ? `+${data?.avgGrowthRate}%` : `${data?.avgGrowthRate}%`}
          </div>
          <div className="text-[11px] text-slate-500">30-day trailing comparison</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Increasing Trends</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">
            {data?.increasingSpeciesCount || 0}
            <span className="text-slate-500 text-sm font-normal ml-1.5">species</span>
          </div>
          <div className="text-[11px] text-slate-500">Positive growth trajectories</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Declining Trends</span>
            <TrendingDown className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400 tracking-tight">
            {data?.decreasingSpeciesCount || 0}
            <span className="text-slate-500 text-sm font-normal ml-1.5">species</span>
          </div>
          <div className="text-[11px] text-slate-500">Targeted for conservation intervention</div>
        </div>
      </div>

      {/* Population Growth Timeline Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              Population Forecasting & Trend Timeline
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Historical estimates and 12-month projections by species conservation tier.
            </p>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase">
            AI Projection Engine
          </span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.monthlyTimeline || []}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorThreatened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Area type="monotone" dataKey="totalEstimatedPopulation" name="Total Population" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
              <Area type="monotone" dataKey="threatenedPopulation" name="Threatened Species" stroke="#f59e0b" fillOpacity={1} fill="url(#colorThreatened)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tab Controls for Species vs Sites */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setSelectedTab("species")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === "species"
                ? "bg-slate-800 text-white border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>Species Population Breakdown ({speciesList.length})</span>
          </button>

          <button
            onClick={() => setSelectedTab("sites")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === "sites"
                ? "bg-slate-800 text-white border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Award className="h-4 w-4 text-blue-400" />
            <span>Monitoring Site Abundance ({siteList.length})</span>
          </button>
        </div>

        {/* Species List View */}
        {selectedTab === "species" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {speciesList.map((sp) => (
              <div key={sp.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-white">{sp.speciesCommonName}</h4>
                    <span className="text-xs text-slate-400 italic block">{sp.speciesScientificName}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                    sp.trendDirection === "Increasing"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : sp.trendDirection === "Decreasing"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}>
                    {sp.trendDirection === "Increasing" ? <TrendingUp className="h-3 w-3" /> : sp.trendDirection === "Decreasing" ? <TrendingDown className="h-3 w-3" /> : null}
                    {sp.trendDirection} ({sp.growthRate >= 0 ? `+${sp.growthRate}%` : `${sp.growthRate}%`})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-mono">Estimated Count</span>
                    <span className="text-lg font-black text-white">{sp.estimatedPopulation?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-mono">Observations</span>
                    <span className="text-lg font-bold text-slate-300">{sp.observationCount} events</span>
                  </div>
                </div>

                {/* Confidence Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Model Confidence</span>
                    <span className="font-mono font-bold text-emerald-400">{sp.estimationConfidence}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${sp.estimationConfidence}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sites List View */}
        {selectedTab === "sites" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {siteList.map((st) => (
              <div key={st.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-white">{st.monitoringSiteName}</h4>
                    <span className="text-xs text-slate-400 block">Sector Monitoring Zone</span>
                  </div>
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase">
                    Active Site
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-mono">Abundance Estimate</span>
                    <span className="text-lg font-black text-white">{st.estimatedPopulation?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-mono">Sightings Recorded</span>
                    <span className="text-lg font-bold text-slate-300">{st.observationCount} events</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
