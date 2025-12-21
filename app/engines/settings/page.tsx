"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EnginesNav } from "@/components/engines/EnginesNav";
import { Settings } from "lucide-react";

export default function EngineSettingsPage() {
  const [settings, setSettings] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .getEngineSettings()
      .then((data) => setSettings(data))
      .catch(() => setSettings(null));
  }, []);

  const handleToggle = (key: string) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const updated = await apiClient.updateEngineSettings(settings);
    setSettings(updated);
    setSaving(false);
  };

  if (!settings) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <PageHeader title="Engine Settings" description="Configure engine behavior per workspace" icon={Settings} />
        <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
          <div className="max-w-4xl mx-auto text-sm text-slate-500 dark:text-slate-400">Loading settings...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader title="Engine Settings" description="Configure engine behavior per workspace" icon={Settings} />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <EnginesNav />
          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            {[
              { key: "playbooks_enabled", label: "Playbooks engine" },
              { key: "list_automation_enabled", label: "List automation engine" },
              { key: "templates_governance_enabled", label: "Templates governance engine" },
              { key: "enrichment_enabled", label: "Enrichment engine" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                  settings[item.key]
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-500"
                }`}
              >
                <span>{item.label}</span>
                <span>{settings[item.key] ? "Enabled" : "Disabled"}</span>
              </button>
            ))}
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-3">
            <label className="text-xs text-slate-500 dark:text-slate-400">Worker concurrency</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.worker_concurrency || 1}
              onChange={(event) => setSettings({ ...settings, worker_concurrency: Number(event.target.value || 1) })}
              className="w-32 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
            />
          </section>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </main>
    </div>
  );
}
