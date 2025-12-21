"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";
import {
  Mail,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Save,
  Download,
  User,
  Globe,
  Sparkles,
  Lightbulb,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TabKey = "find" | "verify" | "bulk";

export default function EmailFinderPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("find");

  // Finder state
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderResult, setFinderResult] = useState<any>(null);
  const [finderForm, setFinderForm] = useState({
    firstName: "",
    lastName: "",
    domain: "",
    skipSmtp: false,
  });

  // Verifier state
  const [verifierLoading, setVerifierLoading] = useState(false);
  const [verifierResult, setVerifierResult] = useState<any>(null);
  const [verifierEmail, setVerifierEmail] = useState("");

  // Bulk state
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const bulkFileRef = useRef<HTMLInputElement | null>(null);

  const normalizeDomain = (value: string) => {
    return value
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0];
  };

  const handleCopy = async (text: string | undefined | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast({
        type: "success",
        title: "Copied",
        message: "Copied to clipboard",
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Could not copy to clipboard",
      });
    }
  };

  const handleFindEmail = async () => {
    const domain = normalizeDomain(finderForm.domain);
    if (!finderForm.firstName || !finderForm.lastName || !domain) {
      showToast({
        type: "error",
        title: "Missing fields",
        message: "Please fill in first name, last name, and domain",
      });
      return;
    }

    setFinderLoading(true);
    setFinderResult(null);
    try {
      setFinderForm((prev) => ({ ...prev, domain }));
      const result = await apiClient.findEmail(
        finderForm.firstName,
        finderForm.lastName,
        domain,
        finderForm.skipSmtp
      );
      setFinderResult(result);
      if (result.email) {
        showToast({
          type: "success",
          title: "Email found!",
          message: `Found: ${result.email} (${((result.confidence || 0) * 100).toFixed(0)}% confidence)`,
        });
      } else {
        showToast({
          type: "info",
          title: "No email found",
          message: "Could not find a confident email match",
        });
      }
    } catch (error: any) {
      console.error("Failed to find email:", error);
      showToast({
        type: "error",
        title: "Error",
        message: error?.response?.data?.detail || "Failed to find email. Please try again.",
      });
    } finally {
      setFinderLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifierEmail) {
      showToast({
        type: "error",
        title: "Missing email",
        message: "Please enter an email address",
      });
      return;
    }

    setVerifierLoading(true);
    setVerifierResult(null);
    try {
      const result = await apiClient.verifyEmail(verifierEmail);
      setVerifierResult(result);
      showToast({
        type: "success",
        title: "Verification complete",
        message: `Status: ${result.status} (${result.reason})`,
      });
    } catch (error: any) {
      console.error("Failed to verify email:", error);
      showToast({
        type: "error",
        title: "Error",
        message: error?.response?.data?.detail || "Failed to verify email. Please try again.",
      });
    } finally {
      setVerifierLoading(false);
    }
  };

  const handleBulkVerify = async () => {
    const emails = bulkEmails
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      showToast({
        type: "error",
        title: "No emails",
        message: "Please enter at least one email address",
      });
      return;
    }

    if (emails.length > 100) {
      showToast({
        type: "error",
        title: "Too many emails",
        message: "Maximum 100 emails per request",
      });
      return;
    }

    setBulkLoading(true);
    setBulkResults([]);
    try {
      const result = await apiClient.verifyEmailsBulk(emails);
      setBulkResults(result.results);
      showToast({
        type: "success",
        title: "Bulk verification complete",
        message: `Verified ${result.total} emails`,
      });
    } catch (error: any) {
      console.error("Failed to verify emails:", error);
      showToast({
        type: "error",
        title: "Error",
        message: error?.response?.data?.detail || "Failed to verify emails. Please try again.",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "invalid":
        return <XCircle className="w-5 h-5 text-rose-400" />;
      case "risky":
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "text-emerald-300 bg-emerald-500/15 border-emerald-400/60";
      case "invalid":
        return "text-rose-300 bg-rose-500/15 border-rose-400/60";
      case "risky":
        return "text-amber-300 bg-amber-500/15 border-amber-400/60";
      default:
        return "text-slate-400 bg-slate-500/15 border-slate-500/60";
    }
  };

  const parseEmailsFromText = (text: string) => {
    const regex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const matches = text.match(regex) || [];
    const unique = Array.from(new Set(matches.map((email) => email.toLowerCase())));
    return unique;
  };

  const handleBulkFileImport = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const emails = parseEmailsFromText(text);
      if (emails.length === 0) {
        showToast({
          type: "info",
          title: "No emails found",
          message: "We could not find any emails in that file.",
        });
        return;
      }
      setBulkEmails((prev) => {
        const combined = prev ? `${prev}\n${emails.join("\n")}` : emails.join("\n");
        return combined.trim();
      });
      showToast({
        type: "success",
        title: "File imported",
        message: `Added ${emails.length} emails from ${file.name}`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Import failed",
        message: "Could not read that file. Please try again.",
      });
    } finally {
      if (bulkFileRef.current) {
        bulkFileRef.current.value = "";
      }
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const emails = parseEmailsFromText(text);
      if (emails.length === 0) {
        showToast({
          type: "info",
          title: "No emails found",
          message: "Clipboard text did not include any emails.",
        });
        return;
      }
      setBulkEmails((prev) => {
        const combined = prev ? `${prev}\n${emails.join("\n")}` : emails.join("\n");
        return combined.trim();
      });
      showToast({
        type: "success",
        title: "Clipboard imported",
        message: `Added ${emails.length} emails from clipboard`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Clipboard blocked",
        message: "Could not read clipboard. Please paste manually.",
      });
    }
  };

  const handleDownloadExtension = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"}/api/extension/download`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leadflux-email-finder-extension.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast({
        type: "success",
        title: "Extension downloaded",
        message: "Check the installation instructions below",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Download failed",
        message: "Failed to download extension. Please try again.",
      });
    }
  };

  const emailCount = bulkEmails.split("\n").filter((e: string) => e.trim()).length;
  const bulkTotal = bulkResults.length;
  const bulkValidRate = bulkTotal > 0 ? Math.round(((bulkSummary.valid || 0) / bulkTotal) * 100) : 0;
  const bulkRiskRate = bulkTotal > 0 ? Math.round(((bulkSummary.risky || 0) / bulkTotal) * 100) : 0;
  const bulkSummary = bulkResults.reduce(
    (acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Email Finder & Verifier"
        description="Find and verify email addresses using pattern matching and SMTP checks"
        icon={Mail}
        action={
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleDownloadExtension}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Extension
            </Button>
          </motion.div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* LinkedIn Extension Hero */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5" />
            <div className="relative z-10 flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-bold text-white">in</span>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                    LinkedIn Email Finder Extension
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                    Works on any LinkedIn profile
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Install our Chrome extension to capture emails directly from LinkedIn profiles while you browse. Perfect for manual prospecting and quick research.
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
                  {[
                    { num: "1", text: "Download and unzip the extension" },
                    { num: "2", text: "Go to chrome://extensions" },
                    { num: "3", text: "Enable Developer mode and Load unpacked" },
                    { num: "4", text: "Select extension folder and browse LinkedIn" },
                  ].map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-2"
                    >
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold text-base">{step.num}</span>
                      <span className="text-slate-700 dark:text-slate-300 text-xs">{step.text}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleDownloadExtension}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Extension ZIP
                    </Button>
                  </motion.div>
                  <a
                    href="chrome://extensions"
                    className="inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold text-sm underline underline-offset-4"
                  >
                    Open Chrome Extensions Page ->
                  </a>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-6 border-b-2 border-slate-200 dark:border-slate-800"
          >
            {[
              { key: "find" as TabKey, label: "Find Email", icon: Search },
              { key: "verify" as TabKey, label: "Verify Email", icon: CheckCircle2 },
              { key: "bulk" as TabKey, label: "Bulk Verify", icon: Sparkles },
            ].map((tab) => (
              <motion.button
                key={tab.key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.key)}
                className={`relative py-3 px-4 text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "text-cyan-600 dark:text-cyan-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full"
                  />
                )}
              </motion.button>
            ))}
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "find" && (
              <motion.div
                key="find"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid gap-6 lg:grid-cols-[2fr,1fr]"
              >
                <FormCard
                  title="Find Email Address"
                  description="Use first name, last name, and company domain. We'll try common patterns and optionally validate via SMTP."
                  icon={Search}
                >
                  <form onSubmit={(e) => { e.preventDefault(); handleFindEmail(); }} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Input
                        label="First Name"
                        icon={User}
                        required
                        value={finderForm.firstName}
                        onChange={(e) => setFinderForm({ ...finderForm, firstName: e.target.value })}
                        placeholder="John"
                      />
                      <Input
                        label="Last Name"
                        icon={User}
                        required
                        value={finderForm.lastName}
                        onChange={(e) => setFinderForm({ ...finderForm, lastName: e.target.value })}
                        placeholder="Doe"
                      />
                      <Input
                        label="Company Domain"
                        icon={Globe}
                        required
                        value={finderForm.domain}
                        onChange={(e) => setFinderForm({ ...finderForm, domain: e.target.value })}
                        placeholder="example.com"
                      />
                    </div>
                    <Checkbox
                      label="Skip SMTP check"
                      description="Faster but less accurate"
                      checked={finderForm.skipSmtp}
                      onChange={(e) => setFinderForm({ ...finderForm, skipSmtp: e.target.checked })}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setFinderForm({
                            firstName: "",
                            lastName: "",
                            domain: "",
                            skipSmtp: false,
                          })
                        }
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setFinderForm({
                            firstName: "Sarah",
                            lastName: "Lee",
                            domain: "acme.com",
                            skipSmtp: false,
                          })
                        }
                      >
                        Try sample
                      </Button>
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        disabled={finderLoading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                      >
                        {finderLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Finding...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Find Email
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>

                  {/* Results */}
                  {finderResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
                    >
                      {finderResult.email ? (
                        <>
                          <div className="flex items-center gap-3">
                            {getStatusIcon(finderResult.status || "unknown")}
                            <div className="flex-1">
                              <div className="text-slate-900 dark:text-slate-50 font-semibold text-base">
                                {finderResult.email}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Confidence: {((finderResult.confidence || 0) * 100).toFixed(0)}%
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCopy(finderResult.email)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-cyan-600"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copy
                            </motion.button>
                          </div>
                          <div className={`p-4 rounded-xl border text-sm ${getStatusColor(finderResult.status || "unknown")}`}>
                            <div className="font-semibold capitalize mb-1">
                              {finderResult.status || "unknown"}
                            </div>
                            <div className="text-xs opacity-80">{finderResult.reason || ""}</div>
                          </div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              onClick={async () => {
                                try {
                                  const result = await apiClient.saveEmailToLeads({
                                    first_name: finderForm.firstName,
                                    last_name: finderForm.lastName,
                                    email: finderResult.email!,
                                    domain: finderForm.domain,
                                    confidence: finderResult.confidence || undefined,
                                  });
                                  showToast({
                                    type: "success",
                                    title: "Saved to leads",
                                    message: `Lead created with ID: ${result.lead_id}`,
                                  });
                                } catch (error: any) {
                                  showToast({
                                    type: "error",
                                    title: "Error",
                                    message: error?.response?.data?.detail || "Failed to save lead",
                                  });
                                }
                              }}
                              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white shadow-lg"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save to Leads
                            </Button>
                          </motion.div>
                        </>
                      ) : (
                        <div className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">
                          No confident email match found. Try adjusting the search or enabling SMTP verification.
                        </div>
                      )}
                    </motion.div>
                  )}
                </FormCard>

                {/* Tips Card */}
                <FormCard
                  title="Tips for Better Matches"
                  icon={Lightbulb}
                  className="h-fit"
                >
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                    {[
                      "Use the company's primary domain (not tracking or subdomains)",
                      "Fill both first and last name for best pattern guesses",
                      "Keep SMTP check enabled when quality matters more than speed",
                      "Save successful results as templates for similar companies",
                    ].map((tip, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <span className="text-cyan-500 mt-0.5">-</span>
                        <span>{tip}</span>
                      </motion.li>
                    ))}
                  </ul>
                </FormCard>
              </motion.div>
            )}

            {activeTab === "verify" && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <FormCard
                  title="Verify Email Address"
                  description="Check if an email address is valid, deliverable, and safe to send to."
                  icon={CheckCircle2}
                >
                  <form onSubmit={(e) => { e.preventDefault(); handleVerifyEmail(); }} className="space-y-4">
                    <Input
                      label="Email Address"
                      icon={Mail}
                      type="email"
                      required
                      value={verifierEmail}
                      onChange={(e) => setVerifierEmail(e.target.value)}
                      placeholder="john.doe@example.com"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setVerifierEmail("")}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setVerifierEmail("sarah.lee@acme.com")}
                      >
                        Try sample
                      </Button>
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        disabled={verifierLoading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                      >
                        {verifierLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Verify Email
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>

                  {verifierResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(verifierResult.status)}
                        <div>
                          <div className="text-slate-900 dark:text-slate-50 font-semibold text-base">
                            {verifierResult.email}
                          </div>
                          {verifierResult.cached && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">(Cached result)</div>
                          )}
                        </div>
                      </div>
                      <div className={`p-4 rounded-xl border text-sm ${getStatusColor(verifierResult.status)}`}>
                        <div className="font-semibold capitalize mb-1">{verifierResult.status}</div>
                        <div className="text-xs opacity-80 mb-1">{verifierResult.reason}</div>
                        {verifierResult.confidence !== null && (
                          <div className="text-xs opacity-80">
                            Confidence: {(verifierResult.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </FormCard>
              </motion.div>
            )}

            {activeTab === "bulk" && (
              <motion.div
                key="bulk"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <FormCard
                  title="Bulk Email Verification"
                  description="Verify up to 100 email addresses at once (one per line)."
                  icon={Sparkles}
                >
                  <form onSubmit={(e) => { e.preventDefault(); handleBulkVerify(); }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Email Addresses ({emailCount} entered, max 100)
                      </span>
                      {bulkResults.length > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"}/api/email-verifier/export/csv`
                              );
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `email_verifications_${new Date().toISOString().split("T")[0]}.csv`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                              showToast({
                                type: "success",
                                title: "Export successful",
                                message: "Verification results downloaded",
                              });
                            } catch (error: any) {
                              showToast({
                                type: "error",
                                title: "Export failed",
                                message: "Failed to export results",
                              });
                            }
                          }}
                          className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export CSV
                        </motion.button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <input
                        ref={bulkFileRef}
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        onChange={(event) => handleBulkFileImport(event.target.files?.[0] || null)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => bulkFileRef.current?.click()}
                      >
                        Upload CSV or TXT
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePasteFromClipboard}
                      >
                        Paste from clipboard
                      </Button>
                      <span>We will extract any emails from the file.</span>
                    </div>
                    <Textarea
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                      rows={10}
                      placeholder="john.doe@example.com&#10;jane.smith@example.com&#10;..."
                      helperText={`${emailCount} emails entered (max 100)`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setBulkEmails("")}
                      >
                        Clear list
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setBulkEmails(
                            ["sarah.lee@acme.com", "tony@northwind.io", "maria@contoso.com"].join("\n")
                          )
                        }
                      >
                        Load sample
                      </Button>
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        disabled={bulkLoading || emailCount === 0}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                      >
                        {bulkLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Verify All ({emailCount} emails)
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>

                  {bulkResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {["valid", "risky", "invalid", "unknown"].map((status) => (
                          <div
                            key={status}
                            className={`rounded-xl border px-3 py-2 text-xs ${getStatusColor(status)}`}
                          >
                            <div className="font-semibold capitalize">{status}</div>
                            <div className="text-sm font-bold">{bulkSummary[status] || 0}</div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/40 p-4 mb-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                          <span>Deliverability snapshot</span>
                          <span>{bulkTotal} verified</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-2 bg-emerald-500"
                            style={{ width: `${bulkValidRate}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {bulkValidRate}% deliverable
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            {bulkRiskRate}% risky
                          </span>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-4">
                        Results ({bulkResults.length})
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                        {bulkResults.map((result: any, idx: number) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {getStatusIcon(result.status)}
                              <div className="flex-1">
                                <div className="text-slate-900 dark:text-slate-50 font-semibold text-sm">
                                  {result.email}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {result.reason}
                                </div>
                              </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusColor(result.status)}`}>
                              {result.status}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </FormCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
