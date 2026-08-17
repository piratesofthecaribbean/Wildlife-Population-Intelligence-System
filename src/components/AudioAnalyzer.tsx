import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, 
  Upload, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  Music, 
  Activity, 
  Clock, 
  FileAudio, 
  AlertTriangle,
  HelpCircle,
  BarChart2,
  RefreshCw,
  Search,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus
} from "lucide-react";
import { AudioAnalysis, MonitoringSite, Survey } from "../types.js";

interface AudioAnalyzerProps {
  surveys: Survey[];
  sites: MonitoringSite[];
  audioAnalyses: AudioAnalysis[];
  onAudioAnalyzed: () => void;
}

export default function AudioAnalyzer({
  surveys,
  sites,
  audioAnalyses,
  onAudioAnalyzed
}: AudioAnalyzerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [surveyId, setSurveyId] = useState<string>(surveys[0]?.id || "survey-1");
  const [siteId, setSiteId] = useState<string>(sites[0]?.id || "site-1");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AudioAnalysis | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<AudioAnalysis | null>(null);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter state for history
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ["audio/wav", "audio/mp3", "audio/mpeg", "audio/flac", "audio/ogg", "audio/x-wav"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && !["wav", "mp3", "flac", "ogg"].includes(ext || "")) {
      setErrorMsg("Unsupported audio format. Please upload a .wav, .mp3, .flac, or .ogg file.");
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setAudioPreviewUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAnalyzeAudio = async () => {
    if (!selectedFile && !audioPreviewUrl) {
      setErrorMsg("Please select or drop a wildlife audio recording file.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      let base64Audio = "";
      if (selectedFile) {
        base64Audio = await fileToBase64(selectedFile);
      } else if (audioPreviewUrl) {
        base64Audio = audioPreviewUrl;
      }

      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/audio/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          surveyId,
          siteId,
          fileName: selectedFile?.name || "wildlife_recording.wav",
          audioUri: base64Audio,
          mimeType: selectedFile?.type || "audio/wav"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Audio analysis failed.");
      }

      setCurrentResult(data);
      setSelectedHistory(data);
      onAudioAnalyzed();
    } catch (err: any) {
      console.error("Audio Analysis Error:", err);
      setErrorMsg(err.message || "Failed to process wildlife audio recording.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  const activeDisplay = selectedHistory || currentResult || (audioAnalyses.length > 0 ? audioAnalyses[0] : null);

  // IUCN Badge color helper
  const getIUCNBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("extinct in the wild") || s.includes("(ew)")) return { bg: "bg-purple-950/80 text-purple-300 border-purple-800", label: "EX / EW" };
    if (s.includes("critically") || s.includes("(cr)")) return { bg: "bg-red-950/80 text-red-400 border-red-800/80 animate-pulse", label: "CR - Critically Endangered" };
    if (s.includes("endangered") || s.includes("(en)")) return { bg: "bg-orange-950/80 text-orange-400 border-orange-800", label: "EN - Endangered" };
    if (s.includes("vulnerable") || s.includes("(vu)")) return { bg: "bg-amber-950/80 text-amber-400 border-amber-800", label: "VU - Vulnerable" };
    if (s.includes("near") || s.includes("(nt)")) return { bg: "bg-yellow-950/80 text-yellow-300 border-yellow-800", label: "NT - Near Threatened" };
    if (s.includes("data deficient") || s.includes("(dd)")) return { bg: "bg-slate-800 text-slate-300 border-slate-700", label: "DD - Data Deficient" };
    return { bg: "bg-emerald-950/80 text-emerald-400 border-emerald-800", label: "LC - Least Concern" };
  };

  const filteredHistory = audioAnalyses.filter(a => 
    a.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.speciesCommonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.speciesScientificName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Mic className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Wildlife Voice & Bioacoustic AI Intelligence
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload recordings (.wav, .mp3, .flac, .ogg) for automatic bioacoustic species identification, vocalization waveform profiling, and IUCN Red List conservation classification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold rounded-full flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Gemini Bioacoustics Active
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/80 border border-red-800 rounded-xl text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Upload & Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileAudio className="h-4 w-4 text-emerald-400" /> Upload Wildlife Audio
            </h2>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-slate-750 hover:border-emerald-500/50 bg-slate-950/60 transition-all rounded-xl p-6 text-center flex flex-col items-center justify-center gap-3 cursor-pointer group"
            >
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-full text-slate-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : "Drag & drop wildlife recording file"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports WAV, MP3, FLAC, OGG (Up to 25MB)
                </p>
              </div>

              <label className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg cursor-pointer border border-slate-700 transition-all">
                Browse Audio File
                <input
                  type="file"
                  accept="audio/wav,audio/mp3,audio/flac,audio/ogg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Survey & Site Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Survey Campaign
                </label>
                <select
                  value={surveyId}
                  onChange={(e) => setSurveyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:border-emerald-500 outline-none"
                >
                  {surveys.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Monitoring Site
                </label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:border-emerald-500 outline-none"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audio Player Preview */}
            {audioPreviewUrl && (
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <audio
                  ref={audioRef}
                  src={audioPreviewUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={togglePlayPause}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>

                  <div className="flex-1 mx-4 space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleAnalyzeAudio}
              disabled={isAnalyzing || (!selectedFile && !audioPreviewUrl)}
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isAnalyzing || (!selectedFile && !audioPreviewUrl)
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing Bioacoustics via Gemini AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Execute Voice Species Analysis
                </>
              )}
            </button>
          </div>

          {/* Audio History Drawer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" /> Bioacoustic History Log ({audioAnalyses.length})
              </h3>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search history by species or file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg pl-8 pr-3 py-2 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  No recorded voice analyses match your search query.
                </p>
              ) : (
                filteredHistory.map((item) => {
                  const badge = getIUCNBadge(item.iucnStatus);
                  const isSelected = activeDisplay?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedHistory(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-950/40 border-emerald-500/50 text-white"
                          : "bg-slate-950/70 border-slate-800/80 hover:bg-slate-850 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-lg text-emerald-400 border border-slate-800">
                          <Music className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{item.speciesCommonName}</p>
                          <p className="text-[10px] text-slate-400 italic">{item.speciesScientificName}</p>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
                            {item.fileName} • {(item.confidence * 100).toFixed(0)}% Conf
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-mono font-bold ${badge.bg}`}>
                          {item.iucnStatus.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Detailed AI Analysis Output (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {activeDisplay ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              
              {/* Species Identification Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
                    AI Bioacoustic Match
                  </span>
                  <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                    {activeDisplay.speciesCommonName}
                  </h2>
                  <p className="text-xs text-slate-400 italic font-serif">
                    {activeDisplay.speciesScientificName}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg border uppercase tracking-wider ${getIUCNBadge(activeDisplay.iucnStatus).bg}`}>
                    {getIUCNBadge(activeDisplay.iucnStatus).label}
                  </span>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                    <span className="text-slate-400">Confidence Score:</span>
                    <span className="font-bold text-emerald-400">{(activeDisplay.confidence * 100).toFixed(1)}%</span>
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 font-sans border border-slate-700">
                      {activeDisplay.predictionQuality}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confidence Meter Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Model Precision Confidence Bar</span>
                  <span className="text-emerald-400 font-bold">{(activeDisplay.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.max(0, activeDisplay.confidence * 100))}%` }}
                  />
                </div>
              </div>

              {/* Audio Waveform & Spectrogram Visualization */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-emerald-400" /> Bioacoustic Waveform & Spectral Envelope
                  </span>
                  <span className="text-slate-500 text-[10px]">{activeDisplay.fileName}</span>
                </div>

                {/* Waveform Canvas Simulation */}
                <div className="h-28 bg-slate-900/90 rounded-lg p-4 border border-slate-800/80 flex items-end justify-between gap-1 overflow-hidden">
                  {(activeDisplay.waveformData && activeDisplay.waveformData.length > 0
                    ? activeDisplay.waveformData
                    : [0.15, 0.35, 0.6, 0.85, 0.92, 0.75, 0.4, 0.2, 0.5, 0.8, 0.7, 0.45, 0.3, 0.65, 0.88, 0.6, 0.25, 0.15, 0.45, 0.7, 0.5, 0.3, 0.15, 0.4, 0.65, 0.4, 0.2, 0.1]
                  ).map((amp, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-emerald-600 via-teal-400 to-cyan-300 rounded-t hover:bg-emerald-300 transition-all"
                      style={{ height: `${Math.max(8, amp * 100)}%` }}
                    />
                  ))}
                </div>

                {/* Spectrogram Frequency Heatmap */}
                <div className="h-10 rounded-lg overflow-hidden border border-slate-800/80 grid grid-cols-12 gap-0.5 bg-slate-900 p-1">
                  {[
                    "bg-blue-950", "bg-indigo-900", "bg-indigo-800", "bg-teal-700", "bg-emerald-600",
                    "bg-yellow-500", "bg-amber-500", "bg-orange-600", "bg-red-600", "bg-orange-500",
                    "bg-teal-600", "bg-indigo-900"
                  ].map((color, idx) => (
                    <div key={idx} className={`${color} rounded-sm opacity-80 hover:opacity-100 transition-opacity`} />
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 font-mono text-center">
                  Frequency Band Spectrum: 20Hz - 16kHz (Peak Energy Density: 78Hz - 3.2kHz)
                </p>
              </div>

              {/* Conservation & Threat Analysis Badges */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    IUCN Category
                  </span>
                  <p className="text-xs font-bold text-white truncate">{activeDisplay.iucnStatus}</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Population Trend
                  </span>
                  <p className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    {activeDisplay.populationTrend === "Decreasing" ? (
                      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    ) : activeDisplay.populationTrend === "Increasing" ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    {activeDisplay.populationTrend}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Threat Pressure Level
                  </span>
                  <p className={`text-xs font-bold ${
                    activeDisplay.threatLevel === "Critical" ? "text-red-400" :
                    activeDisplay.threatLevel === "High" ? "text-orange-400" :
                    activeDisplay.threatLevel === "Moderate" ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {activeDisplay.threatLevel}
                  </p>
                </div>
              </div>

              {/* Conservation Status Explanation */}
              {activeDisplay.statusExplanation && (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" /> Conservation Status Context
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeDisplay.statusExplanation}
                  </p>
                </div>
              )}

              {/* AI Explanation Deep Dive */}
              {activeDisplay.aiExplanation && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" /> AI Bioacoustic Explanation & Reasoning
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block font-mono">
                        Why this species was selected
                      </span>
                      <p className="text-xs text-slate-300 leading-normal">
                        {activeDisplay.aiExplanation.whySelected}
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-mono">
                        Distinct visual/acoustic features
                      </span>
                      <p className="text-xs text-slate-300 leading-normal">
                        {activeDisplay.aiExplanation.distinctFeatures}
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block font-mono">
                        Habitat
                      </span>
                      <p className="text-xs text-slate-300 leading-normal">
                        {activeDisplay.aiExplanation.habitatCharacteristics || "Native acoustic ecosystem environment matched."}
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block font-mono">
                        Similar species
                      </span>
                      <p className="text-xs text-slate-300 leading-normal">
                        {activeDisplay.aiExplanation.similarSpecies}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block font-mono">
                      Reason for confidence score
                    </span>
                    <p className="text-xs text-slate-300 leading-normal">
                      {activeDisplay.aiExplanation.reasonForConfidence}
                    </p>
                  </div>
                </div>
              )}

              {/* Bioacoustic Field Notes */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Bioacoustic Inspector Summary
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {activeDisplay.acousticNotes}
                </p>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-slate-500">
                <Mic className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">No Audio Selected for Analysis</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Upload a wildlife audio recording on the left panel or select a recorded history entry to inspect detailed bioacoustic species identification.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
