import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  FaCloudUploadAlt,
  FaPaw,
  FaInfoCircle,
  FaFileImage,
  FaSlidersH,
  FaCamera,
  FaShieldAlt,
} from "react-icons/fa";

export default function DetectionUpload() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.4);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [habitatType, setHabitatType] = useState("Tropical Forest");
  const [protectedArea, setProtectedArea] = useState("Sunderbans Tiger Reserve");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentDetections, setRecentDetections] = useState([]);

  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [survRes, detRes] = await Promise.all([
          api.get("/surveys"),
          api.get("/detections"),
        ]);
        setSurveys(survRes.data || []);
        setRecentDetections(detRes.data || []);
      } catch (err) {
        toast.error("Failed to load initial camera-trap telemetry.");
      }
    }
    loadInitialData();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload a camera-trap image first.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (selectedSurvey) formData.append("survey_id", selectedSurvey);
    if (latitude) formData.append("latitude", latitude);
    if (longitude) formData.append("longitude", longitude);
    if (habitatType) formData.append("habitat_type", habitatType);
    if (protectedArea) formData.append("protected_area", protectedArea);

    try {
      const { data } = await api.post("/detections/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      toast.success(`Inference Complete: Identified ${data.species_name}!`);
      setRecentDetections((prev) => [data, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI inference pipeline failed.");
    } finally {
      setLoading(false);
    }
  };

  const drawBoxes = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !result || !result.detections) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    result.detections.forEach((det) => {
      if (det.confidence < confidenceThreshold) return;

      const [xMin, yMin, xMax, yMax] = det.box;
      const x = xMin * canvas.width;
      const y = yMin * canvas.height;
      const w = (xMax - xMin) * canvas.width;
      const h = (yMax - yMin) * canvas.height;

      ctx.strokeStyle = "#155e3b";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = "#155e3b";
      const label = `${det.label} (${Math.round(det.confidence * 100)}%)`;
      ctx.font = "bold 12px Inter, sans-serif";
      const textWidth = ctx.measureText(label).width;

      ctx.fillRect(x, y - 22, textWidth + 12, 22);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 6, y - 7);
    });
  };

  useEffect(() => {
    if (result) {
      drawBoxes();
    }
  }, [result, confidenceThreshold]);

  useEffect(() => {
    window.addEventListener("resize", drawBoxes);
    return () => window.removeEventListener("resize", drawBoxes);
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#0d261b] flex items-center gap-2.5">
            <FaCamera className="text-[#155e3b]" /> AI Computer Vision Telemetry
          </h2>
          <p className="text-xs text-[#355344] mt-1">
            YOLO11 real-time species localization, bounding-box coordinate tracking, and GPS habitat association.
          </p>
        </div>
        <span className="badge-forest self-start sm:self-auto font-mono">
          <FaShieldAlt className="text-[#155e3b]" /> Verified Model Pipeline
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Upload Form */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard variant="standard" className="p-6 space-y-5">
            <h3 className="font-display font-bold text-base text-[#0d261b]">
              Ingest Camera-Trap Frame
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="relative border-2 border-dashed border-[#d6e4dc] hover:border-[#155e3b] rounded-2xl p-6 text-center bg-[#f7faf8] hover:bg-[#eef5f1] transition-all cursor-pointer group"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="h-11 w-11 rounded-xl bg-[#e8f4ed] text-[#155e3b] flex items-center justify-center text-xl shadow-sm border border-[#c2e2d0] group-hover:scale-105 transition-transform">
                    <FaCloudUploadAlt />
                  </div>
                  <p className="text-xs font-bold text-[#0d261b] mt-3">
                    Drag & drop imagery here
                  </p>
                  <p className="text-[10px] text-[#4e6b5c] mt-0.5 font-mono">
                    JPEG, PNG, RAW supported
                  </p>
                </div>
              </div>

              {/* Selected File Details */}
              {file && (
                <div className="flex items-center space-x-3 p-3 bg-[#e8f4ed] rounded-xl border border-[#c2e2d0]">
                  <FaFileImage className="text-[#155e3b] text-xl" />
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-bold truncate text-[#0d261b]">{file.name}</p>
                    <p className="text-[10px] text-[#355344] font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#0d261b] font-mono">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="21.9497"
                    className="input-forest text-xs py-1.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#0d261b] font-mono">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="89.1833"
                    className="input-forest text-xs py-1.5"
                  />
                </div>
              </div>

              {/* Habitat Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0d261b] font-mono">
                  Habitat Type
                </label>
                <select
                  value={habitatType}
                  onChange={(e) => setHabitatType(e.target.value)}
                  className="input-forest text-xs py-2 cursor-pointer"
                >
                  <option>Tropical Forest</option>
                  <option>Mangrove</option>
                  <option>Grassland</option>
                  <option>Wetland</option>
                  <option>Desert</option>
                  <option>Alpine</option>
                </select>
              </div>

              {/* Protected Area */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0d261b] font-mono">
                  Protected Area
                </label>
                <select
                  value={protectedArea}
                  onChange={(e) => setProtectedArea(e.target.value)}
                  className="input-forest text-xs py-2 cursor-pointer"
                >
                  <option>Sunderbans Tiger Reserve</option>
                  <option>Jim Corbett National Park</option>
                  <option>Kaziranga National Park</option>
                  <option>Bandipur National Park</option>
                  <option>Ranthambore National Park</option>
                  <option>Gir Forest National Park</option>
                  <option>Other / Unprotected</option>
                </select>
              </div>


              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0d261b] font-mono">
                  Link to Survey Node
                </label>
                <select
                  value={selectedSurvey}
                  onChange={(e) => setSelectedSurvey(e.target.value)}
                  className="input-forest text-xs py-2 cursor-pointer"
                >
                  <option value="">Select an active survey...</option>
                  {surveys.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-bold text-[#0d261b] font-mono">
                  <span className="flex items-center gap-1">
                    <FaSlidersH className="text-[#155e3b]" /> Filter Confidence
                  </span>
                  <span className="text-[#155e3b]">
                    {Math.round(confidenceThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-[#155e3b] h-1.5 bg-[#d6e4dc] rounded-lg cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full btn-forest-primary py-3 font-bold text-sm shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FaPaw className="text-sm" />
                    <span>Run AI Species Inference</span>
                  </>
                )}
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Right: Visualizer */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard variant="standard" className="p-6 flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base text-[#0d261b]">
                Bounding Box & Species Visualizer
              </h3>
              {result && (
                <StatusBadge status={result.conservation_status || "LC"} size="sm" />
              )}
            </div>

            <div className="flex-1 flex items-center justify-center bg-[#f7faf8] rounded-xl overflow-hidden min-h-[350px] relative border border-[#d6e4dc]">
              {previewUrl ? (
                <div className="relative inline-block max-w-full">
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Camera-trap frame"
                    onLoad={drawBoxes}
                    className="max-h-[480px] object-contain max-w-full block mx-auto rounded-lg"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  />
                </div>
              ) : (
                <div className="text-center text-[#4e6b5c] p-8 space-y-1.5">
                  <FaInfoCircle className="mx-auto text-4xl text-[#86b398] mb-2" />
                  <p className="font-bold text-sm text-[#0d261b]">No Image Loaded</p>
                  <p className="text-xs text-[#355344] max-w-xs mx-auto">
                    Upload camera-trap imagery to activate bounding-box detection overlay.
                  </p>
                </div>
              )}
            </div>

            {/* Inference Diagnostics */}
            {result && (
              <div className="mt-5 p-4 bg-[#e8f4ed] border border-[#c2e2d0] rounded-xl space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-extrabold text-[#0d261b] text-base">
                    {result.species_name}
                  </h4>
                  <span className="text-xs font-mono font-bold text-[#155e3b]">
                    Confidence: {Math.round(result.confidence * 100)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium text-[#0d261b]">
                  <p>Scientific: <span className="italic text-[#355344]">{result.scientific_name || "—"}</span></p>
                  <p>Count: <span className="font-bold font-mono text-[#155e3b]">{result.animal_count || 1}</span></p>
                  <p>Model: <span className="font-mono text-[#355344]">{result.model_used || "YOLO11"}</span></p>
                  <p>IUCN Status: <span className="font-bold">{result.conservation_status || "N/A"}</span></p>
                </div>

                {result.model_note && (
                  <div className="pt-2 border-t border-[#c2e2d0] text-[11px] text-[#92400e] font-medium">
                    ⚠️ {result.model_note}
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Log Table */}
      <GlassCard variant="standard" className="p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-[#0d261b]">
          Logged Camera-Trap Observation Records
        </h3>
        <div className="overflow-x-auto rounded-xl border border-[#d6e4dc] bg-white">
          <table className="w-full text-xs text-left text-[#0d261b]">
            <thead className="bg-[#ebf3ed] text-[#0d261b] uppercase font-bold text-[10px] tracking-wider font-mono border-b border-[#d6e4dc]">
              <tr>
                <th className="px-5 py-3.5">Frame Preview</th>
                <th className="px-5 py-3.5">Taxon / Common Name</th>
                <th className="px-5 py-3.5 text-center">Confidence</th>
                <th className="px-5 py-3.5">Survey Reference</th>
                <th className="px-5 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5efe8]">
              {recentDetections.map((det) => (
                <tr key={det.id} className="hover:bg-[#f3f7f4] transition-colors">
                  <td className="px-5 py-2.5">
                    <div className="h-12 w-20 rounded-lg overflow-hidden bg-[#f7faf8] border border-[#d6e4dc]">
                      {det.image_path.startsWith("/uploads/") ? (
                        <img
                          src={`http://localhost:8000${det.image_path}`}
                          alt={det.species_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-bold text-xs text-[#155e3b] uppercase font-mono">
                          {det.species_name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-[#0d261b]">
                    {det.species_name}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-bold text-[#155e3b]">
                    {Math.round(det.confidence * 100)}%
                  </td>
                  <td className="px-5 py-3.5 text-[#355344] font-mono">
                    Survey #{det.survey_id || "N/A"}
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
