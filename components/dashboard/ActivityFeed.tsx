"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Sparkles, TrendingUp, Users, Mail, Zap } from "lucide-react";
import { formatRelativeTime } from "@/lib/time";

interface Activity {
  id: string;
  type: "job_completed" | "job_failed" | "lead_added" | "verification_completed" | "enrichment_completed";
  message: string;
  timestamp: string;
  link?: string;
}

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "job_completed",
    message: "Scraping job 'Dentist in New York' completed with 45 leads",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    link: "/jobs/1",
  },
  {
    id: "2",
    type: "verification_completed",
    message: "Email verification job completed: 120 valid, 8 invalid",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    link: "/verification/1",
  },
  {
    id: "3",
    type: "enrichment_completed",
    message: "AI enrichment completed for 30 leads",
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: "4",
    type: "lead_added",
    message: "15 new leads added from LinkedIn extension",
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
  },
];

const iconMap = {
  job_completed: CheckCircle2,
  job_failed: XCircle,
  lead_added: Users,
  verification_completed: Mail,
  enrichment_completed: Zap,
};

const colorMap = {
  job_completed: "text-emerald-500 bg-emerald-500/10",
  job_failed: "text-rose-500 bg-rose-500/10",
  lead_added: "text-blue-500 bg-blue-500/10",
  verification_completed: "text-cyan-500 bg-cyan-500/10",
  enrichment_completed: "text-purple-500 bg-purple-500/10",
};

export function ActivityFeed() {
  return (
    <div className="space-y-3 flex-1">
      {mockActivities.map((activity, index) => {
        const Icon = iconMap[activity.type];
        const colorClass = colorMap[activity.type];
        
        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors group"
          >
            <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                {activity.message}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formatRelativeTime(activity.timestamp)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

