import React from "react";

/**
 * Standardized status badge for Ecosystem Health and IUCN Conservation Status.
 * Color-coded with distinct high-contrast palettes:
 * - Excellent / Healthy: Deep emerald / green
 * - Moderate Concern: Amber / yellow
 * - Vulnerable: Orange
 * - Critical / Endangered: Deep crimson / red
 */
export default function StatusBadge({ status = "", size = "md", className = "" }) {
  const norm = String(status).trim().toLowerCase();

  let styles = "bg-[#e8f4ed] text-[#10482e] border-[#c2e2d0]";
  let dotColor = "bg-[#155e3b]";

  if (norm.includes("crit") || norm === "cr") {
    styles = "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]";
    dotColor = "bg-[#b91c1c]";
  } else if (norm.includes("vuln") || norm === "vu") {
    styles = "bg-[#ffedd5] text-[#9a3412] border-[#fdba74]";
    dotColor = "bg-[#c2410c]";
  } else if (norm.includes("endang") || norm === "en") {
    styles = "bg-[#fef3c7] text-[#92400e] border-[#fde68a]";
    dotColor = "bg-[#b45309]";
  } else if (norm.includes("mod") || norm.includes("concern")) {
    styles = "bg-[#fef9c3] text-[#854d0e] border-[#fef08a]";
    dotColor = "bg-[#a16207]";
  } else if (norm.includes("excel")) {
    styles = "bg-[#dcfce7] text-[#14532d] border-[#bbf7d0]";
    dotColor = "bg-[#15803d]";
  } else if (norm.includes("health") || norm === "lc" || norm.includes("least")) {
    styles = "bg-[#f0fdf4] text-[#166534] border-[#dcfce7]";
    dotColor = "bg-[#16a34a]";
  }

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-[11px] font-bold gap-1",
    md: "px-3 py-1 text-xs font-bold gap-1.5",
    lg: "px-3.5 py-1.5 text-sm font-extrabold gap-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm font-mono ${sizeClasses[size] || sizeClasses.md} ${styles} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
}
