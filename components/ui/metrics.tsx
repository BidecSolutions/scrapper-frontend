"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function MetricCard({
  label,
  value,
  tone = "default",
  change,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "info" | "success" | "danger" | "warning";
  change?: number;
  icon?: React.ElementType;
}) {
  const colors: Record<string, { text: string; bg: string; border: string; gradient: string }> = {
    default: {
      text: "text-slate-900 dark:text-slate-50",
      bg: "bg-white/80 dark:bg-slate-900/80",
      border: "border-slate-200/50 dark:border-slate-800/50",
      gradient: "from-slate-50 to-white dark:from-slate-900 dark:to-slate-800",
    },
    info: {
      text: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-cyan-950/30 dark:to-blue-950/30",
      border: "border-cyan-200/50 dark:border-cyan-900/30",
      gradient: "from-cyan-500/10 via-blue-500/10 to-cyan-500/10",
    },
    success: {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-gradient-to-br from-emerald-50/80 to-green-50/80 dark:from-emerald-950/30 dark:to-green-950/30",
      border: "border-emerald-200/50 dark:border-emerald-900/30",
      gradient: "from-emerald-500/10 via-green-500/10 to-emerald-500/10",
    },
    danger: {
      text: "text-rose-600 dark:text-rose-400",
      bg: "bg-gradient-to-br from-rose-50/80 to-red-50/80 dark:from-rose-950/30 dark:to-red-950/30",
      border: "border-rose-200/50 dark:border-rose-900/30",
      gradient: "from-rose-500/10 via-red-500/10 to-rose-500/10",
    },
    warning: {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-gradient-to-br from-amber-50/80 to-yellow-50/80 dark:from-amber-950/30 dark:to-yellow-950/30",
      border: "border-amber-200/50 dark:border-amber-900/30",
      gradient: "from-amber-500/10 via-yellow-500/10 to-amber-500/10",
    },
  };

  const style = colors[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ 
        scale: 1.02, 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className={`
        relative rounded-2xl ${style.bg} border ${style.border} 
        px-6 py-5 shadow-lg backdrop-blur-md overflow-hidden
        transition-all duration-300 group
        ${tone === 'info' ? 'hover:shadow-xl hover:shadow-cyan-500/10' : 
          tone === 'success' ? 'hover:shadow-xl hover:shadow-emerald-500/10' : 
          tone === 'danger' ? 'hover:shadow-xl hover:shadow-rose-500/10' : 
          tone === 'warning' ? 'hover:shadow-xl hover:shadow-amber-500/10' :
          'hover:shadow-xl hover:shadow-slate-500/10'}
      `}
    >
      {/* Animated gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">
              {label}
            </p>
            {Icon && (
              <div className={`
                inline-flex p-2 rounded-lg mb-2
                ${tone === 'info' ? 'bg-cyan-100/50 dark:bg-cyan-900/30' : 
                  tone === 'success' ? 'bg-emerald-100/50 dark:bg-emerald-900/30' : 
                  tone === 'danger' ? 'bg-rose-100/50 dark:bg-rose-900/30' : 
                  tone === 'warning' ? 'bg-amber-100/50 dark:bg-amber-900/30' :
                  'bg-slate-100/50 dark:bg-slate-900/30'}
              `}>
                <Icon className={`w-4 h-4 ${style.text}`} />
              </div>
            )}
          </div>
          {change !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold
                ${change > 0 
                  ? 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                  : change < 0 
                  ? 'bg-rose-100/80 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-100/80 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                }
              `}
            >
              {change > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : change < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              <span>{Math.abs(change)}%</span>
            </motion.div>
          )}
        </div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`text-3xl font-bold ${style.text} tracking-tight`}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </motion.p>
      </div>

      {/* Shine effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6 }}
      />
    </motion.div>
  );
}
