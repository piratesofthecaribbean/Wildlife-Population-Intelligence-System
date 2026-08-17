import React, { useState } from "react";
import { 
  Calendar, 
  MapPin, 
  User, 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { Survey, MonitoringSite } from "../types.js";

interface SurveysProps {
  surveys: Survey[];
  sites: MonitoringSite[];
  currentRole: string;
  onCreateSurvey: (data: any) => Promise<void>;
  onUpdateSurvey: (id: string, updates: any) => Promise<void>;
  onDeleteSurvey: (id: string) => Promise<void>;
  onSelectTab: (tab: string) => void;
}

export default function Surveys({ 
  surveys, 
  sites, 
  currentRole, 
  onCreateSurvey, 
  onUpdateSurvey, 
  onDeleteSurvey,
  onSelectTab
}: SurveysProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [siteId, setSiteId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !siteId) return;

    try {
      setSubmitting(true);
      await onCreateSurvey({
        title,
        description,
        siteId,
        startDate,
        endDate,
      });
      // Reset
      setTitle("");
      setDescription("");
      setSiteId("");
      setStartDate("");
      setEndDate("");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (survey: Survey) => {
    const nextStatus = survey.status === "Planned" 
      ? "Active" 
      : survey.status === "Active" 
      ? "Completed" 
      : "Planned";
    
    await onUpdateSurvey(survey.id, { status: nextStatus });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Wildlife Surveys & Censuses
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Establish tracking campaigns, configure target coordinates, and transition observation periods.
          </p>
        </div>
        
        {currentRole !== "Forest Officer" && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Establish New Survey
          </button>
        )}
      </div>

      {/* CREATE SURVEY FORM */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-slide-up">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans border-b border-slate-850 pb-2">
            Establish Conservation Campaign Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Survey Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Primates Population Survey B"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Target GIS Site</label>
              <select
                required
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="">-- Choose Deployed Monitoring Site --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.habitatType} - {s.protectedArea})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Description & Intent</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe tracking intent, specific camera layout, target fauna..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none h-20 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              {submitting ? "Deploying..." : "Deploy Survey Campaign"}
            </button>
          </div>
        </form>
      )}

      {/* SURVEYS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {surveys.map((survey) => {
          const site = sites.find((s) => s.id === survey.siteId);
          
          return (
            <div 
              key={survey.id} 
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all duration-300"
            >
              <div className="space-y-3">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    survey.status === "Active" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                      : survey.status === "Completed"
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                  }`}>
                    {survey.status === "Active" && <Clock className="h-3 w-3 animate-spin" />}
                    {survey.status === "Completed" && <CheckCircle className="h-3 w-3" />}
                    {survey.status === "Planned" && <AlertCircle className="h-3 w-3" />}
                    {survey.status}
                  </span>
                  
                  {site && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {site.habitatType} Zone
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white font-sans leading-snug line-clamp-1" title={survey.title}>
                    {survey.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed" title={survey.description}>
                    {survey.description || "No specific survey campaign description provided."}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 text-xs text-slate-400 border-t border-slate-850">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      Site: <strong className="text-slate-300">{site ? site.name : "Unknown Location"}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      Window: <strong className="text-slate-300 font-mono text-[11px]">{survey.startDate} to {survey.endDate}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      Surveyor: <strong className="text-slate-300">{survey.surveyorName}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-850">
                <button
                  onClick={() => handleToggleStatus(survey)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-xs font-semibold py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition text-white cursor-pointer"
                >
                  {survey.status === "Planned" && "Activate Survey"}
                  {survey.status === "Active" && "Close Survey"}
                  {survey.status === "Completed" && "Plan Again"}
                </button>

                <button
                  onClick={() => onSelectTab("upload")}
                  className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition cursor-pointer"
                  title="Upload camera trap photos for this survey"
                >
                  <ExternalLink className="h-4.5 w-4.5" />
                </button>

                {currentRole === "Admin" && (
                  <button
                    onClick={() => onDeleteSurvey(survey.id)}
                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition cursor-pointer"
                    title="Delete survey record"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
