"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { Template, TemplateStatus } from "@/types/templates";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Lock, FileText, CheckCircle2, XCircle, Clock, Loader2, Search } from "lucide-react";
import { MetricCard } from "@/components/ui/metrics";
import { Input } from "@/components/ui/Input";

type TabKey = "all" | "draft" | "pending" | "approved";

const STATUS_LABELS: Record<TemplateStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
  deprecated: "Deprecated",
  rejected: "Rejected",
};

function StatusBadge({ status }: { status: TemplateStatus }) {
  const map: Record<TemplateStatus, string> = {
    draft: "bg-slate-500/15 text-slate-300 border border-slate-400/60",
    pending_approval: "bg-amber-500/15 text-amber-300 border border-amber-400/60",
    approved: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/60",
    deprecated: "bg-slate-600/50 text-slate-400 border border-slate-600",
    rejected: "bg-rose-500/15 text-rose-300 border border-rose-400/60",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status] || map.draft}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 border border-slate-800 px-6 py-10 flex flex-col items-center text-center"
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/40 mb-4">
        <FileText className="w-6 h-6 text-indigo-400" />
      </div>

      <h2 className="text-lg font-semibold mb-1 text-slate-100">No templates yet</h2>
      <p className="text-xs text-slate-400 max-w-md mb-6">
        Create your first template to keep messaging consistent across your
        team. Save proven cold emails, follow-ups, and nurture sequences in one
        shared library.
      </p>

      {/* 3 small benefit cards */}
      <div className="grid gap-4 sm:grid-cols-3 text-left w-full max-w-3xl mb-8">
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <p className="text-[11px] font-semibold text-slate-200 mb-1">
            1. Save best-performing copy
          </p>
          <p className="text-[11px] text-slate-400">
            Turn winning emails into reusable templates instead of rewriting
            from scratch.
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <p className="text-[11px] font-semibold text-slate-200 mb-1">
            2. Control approvals
          </p>
          <p className="text-[11px] text-slate-400">
            Mark templates as draft, pending, or approved to keep content
            on-brand.
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <p className="text-[11px] font-semibold text-slate-200 mb-1">
            3. Power AI suggestions
          </p>
          <p className="text-[11px] text-slate-400">
            Let AI learn from your library to suggest the right template for
            each segment.
          </p>
        </div>
      </div>

      <button
        onClick={onCreateClick}
        className="inline-flex items-center rounded-lg bg-indigo-500 hover:bg-indigo-400 text-xs font-medium px-5 py-2.5 shadow-sm transition-colors"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Create First Template
      </button>
    </motion.section>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getVersionLabel(template: Template): string {
  const createdAt = new Date(template.created_at).getTime();
  const updatedAt = new Date(template.updated_at).getTime();
  const diffMinutes = Math.floor((updatedAt - createdAt) / (1000 * 60));
  return diffMinutes > 5 ? "v2" : "v1";
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | Template["kind"]>("all");
  const [previewMode, setPreviewMode] = useState<"off" | "subject" | "full">("off");
  const [governance, setGovernance] = useState<any | null>(null);
  const slaHours = 24;
  const [slaMetrics, setSlaMetrics] = useState<{ pending: number; overdue: number } | null>(null);

  const metrics = {
    total: templates.length,
    draft: templates.filter((t) => t.status === "draft").length,
    pending: templates.filter((t) => t.status === "pending_approval").length,
    approved: templates.filter((t) => t.status === "approved").length,
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeTab !== "all") {
        if (activeTab === "pending") {
          params.status = "pending_approval";
        } else {
          params.status = activeTab;
        }
      }
      const res = await apiClient.getTemplates(params);
      setTemplates(res.items);
      setLoadError(null);
    } catch (err) {
      console.error("Error loading templates:", err);
      setLoadError("Failed to load templates. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    apiClient
      .getTemplateGovernance()
      .then((res) => {
        if (!active) return;
        setGovernance(res);
      })
      .catch(() => {
        if (!active) return;
        setGovernance(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    apiClient
      .getTemplateSla(slaHours)
      .then((res) => {
        if (!active) return;
        setSlaMetrics({ pending: res.pending, overdue: res.overdue });
      })
      .catch(() => {
        if (!active) return;
        setSlaMetrics(null);
      });
    return () => {
      active = false;
    };
  }, [slaHours]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
  };

  async function handleApprove(templateId: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await apiClient.approveTemplate(templateId);
      load();
    } catch (err) {
      console.error("Error approving template:", err);
      alert("Failed to approve template");
    }
  }

  async function handleReject(templateId: number, e: React.MouseEvent) {
    e.stopPropagation();
    const reason = prompt("Rejection reason (optional):");
    try {
      await apiClient.rejectTemplate(templateId, reason || undefined);
      load();
    } catch (err) {
      console.error("Error rejecting template:", err);
      alert("Failed to reject template");
    }
  }

  const hasTemplates = templates.length > 0;
  const filteredTemplates = templates.filter((template) => {
    if (kindFilter !== "all" && template.kind !== kindFilter) {
      return false;
    }
    if (!searchQuery.trim()) {
      return true;
    }
    const haystack = `${template.name} ${template.description || ""} ${template.kind}`.toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  });

  const pendingTemplates = templates.filter((t) => t.status === "pending_approval");
  const overduePending = pendingTemplates.filter((template) => {
    const ageHours = (Date.now() - new Date(template.created_at).getTime()) / (1000 * 60 * 60);
    return ageHours >= slaHours;
  });
  const pendingCount = slaMetrics ? slaMetrics.pending : pendingTemplates.length;
  const overdueCount = slaMetrics ? slaMetrics.overdue : overduePending.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Template Library
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage email templates, approvals, and content governance
            </p>
          </div>

          <button
            onClick={() => router.push("/templates/new")}
            className="inline-flex items-center rounded-lg bg-indigo-500 hover:bg-indigo-400 text-xs font-medium px-4 py-2 shadow-sm text-white transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Template
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-10 space-y-6">
        {loadError && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center justify-between">
            <span>{loadError}</span>
            <button
              onClick={() => load()}
              className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-100 hover:bg-rose-500/20"
            >
              Try again
            </button>
          </div>
        )}
        {/* Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <MetricCard label="Total Templates" value={metrics.total} />
          <MetricCard label="Draft" value={metrics.draft} tone="default" />
          <MetricCard label="Pending" value={metrics.pending} tone="info" />
          <MetricCard label="Approved" value={metrics.approved} tone="success" />
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">Governance alerts</h3>
            {governance ? (
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div>
                  Approval required:{" "}
                  <span className="text-slate-900 dark:text-slate-200">
                    {governance.require_approval_for_new_templates ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  Approved-only mode:{" "}
                  <span className="text-slate-900 dark:text-slate-200">
                    {governance.restrict_to_approved_only ? "On" : "Off"}
                  </span>
                </div>
                {metrics.pending > 0 && (
                  <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-700 dark:text-amber-200">
                    {metrics.pending} templates waiting for approval.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Governance settings unavailable.</p>
            )}
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">Approval SLA</h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div>
                SLA target:{" "}
                <span className="text-slate-900 dark:text-slate-200">{slaHours} hours</span>
              </div>
              <div>
                Pending approvals:{" "}
                <span className="text-slate-900 dark:text-slate-200">{pendingCount}</span>
              </div>
              <div>
                Overdue approvals:{" "}
                <span className="text-rose-600 dark:text-rose-300">{overdueCount}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                label="Search templates"
                icon={Search}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, description, or kind"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "email", "subject", "sequence_step"] as const).map((kind) => (
                <button
                  key={kind}
                  onClick={() => setKindFilter(kind)}
                  className={`px-3 py-2 rounded-full text-[11px] font-medium border transition-colors ${
                    kindFilter === kind
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/40"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-400/60"
                  }`}
                >
                  {kind === "all" ? "All kinds" : kind.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              {(["off", "subject", "full"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    previewMode === mode
                      ? "bg-slate-900 text-slate-100 border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                  }`}
                >
                  Preview: {mode === "off" ? "Off" : mode === "subject" ? "Subject" : "Full"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4">
          <nav className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 pb-2">
            {[
              { key: "all" as TabKey, label: "All", icon: FileText },
              { key: "draft" as TabKey, label: "Draft", icon: FileText },
              { key: "pending" as TabKey, label: "Pending", icon: Clock },
              { key: "approved" as TabKey, label: "Approved", icon: CheckCircle2 },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`inline-flex items-center gap-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.key
                      ? "border-indigo-400 text-slate-900 dark:text-slate-50"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading templates...
          </div>
        ) : hasTemplates ? (
          // Templates table
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Kind</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Tags</th>
                    <th className="px-4 py-3 text-left font-medium">Version</th>
                    <th className="px-4 py-3 text-left font-medium">Updated</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        No templates match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTemplates.map((template) => (
                      <Fragment key={template.id}>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors cursor-pointer"
                          onClick={() => router.push(`/templates/${template.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                              {template.name}
                              {template.locked && (
                                <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              )}
                            </div>
                            {template.description && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {template.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-700 dark:text-slate-300 capitalize">{template.kind}</span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={template.status as TemplateStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {template.tags && template.tags.length > 0 ? (
                                template.tags.map((tag, tagIdx) => (
                                  <span
                                    key={tagIdx}
                                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px]"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 text-[10px]">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                              {getVersionLabel(template)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {formatDate(template.updated_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => router.push(`/templates/${template.id}`)}
                                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                              >
                                View
                              </button>
                              {template.status === "pending_approval" && (
                                <>
                                  <button
                                    onClick={(e) => handleApprove(template.id, e)}
                                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={(e) => handleReject(template.id, e)}
                                    className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                        {previewMode !== "off" && (
                          <tr className="bg-slate-50 dark:bg-slate-900/60">
                            <td colSpan={7} className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-400">
                              {previewMode === "subject" ? (
                                <span>
                                  Subject: {template.subject || "No subject set"}
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <div>
                                    <span className="font-semibold">Subject:</span>{" "}
                                    {template.subject || "No subject set"}
                                  </div>
                                  <div className="text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold">Body:</span>{" "}
                                    {template.body ? template.body.slice(0, 180) : "No body content"}
                                    {template.body && template.body.length > 180 ? "..." : ""}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        ) : (
          <EmptyState onCreateClick={() => router.push("/templates/new")} />
        )}
      </main>
    </div>
  );
}
