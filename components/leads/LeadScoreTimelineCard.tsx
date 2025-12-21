"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, History } from "lucide-react";
import { apiClient } from "@/lib/api";

interface LeadScoreTimelineCardProps {
  leadId: number;
}

interface ScoreHistoryItem {
  id: number;
  created_at: string;
  score_type?: string | null;
  previous_score?: number | null;
  new_score?: number | null;
  delta?: number | null;
}

export function LeadScoreTimelineCard({ leadId }: LeadScoreTimelineCardProps) {
  const [items, setItems] = useState<ScoreHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getLeadScoreHistory(leadId, 10);
      setItems(data);
    } catch (error) {
      console.error("Failed to load score history:", error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 animate-pulse h-24" />
    );
  }

  if (items.length === 0) {
    return null;
  }

  const latest = items[0];
  const showAlert = typeof latest?.delta === "number" && latest.delta <= -10;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Score Timeline
          </h3>
        </div>
        {showAlert && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
            Score drop detected
          </span>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs text-slate-400">
            <span>{new Date(item.created_at).toLocaleString()}</span>
            <span className="flex items-center gap-2">
              <span className="text-slate-300 font-semibold">
                {Math.round(item.new_score || 0)}
              </span>
              {typeof item.delta === "number" && (
                <span
                  className={`inline-flex items-center gap-1 ${
                    item.delta >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {item.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {item.delta >= 0 ? "+" : ""}
                  {item.delta}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
