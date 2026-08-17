import React, { useState } from "react";
import { 
  Sparkles, 
  Activity, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Compass,
  Check,
  Play,
  Archive
} from "lucide-react";
import { Survey, ConservationRecommendation, MonitoringSite } from "../types.js";

interface RecommendationsProps {
  surveys: Survey[];
  sites: MonitoringSite[];
  recommendations: ConservationRecommendation[];
  onGenerateRecommendation: (surveyId: string) => Promise<any>;
  onUpdateStatus?: (id: string, status: string) => Promise<any>;
}

export default function Recommendations({ 
  surveys, 
  sites, 
  recommendations, 
  onGenerateRecommendation,
  onUpdateStatus
}: RecommendationsProps) {
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [newlyGenerated, setNewlyGenerated] = useState<any>(null);
  const [localRecs, setLocalRecs] = useState<ConservationRecommendation[]>(recommendations);

  React.useEffect(() => {
    setLocalRecs(recommendations);
  }, [recommendations]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(id, newStatus);
      } else {
        await fetch(`/api/conservation/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });
      }
      setLocalRecs(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSurveyId) return;
    try {
      setGenerating(true);
      setError("");
      setNewlyGenerated(null);
      const result = await onGenerateRecommendation(selectedSurveyId);
      setNewlyGenerated(result);
    } catch (err: any) {
      console.error(err);
      setError("AI Generation failed. Standard conservation templates loaded as backup.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          AI Conservation Recommendation Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Synthesize campaign census metrics and invoke Gemini AI to design actionable habitat restoration roadmaps, water security plans, and risk assessments.
        </p>
      </div>

      {/* GENERATE ROADMAP PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider font-sans border-b border-slate-850 pb-2">
          <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
          <span>Launch AI Intervention planner</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Select Completed or Active Survey Campaign</label>
            <select
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
            >
              <option value="">-- Choose Campaign Context --</option>
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedSurveyId || generating}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent text-white font-sans text-xs font-semibold px-5 py-3 rounded-lg border border-emerald-500 hover:border-emerald-400 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            {generating ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Synthesizing GIS Data...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate AI Roadmap
              </>
            )}
          </button>
        </div>

        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
      </div>

      {/* NEWLY GENERATED RESULT BANNERS */}
      {newlyGenerated && (
        <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-5 space-y-5 animate-slide-up">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                Newly Generated AI Intervention Roadmap
              </h3>
            </div>
            <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
              newlyGenerated.riskLevel === "Critical" 
                ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                : newlyGenerated.riskLevel === "Elevated"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              Assessed Risk: {newlyGenerated.riskLevel}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-4 rounded-lg border border-slate-850 italic">
            "{newlyGenerated.recommendationText}"
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Suggestions 1 */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-bold">Habitat Restoration Proposals</span>
              <ul className="space-y-2 text-xs text-slate-400">
                {newlyGenerated.habitatRestorationSuggestions?.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggestions 2 */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold">Scientific Monitoring Roadmap</span>
              <ul className="space-y-2 text-xs text-slate-400">
                {newlyGenerated.monitoringSuggestions?.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <Compass className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE OF PREVIOUS RECOMMENDATIONS */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
          Actionable Conservation Interventions & Roadmaps ({localRecs.length})
        </h3>

        <div className="space-y-4">
          {localRecs.map((rec) => {
            const survey = surveys.find((s) => s.id === rec.surveyId);
            const site = survey ? sites.find((s) => s.id === survey.siteId) : null;
            const siteName = rec.monitoringSiteName || (site ? site.name : "Protected Conservation Zone");

            return (
              <div key={rec.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white font-sans">
                        {rec.recommendationCategory || (survey ? survey.title : "Conservation Action Plan")}
                      </h4>
                      {rec.affectedSpecies && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-2 py-0.5 rounded">
                          {rec.affectedSpecies}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {siteName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(rec.generatedAt).toLocaleDateString()}
                    </span>
                    <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                      rec.priorityLevel === "Critical" || rec.riskLevel === "Critical"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                        : rec.priorityLevel === "High" || rec.riskLevel === "Elevated"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      Priority: {rec.priorityLevel || rec.riskLevel}
                    </span>

                    <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                      rec.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : rec.status === "in_progress"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : rec.status === "approved"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    }`}>
                      Status: {rec.status || "pending"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {rec.recommendationText}
                </p>

                {rec.expectedImpact && (
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-xs text-emerald-400 flex items-center gap-2 font-mono">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>Expected Impact: {rec.expectedImpact}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-850">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Suggested Actions</span>
                    {(rec.suggestedActions || rec.habitatRestorationSuggestions)?.map((item, i) => (
                      <p key={i} className="text-slate-400 flex items-start gap-1.5 leading-relaxed">
                        <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Telemetry Monitoring</span>
                      {rec.monitoringSuggestions?.map((item, i) => (
                        <p key={i} className="text-slate-400 flex items-start gap-1.5 leading-relaxed">
                          <span className="text-cyan-500 shrink-0 mt-0.5">•</span>
                          <span>{item}</span>
                        </p>
                      ))}
                    </div>

                    {/* Status Workflow Action Buttons */}
                    <div className="flex items-center gap-2 pt-3">
                      {rec.status !== "approved" && rec.status !== "in_progress" && rec.status !== "completed" && (
                        <button
                          onClick={() => handleStatusChange(rec.id, "approved")}
                          className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve Action</span>
                        </button>
                      )}

                      {rec.status === "approved" && (
                        <button
                          onClick={() => handleStatusChange(rec.id, "in_progress")}
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Start Field Deployment</span>
                        </button>
                      )}

                      {rec.status === "in_progress" && (
                        <button
                          onClick={() => handleStatusChange(rec.id, "completed")}
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Mark as Completed</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
