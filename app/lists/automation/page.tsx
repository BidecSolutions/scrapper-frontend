"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { apiClient } from "@/lib/api";
import { Zap, Shield, Plus, Trash2, Sparkles } from "lucide-react";

export default function ListsAutomationPage() {
  const { showToast } = useToast();
  const [ruleName, setRuleName] = useState("High quality leads");
  const [autoSync, setAutoSync] = useState(true);
  const [notify, setNotify] = useState(true);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conditions, setConditions] = useState([
    { field: "score", operator: ">=", value: "80" },
  ]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"hourly" | "daily">("hourly");
  const [scheduleInterval, setScheduleInterval] = useState(60);
  const [scheduleHour, setScheduleHour] = useState(9);
  const [auditLog, setAuditLog] = useState<Array<{ id: string; message: string; time: string }>>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [engineSummary, setEngineSummary] = useState<any | null>(null);
  const [engineAudit, setEngineAudit] = useState<any[]>([]);

  const rulePresets = [
    {
      name: "High score + LinkedIn",
      conditions: [
        { field: "score", operator: ">=", value: "80" },
        { field: "source", operator: "equals", value: "linkedin_extension" },
      ],
    },
    {
      name: "Tag: priority",
      conditions: [{ field: "tag", operator: "contains", value: "priority" }],
    },
    {
      name: "City list",
      conditions: [{ field: "city", operator: "contains", value: "new york" }],
    },
  ];

  const operatorOptions = useMemo(() => {
    return {
      score: [">=", "<=", "="],
      source: ["equals", "contains"],
      tag: ["equals", "contains"],
      city: ["equals", "contains"],
      country: ["equals", "contains"],
    };
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getListAutomationRules();
      setRules(data || []);
    } catch (error) {
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("leadflux_list_automation_audit");
      const parsed = stored ? JSON.parse(stored) : [];
      setAuditLog(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAuditLog([]);
    }
    const storedError = localStorage.getItem("leadflux_list_automation_error");
    setLastError(storedError || null);
    apiClient
      .getListAutomationAudit()
      .then((data) => setEngineAudit(data || []))
      .catch(() => setEngineAudit([]));
  }, []);

  const handleSave = async () => {
    if (!ruleName.trim()) {
      showToast({
        type: "error",
        title: "Missing name",
        message: "Rule name cannot be empty.",
      });
      return;
    }

    try {
      setSaving(true);
      const minScore = conditions.find((cond) => cond.field === "score" && cond.operator === ">=")?.value || "0";
      await apiClient.createListAutomationRule({
        name: ruleName.trim(),
        min_score: Number(minScore) || 0,
        auto_sync: autoSync,
        notify,
        conditions,
        schedule: {
          mode: scheduleMode,
          interval_minutes: scheduleInterval,
          hour_utc: scheduleHour,
        },
      });
      showToast({
        type: "success",
        title: "Rule saved",
        message: "Automation rule created.",
      });
      setRuleName("High quality leads");
      setAutoSync(true);
      setNotify(true);
      setConditions([{ field: "score", operator: ">=", value: "80" }]);
      setScheduleMode("hourly");
      setScheduleInterval(60);
      setScheduleHour(9);
      const entry = {
        id: `${Date.now()}`,
        message: `Created rule "${ruleName.trim()}"`,
        time: new Date().toISOString(),
      };
      setAuditLog((prev) => {
        const next = [entry, ...prev].slice(0, 12);
        localStorage.setItem("leadflux_list_automation_audit", JSON.stringify(next));
        return next;
      });
      await loadRules();
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to save rule.";
      showToast({
        type: "error",
        title: "Save failed",
        message,
      });
      setLastError(message);
      localStorage.setItem("leadflux_list_automation_error", message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCondition = () => {
    setConditions((prev) => [...prev, { field: "score", operator: ">=", value: "0" }]);
  };

  const handlePreset = (presetIndex: number) => {
    const preset = rulePresets[presetIndex];
    setRuleName(preset.name);
    setConditions(preset.conditions);
  };

  const handleUpdateCondition = (index: number, next: { field: string; operator: string; value: string }) => {
    setConditions((prev) => prev.map((cond, idx) => (idx === index ? next : cond)));
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePreview = async () => {
    try {
      setPreviewLoading(true);
      const filters: Record<string, any> = {};
      const minScore = conditions.find((cond) => cond.field === "score" && cond.operator === ">=")?.value;
      const maxScore = conditions.find((cond) => cond.field === "score" && cond.operator === "<=")?.value;
      const source = conditions.find((cond) => cond.field === "source")?.value;
      if (minScore) filters.min_score = minScore;
      if (maxScore) filters.max_score = maxScore;
      if (source) filters.source = source;
      let data = await apiClient.getLeads(undefined, filters);
      conditions.forEach((cond) => {
        const value = String(cond.value || "").toLowerCase();
        if (!value) return;
        const isExact = cond.operator === "equals";
        if (cond.field === "tag") {
          data = data.filter((lead) =>
            (lead.tags || []).some((tag) =>
              isExact ? tag.toLowerCase() === value : tag.toLowerCase().includes(value)
            )
          );
        }
        if (cond.field === "city") {
          data = data.filter((lead) =>
            isExact ? (lead.city || "").toLowerCase() === value : (lead.city || "").toLowerCase().includes(value)
          );
        }
        if (cond.field === "country") {
          data = data.filter((lead) =>
            isExact ? (lead.country || "").toLowerCase() === value : (lead.country || "").toLowerCase().includes(value)
          );
        }
      });
      setPreviewCount(data.length);
      const entry = {
        id: `${Date.now()}`,
        message: `Previewed matches (${data.length})`,
        time: new Date().toISOString(),
      };
      setAuditLog((prev) => {
        const next = [entry, ...prev].slice(0, 12);
        localStorage.setItem("leadflux_list_automation_audit", JSON.stringify(next));
        return next;
      });
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to preview matching leads.";
      showToast({
        type: "error",
        title: "Preview failed",
        message,
      });
      setLastError(message);
      localStorage.setItem("leadflux_list_automation_error", message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (ruleId: number) => {
    try {
      await apiClient.deleteListAutomationRule(ruleId);
      showToast({
        type: "success",
        title: "Rule deleted",
        message: "Automation rule removed.",
      });
      const entry = {
        id: `${Date.now()}`,
        message: `Deleted rule ${ruleId}`,
        time: new Date().toISOString(),
      };
      setAuditLog((prev) => {
        const next = [entry, ...prev].slice(0, 12);
        localStorage.setItem("leadflux_list_automation_audit", JSON.stringify(next));
        return next;
      });
      await loadRules();
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to delete rule.";
      showToast({
        type: "error",
        title: "Delete failed",
        message,
      });
      setLastError(message);
      localStorage.setItem("leadflux_list_automation_error", message);
    }
  };

  const handleRunEngine = async () => {
    try {
      const summary = await apiClient.runListAutomationEngine();
      setEngineSummary(summary);
      const data = await apiClient.getListAutomationAudit();
      setEngineAudit(data || []);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Engine run failed",
        message: error?.response?.data?.detail || "Failed to run automation engine.",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="List Automation"
        description="Build rules to auto-sync leads into lists"
        icon={Zap}
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Create rule</h3>
            <Input label="Rule name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Rule templates</p>
              <div className="flex flex-wrap gap-2">
                {rulePresets.map((preset, index) => (
                  <Button key={preset.name} variant="outline" size="sm" onClick={() => handlePreset(index)}>
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Conditions</h4>
                <Button variant="ghost" size="sm" onClick={handleAddCondition}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add condition
                </Button>
              </div>
              <div className="space-y-3">
                {conditions.map((condition, index) => {
                  const ops = operatorOptions[condition.field as keyof typeof operatorOptions] || operatorOptions.score;
                  return (
                    <div
                      key={`${condition.field}-${index}`}
                      className="flex flex-col gap-2 md:flex-row md:items-center"
                    >
                      <select
                        value={condition.field}
                        onChange={(e) =>
                          handleUpdateCondition(index, {
                            field: e.target.value,
                            operator: operatorOptions[e.target.value as keyof typeof operatorOptions]?.[0] || ">=",
                            value: condition.value,
                          })
                        }
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <option value="score">Score</option>
                        <option value="source">Source</option>
                        <option value="tag">Tag</option>
                        <option value="city">City</option>
                        <option value="country">Country</option>
                      </select>
                      <select
                        value={condition.operator}
                        onChange={(e) => handleUpdateCondition(index, { ...condition, operator: e.target.value })}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
                      >
                        {ops.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                      <input
                        value={condition.value}
                        onChange={(e) => handleUpdateCondition(index, { ...condition, value: e.target.value })}
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
                        placeholder="Value"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-500"
                        onClick={() => handleRemoveCondition(index)}
                        disabled={conditions.length === 1}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Schedule</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setScheduleMode("hourly")}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${
                    scheduleMode === "hourly"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                      : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Hourly
                </button>
                <button
                  onClick={() => setScheduleMode("daily")}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${
                    scheduleMode === "daily"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                      : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Daily
                </button>
              </div>
              {scheduleMode === "hourly" ? (
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <span>Interval (min)</span>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    value={scheduleInterval}
                    onChange={(e) => setScheduleInterval(Number(e.target.value || 60))}
                    className="w-24 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <span>Run hour (UTC)</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={scheduleHour}
                    onChange={(e) => setScheduleHour(Number(e.target.value || 9))}
                    className="w-24 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1"
                  />
                </div>
              )}
            </div>
            <Checkbox
              label="Auto-sync to list"
              description="Automatically add leads that match the rule"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
            />
            <Checkbox
              label="Notify on changes"
              description="Send notifications when leads match the rule"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />
            <Button onClick={handleSave} disabled={saving}>
              <Plus className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save rule"}
            </Button>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Dry-run preview</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Preview how many leads match the current conditions before saving.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? "Checking..." : "Preview matches"}
              </Button>
              {previewCount !== null && (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {previewCount} leads match
                </span>
              )}
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Automation audit log</h3>
            {auditLog.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No audit entries yet.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">{entry.message}</span>
                    <span>{new Date(entry.time).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {lastError && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                Last error: {lastError}
              </div>
            )}
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Engine run</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Trigger a manual rule evaluation and see a summary.
            </p>
            <Button variant="outline" onClick={handleRunEngine}>
              Run automation engine
            </Button>
            {engineSummary && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Ran {engineSummary.total_rules} rules, {engineSummary.matched_total} matches at{" "}
                {new Date(engineSummary.ran_at).toLocaleString()}
              </div>
            )}
            {engineAudit.length > 0 && (
              <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                {engineAudit.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between">
                    <span>{entry.message}</span>
                    <span>{new Date(entry.time).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Active rules
            </h3>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading rules...</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No automation rules yet.</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{rule.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {rule.conditions?.length ? `${rule.conditions.length} conditions` : `Min score ${rule.min_score}`}
                        {" "}| Auto-sync {rule.auto_sync ? "on" : "off"} | Notify {rule.notify ? "on" : "off"}
                        {rule.schedule?.mode ? ` | ${rule.schedule.mode}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-500 hover:text-rose-600"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">How it works</h3>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
              <li>Rules check new leads every hour and tag matching records.</li>
              <li>Auto-sync adds them to the target list and updates totals.</li>
              <li>Notifications summarize new matches for review.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

