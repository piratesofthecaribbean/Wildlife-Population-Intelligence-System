import React from "react";
import { ShieldCheck, User, Terminal, Calendar, Clock, Lock } from "lucide-react";
import { AuditLog } from "../types.js";

interface AuditLogsProps {
  logs: AuditLog[];
}

export default function AuditLogs({ logs }: AuditLogsProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
          System Audit & Security Trails
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically signed surveyor logging records tracking computer vision analysis, campaign modifications, and telemetry updates.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-850 flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-emerald-500" /> Secure Audit Buffer
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-slate-500" /> COMPLIANCE: ISO/IEC 27001
          </span>
        </div>

        <div className="divide-y divide-slate-850 font-mono text-xs max-h-[500px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No security logs recorded in the current session.</div>
          ) : (
            logs.map((log) => {
              let actionColor = "text-emerald-400 bg-emerald-500/10";
              if (log.action.includes("ALERT") || log.action.includes("CRITICAL")) {
                actionColor = "text-red-400 bg-red-500/10";
              } else if (log.action.includes("CREATE")) {
                actionColor = "text-cyan-400 bg-cyan-500/10";
              }

              return (
                <div key={log.id} className="p-4 hover:bg-slate-950/40 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${actionColor}`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        {log.userName} ({log.userRole})
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {log.details}
                    </p>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="text-[10px] text-slate-500 flex items-center sm:justify-end gap-1 font-mono">
                      <Clock className="h-3.5 w-3.5 text-slate-600" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[9px] text-slate-600 block mt-1">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
