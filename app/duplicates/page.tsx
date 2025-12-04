"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RefreshCw, 
  Merge, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  Globe,
  MapPin,
  Loader2,
  Copy,
} from "lucide-react";
import { apiClient, type DuplicateGroup } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/metrics";

export default function DuplicatesPage() {
  const { showToast } = useToast();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);

  useEffect(() => {
    loadGroups();
    loadStats();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDuplicateGroups("pending");
      setGroups(data);
    } catch (error: any) {
      console.error("Failed to load duplicate groups:", error);
      showToast({
        type: "error",
        title: "Failed to load duplicates",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiClient.getDuplicateStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleDetect = async () => {
    try {
      setDetecting(true);
      const result = await apiClient.detectDuplicates();
      showToast({
        type: "success",
        title: "Detection complete",
        message: result.message,
      });
      await loadGroups();
      await loadStats();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Detection failed",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setDetecting(false);
    }
  };

  const handleMerge = async (groupId: number, canonicalLeadId: number) => {
    try {
      const result = await apiClient.mergeDuplicates(groupId, canonicalLeadId);
      showToast({
        type: "success",
        title: "Merge successful",
        message: result.message,
      });
      setShowMergeModal(false);
      setSelectedGroup(null);
      await loadGroups();
      await loadStats();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Merge failed",
        message: error?.response?.data?.detail || "Please try again",
      });
    }
  };

  const handleIgnore = async (groupId: number) => {
    if (!confirm("Are you sure you want to ignore this duplicate group? You can always detect duplicates again later.")) {
      return;
    }

    try {
      await apiClient.ignoreDuplicateGroup(groupId);
      showToast({
        type: "success",
        title: "Group ignored",
        message: "This duplicate group has been marked as ignored",
      });
      await loadGroups();
      await loadStats();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Failed to ignore",
        message: error?.response?.data?.detail || "Please try again",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Duplicate Detection"
        description="Find and merge duplicate leads automatically"
        icon={Copy}
        action={
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleDetect}
              disabled={detecting}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25"
            >
              {detecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Detect Duplicates
                </>
              )}
            </Button>
          </motion.div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          {stats && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-4"
            >
              <MetricCard label="Pending groups" value={stats.pending_groups} tone="info" />
              <MetricCard label="Total groups" value={stats.total_groups} />
              <MetricCard label="Merged groups" value={stats.merged_groups} tone="success" />
              <MetricCard label="Duplicate leads" value={stats.total_duplicate_leads} tone="danger" />
            </motion.section>
          )}

          {/* Duplicate Groups */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20"
              >
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-4" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading duplicate groups...</p>
              </motion.div>
            ) : groups.length === 0 ? (
              <motion.section
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-12 text-center shadow-2xl"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 mb-4 shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                  No duplicate groups found
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Click "Detect Duplicates" to scan your leads for potential duplicates
                </p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleDetect}
                    disabled={detecting}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                  >
                    {detecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Detect Duplicates
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.section>
            ) : (
              <motion.section
                key="groups"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {groups.map((group, index) => (
                  <DuplicateGroupCard
                    key={group.id}
                    group={group}
                    index={index}
                    onMerge={() => {
                      setSelectedGroup(group);
                      setShowMergeModal(true);
                    }}
                    onIgnore={() => handleIgnore(group.id)}
                  />
                ))}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Merge Modal */}
      <AnimatePresence>
        {showMergeModal && selectedGroup && (
          <MergeModal
            group={selectedGroup}
            onClose={() => {
              setShowMergeModal(false);
              setSelectedGroup(null);
            }}
            onMerge={handleMerge}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DuplicateGroupCard({
  group,
  index,
  onMerge,
  onIgnore,
}: {
  group: DuplicateGroup;
  index: number;
  onMerge: () => void;
  onIgnore: () => void;
}) {
  const confidenceColor =
    group.confidence_score >= 0.8
      ? "text-emerald-600 dark:text-emerald-400"
      : group.confidence_score >= 0.6
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  const matchReasonLabels: Record<string, string> = {
    same_email: "Same Email",
    same_domain_name: "Same Domain + Name",
    same_domain: "Same Domain",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Group #{group.id}
            </h3>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 ${confidenceColor}`}>
              {(group.confidence_score * 100).toFixed(0)}% confidence
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              {group.match_reason ? (matchReasonLabels[group.match_reason] || group.match_reason) : "Unknown"}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {group.leads.length} potential duplicate{group.leads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onMerge}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
            >
              <Merge className="w-4 h-4 mr-2" />
              Merge
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onIgnore}
              variant="outline"
            >
              <X className="w-4 h-4 mr-2" />
              Ignore
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="space-y-3">
        {group.leads.map((lead, idx) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 + idx * 0.02 }}
            className="flex items-start gap-3 p-4 rounded-xl glass border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-50">
                  {lead.name || "Unnamed Lead"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  #{lead.id}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                {lead.website && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">{lead.website}</span>
                  </div>
                )}
                {lead.emails && lead.emails.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{lead.emails[0]}</span>
                    {lead.emails.length > 1 && (
                      <span className="text-[10px]">+{lead.emails.length - 1}</span>
                    )}
                  </div>
                )}
                {lead.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{lead.city}</span>
                  </div>
                )}
              </div>
              {lead.matched_fields && lead.matched_fields.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lead.matched_fields.map((field: string) => (
                    <span
                      key={field}
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function MergeModal({
  group,
  onClose,
  onMerge,
}: {
  group: DuplicateGroup;
  onClose: () => void;
  onMerge: (groupId: number, canonicalLeadId: number) => void;
}) {
  const [selectedCanonical, setSelectedCanonical] = useState<number | null>(
    group.leads[0]?.id || null
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Merge className="w-5 h-5 text-cyan-500" />
            Merge Duplicates
          </h3>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
          >
            ×
          </motion.button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Select which lead to keep (canonical). All other leads will be merged into it, and their
          data (emails, phones, sources) will be combined.
        </p>

        <div className="space-y-3 mb-6">
          {group.leads.map((lead, idx) => (
            <motion.label
              key={lead.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedCanonical === lead.id
                  ? "border-cyan-500 dark:border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-lg"
                  : "border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700 bg-white dark:bg-slate-900/30"
              }`}
            >
              <input
                type="radio"
                name="canonical"
                value={lead.id}
                checked={selectedCanonical === lead.id}
                onChange={(e) => setSelectedCanonical(Number(e.target.value))}
                className="mt-1 w-4 h-4 text-cyan-600 focus:ring-cyan-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm text-slate-900 dark:text-slate-50 mb-2">
                  {lead.name || "Unnamed Lead"} #{lead.id}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  {lead.website && <div>🌐 {lead.website}</div>}
                  {lead.emails && lead.emails.length > 0 && (
                    <div>📧 {lead.emails.join(", ")}</div>
                  )}
                  {lead.phones && lead.phones.length > 0 && (
                    <div>📞 {lead.phones.join(", ")}</div>
                  )}
                </div>
              </div>
            </motion.label>
          ))}
        </div>

        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
            <Button
              onClick={() => {
                if (selectedCanonical) {
                  onMerge(group.id, selectedCanonical);
                }
              }}
              disabled={!selectedCanonical}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
            >
              <Merge className="w-4 h-4 mr-2" />
              Merge {group.leads.length - 1} duplicate{group.leads.length - 1 !== 1 ? "s" : ""}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onClose}
              variant="outline"
              className="px-6"
            >
              Cancel
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
