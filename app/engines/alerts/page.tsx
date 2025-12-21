"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EnginesNav } from "@/components/engines/EnginesNav";
import { Bell } from "lucide-react";

const EVENT_OPTIONS = [
  "playbook_failed",
  "automation_failed",
  "template_overdue",
  "enrichment_failed",
];

export default function EngineAlertsPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>(["playbook_failed"]);

  const loadWebhooks = () => {
    apiClient
      .getEngineWebhooks()
      .then((data) => setWebhooks(data || []))
      .catch(() => setWebhooks([]));
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleToggleEvent = (event: string) => {
    setSelected((prev) =>
      prev.includes(event) ? prev.filter((item) => item !== event) : [...prev, event]
    );
  };

  const handleAddWebhook = async () => {
    if (!url.trim()) return;
    await apiClient.createEngineWebhook({ url: url.trim(), events: selected, enabled: true });
    setUrl("");
    setSelected(["playbook_failed"]);
    loadWebhooks();
  };

  const handleDelete = async (id: string) => {
    await apiClient.deleteEngineWebhook(id);
    loadWebhooks();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Engine Alerts"
        description="Configure failure alerts and webhook destinations"
        icon={Bell}
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <EnginesNav />
          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Create webhook</h3>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://hooks.example.com/leadflux"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
            />
            <div className="flex flex-wrap gap-2">
              {EVENT_OPTIONS.map((event) => (
                <button
                  key={event}
                  onClick={() => handleToggleEvent(event)}
                  className={`px-3 py-1.5 rounded-full text-[11px] border ${
                    selected.includes(event)
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                      : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {event.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <Button onClick={handleAddWebhook}>Add webhook</Button>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Configured webhooks</h3>
            {webhooks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No webhooks configured.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                {webhooks.map((hook) => (
                  <div key={hook.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-700 dark:text-slate-300">{hook.url}</p>
                      <p>{(hook.events || []).join(", ")}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(hook.id)}>
                      Remove
                    </Button>
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
