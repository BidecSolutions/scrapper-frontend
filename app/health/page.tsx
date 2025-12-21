"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { HealthResponse } from "@/types/health";
import { motion } from "framer-motion";
import { Activity, ChevronDown } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/metrics";

type Status = "ok" | "warning" | "bad";

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { bg: string; text: string; border: string }> = {
    ok: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/30",
    },
    warning: {
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/30",
    },
    bad: {
      bg: "bg-rose-500/10",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500/30",
    },
  };
  const label: Record<Status, string> = {
    ok: "Healthy",
    warning: "Watch",
    bad: "Attention",
  };
  const styles = map[status];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles.bg} ${styles.text} border ${styles.border}`}>
      {label[status]}
    </span>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getHealth(days);
      setHealth(data);
    } catch (err) {
      console.error("Error loading health data:", err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  function getHealthScoreColor(score: number): string {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-rose-400";
  }

  function getHealthScoreStrokeColor(score: number): string {
    if (score >= 80) return "stroke-emerald-400";
    if (score >= 60) return "stroke-amber-400";
    return "stroke-rose-400";
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Health & Quality Dashboard"
        description="System health metrics and quality indicators across your workspace"
        icon={Activity}
        action={
          <Select
            value={days.toString()}
            onChange={(e) => setDays(Number(e.target.value))}
            options={[
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
            className="w-40"
          />
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {loading || !health ? (
            <div className="text-center py-20">
              <div className="inline-block w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading health data...</p>
            </div>
          ) : (
            <>
              {/* Overall score card */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-8 shadow-2xl grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-8"
              >
                <div className="flex flex-col justify-between gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
                      Overall Health Score
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span className={`text-6xl font-extrabold ${getHealthScoreColor(health.health_score)}`}>
                        {health.health_score}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">out of 100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: "Deliverability",
                        value: `${(health.cards.deliverability.details.bounce_rate * 100).toFixed(2)}% bounce`,
                        sub: `Spam: ${(health.cards.deliverability.details.spam_complaint_rate * 100).toFixed(3)}%`,
                      },
                      {
                        label: "Verification",
                        value: `${(health.cards.verification.details.valid_pct * 100).toFixed(1)}% valid`,
                        sub: `Invalid: ${(health.cards.verification.details.invalid_pct * 100).toFixed(1)}%`,
                      },
                      {
                        label: "Campaigns",
                        value: `${(health.cards.campaigns.details.avg_open_rate * 100).toFixed(1)}% open`,
                        sub: `Reply: ${(health.cards.campaigns.details.avg_reply_rate * 100).toFixed(1)}%`,
                      },
                      {
                        label: "Jobs & Playbooks",
                        value: `${health.cards.jobs.details.jobs_failed || 0} failures`,
                        sub: `of ${health.cards.jobs.details.jobs_started || 0} jobs`,
                      },
                    ].map((metric, idx) => (
                      <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className="rounded-xl glass border border-slate-200/50 dark:border-slate-800/50 p-4"
                      >
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{metric.label}</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{metric.value}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{metric.sub}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Circular gauge */}
                <div className="flex items-center justify-center">
                  <div className="relative h-48 w-48">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-slate-200 dark:stroke-slate-800"
                        strokeWidth="8"
                        fill="none"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="42"
                        className={getHealthScoreStrokeColor(health.health_score)}
                        strokeWidth="8"
                        strokeDasharray="264"
                        initial={{ strokeDashoffset: 264 }}
                        animate={{ strokeDashoffset: 264 - (264 * health.health_score) / 100 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-extrabold ${getHealthScoreColor(health.health_score)}`}>
                        {health.health_score}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Health</span>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Metric sections grid */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    key: "deliverability",
                    title: "Deliverability",
                    status: health.cards.deliverability.status as Status,
                    details: [
                      { label: "Emails sent", value: (health.cards.deliverability.details.emails_sent || 0).toLocaleString() },
                      { label: "Bounce rate", value: `${(health.cards.deliverability.details.bounce_rate * 100).toFixed(2)}%` },
                      { label: "Spam complaints", value: `${(health.cards.deliverability.details.spam_complaint_rate * 100).toFixed(3)}%` },
                    ],
                    delay: 0.1,
                  },
                  {
                    key: "verification",
                    title: "Verification",
                    status: health.cards.verification.status as Status,
                    details: [
                      { label: "Emails verified", value: (health.cards.verification.details.emails_verified || 0).toLocaleString() },
                      { label: "Valid %", value: `${(health.cards.verification.details.valid_pct * 100).toFixed(1)}%` },
                      { label: "Invalid %", value: `${(health.cards.verification.details.invalid_pct * 100).toFixed(1)}%` },
                    ],
                    delay: 0.2,
                  },
                  {
                    key: "campaigns",
                    title: "Campaigns",
                    status: health.cards.campaigns.status as Status,
                    details: [
                      { label: "Avg open rate", value: `${(health.cards.campaigns.details.avg_open_rate * 100).toFixed(1)}%` },
                      { label: "Avg reply rate", value: `${(health.cards.campaigns.details.avg_reply_rate * 100).toFixed(1)}%` },
                    ],
                    delay: 0.3,
                  },
                  {
                    key: "jobs",
                    title: "Jobs & Playbooks",
                    status: health.cards.jobs.status as Status,
                    details: [
                      { label: "Jobs started", value: (health.cards.jobs.details.jobs_started || 0).toLocaleString() },
                      { label: "Jobs failed", value: (health.cards.jobs.details.jobs_failed || 0).toLocaleString() },
                    ],
                    delay: 0.4,
                  },
                ].map((card) => (
                  <motion.div
                    key={card.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: card.delay }}
                    className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{card.title}</h2>
                      <StatusPill status={card.status} />
                    </div>
                    <dl className="space-y-2">
                      {card.details.map((detail, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                          <dt className="text-sm text-slate-600 dark:text-slate-400">{detail.label}</dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-slate-50">{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </motion.div>
                ))}
              </section>

              {/* Trends placeholder */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">Trends</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bounce, verification, and reply rate over time
                  </p>
                </div>
                <div className="h-48 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                  Chart area – plug in Recharts / Chart.js here
                </div>
              </motion.section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
