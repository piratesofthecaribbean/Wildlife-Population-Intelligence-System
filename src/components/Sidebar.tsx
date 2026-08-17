import React from "react";
import { 
  Compass, 
  MapPin, 
  Activity, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle,
  User,
  Users,
  LogOut,
  Sliders,
  TreePine,
  Mic,
  TrendingUp,
  Trees,
  HeartPulse
} from "lucide-react";
import { User as UserType } from "../types.js";

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserType | null;
  unreadNotificationsCount: number;
  onLogout: () => void;
}

export default function Sidebar({ 
  currentTab, 
  onSelectTab, 
  currentUser, 
  unreadNotificationsCount,
  onLogout
}: SidebarProps) {
  
  const navItems = [
    { id: "dashboard", label: "Control Room", icon: Activity },
    { id: "population", label: "Population Intelligence", icon: TrendingUp },
    { id: "habitat", label: "Habitat Intelligence", icon: Trees },
    { id: "ecosystem", label: "Ecosystem Health", icon: HeartPulse },
    { id: "surveys", label: "Active Surveys", icon: Sliders },
    { id: "sites", label: "Monitoring Sites", icon: MapPin },
    { id: "upload", label: "AI Camera Trap", icon: Upload },
    { id: "audio", label: "Wildlife Voice AI", icon: Mic },
    { id: "recommendations", label: "Intervention Planner", icon: Sparkles },
    { id: "audit", label: "Audit Trails", icon: ShieldCheck },
  ];

  if (currentUser?.role === "Admin") {
    navItems.push({ id: "users", label: "User Accounts", icon: Users });
  }

  return (
    <div className="w-64 bg-slate-950 border-r border-slate-850 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      
      <div className="flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-850 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <TreePine className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-white uppercase font-sans">
              Wildlife AI
            </h1>
            <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-widest font-mono">
              SaaS Population Intelligence
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all cursor-pointer font-sans ${
                  isActive 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10" 
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </div>

                {item.id === "upload" && unreadNotificationsCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer profile display */}
      {currentUser && (
        <div className="p-4 bg-slate-900 border-t border-slate-850 flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-emerald-600/15 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500 block truncate">{currentUser.role}</span>
            </div>
          </div>
          <button 
            className="text-slate-500 hover:text-white transition cursor-pointer"
            title="SaaS Logout"
            onClick={onLogout}
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      )}

    </div>
  );
}
