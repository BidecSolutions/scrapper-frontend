"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import type { Segment, SegmentLead } from "@/types/segments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Layers, ArrowLeft, Download, Search, Loader2, RefreshCw, Copy } from "lucide-react";

const PAGE_SIZE = 50;

export default function SegmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const segmentId = Number(params.id);

  const [segment, setSegment] = useState<Segment | null>(null);
  const [leads, setLeads] = useState<SegmentLead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [offset, setOffset] = useState(0);
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const loadSegment = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSegment(segmentId);
      setSegment(data);
      setSegmentError(null);
    } catch (error: any) {
      setSegmentError(error?.response?.data?.detail || "Failed to load segment.");
      showToast({
        type: "error",
        title: "Failed to load segment",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, [segmentId, showToast]);

  const loadLeads = useCallback(
    async (nextOffset: number, append: boolean) => {
      try {
        setLeadsLoading(true);
        const data = await apiClient.getSegmentLeads(segmentId, PAGE_SIZE, nextOffset);
        setLeads((prev) => (append ? [...prev, ...data.leads] : data.leads));
        setTotalLeads(data.total || data.leads.length);
        setOffset(nextOffset + data.leads.length);
        setLeadsError(null);
      } catch (error: any) {
        setLeadsError(error?.response?.data?.detail || "Failed to load leads.");
        showToast({
          type: "error",
          title: "Failed to load leads",
          message: error?.response?.data?.detail || "Please try again",
        });
      } finally {
        setLeadsLoading(false);
      }
    },
    [segmentId, showToast]
  );

  useEffect(() => {
    if (!segmentId) return;
    loadSegment();
    loadLeads(0, false);
  }, [segmentId, loadSegment, loadLeads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (minScore > 0 && (lead.quality_score || 0) < minScore) return false;
      if (!searchQuery.trim()) return true;
      const haystack = `${lead.name || ""} ${lead.contact_person_name || ""} ${lead.website || ""}`.toLowerCase();
      return haystack.includes(searchQuery.trim().toLowerCase());
    });
  }, [leads, minScore, searchQuery]);

  const avgScore =
    leads.length > 0
      ? Math.round(
          leads.reduce((sum, lead) => sum + (lead.quality_score || 0), 0) / leads.length
        )
      : 0;
  const highScore = leads.filter((lead) => (lead.quality_score || 0) >= 80).length;
  const mediumScore = leads.filter((lead) => (lead.quality_score || 0) >= 50 && (lead.quality_score || 0) < 80).length;
  const lowScore = leads.filter((lead) => (lead.quality_score || 0) < 50).length;
  const topSources = leads
    .map((lead) => lead.source || "unknown")
    .reduce((acc: Record<string, number>, source) => {
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
  const topSourceList = Object.entries(topSources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const insightSummary =
    avgScore >= 75
      ? "Strong segment with high-quality leads. Consider scaling outreach."
      : avgScore >= 55
      ? "Balanced segment. Improve targeting to lift top scores."
      : "Segment needs refinement. Tighten filters or enrich more fields.";

  const handleExport = () => {
    if (!filteredLeads.length) {
      showToast({
        type: "error",
        title: "No leads to export",
        message: "No leads match the current filters.",
      });
      return;
    }
    const headers = ["name", "contact", "role", "website", "score", "source"];
    const rows = [
      headers,
      ...filteredLeads.map((lead) => [
        lead.name || "",
        lead.contact_person_name || "",
        lead.contact_person_role || "",
        lead.website || "",
        String(lead.quality_score || 0),
        lead.source || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `segment_${segmentId}_leads.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyEmails = async () => {
    const emails = filteredLeads
      .map((lead) => lead.email)
      .filter((email): email is string => Boolean(email));
    if (emails.length === 0) {
      showToast({
        type: "info",
        title: "No emails found",
        message: "No emails available in the current filter.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(Array.from(new Set(emails)).join("\n"));
      showToast({
        type: "success",
        title: "Emails copied",
        message: `Copied ${emails.length} emails.`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Could not copy emails.",
      });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setMinScore(0);
  };

  if (loading && !segment) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push("/segments")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Segments
        </Button>
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm text-amber-100">
          Segment not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title={segment.name}
        description={segment.description || "Segment detail view and lead performance"}
        icon={Layers}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/segments")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {!leadsLoading && filteredLeads.length > 0 && (
              <>
                <Button variant="outline" onClick={handleCopyEmails}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy emails
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export filtered CSV
                </Button>
              </>
            )}
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {segmentError && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center justify-between">
              <span>{segmentError}</span>
              <Button variant="outline" size="sm" onClick={loadSegment}>
                Try again
              </Button>
            </div>
          )}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Leads</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{totalLeads}</p>
            </div>
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg. Score</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{avgScore}</p>
            </div>
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">High Score Leads</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{highScore}</p>
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <Input
                    label="Search leads"
                    icon={Search}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by name, contact, or website"
                    helperText="Press / to focus"
                    data-global-search="true"
                  />
                </div>
                <div>
                  <Input
                    label="Min score"
                    value={minScore.toString()}
                    onChange={(event) => setMinScore(Number(event.target.value || 0))}
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyEmails} disabled={filteredLeads.length === 0}>
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copy emails
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredLeads.length === 0}>
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Export filtered CSV
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">AI Insights</h3>
              <span className="text-[11px] uppercase tracking-wide text-cyan-500">Insight Mode</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Quality Mix</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  {highScore} high, {mediumScore} medium, {lowScore} low
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Top Sources</p>
                {topSourceList.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No sources yet</p>
                ) : (
                  <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {topSourceList.map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between">
                        <span className="capitalize">{source.replace(/_/g, " ")}</span>
                        <span className="text-slate-500 dark:text-slate-400">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Recommendation</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{insightSummary}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200/50 dark:border-slate-800/50 text-sm text-slate-600 dark:text-slate-400">
              Leads ({filteredLeads.length})
            </div>
            {leadsError && (
              <div className="p-4 border-b border-rose-500/30 bg-rose-500/10 text-sm text-rose-100 flex items-center justify-between">
                <span>{leadsError}</span>
                <Button variant="outline" size="sm" onClick={() => loadLeads(0, false)}>
                  Try again
                </Button>
              </div>
            )}
            {leadsLoading && leads.length === 0 ? (
              <div className="p-6">
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`segment-lead-skeleton-${index}`}
                      className="h-10 rounded-xl bg-slate-200/70 dark:bg-slate-800/60"
                    />
                  ))}
                </div>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No leads match your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr className="text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3 text-left font-medium">Lead</th>
                      <th className="px-4 py-3 text-left font-medium">Contact</th>
                      <th className="px-4 py-3 text-left font-medium">Website</th>
                      <th className="px-4 py-3 text-right font-medium">Score</th>
                      <th className="px-4 py-3 text-left font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-50">
                            {lead.name || "Unnamed lead"}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">#{lead.id}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {lead.contact_person_name || "-"}
                          {lead.contact_person_role ? `, ${lead.contact_person_role}` : ""}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {lead.website || "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {lead.quality_score ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {lead.source || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {offset < totalLeads && (
              <div className="px-5 py-4 border-t border-slate-200/50 dark:border-slate-800/50">
                <Button variant="outline" onClick={() => loadLeads(offset, true)} disabled={leadsLoading}>
                  {leadsLoading ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
