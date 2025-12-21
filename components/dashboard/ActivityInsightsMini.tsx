"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import type { WorkspaceActivityItem } from "@/types/workspaceActivity";

const formatLabel = (value: string) => {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function ActivityInsightsMini() {
  const [items, setItems] = useState<WorkspaceActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.getWorkspaceActivity({ page: 1, page_size: 120 });
        setItems(res.items || []);
      } catch (error) {
        console.error("Failed to load activity insights:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const { topTypes, topActors } = useMemo(() => {
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    const recent = items.filter((item) => new Date(item.created_at).getTime() >= now - windowMs);

    const typeCounts = recent.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    const actorCounts = recent.reduce<Record<string, number>>((acc, item) => {
      const key = item.actor_user_id ? `User #${item.actor_user_id}` : "System";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topTypesList = Object.entries(typeCounts)
      .map(([type, count]) => ({ label: formatLabel(type), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topActorsList = Object.entries(actorCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { topTypes: topTypesList, topActors: topActorsList };
  }, [items]);

  if (loading) {
    return (
      <div className="text-xs text-slate-500 dark:text-slate-400">Loading insights...</div>
    );
  }

  if (topTypes.length === 0 && topActors.length === 0) {
    return (
      <div className="text-xs text-slate-500 dark:text-slate-400">
        No recent activity to summarize.
      </div>
    );
  }

  const maxType = Math.max(...topTypes.map((entry) => entry.count), 1);
  const maxActor = Math.max(...topActors.map((entry) => entry.count), 1);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Top activity types (24h)
        </div>
        <div className="space-y-2">
          {topTypes.map((entry) => (
            <div key={entry.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{entry.label}</span>
                <span className="text-slate-700 dark:text-slate-200 font-semibold">{entry.count}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${Math.round((entry.count / maxType) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Top actors (24h)
        </div>
        <div className="space-y-2">
          {topActors.map((entry) => (
            <div key={entry.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{entry.label}</span>
                <span className="text-slate-700 dark:text-slate-200 font-semibold">{entry.count}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${Math.round((entry.count / maxActor) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
