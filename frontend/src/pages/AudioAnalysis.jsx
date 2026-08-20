import React, { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  FaMicrophone,
  FaPlay,
  FaPause,
  FaFileAudio,
  FaWaveSquare,
  FaChartArea,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function AudioAnalysis() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    async function loadAudioHistory() {
      try {
        const { data } = await api.get("/audio/history");
        setHistory(data || []);
      } catch (err) {
        toast.error("Failed to load acoustic observation history.");
      }
    }
    loadAudioHistory();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select an audio file.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/audio/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      toast.success(`Identified ${data.species_name} with ${Math.round(data.confidence * 100)}% confidence!`);
      setHistory((prev) => [data, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Audio analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const waveformMock = [
    { time: "0.0s", amp: 10 },
    { time: "0.5s", amp: 45 },
    { time: "1.0s", amp: 85 },
    { time: "1.5s", amp: 30 },
    { time: "2.0s", amp: 95 },
    { time: "2.5s", amp: 60 },
    { time: "3.0s", amp: 20 },
    { time: "3.5s", amp: 75 },
    { time: "4.0s", amp: 40 },
    { time: "4.5s", amp: 15 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0d261b] flex items-center gap-2.5">
            <FaMicrophone className="text-[#155e3b]" /> Passive Bioacoustic Intelligence
          </h2>
          <p className="text-xs text-[#355344] mt-1">
            BirdNET acoustic classification, nocturnal vocalization tracking, and spectral energy analysis.
          </p>
        </div>
        <span className="badge-forest self-start sm:self-auto font-mono">
          24/7 Sensor Array Online
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Audio Ingestion Card */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard variant="standard" className="p-6 space-y-5">
            <h3 className="font-display font-bold text-base text-[#0d261b]">
              Ingest Bioacoustic Audio Clip
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-[#d6e4dc] hover:border-[#155e3b] rounded-2xl p-6 text-center bg-[#f7faf8] hover:bg-[#eef5f1] transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="h-11 w-11 rounded-xl bg-[#e8f4ed] text-[#155e3b] flex items-center justify-center text-xl shadow-sm border border-[#c2e2d0] group-hover:scale-105 transition-transform">
                    <FaMicrophone />
                  </div>
                  <p className="text-xs font-bold text-[#0d261b] mt-3">
                    Drag & drop audio files
                  </p>
                  <p className="text-[10px] text-[#4e6b5c] mt-0.5 font-mono">
                    WAV, MP3, FLAC, OGG supported
                  </p>
                </div>
              </div>

              {file && (
                <div className="flex items-center space-x-3 p-3 bg-[#e8f4ed] rounded-xl border border-[#c2e2d0]">
                  <FaFileAudio className="text-[#155e3b] text-xl" />
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-bold truncate text-[#0d261b]">{file.name}</p>
                    <p className="text-[10px] text-[#355344] font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full btn-forest-primary py-3 font-bold text-sm shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FaWaveSquare className="text-sm" />
                    <span>Run Bioacoustic Inference</span>
                  </>
                )}
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Spectral Waveform View */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard variant="standard" className="p-6 flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base text-[#0d261b] flex items-center gap-2">
                <FaChartArea className="text-[#155e3b]" /> Spectral Amplitude Profile
              </h3>
              {result && (
                <StatusBadge status={result.conservation_status || "LC"} size="sm" />
              )}
            </div>

            <div className="flex-1 bg-[#f7faf8] rounded-xl p-4 flex flex-col justify-center border border-[#d6e4dc]">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={waveformMock}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5efe8" />
                    <XAxis dataKey="time" stroke="#355344" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#355344" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#d6e4dc",
                        borderRadius: "10px",
                        color: "#0d261b",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Area type="monotone" dataKey="amp" stroke="#155e3b" fill="#c2e2d0" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Audio Controls */}
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="btn-forest-secondary text-xs px-4 py-2"
                >
                  {isPlaying ? <FaPause /> : <FaPlay />}
                  <span>{isPlaying ? "Pause Playback" : "Listen to Sample"}</span>
                </button>
              </div>
            </div>

            {/* Inference Result */}
            {result && (
              <div className="mt-5 p-4 bg-[#e8f4ed] border border-[#c2e2d0] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-extrabold text-[#0d261b] text-base">
                    {result.species_name}
                  </h4>
                  <span className="text-xs font-mono font-bold text-[#155e3b]">
                    Confidence: {Math.round(result.confidence * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-[#0d261b]">
                  <p>Scientific: <span className="italic text-[#355344]">{result.scientific_name || "—"}</span></p>
                  <p>Category: <span className="font-mono text-[#355344]">{result.vocalization_type || "Nocturnal Call"}</span></p>
                  <p>IUCN Status: <span className="font-bold">{result.conservation_status || "LC"}</span></p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* History Log */}
      <GlassCard variant="standard" className="p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-[#0d261b]">
          Acoustic Sensor Ingestion Log
        </h3>
        <div className="overflow-x-auto rounded-xl border border-[#d6e4dc] bg-white">
          <table className="w-full text-xs text-left text-[#0d261b]">
            <thead className="bg-[#ebf3ed] text-[#0d261b] uppercase font-bold text-[10px] tracking-wider font-mono border-b border-[#d6e4dc]">
              <tr>
                <th className="px-5 py-3.5">Identified Species</th>
                <th className="px-5 py-3.5">Scientific Name</th>
                <th className="px-5 py-3.5 text-center">Confidence</th>
                <th className="px-5 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5efe8]">
              {history.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#f3f7f4] transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#0d261b]">
                    {item.species_name}
                  </td>
                  <td className="px-5 py-3.5 italic text-[#355344]">
                    {item.scientific_name || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-bold text-[#155e3b]">
                    {Math.round(item.confidence * 100)}%
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-[11px] text-[#4e6b5c]">
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Live Stream"}
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
