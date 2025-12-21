"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Sparkles, TrendingUp, Users, XCircle, Zap, Target, Activity as ActivityIcon } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatRelativeTime } from "@/lib/time";
import type { WorkspaceActivityItem } from "@/types/workspaceActivity";

const typeConfig: Record<
  string,
  { label: string; icon: typeof CheckCircle2; color: string }
> = {
  job_created: { label: "Job created", icon: ActivityIcon, color: "text-blue-500 bg-blue-500/10" },
  job_completed: { label: "Job completed", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  job_failed: { label: "Job failed", icon: XCircle, color: "text-rose-500 bg-rose-500/10" },
  lead_created: { label: "Lead created", icon: Users, color: "text-blue-500 bg-blue-500/10" },
  lead_updated: { label: "Lead updated", icon: Users, color: "text-slate-500 bg-slate-500/10" },
  lead_score_updated: { label: "Lead score updated", icon: Target, color: "text-cyan-500 bg-cyan-500/10" },
  email_found: { label: "Email found", icon: Mail, color: "text-indigo-500 bg-indigo-500/10" },
  email_verified: { label: "Email verified", icon: Mail, color: "text-cyan-500 bg-cyan-500/10" },
  campaign_sent: { label: "Campaign sent", icon: Zap, color: "text-purple-500 bg-purple-500/10" },
  campaign_event: { label: "Campaign event", icon: Sparkles, color: "text-amber-500 bg-amber-500/10" },
  playbook_run: { label: "Playbook run", icon: Sparkles, color: "text-purple-500 bg-purple-500/10" },
  playbook_completed: { label: "Playbook completed", icon: Sparkles, color: "text-emerald-500 bg-emerald-500/10" },
  list_created: { label: "List created", icon: Users, color: "text-blue-500 bg-blue-500/10" },
  list_marked_campaign_ready: { label: "List ready", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  task_created: { label: "Task created", icon: TrendingUp, color: "text-blue-500 bg-blue-500/10" },
  task_completed: { label: "Task completed", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  task_cancelled: { label: "Task cancelled", icon: XCircle, color: "text-rose-500 bg-rose-500/10" },
  note_added: { label: "Note added", icon: Sparkles, color: "text-slate-500 bg-slate-500/10" },
  deal_created: { label: "Deal created", icon: Target, color: "text-blue-500 bg-blue-500/10" },
  deal_stage_changed: { label: "Deal stage changed", icon: TrendingUp, color: "text-amber-500 bg-amber-500/10" },
  deal_won: { label: "Deal won", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  deal_lost: { label: "Deal lost", icon: XCircle, color: "text-rose-500 bg-rose-500/10" },
  member_invited: { label: "Member invited", icon: Users, color: "text-blue-500 bg-blue-500/10" },
  member_joined: { label: "Member joined", icon: Users, color: "text-emerald-500 bg-emerald-500/10" },
};

const fallbackType = {
  label: "Activity",
  icon: Sparkles,
  color: "text-slate-500 bg-slate-500/10",
};

const formatScoreDelta = (delta?: number | null) => {
  if (delta === null || delta === undefined) return null;
  if (delta === 0) return "no change";
  return `${delta > 0 ? "+" : ""}${delta}`;
};

const formatActivityMessage = (activity: WorkspaceActivityItem) => {
  const meta = activity.meta || {};
  switch (activity.type) {
    case "job_created":
      return meta.job_name ? `Job created: ${meta.job_name}` : "Job created";
    case "job_completed": {
      const jobName = meta.job_name || meta.niche || meta.job_title;
      const count = meta.total_leads || meta.result_count || meta.leads_count;
      if (jobName && count) return `Job "${jobName}" completed with ${count} leads`;
      if (jobName) return `Job "${jobName}" completed`;
      return "Job completed";
    }
    case "job_failed":
      return meta.error ? `Job failed: ${meta.error}` : "Job failed";
    case "lead_created":
      return meta.lead_name ? `Lead created: ${meta.lead_name}` : "Lead created";
    case "lead_updated":
      return meta.lead_name ? `Lead updated: ${meta.lead_name}` : "Lead updated";
    case "lead_score_updated": {
      const delta = formatScoreDelta(meta.delta);
      if (meta.new_score !== undefined && delta) {
        return `Lead score updated to ${meta.new_score} (${delta})`;
      }
      if (meta.new_score !== undefined) return `Lead score updated to ${meta.new_score}`;
      return "Lead score updated";
    }
    case "email_found":
      return meta.email ? `Email found: ${meta.email}` : "Email found";
    case "email_verified":
      return meta.email ? `Email verified: ${meta.email}` : "Email verified";
    case "campaign_sent":
      return meta.campaign_name ? `Campaign sent: ${meta.campaign_name}` : "Campaign sent";
    case "campaign_event": {
      const event = meta.event || meta.status || "update";
      const name = meta.campaign_name ? ` in ${meta.campaign_name}` : "";
      return `Campaign ${event}${name}`;
    }
    case "playbook_run":
      return meta.job_type ? `${meta.job_type} run started` : "Playbook run started";
    case "playbook_completed":
      return meta.job_type ? `${meta.job_type} completed` : "Playbook completed";
    case "list_created":
      return meta.list_name ? `List created: ${meta.list_name}` : "List created";
    case "list_marked_campaign_ready":
      return meta.list_name ? `List ready: ${meta.list_name}` : "List marked campaign ready";
    case "task_created":
      return meta.task_title ? `Task created: ${meta.task_title}` : "Task created";
    case "task_completed":
      return meta.task_title ? `Task completed: ${meta.task_title}` : "Task completed";
    case "task_cancelled":
      return meta.task_title ? `Task cancelled: ${meta.task_title}` : "Task cancelled";
    case "note_added":
      return meta.note_title ? `Note added: ${meta.note_title}` : "Note added";
    case "deal_created":
      return meta.deal_name ? `Deal created: ${meta.deal_name}` : "Deal created";
    case "deal_stage_changed":
      if (meta.deal_name && meta.new_stage) {
        return `Deal "${meta.deal_name}" moved to ${meta.new_stage}`;
      }
      return "Deal stage changed";
    case "deal_won":
      return meta.deal_name ? `Deal won: ${meta.deal_name}` : "Deal won";
    case "deal_lost":
      return meta.deal_name ? `Deal lost: ${meta.deal_name}` : "Deal lost";
    case "member_invited":
      return meta.email ? `Member invited: ${meta.email}` : "Member invited";
    case "member_joined":
      return meta.email ? `Member joined: ${meta.email}` : "Member joined";
    default:
      return `${typeConfig[activity.type]?.label || "Activity"} update`;
  }
};

const calculateCounts = (items: WorkspaceActivityItem[]) => {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<WorkspaceActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightMode, setInsightMode] = useState(false);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getWorkspaceActivity({ page: 1, page_size: 200 });
        setActivities(response.items || []);
      } catch (error) {
        console.error("Failed to load workspace activity:", error);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, []);

  const { grouped, anomalies } = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const recent = activities.filter((item) => new Date(item.created_at).getTime() >= now - oneDay);
    const previous = activities.filter((item) => {
      const time = new Date(item.created_at).getTime();
      return time < now - oneDay && time >= now - 2 * oneDay;
    });

    const recentCounts = calculateCounts(recent);
    const previousCounts = calculateCounts(previous);

    const groupedEntries = Object.entries(recentCounts)
      .map(([type, count]) => ({
        type,
        count,
        prev: previousCounts[type] || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const anomalyEntries = groupedEntries
      .map((entry) => {
        const delta = entry.count - entry.prev;
        const ratio = entry.prev > 0 ? entry.count / entry.prev : null;
        const spike = entry.prev === 0 ? entry.count >= 5 : ratio !== null && ratio >= 1.6 && delta >= 3;
        return { ...entry, delta, spike };
      })
      .filter((entry) => entry.spike)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3);

    return { grouped: groupedEntries, anomalies: anomalyEntries };
  }, [activities]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-4 flex-1">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          Insight mode
        </div>
        <button
          onClick={() => setInsightMode((value) => !value)}
          className="rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
        >
          {insightMode ? "Show feed" : "Show insights"}
        </button>
      </div>

      {insightMode ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {grouped.map((entry, index) => {
              const config = typeConfig[entry.type] || fallbackType;
              const Icon = config.icon;
              const delta = entry.count - entry.prev;
              return (
                <motion.div
                  key={entry.type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-3 bg-white/70 dark:bg-slate-900/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${config.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {config.label}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{entry.count}</div>
                  <div className={`text-[11px] ${delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta} vs prev 24h`}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 bg-white/70 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Anomaly signals
            </div>
            {anomalies.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No spikes detected in the last 24 hours.
              </p>
            ) : (
              <div className="space-y-2">
                {anomalies.map((entry) => {
                  const config = typeConfig[entry.type] || fallbackType;
                  return (
                    <div key={entry.type} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>{config.label} spike</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        +{entry.delta} vs prev 24h
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 12).map((activity, index) => {
            const config = typeConfig[activity.type] || fallbackType;
            const Icon = config.icon;
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors group"
              >
                <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                    {formatActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatRelativeTime(activity.created_at)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

