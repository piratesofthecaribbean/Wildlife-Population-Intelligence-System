import React, { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import CountUp from "../components/CountUp.jsx";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import {
  FaLeaf,
  FaFilePdf,
  FaFileExcel,
  FaCalculator,
  FaShieldAlt,
} from "react-icons/fa";

export default function BiodiversityAnalytics() {
  const [metrics, setMetrics] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [metRes, detRes] = await Promise.all([
        api.get("/biodiversity/metrics"),
        api.get("/detections"),
      ]);
      setMetrics(metRes.data);
      setDetections(detRes.data || []);
    } catch (err) {
      toast.error("Failed to load biodiversity metrics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleDownload = async (format) => {
    try {
      const endpoint =
        format === "pdf"
          ? "/biodiversity/reports/pdf"
          : "/biodiversity/reports/excel";
      const filename = `biodiversity_report.${format === "pdf" ? "pdf" : "xlsx"}`;
      const response = await api.get(endpoint, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Exported ${format.toUpperCase()} successfully!`);
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()}.`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-10 w-10 border-4 border-[#155e3b] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#355344] font-bold">
          Computing Mathematical Entropy Indices...
        </p>
      </div>
    );
  }

  const COLORS = ["#155e3b", "#0284c7", "#b45309", "#0f766e", "#be123c", "#6366f1"];

  const speciesAbundance = detections.reduce((acc, curr) => {
    acc[curr.species_name] = (acc[curr.species_name] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(speciesAbundance).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0d261b] flex items-center gap-2.5">
            <FaLeaf className="text-[#155e3b]" /> Biodiversity Metrics & Mathematical Entropy
          </h2>
          <p className="text-xs text-[#355344] mt-1">
            Shannon-Wiener diversity entropy (H&apos;), Simpson dominance index (D), species richness, and evenness.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleDownload("pdf")}
            className="flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <FaFilePdf />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => handleDownload("excel")}
            className="btn-forest-primary text-xs"
          >
            <FaFileExcel />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Index Formula Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard variant="standard" className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[#355344]">
              Shannon-Wiener (H&apos;)
            </span>
            <FaCalculator className="text-[#155e3b]" />
          </div>
          <div className="font-display font-extrabold text-3xl text-[#0d261b]">
            <CountUp end={metrics?.shannon_index || 2.45} decimals={2} />
          </div>
          <p className="text-xs text-[#355344]">{'H\' = -\u03a3(pi * ln(pi))'}</p>
          <div className="pt-2">
            <StatusBadge status="Healthy" size="sm" />
          </div>
        </GlassCard>

        <GlassCard variant="standard" className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[#355344]">
              Simpson Index (1 - D)
            </span>
            <FaCalculator className="text-[#0284c7]" />
          </div>
          <div className="font-display font-extrabold text-3xl text-[#0d261b]">
            <CountUp end={metrics?.simpson_index || 0.88} decimals={2} />
          </div>
          <p className="text-xs text-[#355344]">High Evenness & Balance</p>
          <div className="pt-2">
            <StatusBadge status="Excellent" size="sm" />
          </div>
        </GlassCard>

        <GlassCard variant="standard" className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[#355344]">
              Species Richness (S)
            </span>
            <FaLeaf className="text-[#155e3b]" />
          </div>
          <div className="font-display font-extrabold text-3xl text-[#0d261b]">
            <CountUp end={metrics?.species_richness || 14} />
          </div>
          <p className="text-xs text-[#355344]">Distinct taxa cataloged</p>
          <div className="pt-2">
            <span className="badge-forest text-[11px] font-mono">14 Taxa</span>
          </div>
        </GlassCard>

        <GlassCard variant="standard" className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[#355344]">
              Overall Health Rating
            </span>
            <FaShieldAlt className="text-[#be123c]" />
          </div>
          <div className="font-display font-extrabold text-3xl text-[#0d261b]">
            <CountUp end={metrics?.health_score || 86.4} decimals={1} suffix="%" />
          </div>
          <p className="text-xs text-[#355344]">Weighted composite index</p>
          <div className="pt-2">
            <StatusBadge status="Excellent" size="sm" />
          </div>
        </GlassCard>
      </div>

      {/* Relative Abundance Pie Chart */}
      <GlassCard variant="standard" className="p-6 space-y-4">
        <div>
          <h3 className="font-display font-bold text-base text-[#0d261b]">
            Species Relative Abundance Distribution
          </h3>
          <p className="text-xs text-[#355344]">Proportional breakdown of logged telemetry observations</p>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
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
            </PieChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Observation History Table */}
      <GlassCard variant="standard" className="p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-[#0d261b]">
          Multimodal Observation Telemetry Log
        </h3>
        <div className="overflow-x-auto rounded-xl border border-[#d6e4dc] bg-white">
          <table className="w-full text-xs text-left text-[#0d261b]">
            <thead className="bg-[#ebf3ed] text-[#0d261b] uppercase font-bold text-[10px] tracking-wider font-mono border-b border-[#d6e4dc]">
              <tr>
                <th className="px-5 py-3.5">Species Name</th>
                <th className="px-5 py-3.5">Scientific Name</th>
                <th className="px-5 py-3.5 text-center">Modality</th>
                <th className="px-5 py-3.5 text-center">Confidence</th>
                <th className="px-5 py-3.5 text-right">Observation Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5efe8]">
              {detections.slice(0, 8).map((det) => (
                <tr key={det.id} className="hover:bg-[#f3f7f4] transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#0d261b]">
                    {det.species_name}
                  </td>
                  <td className="px-5 py-3.5 italic text-[#355344]">
                    {det.scientific_name || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono">
                    <span className="badge-forest text-[10px] font-bold">
                      {det.source_type || "Camera Trap"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-bold text-[#155e3b]">
                    {Math.round(det.confidence * 100)}%
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-[11px] text-[#4e6b5c]">
                    {new Date(det.created_at).toLocaleString()}
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
