"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import type { Template } from "@/types/templates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3 } from "lucide-react";

export default function TemplatesAnalyticsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareLeftId, setCompareLeftId] = useState<number | null>(null);
  const [compareRightId, setCompareRightId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .getTemplates()
      .then((res) => {
        if (!active) return;
        setTemplates(res.items as Template[]);
      })
      .catch(() => {
        if (!active) return;
        setTemplates([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (templates.length >= 2) {
      setCompareLeftId(templates[0].id);
      setCompareRightId(templates[1].id);
    } else if (templates.length === 1) {
      setCompareLeftId(templates[0].id);
      setCompareRightId(null);
    }
  }, [templates]);

  const performance = useMemo(() => {
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const estimate = (tpl: Template) => {
      const subjectLength = (tpl.subject || "").length;
      const bodyLength = (tpl.body || "").length;
      const hasToken = /{{\s*\w+\s*}}/.test(tpl.subject || "") || /{{\s*\w+\s*}}/.test(tpl.body || "");
      let openRate = 18;
      if (subjectLength >= 15 && subjectLength <= 45) openRate += 6;
      if (hasToken) openRate += 4;
      if (bodyLength > 900) openRate -= 3;
      openRate = clamp(openRate, 8, 60);
      const clickRate = clamp(openRate * 0.25, 2, 30);
      const replyRate = clamp(openRate * 0.09, 1, 20);
      return {
        subjectLength,
        bodyLength,
        hasToken,
        openRate,
        clickRate,
        replyRate,
      };
    };
    return templates.reduce<Record<number, ReturnType<typeof estimate>>>((acc, tpl) => {
      acc[tpl.id] = estimate(tpl);
      return acc;
    }, {});
  }, [templates]);

  const aggregateRates = useMemo(() => {
    const values = Object.values(performance);
    if (values.length === 0) {
      return { open: 0, click: 0, reply: 0 };
    }
    const sum = values.reduce(
      (acc, item) => {
        acc.open += item.openRate;
        acc.click += item.clickRate;
        acc.reply += item.replyRate;
        return acc;
      },
      { open: 0, click: 0, reply: 0 }
    );
    return {
      open: Math.round(sum.open / values.length),
      click: Math.round(sum.click / values.length),
      reply: Math.round(sum.reply / values.length),
    };
  }, [performance]);

  const handleExportCsv = () => {
    if (templates.length === 0) return;
    const headers = [
      "id",
      "name",
      "status",
      "kind",
      "subject_length",
      "body_length",
      "has_personalization",
      "est_open_rate",
      "est_click_rate",
      "est_reply_rate",
      "updated_at",
    ];
    const rows = templates.map((tpl) => {
      const perf = performance[tpl.id];
      return [
        tpl.id,
        tpl.name,
        tpl.status,
        tpl.kind,
        perf?.subjectLength || 0,
        perf?.bodyLength || 0,
        perf?.hasToken ? "yes" : "no",
        Math.round(perf?.openRate || 0),
        Math.round(perf?.clickRate || 0),
        Math.round(perf?.replyRate || 0),
        tpl.updated_at,
      ];
    });
    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `template_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    let bodyLength = 0;
    let subjectLength = 0;
    let bodyCount = 0;
    let subjectCount = 0;
    let personalizationCount = 0;
    const tokenPattern = /{{\s*\w+\s*}}/;
    templates.forEach((tpl) => {
      byStatus[tpl.status] = (byStatus[tpl.status] || 0) + 1;
      byKind[tpl.kind] = (byKind[tpl.kind] || 0) + 1;
      (tpl.tags || []).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      let hasToken = false;
      if (tpl.body) {
        bodyLength += tpl.body.length;
        bodyCount += 1;
        if (tokenPattern.test(tpl.body)) {
          hasToken = true;
        }
      }
      if (tpl.subject) {
        subjectLength += tpl.subject.length;
        subjectCount += 1;
        if (tokenPattern.test(tpl.subject)) {
          hasToken = true;
        }
      }
      if (hasToken) {
        personalizationCount += 1;
      }
    });
    return {
      total: templates.length,
      byStatus,
      byKind,
      topTags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
      avgBodyLength: bodyCount > 0 ? Math.round(bodyLength / bodyCount) : 0,
      avgSubjectLength: subjectCount > 0 ? Math.round(subjectLength / subjectCount) : 0,
      personalizationCount,
    };
  }, [templates]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Template Analytics"
        description="Overview of template usage, statuses, and content mix"
        icon={BarChart3}
        action={
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={templates.length === 0}>
            Export CSV
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-8 text-center text-slate-500 dark:text-slate-400">
              Loading analytics...
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total templates</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{stats.total}</p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Approved</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-500">
                    {stats.byStatus.approved || 0}
                  </p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-500">
                    {stats.byStatus.pending_approval || 0}
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Status breakdown</h3>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    {Object.entries(stats.byStatus).length === 0 && (
                      <p>No templates yet.</p>
                    )}
                    {Object.entries(stats.byStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="capitalize">{status.replace("_", " ")}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-50">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Kind mix</h3>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    {Object.entries(stats.byKind).length === 0 && (
                      <p>No templates yet.</p>
                    )}
                    {Object.entries(stats.byKind).map(([kind, count]) => (
                      <div key={kind} className="flex items-center justify-between">
                        <span className="capitalize">{kind.replace("_", " ")}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-50">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Top tags</h3>
                {stats.topTags.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No tags yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {stats.topTags.map(([tag, count]) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30"
                      >
                        {tag} ({count})
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg body length</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {stats.avgBodyLength} chars
                  </p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg subject length</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {stats.avgSubjectLength} chars
                  </p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Personalized templates</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {stats.personalizationCount}
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Est. open rate</p>
                  <p className="mt-2 text-2xl font-semibold text-cyan-500">{aggregateRates.open}%</p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Est. click rate</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-500">{aggregateRates.click}%</p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Est. reply rate</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-500">{aggregateRates.reply}%</p>
                </div>
              </section>

              <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">A/B comparison</h3>
                {templates.length < 2 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Add at least two templates to compare.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <select
                        value={compareLeftId ?? ""}
                        onChange={(e) => setCompareLeftId(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={compareRightId ?? ""}
                        onChange={(e) => setCompareRightId(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[compareLeftId, compareRightId].map((id, index) => {
                        const tpl = templates.find((item) => item.id === id);
                        if (!tpl) return null;
                        const perf = performance[tpl.id];
                        return (
                          <div
                            key={tpl.id}
                            className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 p-4"
                          >
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Variant {index === 0 ? "A" : "B"}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{tpl.name}</p>
                            <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                              <p>Status: <span className="text-slate-900 dark:text-slate-200">{tpl.status}</span></p>
                              <p>Subject length: {perf.subjectLength} chars</p>
                              <p>Body length: {perf.bodyLength} chars</p>
                              <p>Personalization: {perf.hasToken ? "Yes" : "No"}</p>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                              <div className="rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 px-2 py-2">
                                Open {Math.round(perf.openRate)}%
                              </div>
                              <div className="rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 px-2 py-2">
                                Click {Math.round(perf.clickRate)}%
                              </div>
                              <div className="rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300 px-2 py-2">
                                Reply {Math.round(perf.replyRate)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Rates are estimated from template structure for quick comparison.
                    </p>
                  </>
                )}
              </section>

              <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Recent templates</h3>
                {templates.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No templates yet.</p>
                ) : (
                  <div className="space-y-3">
                    {templates.slice(0, 5).map((tpl) => (
                      <div key={tpl.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-900 dark:text-slate-50 font-medium">{tpl.name}</span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {new Date(tpl.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Performance table</h3>
                {templates.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No templates yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-slate-600 dark:text-slate-300">
                      <thead className="text-[11px] uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="text-left py-2 pr-4">Name</th>
                          <th className="text-left py-2 pr-4">Status</th>
                          <th className="text-left py-2 pr-4">Kind</th>
                          <th className="text-left py-2 pr-4">Open</th>
                          <th className="text-left py-2 pr-4">Click</th>
                          <th className="text-left py-2 pr-4">Reply</th>
                          <th className="text-left py-2 pr-4">Personalized</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                        {templates.slice(0, 10).map((tpl) => {
                          const perf = performance[tpl.id];
                          return (
                            <tr key={tpl.id}>
                              <td className="py-2 pr-4 text-slate-900 dark:text-slate-50">{tpl.name}</td>
                              <td className="py-2 pr-4 capitalize">{tpl.status.replace("_", " ")}</td>
                              <td className="py-2 pr-4 capitalize">{tpl.kind.replace("_", " ")}</td>
                              <td className="py-2 pr-4">{Math.round(perf?.openRate || 0)}%</td>
                              <td className="py-2 pr-4">{Math.round(perf?.clickRate || 0)}%</td>
                              <td className="py-2 pr-4">{Math.round(perf?.replyRate || 0)}%</td>
                              <td className="py-2 pr-4">{perf?.hasToken ? "Yes" : "No"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
