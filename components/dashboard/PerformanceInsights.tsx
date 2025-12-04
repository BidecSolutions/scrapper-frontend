"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target, Zap } from "lucide-react";

interface Insight {
  type: "success" | "warning" | "info" | "tip";
  title: string;
  description: string;
  action?: string;
  icon: React.ElementType;
}

const insights: Insight[] = [
  {
    type: "success",
    title: "Lead Quality Improving",
    description: "Your average lead score increased by 12% this week",
    icon: TrendingUp,
  },
  {
    type: "tip",
    title: "Optimize Email Verification",
    description: "Verify 45 pending emails to improve deliverability rate",
    action: "Verify Now",
    icon: Zap,
  },
  {
    type: "info",
    title: "Top Performing Niche",
    description: "'Dentist' jobs generate 3x more leads than average",
    icon: Target,
  },
];

const typeStyles = {
  success: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-300",
  info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-300",
  tip: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/30 text-purple-700 dark:text-purple-300",
};

export function PerformanceInsights() {
  return (
    <div className="space-y-3">
      {insights.map((insight, index) => {
        const Icon = insight.icon;
        return (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border ${typeStyles[insight.type]} group hover:shadow-lg transition-all`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-900/30 flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold mb-1">{insight.title}</h4>
                <p className="text-xs opacity-90">{insight.description}</p>
                {insight.action && (
                  <button className="mt-2 text-xs font-medium underline opacity-80 hover:opacity-100 transition-opacity">
                    {insight.action} →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

