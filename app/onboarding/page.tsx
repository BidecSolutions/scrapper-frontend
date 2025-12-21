"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Sparkles, Rocket, ChevronRight } from "lucide-react";
import { apiClient, type OnboardingStatus } from "@/lib/api";

export default function OnboardingPage() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getOnboardingStatus();
      setStatus(data);
    } catch (error) {
      console.error("Failed to load onboarding status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 min-h-screen">
      <header className="px-6 py-6 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Onboarding Wizard</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Finish these steps to unlock your first high-quality leads.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 backdrop-blur p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Your progress
                </h2>
              </div>
              {status && (
                <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 px-2.5 py-1 rounded-full">
                  {status.steps.filter((step) => step.completed).length} / {status.steps.length} complete
                </span>
              )}
            </div>

            {loading ? (
              <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            ) : (
              <div className="space-y-3">
                {(status?.steps || []).map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/70 px-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                      <div>
                        <p className={`text-sm font-semibold ${step.completed ? "text-slate-500 line-through" : "text-slate-800 dark:text-slate-100"}`}>
                          {step.label}
                        </p>
                        {!step.completed && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">Recommended next action</p>
                        )}
                      </div>
                    </div>
                    {!step.completed && step.action_url && (
                      <Link
                        href={step.action_url}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                      >
                        Go
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        </div>
      </main>
    </div>
  );
}
