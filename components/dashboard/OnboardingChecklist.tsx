"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { apiClient, type OnboardingStatus } from "@/lib/api";
import Link from "next/link";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  actionUrl?: string;
}

export function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChecklist = useCallback(async () => {
    try {
      setLoading(true);
      const status: OnboardingStatus = await apiClient.getOnboardingStatus();
      setItems(
        (status.steps || []).map((step) => ({
          id: step.id,
          label: step.label,
          completed: step.completed,
          actionUrl: step.action_url,
        }))
      );
    } catch (error) {
      console.error("Failed to load checklist:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const completedCount = items.filter(item => item.completed).length;
  const allCompleted = completedCount === items.length && items.length > 0;

  if (loading) {
    return (
      <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 h-56 animate-pulse" />
    );
  }

  if (allCompleted) {
    return null; // Hide checklist when all completed
  }

  return (
    <motion.div
      className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Getting Started</h3>
          <Link
            href="/onboarding"
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 inline-flex items-center gap-1 mt-1"
          >
            Open onboarding wizard
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 px-2.5 py-1 rounded-full">
          {completedCount} / {items.length} completed
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
            )}
            <span
              className={`text-sm flex-1 font-medium ${
                item.completed 
                  ? "text-slate-500 dark:text-slate-500 line-through" 
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {item.label}
            </span>
            {!item.completed && item.actionUrl && (
              <Link
                href={item.actionUrl}
                className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
              >
                <span>Go</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

