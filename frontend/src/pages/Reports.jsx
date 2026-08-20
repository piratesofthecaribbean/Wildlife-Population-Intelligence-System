import React, { useState } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import GlassCard from "../components/GlassCard.jsx";
import {
  FaFilePdf,
  FaFileExcel,
  FaFileAlt,
  FaLeaf,
  FaPaw,
  FaSeedling,
  FaShieldAlt,
  FaClipboardList,
  FaDownload,
  FaSpinner,
} from "react-icons/fa";

const REPORT_TYPES = [
  {
    id: "wildlife_survey",
    title: "Wildlife Survey Report",
    description: "Summary of active survey campaigns, GPS coordinate bounds, sensor nodes, and transect records.",
    icon: FaClipboardList,
    pdfEndpoint: "/biodiversity/reports/pdf",
    excelEndpoint: "/biodiversity/reports/excel",
    pdfFile: "wildlife_survey_report.pdf",
    excelFile: "wildlife_survey_report.xlsx",
  },
  {
    id: "biodiversity",
    title: "Biodiversity Analytics Report",
    description: "Shannon-Wiener and Simpson entropy formulations, species richness, and longitudinal detection logs.",
    icon: FaLeaf,
    pdfEndpoint: "/biodiversity/reports/pdf",
    excelEndpoint: "/biodiversity/reports/excel",
    pdfFile: "biodiversity_report.pdf",
    excelFile: "biodiversity_report.xlsx",
  },
  {
    id: "species_population",
    title: "Species Population Census Report",
    description: "Demographic estimates, density per sq km, annual growth rates, and movement corridor vectors.",
    icon: FaPaw,
    pdfEndpoint: "/biodiversity/reports/pdf",
    excelEndpoint: "/biodiversity/reports/excel",
    pdfFile: "species_population_report.pdf",
    excelFile: "species_population_report.xlsx",
  },
  {
    id: "habitat_assessment",
    title: "Habitat Health Assessment",
    description: "Suitability scores, NDVI vegetation metrics, riparian water availability, and degradation alarms.",
    icon: FaSeedling,
    pdfEndpoint: "/biodiversity/reports/pdf",
    excelEndpoint: "/biodiversity/reports/excel",
    pdfFile: "habitat_assessment_report.pdf",
    excelFile: "habitat_assessment_report.xlsx",
  },
  {
    id: "conservation",
    title: "Conservation Recommendations Matrix",
    description: "Priority mitigation interventions, habitat restoration blueprints, and ranger resource allocation.",
    icon: FaShieldAlt,
    pdfEndpoint: "/biodiversity/reports/pdf",
    excelEndpoint: "/biodiversity/reports/excel",
    pdfFile: "conservation_report.pdf",
    excelFile: "conservation_report.xlsx",
  },
];

export default function Reports() {
  const [loadingMap, setLoadingMap] = useState({});
  const [downloadHistory, setDownloadHistory] = useState([]);

  const downloadReport = async (report, format) => {
    const key = `${report.id}_${format}`;
    setLoadingMap((prev) => ({ ...prev, [key]: true }));

    try {
      const endpoint = format === "pdf" ? report.pdfEndpoint : report.excelEndpoint;
      const filename = format === "pdf" ? report.pdfFile : report.excelFile;
      const response = await api.get(endpoint, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`${report.title} (${format.toUpperCase()}) exported!`);

      setDownloadHistory((prev) => [
        {
          id: Date.now(),
          title: report.title,
          format: format.toUpperCase(),
          filename,
          timestamp: new Date().toLocaleString(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()} report.`);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  const isLoading = (reportId, format) => loadingMap[`${reportId}_${format}`] === true;

  return (
    <div className="space-y-8">
      {/* Header */}
      <GlassCard variant="prominent" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#e8f4ed] text-[#155e3b] flex items-center justify-center text-xl shadow-sm border border-[#c2e2d0]">
            <FaFileAlt />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-2xl text-[#0d261b]">
              Reports & Data Export Center
            </h2>
            <p className="text-xs text-[#355344] mt-0.5">
              Generate and download structured research-grade wildlife intelligence reports in PDF and Excel formats.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Report Templates", value: REPORT_TYPES.length, suffix: " Standard" },
            { label: "Export Engines", value: "PDF & Excel", suffix: "" },
            { label: "Exports Generated", value: downloadHistory.length, suffix: " Files" },
            { label: "Telemetry Feeds", value: "Vision & Audio", suffix: "" },
          ].map((s, i) => (
            <div key={i} className="p-4 bg-[#f7faf8] rounded-xl border border-[#d6e4dc]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#355344] font-mono">
                {s.label}
              </p>
              <p className="font-display font-extrabold text-xl text-[#0d261b] mt-1">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {REPORT_TYPES.map((report) => {
          const Icon = report.icon;
          return (
            <GlassCard
              key={report.id}
              variant="interactive"
              className="p-6 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#e8f4ed] text-[#155e3b] flex items-center justify-center text-lg border border-[#c2e2d0]">
                    <Icon />
                  </div>
                  <h3 className="font-display font-bold text-base text-[#0d261b] leading-tight">
                    {report.title}
                  </h3>
                </div>

                <p className="text-xs text-[#0d261b] leading-relaxed">
                  {report.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => downloadReport(report, "pdf")}
                  disabled={isLoading(report.id, "pdf")}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
                >
                  {isLoading(report.id, "pdf") ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaFilePdf />
                  )}
                  <span>PDF Format</span>
                </button>
                <button
                  onClick={() => downloadReport(report, "excel")}
                  disabled={isLoading(report.id, "excel")}
                  className="flex-1 btn-forest-primary text-xs"
                >
                  {isLoading(report.id, "excel") ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaFileExcel />
                  )}
                  <span>Excel Data</span>
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Export History */}
      {downloadHistory.length > 0 && (
        <GlassCard variant="standard" className="p-6 space-y-4">
          <h3 className="font-display font-bold text-base text-[#0d261b] flex items-center gap-2">
            <FaDownload className="text-[#155e3b]" /> Recent Session Exports
          </h3>
          <div className="space-y-2.5">
            {downloadHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 bg-[#f7faf8] rounded-xl border border-[#d6e4dc]"
              >
                <div className="flex items-center gap-3">
                  {item.format === "PDF" ? (
                    <FaFilePdf className="text-red-500 text-lg" />
                  ) : (
                    <FaFileExcel className="text-[#155e3b] text-lg" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-[#0d261b]">{item.title}</p>
                    <p className="text-[10px] text-[#4e6b5c] font-mono">{item.filename}</p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="badge-forest text-[10px] uppercase font-bold">{item.format}</span>
                  <p className="text-[10px] text-[#4e6b5c] mt-1">{item.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
