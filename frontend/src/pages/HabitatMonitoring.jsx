import React, { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import CountUp from "../components/CountUp.jsx";
import {
  FaSeedling,
  FaPlus,
  FaTimes,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaChartArea,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

export default function HabitatMonitoring() {
  const [habitats, setHabitats] = useState([]);
  const [healthScores, setHealthScores] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [locationName, setLocationName] = useState("");
  const [vegIndex, setVegIndex] = useState(0.5);
  const [waterAvail, setWaterAvail] = useState(0.5);
  const [humanDist, setHumanDist] = useState(0.2);
  const [formLoading, setFormLoading] = useState(false);

  async function loadData() {
    try {
      const [habRes, healthRes, recRes] = await Promise.all([
        api.get("/habitat"),
        api.get("/conservation/health-score"),
        api.get("/conservation/recommendations"),
      ]);
      setHabitats(habRes.data || []);
      setHealthScores(healthRes.data || null);
      setRecommendations(recRes.data || []);
    } catch (err) {
      toast.error("Failed to load habitat telemetry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    const rawScore = (vegIndex + waterAvail + (1 - humanDist)) / 3;
    const healthScore = Math.max(0, Math.min(1, Math.round(rawScore * 100) / 100));

    try {
      await api.post("/habitat", {
        location_name: locationName,
        vegetation_index: vegIndex,
        water_availability: waterAvail,
        human_disturbance: humanDist,
        health_score: healthScore,
      });
      toast.success("Habitat telemetry reading recorded!");
      setModalOpen(false);
      setLocationName("");
      setVegIndex(0.5);
      setWaterAvail(0.5);
      setHumanDist(0.2);
      loadData();
    } catch (err) {
      toast.error("Failed to register habitat reading.");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-10 w-10 border-4 border-[#155e3b] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#355344] font-bold">
          Computing Ecosystem Health Models...
        </p>
      </div>
    );
  }

  const chartData = habitats.slice(0, 4).map((hab) => ({
    subject: hab.location_name.split(" ")[0],
    Vegetation: hab.vegetation_index * 100,
    Water: hab.water_availability * 100,
    Disturbance: hab.human_disturbance * 100,
    Health: hab.health_score * 100,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0d261b] flex items-center gap-2.5">
            <FaSeedling className="text-[#155e3b]" /> Habitat Suitability & Ecosystem Health
          </h2>
          <p className="text-xs text-[#355344] mt-1">
            Vegetation indices (NDVI), riparian water access, human disturbance footprints, and weighted conservation indexes.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-forest-primary text-xs shadow-sm"
        >
          <FaPlus />
          <span>Record Sensor Telemetry</span>
        </button>
      </div>

      {/* Weighted Composite Health Score */}
      <GlassCard variant="standard" className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#e5efe8] gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#355344] font-mono">
              Composite Ecological Health Metric
            </span>
            <h3 className="font-display font-black text-2xl text-[#0d261b] mt-1">
              National Reserve Index: <CountUp end={healthScores?.overall_health_score || 78.4} decimals={1} suffix=" / 100" />
            </h3>
            <p className="text-xs text-[#4e6b5c] mt-1 font-mono">
              Formula: 30% Diversity + 25% Stability + 20% Habitat + 15% Endangered + 10% Environmental
            </p>
          </div>
          <StatusBadge status={healthScores?.status || "Healthy"} size="lg" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {healthScores?.weights &&
            Object.entries(healthScores.weights).map(([key, val]) => (
              <div key={key} className="p-4 bg-[#f7faf8] rounded-xl border border-[#d6e4dc] text-center space-y-1">
                <span className="text-[10px] font-bold text-[#355344] uppercase font-mono block">
                  {key.replace("_", " ")}
                </span>
                <span className="text-xs text-[#4e6b5c] font-mono font-bold block">
                  Weight: {val.weight}
                </span>
                <p className="font-display font-extrabold text-xl text-[#0d261b] mt-1">
                  <CountUp end={val.score} suffix="%" />
                </p>
              </div>
            ))}
        </div>
      </GlassCard>

      {/* Radar Chart & Monitored Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard variant="standard" className="p-6 space-y-4">
          <h3 className="font-display font-bold text-base text-[#0d261b] flex items-center gap-2">
            <FaChartArea className="text-[#155e3b]" /> Habitat Factor Radar Profile
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid stroke="#d6e4dc" />
                <PolarAngleAxis dataKey="subject" stroke="#355344" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#355344" tick={{ fontSize: 9 }} />
                <Radar name="Vegetation (NDVI)" dataKey="Vegetation" stroke="#155e3b" fill="#c2e2d0" fillOpacity={0.5} />
                <Radar name="Water Availability" dataKey="Water" stroke="#0284c7" fill="#bae6fd" fillOpacity={0.4} />
                <Radar name="Human Disturbance" dataKey="Disturbance" stroke="#b91c1c" fill="#fca5a5" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Monitored Locations */}
        <GlassCard variant="standard" className="p-6 space-y-4 flex flex-col justify-between">
          <h3 className="font-display font-bold text-base text-[#0d261b]">
            Monitored Sanctuary Sectors
          </h3>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {habitats.map((hab) => {
              const scorePct = Math.round(hab.health_score * 100);
              return (
                <div
                  key={hab.id}
                  className="p-4 bg-[#f7faf8] rounded-xl border border-[#d6e4dc] flex items-center justify-between hover:bg-[#eef5f1] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[#155e3b] text-xs" />
                      <h4 className="font-bold text-sm text-[#0d261b]">{hab.location_name}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#355344] font-mono">
                      <span>NDVI: <b>{hab.vegetation_index}</b></span>
                      <span>Water: <b>{hab.water_availability}</b></span>
                      <span>Disturbance: <b>{hab.human_disturbance}</b></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-extrabold text-xl text-[#0d261b]">
                      {scorePct}%
                    </span>
                    <span className="text-[10px] text-[#4e6b5c] font-mono uppercase block">Health</span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Conservation Recommendations */}
      <GlassCard variant="prominent" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#e8f4ed] text-[#155e3b] flex items-center justify-center text-lg border border-[#c2e2d0]">
            <FaShieldAlt />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-[#0d261b]">
              Conservation Priority Directives
            </h3>
            <p className="text-xs text-[#355344]">
              Interventions generated from NDVI satellite trends, camera trap censuses, and acoustic alerts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-5 bg-[#f7faf8] rounded-xl border border-[#d6e4dc] space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="badge-forest text-[10px] font-mono uppercase">{rec.category}</span>
                <StatusBadge status={rec.priority} size="sm" />
              </div>
              <h4 className="font-display font-bold text-base text-[#0d261b]">{rec.title}</h4>
              <p className="text-xs text-[#355344] font-mono">📍 Sector: {rec.target_area}</p>
              <p className="text-xs text-[#0d261b] leading-relaxed">
                <b>Ecosystem Impact:</b> {rec.impact}
              </p>
              <p className="text-xs text-[#0d261b] bg-white p-3 rounded-lg border border-[#d6e4dc] leading-snug">
                <b>Action Directives:</b> {rec.action_plan}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Record Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#d6e4dc] relative">
            <div className="flex justify-between items-center pb-4 border-b border-[#e5efe8]">
              <h3 className="font-display font-bold text-lg text-[#0d261b]">
                Record Habitat Telemetry
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#4e6b5c] hover:text-[#0d261b] p-1"
              >
                <FaTimes className="text-base" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">
                  Reserve Sector Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Western Ghats Sector 5"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="input-forest text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">
                  Vegetation Index (NDVI): {vegIndex}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={vegIndex}
                  onChange={(e) => setVegIndex(parseFloat(e.target.value))}
                  className="w-full accent-[#155e3b] h-1.5 bg-[#d6e4dc] rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">
                  Water Availability: {waterAvail}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={waterAvail}
                  onChange={(e) => setWaterAvail(parseFloat(e.target.value))}
                  className="w-full accent-[#155e3b] h-1.5 bg-[#d6e4dc] rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0d261b] font-mono">
                  Human Disturbance Pressure: {humanDist}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={humanDist}
                  onChange={(e) => setHumanDist(parseFloat(e.target.value))}
                  className="w-full accent-[#155e3b] h-1.5 bg-[#d6e4dc] rounded-lg cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full btn-forest-primary py-3 font-bold text-sm shadow-sm"
                >
                  {formLoading ? "Recording..." : "Save Telemetry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
