import React, { useState } from "react";
import { 
  Compass, 
  Layers, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert,
  Activity, 
  MapPin, 
  HelpCircle,
  Eye,
  TreePine,
  Droplet,
  Flame,
  Thermometer
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  Legend 
} from "recharts";
import { DashboardData, MonitoringSite } from "../types.js";

interface DashboardProps {
  data: DashboardData | null;
  sites: MonitoringSite[];
  onSelectTab: (tab: string) => void;
  onSelectSite?: (siteId: string) => void;
}

export default function Dashboard({ data, sites, onSelectTab, onSelectSite }: DashboardProps) {
  const [showDiversityExplanation, setShowDiversityExplanation] = useState(false);
  const [hoveredSite, setHoveredSite] = useState<MonitoringSite | null>(null);

  if (!data || !data.kpis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
        <Activity className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="font-medium">Synthesizing GIS Telemetry & Population Records...</p>
      </div>
    );
  }

  const kpis = data.kpis;
  const speciesDistribution = data.speciesDistribution || [];
  const sightTrends = data.sightTrends || [];
  const habitatHealthScores = data.habitatHealthScores || [];

  // Custom styling array for bar chart columns
  const COLORS = ["#10b981", "#34d399", "#059669", "#6ee7b7", "#047857", "#a7f3d0"];

  // SVG-based GIS Simulated Radar Map bounding dimensions
  const mapWidth = 800;
  const mapHeight = 350;

  // Normalize coordinates for drawing
  const getMapCoords = (lat: number, lng: number) => {
    // Tanzanian Serengeti bounds roughly: lat -3 to -1, lng 33 to 36
    // Amazon bounds roughly: lat -4 to 0, lng -65 to -58
    // Since coordinates are global, let's map them dynamically to fit the canvas symmetrically
    const latitudes = sites.map(s => s.latitude);
    const longitudes = sites.map(s => s.longitude);
    const minLat = Math.min(...latitudes, -5);
    const maxLat = Math.max(...latitudes, 45);
    const minLng = Math.min(...longitudes, -120);
    const maxLng = Math.max(...longitudes, 95);

    const xRange = maxLng - minLng || 1;
    const yRange = maxLat - minLat || 1;

    // Scale to bounds with padding
    const padding = 50;
    const x = padding + ((lng - minLng) / xRange) * (mapWidth - padding * 2);
    // Y is inverted in SVG
    const y = mapHeight - padding - ((lat - minLat) / yRange) * (mapHeight - padding * 2);
    return { x, y };
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Platform Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">
            Population Intelligence Control Room
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time biodiversity indexes, automated species tracking, and deep habitat health metrics.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700 w-fit">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </div>
          <span className="text-xs font-mono font-medium text-emerald-400">GIS SIGNAL LIVE</span>
        </div>
      </div>

      {/* CORE KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 - Ecosystem Health Index */}
        <div 
          onClick={() => onSelectTab("ecosystem")}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase font-mono">Ecosystem Health Index</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-sans">{kpis.avgEcosystemHealth ?? kpis.avgHabitatHealth}/100</span>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">Composite</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Multi-site ecological score</span>
            <span className="text-emerald-400 font-bold group-hover:underline">View Analytics →</span>
          </div>
        </div>

        {/* KPI 2 - Population Growth Rate */}
        <div 
          onClick={() => onSelectTab("population")}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase font-mono">Population Growth Rate</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-sans ${(kpis.popGrowthRate ?? 0) >= 0 ? "text-blue-400" : "text-amber-400"}`}>
              {(kpis.popGrowthRate ?? 0) >= 0 ? `+${kpis.popGrowthRate ?? 0}%` : `${kpis.popGrowthRate}%`}
            </span>
            <span className="text-[10px] text-blue-400 font-mono font-medium">30-Day Trend</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Species growth trajectory</span>
            <span className="text-blue-400 font-bold group-hover:underline">View Estimates →</span>
          </div>
        </div>

        {/* KPI 3 - Habitat Suitability Index */}
        <div 
          onClick={() => onSelectTab("habitat")}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase font-mono">Habitat Suitability Avg</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <TreePine className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400 font-sans">{kpis.avgHabitatSuitability ?? kpis.avgHabitatHealth}/100</span>
            <span className="text-[10px] text-cyan-400 font-mono font-medium">Suitability</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Canopy & water quality</span>
            <span className="text-cyan-400 font-bold group-hover:underline">View Workflows →</span>
          </div>
        </div>

        {/* KPI 4 - High Priority Intervention Alerts */}
        <div 
          onClick={() => onSelectTab("recommendations")}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-red-500/50 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase font-mono">Conservation Alerts</span>
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-sans">{kpis.highPriorityAlertsCount ?? kpis.criticalSpeciesCount}</span>
            <span className="text-[10px] text-rose-400 font-mono font-medium">Critical</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Urgent interventions required</span>
            <span className="text-rose-400 font-bold group-hover:underline">Planner →</span>
          </div>
        </div>
      </div>

      {/* BIODIVERSITY MATHEMATICS BAR & ACCORDION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Activity className="h-6 w-6 text-emerald-400 mt-1" />
            <div>
              <h2 className="text-lg font-bold text-white font-sans flex items-center gap-2">
                Ecosystem Diversity Indexes
                <button 
                  onClick={() => setShowDiversityExplanation(!showDiversityExplanation)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="What is this mathematical formulation?"
                >
                  <HelpCircle className="h-4.5 w-4.5" />
                </button>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic statistical metrics computing biodiversity and habitat stability parameters.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="border-l border-slate-800 pl-6">
              <span className="text-xs font-mono text-slate-400 block uppercase tracking-wider">Shannon Index (H')</span>
              <span className="text-2xl font-bold font-sans text-emerald-400">{kpis.shannonIndex}</span>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <span className="text-xs font-mono text-slate-400 block uppercase tracking-wider">Simpson Index (1 - D)</span>
              <span className="text-2xl font-bold font-sans text-teal-400">{kpis.simpsonIndex}</span>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <span className="text-xs font-mono text-slate-400 block uppercase tracking-wider">Avg Habitat Health</span>
              <span className="text-2xl font-bold font-sans text-indigo-400">{kpis.avgHabitatHealth}%</span>
            </div>
          </div>
        </div>

        {showDiversityExplanation && (
          <div className="mt-5 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 text-slate-300 text-xs leading-relaxed space-y-2">
            <p>
              <strong className="text-white">Shannon-Wiener Diversity Index (H'):</strong> Measures the uncertainty of predicting the species identity of an individual chosen at random. Calculated as <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono">H' = -∑(pi * ln(pi))</code> where <code className="bg-slate-900 px-1 py-0.5 rounded font-mono">pi</code> is the proportion of total individuals in species <code className="bg-slate-900 px-1 py-0.5 rounded font-mono">i</code>. Values range from 0 (monoculture) to ~4.5 (extremely diverse canopy/savanna).
            </p>
            <p>
              <strong className="text-white">Simpson's Index of Diversity (1 - D):</strong> Calculates the probability that two individuals randomly selected from a sample belong to different species. Measured as <code className="bg-slate-900 px-1.5 py-0.5 rounded text-teal-300 font-mono">1 - ∑(pi²)</code>. Ranges strictly between 0 and 1, with values closer to 1 representing near-flawless biodiversity balance.
            </p>
          </div>
        )}
      </div>

      {/* SPECIES & IUCN RED LIST CONSERVATION MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              Species & IUCN Red List Conservation Status Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Real-time ecological audit of monitored wildlife categorized by IUCN threat status and scientific taxonomy.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full self-start sm:self-auto">
            {speciesDistribution.length} Tracked Species
          </span>
        </div>

        {/* 5-Category IUCN Red List Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { title: "Critically Endangered", code: "CR", color: "border-red-800/80 bg-red-950/40 text-red-400", desc: "Extreme risk of extinction" },
            { title: "Endangered", code: "EN", color: "border-orange-800/80 bg-orange-950/40 text-orange-400", desc: "Very high risk of extinction" },
            { title: "Vulnerable", code: "VU", color: "border-amber-800/80 bg-amber-950/40 text-amber-400", desc: "High risk of endangerment" },
            { title: "Near Threatened", code: "NT", color: "border-yellow-800/80 bg-yellow-950/40 text-yellow-300", desc: "Close to qualifying for threatened" },
            { title: "Least Concern", code: "LC", color: "border-emerald-800/80 bg-emerald-950/40 text-emerald-400", desc: "Lowest risk; widespread & abundant" },
          ].map((cat) => {
            const count = speciesDistribution.filter((s) => {
              const st = (s.conservationStatus || "").toLowerCase();
              return st.includes(cat.title.toLowerCase()) || st.includes(`(${cat.code.toLowerCase()})`);
            }).length;

            return (
              <div key={cat.code} className={`p-3.5 rounded-xl border ${cat.color} space-y-1.5`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono">{cat.code}</span>
                  <span className="text-lg font-extrabold font-mono">{count}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-200">{cat.title}</h4>
                <p className="text-[10px] text-slate-400 leading-tight">{cat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Detailed Species List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <th className="pb-3 pt-1 px-3">Common Name</th>
                <th className="pb-3 pt-1 px-3">Scientific Name</th>
                <th className="pb-3 pt-1 px-3">IUCN Threat Category</th>
                <th className="pb-3 pt-1 px-3 text-right">Detection Sightings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {speciesDistribution.map((sp, idx) => {
                const st = (sp.conservationStatus || "").toLowerCase();
                let badgeClass = "bg-emerald-950/80 text-emerald-400 border-emerald-800";
                if (st.includes("critically")) badgeClass = "bg-red-950/80 text-red-400 border-red-800 animate-pulse";
                else if (st.includes("endangered")) badgeClass = "bg-orange-950/80 text-orange-400 border-orange-800";
                else if (st.includes("vulnerable")) badgeClass = "bg-amber-950/80 text-amber-400 border-amber-800";
                else if (st.includes("near")) badgeClass = "bg-yellow-950/80 text-yellow-300 border-yellow-800";

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{sp.commonName}</td>
                    <td className="py-2.5 px-3 italic font-serif text-emerald-400">{sp.scientificName || "N/A"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-mono font-bold ${badgeClass}`}>
                        {sp.conservationStatus || "Least Concern"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-300">
                      {sp.count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHARTS CONTAINER: SIGHTING TRENDS & DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
              Sighting Trends Over Time
            </h3>
            <p className="text-xs text-slate-500">Cumulative counts of wildlife detections recorded on camera traps.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sightTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569", borderRadius: 8 }}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                  itemStyle={{ color: "#34d399" }}
                />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSight)" name="Total Sightings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Species Distribution Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-teal-400" />
              Species Population Distribution
            </h3>
            <p className="text-xs text-slate-500">Aggregated tracking occurrences categorized by species.</p>
          </div>
          <div className="h-72 w-full">
            {speciesDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">No active sighting data loaded.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={speciesDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="commonName" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569", borderRadius: 8 }}
                    itemStyle={{ color: "#34d399" }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Detections">
                    {speciesDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* GIS HIGH-FIDELITY simulated vector map */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Compass className="h-4.5 w-4.5 text-indigo-400" />
              Geospatial Monitoring Grid (GIS)
            </h3>
            <p className="text-xs text-slate-500">Live coordinates of monitoring sites overlaying active protected habitats.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Savanna</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Forest</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-500"></span> Wetland</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400"></span> Desert</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-400"></span> Grassland</span>
          </div>
        </div>

        <div className="relative border border-slate-800 rounded-lg bg-slate-950/70 overflow-hidden flex flex-col md:flex-row items-stretch">
          
          {/* Main SVG Map Canvas */}
          <div className="flex-1 min-h-[350px] relative p-2 select-none border-r border-slate-800 bg-[linear-gradient(rgba(15,23,42,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.1)_1px,transparent_1px)] bg-[size:20px_20px]">
            
            {/* GIS coordinate lines overlay */}
            <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-600">GIS REF grid: WGS84</div>
            <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-600">Scale: 1:25,000</div>
            
            <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-full">
              {/* Background abstract topography grids */}
              <path d="M 0,200 C 150,150 250,220 400,120 C 550,20 650,180 800,100" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3,3" />
              <path d="M 0,300 C 200,280 350,380 500,290 C 650,200 700,250 800,320" fill="none" stroke="#1e293b" strokeWidth="1" />
              
              {/* Drawing connectors from radar hubs */}
              {sites.map((site, index) => {
                const { x, y } = getMapCoords(site.latitude, site.longitude);
                return (
                  <g key={`lines-${site.id}`}>
                    <line x1={x} y1={y} x2={x} y2={mapHeight} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1={0} y1={y} x2={x} y2={y} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                  </g>
                );
              })}

              {/* Deployed Monitoring Hub nodes */}
              {sites.map((site) => {
                const { x, y } = getMapCoords(site.latitude, site.longitude);
                const isHovered = hoveredSite?.id === site.id;
                
                // Color depending on HabitatType
                let color = "#f59e0b"; // Savanna
                if (site.habitatType === "Forest") color = "#10b981";
                if (site.habitatType === "Wetland") color = "#06b6d4";
                if (site.habitatType === "Desert") color = "#f97316";
                if (site.habitatType === "Grassland") color = "#4ade80";

                return (
                  <g 
                    key={site.id} 
                    className="cursor-pointer" 
                    onMouseEnter={() => setHoveredSite(site)}
                    onMouseLeave={() => setHoveredSite(null)}
                    onClick={() => onSelectSite && onSelectSite(site.id)}
                  >
                    {/* Glowing outer signal radius */}
                    <circle cx={x} cy={y} r={isHovered ? 18 : 8} fill={color} fillOpacity="0.15" className="transition-all duration-300">
                      <animate attributeName="r" values={`${isHovered ? 14 : 6};${isHovered ? 26 : 14};${isHovered ? 14 : 6}`} dur="2.5s" repeatCount="indefinite" />
                    </circle>

                    {/* Central anchor node */}
                    <circle cx={x} cy={y} r={isHovered ? 6 : 4.5} fill={color} stroke="#0f172a" strokeWidth="1.5" className="transition-all duration-300" />
                    
                    {/* Text tag label */}
                    <text x={x + 10} y={y + 4} fill="#94a3b8" fontSize="10" fontWeight="500" className="font-sans">
                      {site.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* GIS Details Sidebar Panel */}
          <div className="w-full md:w-80 bg-slate-900/60 p-5 flex flex-col justify-between">
            {hoveredSite ? (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">
                      {hoveredSite.habitatType} Hub
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5 font-sans leading-tight">
                      {hoveredSite.name}
                    </h4>
                  </div>
                  <span className="text-xl font-bold text-emerald-400 font-mono">
                    {hoveredSite.habitatScore}%
                  </span>
                </div>

                <div className="text-xs text-slate-400 border-t border-b border-slate-800 py-3 space-y-2">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Protected Area:</span>
                    <span className="text-slate-200 text-right max-w-[150px] truncate">{hoveredSite.protectedArea}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Latitude:</span>
                    <span className="font-mono text-slate-300">{hoveredSite.latitude.toFixed(4)}°</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Longitude:</span>
                    <span className="font-mono text-slate-300">{hoveredSite.longitude.toFixed(4)}°</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Environment Parameters</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-950/50 p-1.5 rounded border border-slate-850 flex items-center gap-1">
                      <TreePine className="h-3.5 w-3.5 text-emerald-400" />
                      <div>
                        <span className="text-slate-500 block">Canopy</span>
                        <span className="text-slate-300 font-semibold">{hoveredSite.environmentalParameters.canopyCover}%</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/50 p-1.5 rounded border border-slate-850 flex items-center gap-1">
                      <Droplet className="h-3.5 w-3.5 text-cyan-400" />
                      <div>
                        <span className="text-slate-500 block">Water</span>
                        <span className="text-slate-300 font-semibold">{hoveredSite.environmentalParameters.waterAvailability}</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/50 p-1.5 rounded border border-slate-850 flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-400" />
                      <div>
                        <span className="text-slate-500 block">Disturbance</span>
                        <span className="text-slate-300 font-semibold">{hoveredSite.environmentalParameters.humanDisturbance}</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/50 p-1.5 rounded border border-slate-850 flex items-center gap-1">
                      <Thermometer className="h-3.5 w-3.5 text-red-400" />
                      <div>
                        <span className="text-slate-500 block">Temp</span>
                        <span className="text-slate-300 font-semibold">{hoveredSite.environmentalParameters.avgTemperature}°C</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic text-center pt-2">
                  Click node to pivot to active site log surveys.
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-3 py-10">
                <Compass className="h-10 w-10 text-slate-700 animate-pulse-slow" />
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Site Telemetry Panel</h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] mx-auto">
                    Hover over any radar anchor node in the GIS grid to inspect real-time environmental sensors and biodiversity metrics.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => onSelectTab("sites")}
              className="w-full mt-4 bg-slate-800 hover:bg-slate-750 text-xs text-white font-medium py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-all font-sans cursor-pointer text-center"
            >
              Add New Monitoring Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
