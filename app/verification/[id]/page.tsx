"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metrics";
import { API_URL } from "@/lib/api";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

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

  const loadJob = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/verification/jobs/${jobId}`);
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
  }, [jobId, showToast]);

  const loadResults = useCallback(async () => {
    try {
      setLoadingResults(true);
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (currentPage * pageSize).toString(),
      });
      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const response = await fetch(`${API_URL}/api/verification/jobs/${jobId}/results?${params}`);
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
  }, [currentPage, jobId, pageSize, showToast, statusFilter]);

  useEffect(() => {
    if (jobId) {
      loadJob();
      loadResults();
    }
  }, [jobId, loadJob, loadResults]);

  // Poll for job updates if job is running
  useEffect(() => {
    if (!job || (job.status !== "running" && job.status !== "pending")) {
      return;
    }

    const interval = setInterval(() => {
      loadJob();
      loadResults();
    }, 15000);

    return () => clearInterval(interval);
  }, [job, loadJob, loadResults]);

  useEffect(() => {
    loadResults();
  }, [statusFilter, currentPage, loadResults]);

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
      case "disposable":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
            Disposable
          </span>
        );
      case "gibberish":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Gibberish
          </span>
        );
      case "syntax_error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            Syntax Error
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
      <div className="flex items-center justify-center h-full min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading job details...</p>
        </motion.div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalResults / pageSize);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-screen bg-slate-950">
      {/* Animated Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/50 shadow-lg"
      >
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push("/verification")}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </motion.button>
            <div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
                  Verification Job #{job.id}
                </h1>
                {getJobStatusBadge(job.status)}
              </motion.div>
              <p className="text-xs text-slate-400 mt-0.5">
                {job.source_description}
              </p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="text-xs"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Beautiful Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 pt-8 pb-20 space-y-6 max-w-7xl mx-auto"
        >
          {/* Metrics - Staggered Animation */}
          <motion.section variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Emails", value: job.total_emails, delay: 0, icon: Mail },
              { label: "Valid", value: job.valid_count, tone: "success" as const, delay: 0.1, icon: CheckCircle2 },
              { label: "Invalid", value: job.invalid_count, tone: "danger" as const, delay: 0.2, icon: XCircle },
              { label: "Risky", value: job.risky_count, tone: "warning" as const, delay: 0.3, icon: AlertCircle },
            ].map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: metric.delay || 0,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{ scale: 1.05, y: -4, transition: { duration: 0.2 } }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl blur-xl opacity-50" />
                <MetricCard
                  label={metric.label}
                  value={metric.value}
                  tone={metric.tone}
                />
              </motion.div>
            ))}
          </motion.section>

          {/* Progress - Beautiful Animated */}
          <AnimatePresence>
            {(job.status === "running" || job.status === "pending") && (
              <motion.section
                variants={itemVariants}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="relative rounded-2xl bg-gradient-to-br from-cyan-950/30 via-slate-900/90 to-slate-800/90 border border-cyan-500/20 p-6 shadow-2xl backdrop-blur-md overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                      </motion.div>
                      Progress
                    </h3>
                    <span className="text-xs text-cyan-400 font-medium">
                      {job.processed_count} / {job.total_emails} ({getProgressPercent()}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/50 rounded-full h-4 overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgressPercent()}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 h-4 rounded-full shadow-lg shadow-cyan-500/50 relative overflow-hidden"
                    >
                      <motion.div
                        animate={{
                          backgroundPosition: ["0%", "100%"],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        style={{ backgroundSize: "200% 100%" }}
                      />
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Started: {formatDate(job.started_at)}</span>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Job Info - Animated Cards */}
          <motion.section
            variants={itemVariants}
            className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border border-slate-800/50 p-6 shadow-xl backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm font-semibold text-slate-50 mb-5 flex items-center gap-2"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                Job Information
              </motion.h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: "Source Type", value: job.source_type, capitalize: true },
                  { label: "Status", value: getJobStatusBadge(job.status), badge: true },
                  { label: "Created", value: formatDate(job.created_at) },
                  { label: "Completed", value: formatDate(job.completed_at) },
                  ...(job.credits_used ? [{ label: "Credits Used", value: job.credits_used }] : []),
                ].map((info, index) => (
                  <motion.div
                    key={info.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.02, x: 4, transition: { duration: 0.2 } }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-all border border-slate-700/30"
                  >
                    <span className="text-slate-400 min-w-[110px] text-xs">{info.label}:</span>
                    <span className={`flex-1 ${info.badge ? '' : 'text-slate-50'} ${info.capitalize ? 'capitalize' : ''} text-sm`}>
                      {info.value}
                    </span>
                  </motion.div>
                ))}
              </div>
              {job.error_message && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-5 p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 backdrop-blur-sm"
                >
                  <p className="text-sm text-rose-300 font-medium mb-1 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Error:
                  </p>
                  <p className="text-xs text-rose-200/80">{job.error_message}</p>
                </motion.div>
              )}
            </div>
          </motion.section>

          {/* Results - Beautiful Scrollable Table */}
          <motion.section
            variants={itemVariants}
            className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border border-slate-800/50 overflow-hidden shadow-xl backdrop-blur-md"
          >
            <div className="px-6 py-4 border-b border-slate-800/50 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 sticky top-0 z-10">
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-semibold text-slate-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Verification Results ({totalResults})
              </motion.h3>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: "All", value: null, color: "cyan" },
                  { label: "Valid", value: "valid", color: "emerald" },
                  { label: "Invalid", value: "invalid", color: "rose" },
                  { label: "Risky", value: "risky", color: "amber" },
                ].map((filter, index) => (
                  <motion.button
                    key={filter.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`px-4 py-2 text-xs rounded-lg transition-all font-medium ${
                      statusFilter === filter.value
                        ? `bg-${filter.color}-500/20 text-${filter.color}-400 border-2 border-${filter.color}-500/50 shadow-lg shadow-${filter.color}-500/20`
                        : "bg-slate-800/50 text-slate-400 hover:text-slate-300 hover:bg-slate-800/70 border border-slate-700/50"
                    }`}
                  >
                    {filter.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {loadingResults ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Loading results...</p>
                </motion.div>
              ) : results.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center"
                >
                  <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm font-medium">No results found</p>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="overflow-x-auto max-h-[70vh] overflow-y-auto scroll-smooth"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(148, 163, 184, 0.3) transparent",
                  }}
                >
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm">
                      <tr className="text-slate-400">
                        <th className="px-4 py-3 text-left font-medium">Email</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Confidence</th>
                        <th className="px-4 py-3 text-left font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <motion.tr
                          key={result.id}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: index * 0.03,
                            duration: 0.4,
                            ease: "easeOut",
                          }}
                          whileHover={{
                            scale: 1.01,
                            backgroundColor: "rgba(15, 23, 42, 0.8)",
                            transition: { duration: 0.2 },
                          }}
                          className="border-t border-slate-800/50 transition-all"
                        >
                          <td className="px-4 py-4 text-slate-100 font-mono text-xs">
                            {result.email}
                          </td>
                          <td className="px-4 py-4">
                            {result.error ? (
                              <motion.span
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"
                              >
                                <AlertCircle className="w-3 h-3" />
                                Error
                              </motion.span>
                            ) : (
                              getStatusBadge(result.status)
                            )}
                          </td>
                          <td className="px-4 py-4 text-slate-400">
                            {result.confidence !== null ? (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="font-medium"
                              >
                                {Math.round(result.confidence * 100)}%
                              </motion.span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-4 text-slate-400 max-w-md">
                            {result.error ? (
                              <span className="text-red-400 text-xs break-words">{result.error}</span>
                            ) : (
                              <span className="break-words">{result.reason || "—"}</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination - Animated */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between bg-slate-900/30"
              >
                <p className="text-xs text-slate-400">
                  Page {currentPage + 1} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="text-xs"
                    >
                      Previous
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="text-xs"
                    >
                      Next
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
}
