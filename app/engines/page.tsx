"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";
import { EnginesNav } from "@/components/engines/EnginesNav";
import { Activity, Cpu, Shield, Zap } from "lucide-react";

export default function EnginesOverviewPage() {
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient
      .getEngineOverview()
      .then((data) => {
        if (!active) return;
        setOverview(data);
      })
      .catch(() => {
        if (!active) return;
        setOverview(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Engine Monitor"
        description="Unified view of playbooks, automation, templates, and enrichment engines"
        icon={Cpu}
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto space-y-6">
          <EnginesNav />

          {loading ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-8 text-center text-slate-500 dark:text-slate-400">
              Loading engine status...
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-cyan-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Playbooks</h3>
                  </div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {overview?.playbooks?.total ?? 0} runs
                  </p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">List automation</h3>
                  </div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {overview?.list_automation?.rules ?? 0} rules
                  </p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Template governance</h3>
                  </div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {overview?.templates?.pending ?? 0} pending approvals
                  </p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Enrichment</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Pending {overview?.enrichment?.pending ?? 0} | Processing {overview?.enrichment?.processing ?? 0}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Failed {overview?.enrichment?.failed ?? 0} | Success {overview?.enrichment?.success ?? 0}
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
