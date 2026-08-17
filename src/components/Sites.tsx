import React, { useState } from "react";
import { 
  MapPin, 
  Layers, 
  TreePine, 
  Droplet, 
  Flame, 
  Thermometer, 
  Plus, 
  Info,
  Compass
} from "lucide-react";
import { MonitoringSite } from "../types.js";

interface SitesProps {
  sites: MonitoringSite[];
  onCreateSite: (data: any) => Promise<void>;
  selectedSiteId?: string;
}

export default function Sites({ sites, onCreateSite, selectedSiteId }: SitesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [protectedArea, setProtectedArea] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [habitatType, setHabitatType] = useState<"Forest" | "Savanna" | "Wetland" | "Desert" | "Grassland">("Forest");
  const [habitatScore, setHabitatScore] = useState("80");
  const [canopyCover, setCanopyCover] = useState("50");
  const [waterAvailability, setWaterAvailability] = useState<"High" | "Medium" | "Low">("Medium");
  const [humanDisturbance, setHumanDisturbance] = useState<"None" | "Low" | "Medium" | "High">("Low");
  const [avgTemperature, setAvgTemperature] = useState("24");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !protectedArea || !latitude || !longitude) return;

    try {
      setSubmitting(true);
      await onCreateSite({
        name,
        protectedArea,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        habitatType,
        habitatScore: parseInt(habitatScore) || 80,
        canopyCover: parseInt(canopyCover) || 50,
        waterAvailability,
        humanDisturbance,
        avgTemperature: parseFloat(avgTemperature) || 24,
      });

      // Reset
      setName("");
      setProtectedArea("");
      setLatitude("");
      setLongitude("");
      setHabitatScore("80");
      setCanopyCover("50");
      setAvgTemperature("24");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            GIS Monitoring Hubs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure camera coordinates, map core ecosystems, and log localized environmental sensor indices.
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Provision Monitoring Site
        </button>
      </div>

      {/* PROVISION SITE FORM */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-slide-up">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans border-b border-slate-850 pb-2">
            GIS Site Specifications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Site Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Serengeti Sector B"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Protected Area / Forest Reserve</label>
              <input
                type="text"
                required
                value={protectedArea}
                onChange={(e) => setProtectedArea(e.target.value)}
                placeholder="e.g. Serengeti National Park"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Habitat Classification</label>
              <select
                value={habitatType}
                onChange={(e) => setHabitatType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="Forest">Forest Canopy</option>
                <option value="Savanna">Savanna Wood</option>
                <option value="Wetland">River Wetland</option>
                <option value="Desert">Desert Scrub</option>
                <option value="Grassland">Open Grassland</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Latitude Coordinate</label>
              <input
                type="number"
                step="0.0001"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. -2.1543"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Longitude Coordinate</label>
              <input
                type="number"
                step="0.0001"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 34.6852"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Habitat Wellness Score (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={habitatScore}
                onChange={(e) => setHabitatScore(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Canopy Cover (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={canopyCover}
                onChange={(e) => setCanopyCover(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Water Availability</label>
              <select
                value={waterAvailability}
                onChange={(e) => setWaterAvailability(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="High">Abundant/High</option>
                <option value="Medium">Seasonal/Medium</option>
                <option value="Low">Scarce/Low</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Human Disturbance Footprint</label>
              <select
                value={humanDisturbance}
                onChange={(e) => setHumanDisturbance(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="None">None (Pristine)</option>
                <option value="Low">Low (Fringe Patrol)</option>
                <option value="Medium">Medium (Grazing/Buffer)</option>
                <option value="High">High (Settlement Edge)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Avg Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={avgTemperature}
                onChange={(e) => setAvgTemperature(e.target.value)}
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              {submitting ? "Provisioning..." : "Activate GIS Coordinates"}
            </button>
          </div>
        </form>
      )}

      {/* SITES GRID CARD LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sites.map((site) => {
          const isSelected = selectedSiteId === site.id;
          
          let colorClass = "border-amber-500/20 hover:border-amber-500/50";
          let bgIcon = "bg-amber-500/10 text-amber-400";
          if (site.habitatType === "Forest") {
            colorClass = "border-emerald-500/20 hover:border-emerald-500/50";
            bgIcon = "bg-emerald-500/10 text-emerald-400";
          } else if (site.habitatType === "Wetland") {
            colorClass = "border-cyan-500/20 hover:border-cyan-500/50";
            bgIcon = "bg-cyan-500/10 text-cyan-400";
          }

          return (
            <div 
              key={site.id} 
              className={`bg-slate-900 border rounded-xl p-5 space-y-4 transition-all duration-300 ${colorClass} ${
                isSelected ? "ring-2 ring-emerald-500 border-transparent shadow-emerald-500/10" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${bgIcon}`}>
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">{site.name}</h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                      <MapPin className="h-3 w-3" />
                      {site.latitude.toFixed(4)}°, {site.longitude.toFixed(4)}°
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">Habitat score</span>
                  <span className="text-xl font-bold text-white font-sans">{site.habitatScore}%</span>
                </div>
              </div>

              {/* Sensor stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <TreePine className="h-3 w-3 text-emerald-400" /> Canopy
                  </span>
                  <span className="text-slate-200 font-semibold">{site.environmentalParameters.canopyCover}%</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Droplet className="h-3 w-3 text-cyan-400" /> Water
                  </span>
                  <span className="text-slate-200 font-semibold">{site.environmentalParameters.waterAvailability}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-400" /> Disturb
                  </span>
                  <span className="text-slate-200 font-semibold">{site.environmentalParameters.humanDisturbance}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-red-400" /> Sensor
                  </span>
                  <span className="text-slate-200 font-semibold">{site.environmentalParameters.avgTemperature}°C</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-500 shrink-0" />
                <span>
                  Administered within <strong className="text-slate-300">{site.protectedArea}</strong> zone bounds.
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
