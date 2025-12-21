"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { apiClient, API_URL, type Job, type Lead, type JobLog } from "@/lib/api";
import { LeadRow } from "@/components/leads/LeadRow";
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw, Copy } from "lucide-react";
import { StatusChip } from "@/components/jobs/StatusChip";
import { useJobPolling } from "@/hooks/useJobPolling";
import { JobTimeline } from "@/components/jobs/JobTimeline";
import { ProgressRing } from "@/components/jobs/ProgressRing";
import { JobTabs } from "@/components/jobs/JobTabs";
import { LayoutDashboard, Users, Layers, Lightbulb, Activity } from "lucide-react";
import { ClickableStat } from "@/components/ui/ClickableStat";
import { CoverageBar } from "@/components/jobs/CoverageBar";
import { AICopilot } from "@/components/ai/AICopilot";
import { SegmentCard } from "@/components/jobs/SegmentCard";
import { useToast } from "@/components/ui/Toast";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = parseInt(params.id as string);
  const { showToast } = useToast();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Use the polling hook for job updates
  const { job, loading: jobLoading, error: jobError } = useJobPolling(jobId, 3000);
  
  // Debug: Log job state changes
  useEffect(() => {
    if (job) {
      console.log("Job loaded:", { id: job.id, status: job.status, ai_status: job.ai_status });
    }
    if (jobError) {
      console.error("Job error:", jobError);
    }
  }, [job, jobError]);

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getJobLeads(jobId);
      setLeads(data);
    } catch (error) {
      console.error("Failed to load leads:", error);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      loadLeads();
    }
  }, [jobId, loadLeads]);

  // Poll for leads updates if job is running
  useEffect(() => {
    if (!job || (job.status !== "running" && job.status !== "pending" && job.status !== "ai_pending")) {
      return;
    }

    const interval = setInterval(() => {
      loadLeads();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [job, loadLeads]);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
  };

  const handleRetry = async () => {
    try {
      setRetrying(true);
      await apiClient.retryJob(jobId);
      showToast({
        type: "success",
        title: "Job retried",
        message: "The job has been queued for rerun.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Retry failed",
        message: error?.response?.data?.detail || "Unable to retry this job.",
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleExport = () => {
    if (!leads.length) {
      showToast({
        type: "error",
        title: "No leads to export",
        message: "This job has no leads yet.",
      });
      return;
    }
    setExporting(true);
    const headers = ["name", "email", "phone", "website", "company", "country"];
    const rows = [
      headers,
      ...leads.map((lead) => [
        lead.name || "",
        lead.emails?.[0] || "",
        lead.phones?.[0] || "",
        lead.website || "",
        lead.company_name || "",
        lead.country || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job_${jobId}_leads.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast({
        type: "success",
        title: "Link copied",
        message: "Job link copied to clipboard.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Could not copy the job link.",
      });
    }
  };

  const handleCopyLeadEmails = async () => {
    const emails = leads
      .flatMap((lead) => lead.emails || [])
      .filter(Boolean);
    if (emails.length === 0) {
      showToast({
        type: "info",
        title: "No emails found",
        message: "No lead emails available for this job.",
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

  const stats = {
    high: leads.filter((l) => l.quality_label === "high").length,
    medium: leads.filter((l) => l.quality_label === "medium").length,
    low: leads.filter((l) => l.quality_label === "low").length,
    total: leads.length,
  };

  // Show loading only on initial load, not during polling updates
  if (jobLoading && !job) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-cyan-400" />
          <p className="text-sm text-slate-400">Loading job...</p>
        </div>
      </div>
    );
  }

  if (jobError && !job) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.push("/jobs")}
          className="mb-4 text-xs text-slate-400 hover:text-slate-200"
        >
          Back to Jobs
        </button>
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
          <div className="flex items-center justify-between">
            <span>{jobError || "Job not found"}</span>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-100 hover:bg-red-500/20"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Safety check: if we still don't have a job after loading completes, show message
  if (!job && !jobLoading) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.push("/jobs")}
          className="mb-4 text-xs text-slate-400 hover:text-slate-200"
        >
          Back to Jobs
        </button>
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm text-amber-100">
          Job not found. Please check the job ID: {jobId}
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/jobs">
              <Button variant="ghost" size="icon" aria-label="Back to jobs">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{job.niche}</h1>
                <StatusChip status={job.status} />
              </div>
              {job.location && (
                <p className="text-sm text-slate-400 mt-1">{job.location}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={retrying}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {retrying ? "Rerunning..." : "Rerun"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLeadEmails} disabled={leads.length === 0}>
              <Copy className="w-4 h-4 mr-2" />
              Copy emails
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="w-4 h-4 mr-2" />
              Copy link
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Exporting..." : "Export"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <JobTabs
          defaultTab="overview"
          tabs={[
            {
              id: "overview",
              label: "Overview",
              icon: LayoutDashboard,
              content: <OverviewTab job={job} stats={stats} leads={leads} />,
            },
            {
              id: "leads",
              label: "Leads",
              icon: Users,
              content: (
                <LeadsTab
                  leads={leads}
                  loading={loading}
                  job={job}
                  onLeadClick={handleLeadClick}
                />
              ),
            },
            {
              id: "segments",
              label: "Segments",
              icon: Layers,
              content: <SegmentsTab jobId={jobId} />,
            },
            {
              id: "insights",
              label: "Insights",
              icon: Lightbulb,
              content: <InsightsTab jobId={jobId} />,
            },
            {
              id: "activity",
              label: "Activity",
              icon: Activity,
              content: <ActivityTab jobId={jobId} />,
            },
          ]}
        />

        {/* Lead Detail Panel */}
        <LeadDetailPanel
          open={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          lead={selectedLead}
        />
      </div>
  );
}

// Tab Components
function OverviewTab({ job, stats, leads }: { job: Job; stats: any; leads: Lead[] }) {
  return (
    <div className="space-y-6">
      {/* Progress & Timeline */}
      {(job.status === "running" || job.status === "ai_pending") && job.total_targets && job.total_targets > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Progress</h3>
            <ProgressRing
              value={job.processed_targets || 0}
              max={job.total_targets}
              showCountdown={true}
              startedAt={job.started_at ?? undefined}
            />
          </div>
          <JobTimeline status={job.status} />
        </div>
      )}

      {/* Stats Grid with Clickable Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <ClickableStat
          label="Leads Found"
          value={job.result_count?.toString() || "0"}
          onClick={() => {
            // Switch to leads tab (would need tab state management)
            window.location.hash = "#leads";
          }}
        />
        <ClickableStat
          label="High Quality"
          value={stats.high}
          description={`${stats.total > 0 ? Math.round((stats.high / stats.total) * 100) : 0}% of total`}
          onClick={() => {
            // Filter to high quality leads
            window.location.hash = "#leads?quality=high";
          }}
        />
        <ClickableStat
          label="With Email"
          value={leads.filter((l) => l.emails && l.emails.length > 0).length}
          description={`${stats.total > 0 ? Math.round((leads.filter((l) => l.emails && l.emails.length > 0).length / stats.total) * 100) : 0}% coverage`}
          onClick={() => {
            // Filter to leads with email
            window.location.hash = "#leads?hasEmail=true";
          }}
        />
        <InfoCard
          label="Duration"
          value={
            job.duration_seconds
              ? `${Math.round(job.duration_seconds / 60)}m`
              : job.started_at && !job.completed_at
              ? (() => {
                  const elapsed = Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000);
                  return elapsed < 60 ? `${elapsed}s` : `${Math.round(elapsed / 60)}m`;
                })()
              : "-"
          }
        />
      </div>

      {/* Coverage Bar */}
      {stats.total > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <CoverageBar
            high={stats.high}
            medium={stats.medium}
            low={stats.low}
            total={stats.total}
            withEmail={leads.filter((l) => l.emails && l.emails.length > 0).length}
            withPhone={leads.filter((l) => l.phones && l.phones.length > 0).length}
          />
        </div>
      )}

      {/* Quality Stats */}
      {stats.total > 0 && (
        <div className="flex flex-wrap gap-2">
          <StatChip label="High Quality" value={stats.high} color="emerald" />
          <StatChip label="Medium" value={stats.medium} color="amber" />
          <StatChip label="Low" value={stats.low} color="rose" />
        </div>
      )}

      {/* Job Configuration */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold mb-3">Job Configuration</h3>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Max Results:</span>
            <span className="text-slate-50">{job.max_results}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Pages per Site:</span>
            <span className="text-slate-50">{job.max_pages_per_site}</span>
          </div>
        </div>
      </div>

      {/* Leads Preview */}
      {job.status === "completed" || job.status === "completed_with_warnings" ? (
        <LeadsPreview jobId={job.id} />
      ) : null}

      {/* AI Insights Card */}
      <AIInsightsCard key={job.id} job={job} />
    </div>
  );
}

// Leads Preview Component
function LeadsPreview({ jobId }: { jobId: number }) {
  const [previewLeads, setPreviewLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoadingLeads(true);
        const data = await apiClient.getJobLeads(jobId);
        if (!mounted) return;
        setPreviewLeads(data.slice(0, 5)); // First 5 leads
      } catch (error) {
        console.error("Failed to load leads preview:", error);
      } finally {
        if (mounted) setLoadingLeads(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [jobId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-100">Leads Preview</h3>
        <button
          onClick={() => {
            // Try to switch to leads tab, or navigate to leads page
            const leadsTab = document.querySelector('[data-tab="leads"]');
            if (leadsTab) {
              (leadsTab as HTMLElement).click();
            } else {
              router.push(`/leads?job_id=${jobId}`);
            }
          }}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View all leads
        </button>
      </div>

      {loadingLeads && (
        <p className="text-xs text-slate-400">Loading leads...</p>
      )}

      {!loadingLeads && previewLeads.length === 0 && (
        <p className="text-xs text-slate-400">No leads found for this job.</p>
      )}

      {previewLeads.length > 0 && (
        <div className="space-y-2">
          {previewLeads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 truncate">
                    {lead.name || "Unknown contact"}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {lead.website || "No website"}
                  </p>
                </div>
                {lead.country && (
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 flex-shrink-0">
                    {lead.country}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
                {lead.emails && lead.emails.length > 0 && (
                  <span className="flex items-center gap-1">
                    Email: <span className="truncate max-w-[150px]">{lead.emails[0]}</span>
                  </span>
                )}
                {lead.phones && lead.phones.length > 0 && (
                  <span className="flex items-center gap-1">
                    Phone: <span>{lead.phones[0]}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// AI Insights Card Component
function AIInsightsCard({ job }: { job: Job }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerateAi = async () => {
    if (!job) return;
    try {
      setAiLoading(true);
      setAiError(null);
      const updated = await apiClient.triggerJobAiInsights(job.id);
      // Polling will refresh the job data, so we don't need to manually update
      // Just clear any previous errors
      setAiError(null);
    } catch (err: any) {
      setAiError(err.message || "Failed to start AI insights");
    } finally {
      setAiLoading(false);
    }
  };

  const isCompleted = job.status === "completed" || job.status === "completed_with_warnings";
  const aiStatus = job.ai_status || "idle";
  
  // Clear error when AI status changes to ready
  useEffect(() => {
    if (aiStatus === "ready" && aiError) {
      setAiError(null);
    }
  }, [aiStatus, aiError]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-100">
            AI Insights for this job
          </h3>
          <p className="text-xs text-slate-400">
            Get a summary of what kind of leads you scraped and suggested segments for campaigns.
          </p>
        </div>

        <button
          disabled={aiLoading || !isCompleted}
          onClick={handleGenerateAi}
          className="inline-flex items-center gap-1 rounded-full border border-cyan-500/60 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500 transition-colors"
        >
          {aiLoading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              Generating...
            </>
          ) : aiStatus === "ready" ? (
            <>Regenerate</>
          ) : (
            <>Generate summary</>
          )}
        </button>
      </div>

      {/* States */}
      {!isCompleted && (
        <p className="text-xs text-slate-500">
          Finish scraping first. AI insights are available once the job is completed.
        </p>
      )}

      {isCompleted && aiStatus === "idle" && !aiLoading && (
        <p className="text-xs text-slate-500">
          Click &quot;Generate summary&quot; to analyze these leads with AI.
        </p>
      )}

      {isCompleted && (aiStatus === "running" || aiLoading) && (
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          AI is analyzing your leads... this may take a few seconds.
        </div>
      )}

      {aiError && (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/40 p-2 text-[11px] text-red-100">
          {aiError}
        </div>
      )}

      {aiStatus === "disabled" && job.ai_error && (
        <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-950/40 p-2 text-[11px] text-amber-100">
          {job.ai_error}
        </div>
      )}

      {aiStatus === "error" && job.ai_error && (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/40 p-2 text-[11px] text-red-100">
          {job.ai_error}
        </div>
      )}

      {aiStatus === "ready" && (
        <div className="mt-3 space-y-3">
          {job.ai_summary ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Summary
              </p>
              <p className="mt-1 text-sm text-slate-100 whitespace-pre-line">
                {job.ai_summary}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">AI analysis completed, but no summary available.</p>
          )}

          {job.ai_segments && job.ai_segments.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Suggested segments
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {job.ai_segments.map((seg: any, idx: number) => (
                  <AiSegmentCard
                    key={idx}
                    segment={seg}
                    index={idx}
                    jobId={job.id}
                  />
                ))}
              </div>
            </div>
          ) : aiStatus === "ready" && (
            <p className="text-xs text-slate-500">No segments generated.</p>
          )}
        </div>
      )}
    </div>
  );
}

// AI Segment Card Component with Actions
function AiSegmentCard({
  segment,
  index,
  jobId,
}: {
  segment: any;
  index: number;
  jobId: number;
}) {
  const router = useRouter();
  const [creatingView, setCreatingView] = useState(false);
  const [creatingPlaybook, setCreatingPlaybook] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCreateView = async () => {
    try {
      setLocalError(null);
      setCreatingView(true);
      const view = await apiClient.createSavedViewFromSegment(jobId, index);
      // Redirect to leads page with the view
      router.push(`/leads?view_id=${view.id}`);
    } catch (err: any) {
      setLocalError(err.message || "Failed to create saved view");
    } finally {
      setCreatingView(false);
    }
  };

  const handleCreatePlaybook = async () => {
    try {
      setLocalError(null);
      setCreatingPlaybook(true);
      const playbook = await apiClient.createPlaybookFromSegment(jobId, index);
      // Redirect to playbook detail page (adjust route as needed)
      router.push(`/playbooks/${playbook.id}`);
    } catch (err: any) {
      setLocalError(err.message || "Failed to create playbook");
    } finally {
      setCreatingPlaybook(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-100">
            {segment.name || `Segment #${index + 1}`}
          </p>
          {typeof segment.rough_percentage_of_leads === "number" && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
              ~{segment.rough_percentage_of_leads}%
            </span>
          )}
        </div>
        {segment.description && (
          <p className="mt-1 text-[11px] text-slate-400">
            {segment.description}
          </p>
        )}
        {segment.ideal_use_case && (
          <p className="mt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-400">
              Use case:
            </span>{" "}
            {segment.ideal_use_case}
          </p>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreateView}
            disabled={creatingView || creatingPlaybook}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-100 hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 transition-colors"
          >
            {creatingView ? "Creating view..." : "Save as view"}
          </button>
          <button
            onClick={handleCreatePlaybook}
            disabled={creatingPlaybook || creatingView}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-cyan-500/90 px-2 py-1 text-[11px] font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 transition-colors"
          >
            {creatingPlaybook ? "Creating..." : "Create playbook"}
          </button>
        </div>
        {localError && (
          <p className="text-[10px] text-red-300">{localError}</p>
        )}
      </div>
    </div>
  );
}

function LeadsTab({
  leads,
  loading,
  job,
  onLeadClick,
}: {
  leads: Lead[];
  loading: boolean;
  job: Job;
  onLeadClick: (lead: Lead) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Leads ({leads.length})</span>
      </div>
      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-slate-400 mb-2">No leads found for this job yet.</p>
          {job.error_message && (
            <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 max-w-2xl mx-auto">
              <p className="text-sm text-amber-300 font-medium mb-1">Issue:</p>
              <p className="text-xs text-amber-200/80">{job.error_message}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/80 border-b border-slate-800">
                     <tr className="text-xs text-slate-400 text-left">
                       <th className="px-3 py-2">Name</th>
                       <th className="px-3 py-2">Email</th>
                       <th className="px-3 py-2">Phone</th>
                       <th className="px-3 py-2">Score</th>
                       <th className="px-3 py-2">QA</th>
                       <th className="px-3 py-2">Tags</th>
                     </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {leads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} onOpenDetail={onLeadClick} />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SegmentsTab({ jobId }: { jobId: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
      <p className="text-slate-400">Segments will appear here after AI clustering completes.</p>
    </div>
  );
}

function InsightsTab({ jobId }: { jobId: number }) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/jobs/${jobId}/insights`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (error) {
      console.error("Failed to load insights:", error);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const suggestions = [
    "Which 10 leads should I prioritize?",
    "Why is this job's quality lower than my last hospital job?",
    "What are the main patterns in these leads?",
  ];

  const handleAISend = async (query: string): Promise<string> => {
    try {
      const response = await fetch(`${API_URL}/api/jobs/${jobId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await response.json();
      return data.answer || "I couldn't process that question.";
    } catch (error) {
      return "Failed to get AI response. Please try again.";
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="text-slate-400">Loading insights...</p>
        </div>
      ) : insights ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-50">AI Insights</h3>
            <span className="text-[10px] uppercase tracking-wide text-cyan-300 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Powered by AI
            </span>
          </div>
          <div className="prose prose-invert max-w-none text-sm text-slate-200 whitespace-pre-wrap">
            {insights.text}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="text-slate-400">AI insights will appear here after job completion.</p>
        </div>
      )}

      {/* AI Copilot */}
      <AICopilot
        context={`Job ${jobId} insights`}
        suggestions={suggestions}
        onSend={handleAISend}
        placeholder="Ask AI about this job..."
      />
    </div>
  );
}

function ActivityTab({ jobId }: { jobId: number }) {
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getJobLogs(jobId);
      setLogs(data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(logs.map((log) => log.activity_type).filter(Boolean)));
    return ["all", ...types];
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    if (typeFilter !== "all" && log.activity_type !== typeFilter) return false;
    if (!query.trim()) return true;
    const haystack = `${log.activity_type} ${log.description}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <Input
              label="Search activity"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by type or description"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {typeOptions.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                  typeFilter === type
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/40"
                    : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {type === "all" ? "All" : type}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={loadLogs} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs text-slate-400">
          {filteredLogs.length} events
        </div>
        {loading ? (
          <div className="p-6 text-center text-slate-400">Loading activity...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-300">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-slate-400">No activity matches your filters.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredLogs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-800 text-slate-200">
                    {log.activity_type}
                  </span>
                </div>
                <p className="text-sm text-slate-100 mt-1">{log.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </motion.div>
  );
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "amber" | "rose";
}) {
  const colorClasses = {
    emerald: "border-emerald-400/50 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-400/50 bg-amber-500/10 text-amber-300",
    rose: "border-rose-400/50 bg-rose-500/10 text-rose-300",
  };

  return (
    <motion.div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${colorClasses[color]}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <span>{label}:</span>
      <span className="font-semibold">{value}</span>
    </motion.div>
  );
}
