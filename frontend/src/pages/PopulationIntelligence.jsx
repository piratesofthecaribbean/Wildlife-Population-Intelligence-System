import React, { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import {
  FaChartLine,
  FaRoute,
  FaFilePdf,
  FaFileExcel,
  FaPaw,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
} from "react-icons/fa";

export default function PopulationIntelligence() {
  const [estimates, setEstimates] = useState([]);
  const [trends, setTrends] = useState(null);
  const [migration, setMigration] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [estRes, trRes, migRes] = await Promise.all([
        api.get("/population/estimate"),
        api.get("/population/trends"),
        api.get("/population/migration"),
      ]);
      setEstimates(estRes.data || []);
      setTrends(trRes.data || null);
      setMigration(migRes.data || []);
    } catch (err) {
      toast.error("Failed to load population intelligence datasets.");
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
      const filename = `population_report.${format === "pdf" ? "pdf" : "xlsx"}`;
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
          Synthesizing Mark-Recapture &amp; Density Matrices...
        </p>
      </div>
    );
  }

  const historicalCensus = trends?.historical_census || [];
  const growthSummary = trends?.growth_summary || [];
  const trackedSpecies = trends?.tracked_species || ["Bengal Tiger", "Asian Elephant", "Indian Leopard"];

  const SPECIES_COLORS = {
    "Bengal Tiger": { stroke: "#155e3b", fill: "#c2e2d0" },
    "Asian Elephant": { stroke: "#0284c7", fill: "#bae6fd" },
    "Indian Leopard": { stroke: "#b45309", fill: "#fde68a" },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0d261b] flex items-center gap-2.5">
            <FaChartLine className="text-[#155e3b]" /> Population Dynamics &amp; Migration Modeling
          </h2>
          <p className="text-xs text-[#355344] mt-1">
            Lincoln-Petersen demographic counts, spatial density per km², growth rates, and GIS migration corridors.
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

      {/* Growth Summary KPI Cards */}
      {growthSummary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {growthSummary.map((g, i) => (
            <GlassCard key={i} variant="standard" className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#355344] uppercase tracking-wider">
                  {g.species}
                </span>
                {g.growth_rate_pct > 0 ? (
                  <FaArrowUp className="text-[#155e3b] text-xs" />
                ) : g.growth_rate_pct < 0 ? (
                  <FaArrowDown className="text-red-500 text-xs" />
                ) : (
                  <FaMinus className="text-[#b45309] text-xs" />
                )}
              </div>
              <p className="font-display font-extrabold text-2xl text-[#0d261b]">
                {g.current_estimate?.toLocaleString()}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#355344] font-mono">Est. Individuals</span>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  g.growth_rate_pct > 0
                    ? "bg-[#e8f4ed] text-[#10482e]"
                    : "bg-red-50 text-red-600"
                }`}>
                  {g.growth_rate_pct > 0 ? "+" : ""}{g.growth_rate_pct}% YoY
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Multi-Year Species Population Growth Trends */}
      <GlassCard variant="standard" className="p-6 space-y-4">
        <div>
          <h3 className="font-display font-bold text-base text-[#0d261b]">
            Multi-Year Species Population Growth Trends
          </h3>
          <p className="text-xs text-[#355344]">
            Longitudinal population model estimates (2020–2026) · Model:{" "}
            {trends?.model || "Lincoln-Petersen + Logistic Growth Projection"} · Confidence:{" "}
            {trends?.confidence || "87–92%"}
          </p>
        </div>

        <div className="h-80">
          {historicalCensus.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalCensus}>
                <defs>
                  {trackedSpecies.map((sp) => (
                    <linearGradient
                      key={sp}
                      id={`grad-${sp.replace(/\s/g, "")}`}
                      x1="0" y1="0" x2="0" y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={SPECIES_COLORS[sp]?.stroke || "#155e3b"}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={SPECIES_COLORS[sp]?.stroke || "#155e3b"}
                        stopOpacity={0.03}
                      />
                    </linearGradient>
                  ))}
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
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                {trackedSpecies.map((sp) => (
                  <Area
                    key={sp}
                    type="monotone"
                    dataKey={sp}
                    stroke={SPECIES_COLORS[sp]?.stroke || "#155e3b"}
                    fill={`url(#grad-${sp.replace(/\s/g, "")})`}
                    strokeWidth={2}
                    dot={{ r: 3, fill: SPECIES_COLORS[sp]?.stroke || "#155e3b" }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-[#355344] font-mono">
              No trend data available yet.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Census & Density Matrix Table */}
      <GlassCard variant="standard" className="p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-[#0d261b]">
          Species Abundance &amp; Density per Square Kilometer
        </h3>
        <div className="overflow-x-auto rounded-xl border border-[#d6e4dc] bg-white">
          <table className="w-full text-xs text-left text-[#0d261b]">
            <thead className="bg-[#ebf3ed] text-[#0d261b] uppercase font-bold text-[10px] tracking-wider font-mono border-b border-[#d6e4dc]">
              <tr>
                <th className="px-5 py-3.5">Taxon Name</th>
                <th className="px-5 py-3.5 text-center">Estimated Count</th>
                <th className="px-5 py-3.5 text-center">Density (per km²)</th>
                <th className="px-5 py-3.5 text-center">Annual Growth</th>
                <th className="px-5 py-3.5 text-right">IUCN Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5efe8]">
              {estimates.length > 0 ? (
                estimates.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#f3f7f4] transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#0d261b] flex items-center gap-2">
                      <FaPaw className="text-[#155e3b] text-xs" /> {item.species_name}
                    </td>
                    <td className="px-5 py-3.5 text-center font-display font-extrabold text-base text-[#0d261b]">
                      {(item.estimated_population || item.population_size || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-[#355344]">
                      {item.density_per_sq_km}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-[#155e3b]">
                      {item.annual_growth_rate || item.growth_rate_pct}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <StatusBadge status={item.conservation_status || "LC"} size="sm" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[#355344] font-mono">
                    No species abundance data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Migration Corridors Map */}
      <GlassCard variant="prominent" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-lg text-[#0d261b] flex items-center gap-2">
              <FaRoute className="text-[#155e3b]" /> Seasonal Transit &amp; Migration Corridors
            </h3>
            <p className="text-xs text-[#355344]">
              Centroid shift paths tracking seasonal herd movement across national wildlife corridors.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 bg-[#e8f4ed] text-[#10482e] rounded-full border border-[#c2e2d0] self-start sm:self-auto">
            Corridors Active
          </span>
        </div>

        <div className="h-96 rounded-xl overflow-hidden border border-[#d6e4dc]">
          <MapContainer center={[21.0, 80.0]} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {migration.map((m) => {
              const startCoords =
                Array.isArray(m.vector_start) && m.vector_start.length === 2
                  ? m.vector_start
                  : [21.5, 86.0];
              const endCoords =
                Array.isArray(m.vector_end) && m.vector_end.length === 2
                  ? m.vector_end
                  : [22.2, 88.5];

              return (
                <React.Fragment key={m.id}>
                  <Marker position={startCoords}>
                    <Popup>
                      <div className="p-1 font-sans">
                        <h5 className="font-bold text-xs text-[#0d261b]">
                          {m.species_name || m.target_species} (Origin)
                        </h5>
                        <p className="text-[11px] text-[#355344]">Transit Season: {m.season}</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Marker position={endCoords}>
                    <Popup>
                      <div className="p-1 font-sans">
                        <h5 className="font-bold text-xs text-[#0d261b]">
                          {m.species_name || m.target_species} (Destination)
                        </h5>
                        <p className="text-[11px] text-[#355344]">
                          Distance: {m.distance_km || "Computed"} km
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[startCoords, endCoords]}
                    color="#155e3b"
                    weight={3}
                    dashArray="5, 10"
                  />
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      </GlassCard>
    </div>
  );
}
