import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Settings, 
  Lock, 
  HelpCircle, 
  Compass, 
  Layers, 
  Activity, 
  MessageSquare,
  X,
  AlertTriangle,
  Volume2
} from "lucide-react";
import Sidebar from "./components/Sidebar.js";
import Dashboard from "./components/Dashboard.js";
import Surveys from "./components/Surveys.js";
import Sites from "./components/Sites.js";
import UploadAnalyzer from "./components/UploadAnalyzer.js";
import AudioAnalyzer from "./components/AudioAnalyzer.js";
import Recommendations from "./components/Recommendations.js";
import AuditLogs from "./components/AuditLogs.js";
import SignIn from "./components/SignIn.js";
import UsersList from "./components/UsersList.js";
import PopulationIntelligence from "./components/PopulationIntelligence.js";
import HabitatIntelligence from "./components/HabitatIntelligence.js";
import EcosystemHealth from "./components/EcosystemHealth.js";
import { User, MonitoringSite, Survey, WildlifeImage, ConservationRecommendation, Notification, AuditLog, DashboardData, AudioAnalysis } from "./types.js";

export default function App() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Data states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [sites, setSites] = useState<MonitoringSite[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [images, setImages] = useState<WildlifeImage[]>([]);
  const [audioAnalyses, setAudioAnalyses] = useState<AudioAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<ConservationRecommendation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Site detail selection pivot from GIS map
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined);

  // Notifications state drawer
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initial user fetch and role seeding
  useEffect(() => {
    // Start unauthenticated to showcase the gorgeous new Sign In portal
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("authToken");
  };

  const handleLoginWithEmail = async (email: string, password?: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      if (data.user) {
        setCurrentUser(data.user);
        localStorage.setItem("authToken", data.token);
        refreshAllData();
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      throw err;
    }
  };

  const handleRegister = async (registerData: any) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      if (data.user) {
        setCurrentUser(data.user);
        localStorage.setItem("authToken", data.token);
        refreshAllData();
      }
    } catch (err: any) {
      console.error("Registration failed:", err);
      throw err;
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      // Run parallel fetches
      const [
        dashRes,
        sitesRes,
        surveysRes,
        imagesRes,
        audioRes,
        recsRes,
        notifsRes,
        logsRes
      ] = await Promise.all([
        fetch("/api/analytics/dashboard", { headers }),
        fetch("/api/sites", { headers }),
        fetch("/api/surveys", { headers }),
        fetch("/api/images", { headers }),
        fetch("/api/audio", { headers }),
        fetch("/api/recommendations", { headers }),
        fetch("/api/notifications", { headers }),
        fetch("/api/audit-logs", { headers })
      ]);

      setDashboardData(await dashRes.json());
      setSites(await sitesRes.json());
      setSurveys(await surveysRes.json());
      setImages(await imagesRes.json());
      if (audioRes.ok) {
        setAudioAnalyses(await audioRes.json());
      }
      setRecommendations(await recsRes.json());
      setNotifications(await notifsRes.json());
      setAuditLogs(await logsRes.json());
    } catch (err) {
      console.error("Failed to synchronization state from Express backend:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- API Mutation actions ---

  const handleCreateSite = async (siteData: any) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(siteData),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSurvey = async (surveyData: any) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...surveyData,
          surveyorName: currentUser?.name || "Elena Rostova"
        }),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSurvey = async (id: string, updates: any) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/surveys/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSurvey = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/surveys/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadImage = async (uploadPayload: any) => {
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/images/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(uploadPayload),
    });
    
    if (!res.ok) {
      throw new Error("Upload analysis pipeline failed");
    }

    const json = await res.json();
    await refreshAllData();
    return json;
  };

  const handleGenerateRecommendation = async (surveyId: string) => {
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/recommendations/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ surveyId }),
    });

    if (!res.ok) {
      throw new Error("Intervention plan generation failed");
    }

    const json = await res.json();
    await refreshAllData();
    return json;
  };

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`/api/notifications/${notifId}/read`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      await refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const pivotToSiteLogs = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentTab("sites");
  };

  if (!currentUser) {
    return (
      <SignIn 
        onSignIn={handleLoginWithEmail} 
        onRegister={handleRegister}
      />
    );
  }

  return (
    <div className="flex bg-slate-900 text-slate-100 min-h-screen relative font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <Sidebar 
        currentTab={currentTab} 
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedSiteId(undefined); // Clear coordinates selections
        }}
        currentUser={currentUser}
        unreadNotificationsCount={unreadNotificationsCount}
        onLogout={handleLogout}
      />

      {/* MAIN VIEW CANVAS */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP BAR ACTION HEADER */}
        <header className="h-16 bg-slate-950 border-b border-slate-850 px-8 flex items-center justify-between shrink-0 sticky top-0 z-40">
          
          <div className="flex items-center gap-4 text-xs">
            <span className="font-mono text-slate-500 uppercase tracking-widest hidden sm:inline">DEPLOYMENT BASELINE: V1.4.0</span>
            {loading && (
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                SYNCING STATE...
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            
            {/* NOTIFICATION HUB */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition relative cursor-pointer"
                title="System Notifications Hub"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-slate-950"></span>
                )}
              </button>

              {showNotificationPanel && (
                <div className="absolute top-12 right-0 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-4 space-y-3 z-50 animate-slide-up">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">Warning Alert Center</span>
                    <button 
                      onClick={() => setShowNotificationPanel(false)}
                      className="text-slate-500 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">All channels clear. No active alerts.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleMarkAsRead(notif.id)}
                          className={`p-2.5 rounded-lg border text-[11px] leading-relaxed cursor-pointer transition ${
                            notif.read 
                              ? "bg-slate-950 border-slate-900 text-slate-500" 
                              : "bg-red-500/5 border-red-500/20 text-slate-300 hover:bg-red-500/10"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                            <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${notif.read ? "text-slate-600" : "text-amber-400"}`} />
                            <span>{notif.title}</span>
                          </div>
                          <p>{notif.message}</p>
                          <span className="text-[9px] text-slate-500 font-mono block mt-1.5">
                            {new Date(notif.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PLATFORM SECURITY INDICATOR */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>TLS ENCRYPTED</span>
            </div>

          </div>

        </header>

        {/* CONTAINER VIEWPORTS */}
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          {currentTab === "dashboard" && (
            <Dashboard 
              data={dashboardData} 
              sites={sites} 
              onSelectTab={setCurrentTab} 
              onSelectSite={pivotToSiteLogs}
            />
          )}

          {currentTab === "population" && (
            <PopulationIntelligence />
          )}

          {currentTab === "habitat" && (
            <HabitatIntelligence />
          )}

          {currentTab === "ecosystem" && (
            <EcosystemHealth />
          )}

          {currentTab === "surveys" && (
            <Surveys 
              surveys={surveys} 
              sites={sites} 
              currentRole={currentUser?.role || "Researcher"}
              onCreateSurvey={handleCreateSurvey}
              onUpdateSurvey={handleUpdateSurvey}
              onDeleteSurvey={handleDeleteSurvey}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === "sites" && (
            <Sites 
              sites={sites} 
              onCreateSite={handleCreateSite}
              selectedSiteId={selectedSiteId}
            />
          )}

          {currentTab === "upload" && (
            <UploadAnalyzer 
              surveys={surveys} 
              sites={sites} 
              images={images}
              onUploadImage={handleUploadImage}
            />
          )}

          {currentTab === "audio" && (
            <AudioAnalyzer
              surveys={surveys}
              sites={sites}
              audioAnalyses={audioAnalyses}
              onAudioAnalyzed={refreshAllData}
            />
          )}

          {currentTab === "recommendations" && (
            <Recommendations 
              surveys={surveys} 
              sites={sites} 
              recommendations={recommendations}
              onGenerateRecommendation={handleGenerateRecommendation}
            />
          )}

          {currentTab === "users" && currentUser?.role === "Admin" && (
            <UsersList 
              currentUser={currentUser} 
              onRefreshLogs={refreshAllData} 
            />
          )}

          {currentTab === "audit" && (
            <AuditLogs logs={auditLogs} />
          )}
        </main>

      </div>

    </div>
  );
}
