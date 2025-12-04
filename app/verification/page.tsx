"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormCard } from "@/components/ui/FormCard";
import { useToast } from "@/components/ui/Toast";
import { apiClient, type SavedView } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  Upload,
  Mail,
  FileText,
  RefreshCw,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MetricCard } from "@/components/ui/metrics";
import { SavedViewsBar } from "@/components/saved-views/SavedViewsBar";

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
  created_at: string;
  completed_at: string | null;
}

export default function VerificationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<VerificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"leads" | "csv">("leads");
  const [csvEmails, setCsvEmails] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [creatingJob, setCreatingJob] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const hasRunningJobs = jobs.some(
      (j) => j.status === "running" || j.status === "pending"
    );
    
    if (!hasRunningJobs) {
      return;
    }

    const interval = setInterval(() => {
      loadJobs();
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  const loadJobs = async () => {
    try {
      if (jobs.length === 0) {
        setLoading(true);
      }
      const data = await apiClient.getVerificationJobs({ limit: 50, status: statusFilter || undefined });
      setJobs(data);
    } catch (error: any) {
      console.error("Failed to load verification jobs:", error);
      showToast({
        type: "error",
        title: "Failed to load jobs",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  const handleApplyView = (view: SavedView) => {
    if (view.filters.status) {
      setStatusFilter(view.filters.status);
    } else {
      setStatusFilter(null);
    }
    loadJobs();
  };

  const handleCreateJobFromLeads = async () => {
    if (selectedLeadIds.length === 0) {
      showToast({
        type: "error",
        title: "No leads selected",
        message: "Please enter lead IDs or select leads from the Leads page",
      });
      return;
    }

    setCreatingJob(true);
    try {
      const result = await apiClient.createBulkVerifyFromLeads(selectedLeadIds);
      showToast({
        type: "success",
        title: "Verification job created",
        message: `Processing ${result.total_emails} emails`,
      });
      setShowNewJobModal(false);
      setSelectedLeadIds([]);
      loadJobs();
    } catch (error: any) {
      console.error("Failed to create job:", error);
      showToast({
        type: "error",
        title: "Failed to create job",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setCreatingJob(false);
    }
  };

  const handleCreateJobFromCSV = async () => {
    const emails = csvEmails
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e && e.includes("@"));

    if (emails.length === 0) {
      showToast({
        type: "error",
        title: "No emails provided",
        message: "Please enter email addresses (one per line)",
      });
      return;
    }

    if (emails.length > 10000) {
      showToast({
        type: "error",
        title: "Too many emails",
        message: "Maximum 10,000 emails per job",
      });
      return;
    }

    setCreatingJob(true);
    try {
      const result = await apiClient.createBulkVerifyFromCSV(emails);
      showToast({
        type: "success",
        title: "Verification job created",
        message: `Processing ${result.total_emails} emails`,
      });
      setShowNewJobModal(false);
      setCsvEmails("");
      loadJobs();
    } catch (error: any) {
      console.error("Failed to create job:", error);
      showToast({
        type: "error",
        title: "Failed to create job",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setCreatingJob(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: { icon: CheckCircle2, color: "emerald", label: "Completed" },
      running: { icon: Loader2, color: "cyan", label: "Running", spin: true },
      pending: { icon: AlertCircle, color: "amber", label: "Pending" },
      failed: { icon: XCircle, color: "rose", label: "Failed" },
    };
    const badge = badges[status as keyof typeof badges] || { icon: AlertCircle, color: "slate", label: status };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-${badge.color}-500/10 text-${badge.color}-400 border border-${badge.color}-500/30`}>
        <Icon className={`w-3.5 h-3.5 ${badge.spin ? "animate-spin" : ""}`} />
        {badge.label}
      </span>
    );
  };

  const getProgressPercent = (job: VerificationJob) => {
    if (job.total_emails === 0) return 0;
    return Math.round((job.processed_count / job.total_emails) * 100);
  };

  const totalVerified = jobs.reduce((sum, j) => sum + j.valid_count + j.invalid_count + j.risky_count + j.unknown_count, 0);
  const totalValid = jobs.reduce((sum, j) => sum + j.valid_count, 0);
  const totalInvalid = jobs.reduce((sum, j) => sum + j.invalid_count, 0);
  const validPct = totalVerified > 0 ? `${Math.round((totalValid / totalVerified) * 100)}%` : "0%";
  const invalidPct = totalVerified > 0 ? `${Math.round((totalInvalid / totalVerified) * 100)}%` : "0%";

  const filteredJobs = statusFilter ? jobs.filter(j => j.status === statusFilter) : jobs;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Email Verification"
        description="Bulk verify email addresses from leads or CSV uploads"
        icon={Mail}
        action={
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setShowNewJobModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Verification Job
            </Button>
          </motion.div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Saved Views */}
          <SavedViewsBar
            pageType="verification"
            currentFilters={{
              status: statusFilter || undefined,
            }}
            onApplyView={handleApplyView}
          />

          {/* Metrics */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-4"
          >
            <MetricCard label="Verification Jobs" value={jobs.length} icon={FileText} />
            <MetricCard label="Total Verified" value={totalVerified} tone="info" icon={CheckCircle2} />
            <MetricCard label="Valid Rate" value={validPct} tone="success" icon={CheckCircle2} />
            <MetricCard label="Invalid Rate" value={invalidPct} tone="danger" icon={XCircle} />
          </motion.section>

          {/* Status Filters */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-4 shadow-xl"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filter by status:</span>
              {["all", "pending", "running", "completed", "failed"].map((status) => (
                <motion.button
                  key={status}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStatusFilter(status === "all" ? null : status)}
                  className={`px-4 py-2 text-xs rounded-lg font-medium transition-all ${
                    (status === "all" && statusFilter === null) || statusFilter === status
                      ? "bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/40 shadow-lg"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </motion.button>
              ))}
            </div>
          </motion.section>

          {/* Jobs Table or Empty State */}
          <AnimatePresence mode="wait">
            {loading && jobs.length === 0 ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-4" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading verification jobs...</p>
              </motion.div>
            ) : filteredJobs.length === 0 ? (
              <motion.section
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-12 text-center shadow-2xl"
              >
                <Mail className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                  No verification jobs yet
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                  Start by uploading a CSV or selecting leads to verify. We'll track each job here with status, progress, and results.
                </p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => setShowNewJobModal(true)}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Verification Job
                  </Button>
                </motion.div>
              </motion.section>
            ) : (
              <motion.section
                key="jobs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-2xl"
              >
                <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-r from-slate-50/50 to-white/50 dark:from-slate-900/50 dark:to-slate-800/50">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-500" />
                    Verification Jobs ({filteredJobs.length})
                  </h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100/50 dark:bg-slate-900/50 sticky top-0 z-10">
                      <tr className="text-slate-600 dark:text-slate-400">
                        <th className="px-6 py-3 text-left font-semibold">Source</th>
                        <th className="px-6 py-3 text-left font-semibold">Status</th>
                        <th className="px-6 py-3 text-left font-semibold">Progress</th>
                        <th className="px-6 py-3 text-left font-semibold">Results</th>
                        <th className="px-6 py-3 text-left font-semibold">Created</th>
                        <th className="px-6 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                      {filteredJobs.map((job, index) => (
                        <motion.tr
                          key={job.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ backgroundColor: "rgba(6, 182, 212, 0.05)" }}
                          className="transition-colors cursor-pointer"
                          onClick={() => router.push(`/verification/${job.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-slate-900 dark:text-slate-50 font-semibold text-sm">
                                {job.source_type === "leads" ? "Leads" : "CSV"}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {job.source_description}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(job.status)}</td>
                          <td className="px-6 py-4">
                            <div className="space-y-2 min-w-[120px]">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-400">
                                  {job.processed_count} / {job.total_emails}
                                </span>
                                <span className="text-slate-900 dark:text-slate-50 font-semibold">
                                  {getProgressPercent(job)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${getProgressPercent(job)}%` }}
                                  transition={{ duration: 0.5 }}
                                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {job.valid_count}
                              </span>
                              <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                {job.invalid_count}
                              </span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {job.risky_count}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                            {new Date(job.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/verification/${job.id}`);
                              }}
                              className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold text-xs flex items-center gap-1 ml-auto"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* New Job Modal */}
      <AnimatePresence>
        {showNewJobModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-cyan-500" />
                  New Verification Job
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowNewJobModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
                >
                  ×
                </motion.button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-800">
                {[
                  { key: "leads", label: "From Leads", icon: FileText },
                  { key: "csv", label: "From CSV", icon: Upload },
                ].map((tab) => (
                  <motion.button
                    key={tab.key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-all relative ${
                      activeTab === tab.key
                        ? "text-cyan-600 dark:text-cyan-400"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {activeTab === tab.key && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full"
                      />
                    )}
                    <span className="flex items-center justify-center gap-2">
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Leads Tab */}
              <AnimatePresence mode="wait">
                {activeTab === "leads" && (
                  <motion.div
                    key="leads"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Enter lead IDs (comma-separated) or select leads from the Leads page first.
                    </p>
                    <Input
                      label="Lead IDs"
                      icon={FileText}
                      value={selectedLeadIds.join(", ")}
                      onChange={(e) => {
                        const ids = e.target.value
                          .split(",")
                          .map((id) => parseInt(id.trim()))
                          .filter((id) => !isNaN(id));
                        setSelectedLeadIds(ids);
                      }}
                      placeholder="1, 2, 3, 4, 5"
                      helperText={`${selectedLeadIds.length} lead${selectedLeadIds.length !== 1 ? "s" : ""} selected`}
                    />
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleCreateJobFromLeads}
                        disabled={creatingJob || selectedLeadIds.length === 0}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                      >
                        {creatingJob ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Create Job ({selectedLeadIds.length} leads)
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* CSV Tab */}
                {activeTab === "csv" && (
                  <motion.div
                    key="csv"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <Textarea
                      label="Email Addresses"
                      value={csvEmails}
                      onChange={(e) => setCsvEmails(e.target.value)}
                      rows={10}
                      placeholder="john@example.com&#10;jane@example.com&#10;..."
                      helperText={`${csvEmails.split("\n").filter((e) => e.trim()).length} emails (max 10,000)`}
                    />
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleCreateJobFromCSV}
                        disabled={creatingJob || csvEmails.trim().length === 0}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                      >
                        {creatingJob ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Create Verification Job
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
