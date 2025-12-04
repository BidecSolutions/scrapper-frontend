"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Mail,
  TrendingUp,
  Clock,
  DollarSign,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metrics";

interface VerificationJob {
  id: number;
  source_type: string;
  source_description: string;
  status: string;
  total_emails: number;
  processed_count: number;
  valid_count: number;
  invalid_count: number;
  risky_count: number;
  unknown_count: number;
  disposable_count: number;
  syntax_error_count: number;
  error_message?: string | null;
  credits_used?: number | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

interface VerificationResult {
  id: number;
  email: string;
  status: string | null;
  reason: string | null;
  confidence: number | null;
  error: string | null;
  created_at: string | null;
}

export default function VerificationJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const jobId = parseInt(params.id as string);

  const [job, setJob] = useState<VerificationJob | null>(null);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const pageSize = 100;

  useEffect(() => {
    if (jobId) {
      loadJob();
      loadResults();
    }
  }, [jobId]);

  // Poll for job updates if job is running
  useEffect(() => {
    if (!job || (job.status !== "running" && job.status !== "pending")) {
      return;
    }

    const interval = setInterval(() => {
      loadJob();
      loadResults();
    }, 3000);

    return () => clearInterval(interval);
  }, [job, jobId]);

  useEffect(() => {
    loadResults();
  }, [statusFilter, currentPage]);

  const loadJob = async () => {
    try {
      const response = await fetch(`/api/verification/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error("Failed to load job");
      }
      const data = await response.json();
      setJob(data);
    } catch (error: any) {
      console.error("Failed to load job:", error);
      showToast({
        type: "error",
        title: "Failed to load job",
        message: error?.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      setLoadingResults(true);
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (currentPage * pageSize).toString(),
      });
      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/verification/jobs/${jobId}/results?${params}`);
      if (!response.ok) {
        throw new Error("Failed to load results");
      }
      const data = await response.json();
      setResults(data.items || []);
      setTotalResults(data.total || 0);
    } catch (error: any) {
      console.error("Failed to load results:", error);
      showToast({
        type: "error",
        title: "Failed to load results",
        message: error?.message || "Please try again",
      });
    } finally {
      setLoadingResults(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
          Pending
        </span>
      );
    }

    switch (status.toLowerCase()) {
      case "valid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Valid
          </span>
        );
      case "invalid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Invalid
          </span>
        );
      case "risky":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            Risky
          </span>
        );
      case "unknown":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Unknown
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  const getProgressPercent = () => {
    if (!job || job.total_emails === 0) return 0;
    return Math.round((job.processed_count / job.total_emails) * 100);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    showToast({
      type: "info",
      title: "Export coming soon",
      message: "CSV export will be available soon",
    });
  };

  if (loading || !job) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
          <p className="text-slate-400">Loading job details...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalResults / pageSize);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/verification")}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
                  Verification Job #{job.id}
                </h1>
                {getJobStatusBadge(job.status)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {job.source_description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="text-xs"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-10 space-y-5">
        {/* Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <MetricCard label="Total Emails" value={job.total_emails} />
          <MetricCard label="Valid" value={job.valid_count} tone="success" />
          <MetricCard label="Invalid" value={job.invalid_count} tone="danger" />
          <MetricCard label="Risky" value={job.risky_count} tone="warning" />
        </section>

        {/* Progress */}
        {job.status === "running" || job.status === "pending" ? (
          <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-50">Progress</h3>
              <span className="text-xs text-slate-400">
                {job.processed_count} / {job.total_emails} ({getProgressPercent()}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5">
              <div
                className="bg-cyan-500 h-2.5 rounded-full transition-all"
                style={{ width: `${getProgressPercent()}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  Started: {formatDate(job.started_at)}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {/* Job Info */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-50 mb-4">Job Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Source Type:</span>
              <span className="ml-2 text-slate-50 capitalize">{job.source_type}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className="ml-2">{getJobStatusBadge(job.status)}</span>
            </div>
            <div>
              <span className="text-slate-400">Created:</span>
              <span className="ml-2 text-slate-50">{formatDate(job.created_at)}</span>
            </div>
            <div>
              <span className="text-slate-400">Completed:</span>
              <span className="ml-2 text-slate-50">{formatDate(job.completed_at)}</span>
            </div>
            {job.credits_used && (
              <div>
                <span className="text-slate-400">Credits Used:</span>
                <span className="ml-2 text-slate-50">{job.credits_used}</span>
              </div>
            )}
          </div>
          {job.error_message && (
            <div className="mt-4 p-4 rounded-lg border border-rose-500/30 bg-rose-500/10">
              <p className="text-sm text-rose-300 font-medium mb-1">Error:</p>
              <p className="text-xs text-rose-200/80">{job.error_message}</p>
            </div>
          )}
        </section>

        {/* Results */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-50">
              Verification Results ({totalResults})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter(null)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  statusFilter === null
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "bg-slate-800 text-slate-400 hover:text-slate-300"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("valid")}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  statusFilter === "valid"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 hover:text-slate-300"
                }`}
              >
                Valid
              </button>
              <button
                onClick={() => setStatusFilter("invalid")}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  statusFilter === "invalid"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : "bg-slate-800 text-slate-400 hover:text-slate-300"
                }`}
              >
                Invalid
              </button>
              <button
                onClick={() => setStatusFilter("risky")}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  statusFilter === "risky"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-slate-800 text-slate-400 hover:text-slate-300"
                }`}
              >
                Risky
              </button>
            </div>
          </div>

          {loadingResults ? (
            <div className="p-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400 mx-auto mb-2" />
              <p className="text-slate-400 text-xs">Loading results...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-400 text-sm">No results found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900">
                    <tr className="text-slate-400">
                      <th className="px-4 py-2 text-left font-medium">Email</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Confidence</th>
                      <th className="px-4 py-2 text-left font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <motion.tr
                        key={result.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-t border-slate-800 hover:bg-slate-900/70 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-100 font-mono text-xs">
                          {result.email}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(result.status)}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {result.confidence !== null
                            ? `${Math.round(result.confidence * 100)}%`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {result.reason || result.error || "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Page {currentPage + 1} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="text-xs"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

