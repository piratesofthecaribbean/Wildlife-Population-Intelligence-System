import React, { useState, useEffect } from "react";
import { Trees, Droplets, AlertTriangle, ShieldCheck, RefreshCw, Layers, Compass, BarChart2 } from "lucide-react";
import { HabitatAssessment } from "../types.js";

export default function HabitatIntelligence() {
  const [assessments, setAssessments] = useState<HabitatAssessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/habitat/assessments");
      if (res.ok) {
        const json = await res.json();
        setAssessments(json);
      }
    } catch (err) {
      console.error("Failed to fetch habitat assessments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/habitat/recalculate", { method: "POST" });
      if (res.ok) {
        await fetchAssessments();
      }
    } catch (err) {
      console.error("Recalculation error:", err);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading && assessments.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400 font-sans">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-sm font-medium">Analyzing Satellite Canopy & Environmental Metrics...</span>
        </div>
      </div>
    );
  }

  const avgSuitability = assessments.length > 0
    ? Math.round(assessments.reduce((acc, h) => acc + h.habitatSuitability, 0) / assessments.length)
    : 0;

  const avgCanopy = assessments.length > 0
    ? Math.round(assessments.reduce((acc, h) => acc + h.canopyCover, 0) / assessments.length)
    : 0;

  const avgDisturbance = assessments.length > 0
    ? Math.round(assessments.reduce((acc, h) => acc + h.disturbanceScore, 0) / assessments.length)
    : 0;

  return (
    <div className="p-6 md:p-8 space-y-8 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-1">
            <Trees className="h-4 w-4" />
            Milestone 3 — Habitat Intelligence Workflows
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Habitat Suitability & Ecosystem Assessment</h1>
          <p className="text-slate-400 text-xs mt-1">
            Vegetation density, canopy cover, water availability, and anthropogenic disturbance analytics.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
          <span>{recalculating ? "Recalculating Models..." : "Recalculate Habitat Scores"}</span>
        </button>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Avg Habitat Suitability Index</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">
            {avgSuitability}<span className="text-slate-500 text-lg font-normal">/100</span>
          </div>
          <div className="text-[11px] text-slate-500">Combined ecological index score</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Average Canopy Cover</span>
            <Trees className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-400 tracking-tight">
            {avgCanopy}%
          </div>
          <div className="text-[11px] text-slate-500">Forest canopy density average</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Human Disturbance Risk</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 tracking-tight">
            {avgDisturbance}%
          </div>
          <div className="text-[11px] text-slate-500">Road, noise & settlement encroachment</div>
        </div>
      </div>

      {/* Detailed Site Assessments */}
      <div className="space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Compass className="h-4 w-4 text-emerald-400" />
          Sector Habitat Scorecards ({assessments.length} Sectors Evaluated)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {assessments.map((hab) => (
            <div key={hab.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 hover:border-slate-700 transition-all">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-extrabold text-white">{hab.monitoringSiteName}</h4>
                  <span className="text-xs text-slate-400 block mt-0.5">Assessment Date: {new Date(hab.assessedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-mono font-bold">
                    Suitability: {hab.habitatSuitability}/100
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">
                    {hab.habitatClassification}
                  </span>
                </div>
              </div>

              {/* Sub-Metrics Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800">
                {/* Vegetation Score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Trees className="h-3.5 w-3.5 text-emerald-400" />
                      Vegetation Density
                    </span>
                    <span className="font-mono font-bold">{hab.vegetationScore}/100</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${hab.vegetationScore}%` }} />
                  </div>
                </div>

                {/* Canopy Cover */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-400" />
                      Canopy Cover
                    </span>
                    <span className="font-mono font-bold">{hab.canopyCover}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${hab.canopyCover}%` }} />
                  </div>
                </div>

                {/* Water Availability Score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                      Water Availability
                    </span>
                    <span className="font-mono font-bold">{hab.waterScore}/100</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${hab.waterScore}%` }} />
                  </div>
                </div>

                {/* Human Disturbance Score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                      Human Disturbance
                    </span>
                    <span className="font-mono font-bold">{hab.disturbanceScore}/100</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${hab.disturbanceScore > 50 ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${hab.disturbanceScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
