"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Activity, Target, ShieldCheck, Radar } from "lucide-react";
import { apiClient, type LeadScoreExplain } from "@/lib/api";

interface LeadScoreExplainCardProps {
  leadId: number;
}

export function LeadScoreExplainCard({ leadId }: LeadScoreExplainCardProps) {
  const [data, setData] = useState<LeadScoreExplain | null>(null);
  const [loading, setLoading] = useState(true);

  const loadExplain = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiClient.getLeadScoreExplain(leadId);
      setData(result);
    } catch (error) {
      console.error("Failed to load score explainability:", error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadExplain();
  }, [loadExplain]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 animate-pulse h-28" />
    );
  }

  if (!data) {
    return null;
  }

  const sections = [
    { label: "Deliverability", points: data.deliverability.points, max: 30, icon: ShieldCheck },
    { label: "Fit", points: data.fit.points, max: 40, icon: Target },
    { label: "Engagement", points: data.engagement.points, max: 20, icon: Activity },
    { label: "Source", points: data.source.points, max: 10, icon: Radar },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Score Explainability
          </h3>
        </div>
        <span className="text-xs text-slate-400">Total {Math.round(data.total)} / 100</span>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <section.icon className="w-3.5 h-3.5 text-cyan-300" />
                {section.label}
              </span>
              <span className="text-slate-200 font-semibold">{Math.round(section.points)} pts</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full bg-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (Math.max(0, section.points) / section.max) * 100)}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        ))}
      </div>

      {data.notes.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-3 space-y-1 text-xs text-slate-400">
          {data.notes.slice(0, 4).map((note, idx) => (
            <div key={`${note}-${idx}`} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
