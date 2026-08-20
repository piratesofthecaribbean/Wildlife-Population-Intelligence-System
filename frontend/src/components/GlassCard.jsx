import React from "react";

/**
 * Clean, solid card panel component with maximum readability.
 * Provides consistent white background, subtle sage border, and soft shadow.
 */
export default function GlassCard({
  children,
  variant = "standard",
  className = "",
  onClick,
  ...props
}) {
  const variantMap = {
    standard: "bg-white border border-[#d6e4dc] rounded-2xl shadow-card",
    prominent: "bg-white border border-[#c5dcce] rounded-2xl shadow-panel p-6 sm:p-8",
    subtle: "bg-[#f7faf8] border border-[#d6e4dc] rounded-xl p-4",
    interactive: "bg-white border border-[#d6e4dc] rounded-2xl shadow-card hover:shadow-lift hover:border-[#9fc4af] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
    solid: "bg-white border border-[#d6e4dc] rounded-2xl p-6",
  };

  const baseClass = variantMap[variant] || variantMap.standard;

  return (
    <div
      className={`${baseClass} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
