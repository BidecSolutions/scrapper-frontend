"use client";

import { motion } from "framer-motion";

interface TrendChartProps {
  data: Array<{ date: string; value: number }>;
  color?: string;
  height?: number;
}

export function TrendChart({ data, color = "cyan", height = 120 }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,100 ${points} 100,100`;

  const colorMap: Record<string, { fill: string; stroke: string }> = {
    cyan: { fill: "rgba(6, 182, 212, 0.2)", stroke: "rgb(6, 182, 212)" },
    emerald: { fill: "rgba(16, 185, 129, 0.2)", stroke: "rgb(16, 185, 129)" },
    blue: { fill: "rgba(59, 130, 246, 0.2)", stroke: "rgb(59, 130, 246)" },
    purple: { fill: "rgba(168, 85, 247, 0.2)", stroke: "rgb(168, 85, 247)" },
  };

  const colors = colorMap[color] || colorMap.cyan;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <motion.polygon
          points={areaPoints}
          fill={`url(#gradient-${color})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        
        {/* Line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      
      {/* Data points */}
      <div className="absolute inset-0 flex items-end justify-between px-1">
        {data.map((d, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
            className="w-1.5 h-1.5 rounded-full shadow-lg"
            style={{
              backgroundColor: colors.stroke,
              boxShadow: `0 0 8px ${colors.stroke}40`,
              bottom: `${((d.value - minValue) / range) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

