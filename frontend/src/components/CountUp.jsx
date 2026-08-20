import React, { useEffect, useState } from "react";

/**
 * Animated number counter component.
 * Respects prefers-reduced-motion, uses tabular figures for alignment.
 */
export default function CountUp({
  end = 0,
  duration = 1200,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    let startTime = null;
    const startVal = 0;
    const endVal = Number(end) || 0;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentVal = startVal + (endVal - startVal) * easeOutCubic(progress);

      setCount(currentVal);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(endVal);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [end, duration]);

  const formatted = decimals > 0
    ? count.toFixed(decimals)
    : Math.round(count).toLocaleString();

  return (
    <span className={`tabular-nums font-mono tracking-tight ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
