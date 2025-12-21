"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EnginesNav } from "@/components/engines/EnginesNav";
import { Activity } from "lucide-react";

export default function EngineAuditPage() {
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadAudit = () => {
    setLoading(true);
    apiClient
      .getEngineAudit()
      .then((data) => setAudit(data || []))
      .catch(() => setAudit([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return audit;
    const needle = query.trim().toLowerCase();
    return audit.filter((entry) => String(entry.message || "").toLowerCase().includes(needle));
  }, [audit, query]);

  const handleExport = async () => {
    const blob = await apiClient.exportEngineAudit();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `engine_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Engine Audit"
        description="Filter and export engine audit events"
        icon={Activity}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={loadAudit}>
              Refresh
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <EnginesNav />
          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by message..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
            />
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Events</h3>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading events...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No audit events found.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                {filtered.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">{entry.message}</span>
                    <span>{new Date(entry.time).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
