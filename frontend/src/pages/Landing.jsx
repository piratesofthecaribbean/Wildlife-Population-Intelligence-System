import React from "react";
import { Link } from "react-router-dom";
import CountUp from "../components/CountUp.jsx";
import GlassCard from "../components/GlassCard.jsx";
import {
  FaPaw,
  FaMicrophone,
  FaLeaf,
  FaShieldAlt,
  FaRoute,
  FaArrowRight,
} from "react-icons/fa";

export default function Landing() {
  const capabilities = [
    {
      icon: FaPaw,
      title: "YOLO11 Computer Vision",
      tag: "Vision AI",
      description:
        "Edge camera-trap species classification with bounding-box telemetry and verified accuracy bounds.",
      metric: "98.4%",
      metricLabel: "Precision",
    },
    {
      icon: FaMicrophone,
      title: "Bioacoustic Vocalization",
      tag: "Acoustic Sensor",
      description:
        "Passive acoustic monitoring recognizing nocturnal calls, birdsong, and predator vocalizations from sensor arrays.",
      metric: "24/7",
      metricLabel: "Active Array",
    },
    {
      icon: FaRoute,
      title: "GIS Migration Corridors",
      tag: "Spatial Analysis",
      description:
        "Centroid-shift vector tracking mapping seasonal animal transit corridors across national parks and sanctuaries.",
      metric: "12+",
      metricLabel: "Transit Vectors",
    },
    {
      icon: FaShieldAlt,
      title: "Endangered Early Warning",
      tag: "Threat Response",
      description:
        "Instant multi-channel automated dispatch alerts for habitat degradation and endangered species sightings.",
      metric: "< 500ms",
      metricLabel: "Event Latency",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f7f4] text-[#0d261b] selection:bg-[#155e3b] selection:text-white">
      {/* Top Navigation */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-[#d6e4dc] bg-white rounded-b-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-[#155e3b] flex items-center justify-center text-white shadow-sm">
            <FaLeaf className="text-lg" />
          </div>
          <div>
            <span className="font-display font-extrabold text-lg tracking-tight text-[#0d261b] block">
              WPIS <span className="text-[#155e3b]">System</span>
            </span>
            <span className="text-[10px] text-[#355344] font-mono tracking-widest uppercase block">
              Wildlife Population Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-bold text-[#155e3b] hover:text-[#0f492d] transition-colors"
          >
            Sign In
          </Link>
          <Link to="/register" className="btn-forest-primary text-xs">
            <span>Launch Platform</span>
            <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-20 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#e8f4ed] border border-[#c2e2d0]">
            <span className="h-2 w-2 rounded-full bg-[#155e3b]" />
            <span className="text-xs font-semibold text-[#10482e] font-mono">
              AI-Powered Conservation Intelligence Platform
            </span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[#0d261b] leading-[1.15] tracking-tight">
            Autonomous Biodiversity & Population{" "}
            <span className="text-[#155e3b]">Intelligence</span>
          </h1>

          <p className="text-base sm:text-lg text-[#355344] leading-relaxed">
            A research-grade platform fusing camera-trap computer vision, bioacoustic sensor networks,
            and spatial GIS migration modeling to protect endangered wildlife at planetary scale.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/register" className="btn-forest-primary px-8 py-3.5 text-sm shadow-md">
              <span>Enter Command Hub</span>
              <FaArrowRight className="text-xs" />
            </Link>
            <Link to="/login" className="btn-forest-secondary px-7 py-3.5 text-sm">
              <span>Sign In as Ranger / Researcher</span>
            </Link>
          </div>
        </div>

        {/* Live Telemetry KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            { label: "Wildlife Observations", value: 2733, suffix: "+", change: "+14% this quarter" },
            { label: "Reserve Monitoring Area", value: 1500, suffix: " km²", change: "4 Protected Sanctuaries" },
            { label: "Species Cataloged", value: 142, suffix: " Species", change: "Full IUCN Indexing" },
            { label: "Alert Dispatch Latency", value: 420, suffix: " ms", change: "Instant Automated Notice" },
          ].map((kpi, idx) => (
            <GlassCard key={idx} variant="standard" className="p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#355344] font-mono">
                {kpi.label}
              </p>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-[#0d261b] mt-1">
                <CountUp end={kpi.value} suffix={kpi.suffix} />
              </p>
              <p className="text-[11px] text-[#4e6b5c] mt-1 font-medium">{kpi.change}</p>
            </GlassCard>
          ))}
        </div>

        {/* Capabilities Grid */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#155e3b] font-mono">
              Engine Architecture
            </span>
            <h2 className="font-display font-bold text-2xl text-[#0d261b]">
              Conservation Technology Stack
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((cap, idx) => {
              const Icon = cap.icon;
              return (
                <GlassCard key={idx} variant="interactive" className="p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-[#e8f4ed] text-[#155e3b] flex items-center justify-center text-lg border border-[#c2e2d0]">
                        <Icon />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#e8f4ed] text-[#10482e] border border-[#c2e2d0]">
                        {cap.tag}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-base text-[#0d261b]">{cap.title}</h3>
                      <p className="text-xs text-[#355344] mt-1.5 leading-relaxed">
                        {cap.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#e5efe8] flex items-baseline justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#4e6b5c] font-mono">
                      {cap.metricLabel}
                    </span>
                    <span className="font-mono font-black text-base text-[#155e3b]">
                      {cap.metric}
                    </span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#d6e4dc] bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#355344] font-medium">
          <p>© 2026 Wildlife Population Intelligence System. Open Conservation Architecture.</p>
          <div className="flex items-center space-x-6">
            <Link to="/login" className="hover:text-[#0d261b] transition-colors">
              Access Terminal
            </Link>
            <Link to="/register" className="hover:text-[#0d261b] transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
