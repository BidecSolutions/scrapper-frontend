"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface FailedLead {
  id: number;
  name?: string | null;
  website?: string | null;
  ai_last_error?: string | null;
  updated_at?: string | null;
}

export function EnrichmentProgressCard() {
  const [queue, setQueue] = useState<{
    pending: number;
    processing: number;
    success: number;
    failed: number;
    total: number;
  } | null>(null);
  const [failedLeads, setFailedLeads] = useState<FailedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(false);
  const [retryLimit, setRetryLimit] = useState(3);
  const [backoffMinutes, setBackoffMinutes] = useState(10);
  const [engineStatus, setEngineStatus] = useState<{ pending: number; processing: number; success: number; failed: number; total: number } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [queueData, failedData] = await Promise.all([
        apiClient.getEnrichmentQueue(),
        apiClient.listFailedEnrichment(8),
      ]);
      setQueue(queueData);
      setFailedLeads(failedData);
      try {
        const engine = await apiClient.getEnrichmentEngineStatus();
        setEngineStatus(engine);
      } catch {
        setEngineStatus(null);
      }
    } catch (error) {
      console.error("Failed to load enrichment progress:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const etaMinutes = queue ? Math.ceil((queue.pending + queue.processing) / 20) : 0;

  useEffect(() => {
    const storedValue = localStorage.getItem("enrichment_auto_retry");
    if (storedValue) {
      setAutoRetryEnabled(storedValue === "true");
    }
    const storedLimit = localStorage.getItem("enrichment_auto_retry_limit");
    if (storedLimit) {
      const parsed = Number(storedLimit);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setRetryLimit(Math.min(parsed, 10));
      }
    }
    const storedBackoff = localStorage.getItem("enrichment_auto_retry_backoff");
    if (storedBackoff) {
      const parsed = Number(storedBackoff);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setBackoffMinutes(Math.min(parsed, 60));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("enrichment_auto_retry", String(autoRetryEnabled));
  }, [autoRetryEnabled]);

  useEffect(() => {
    localStorage.setItem("enrichment_auto_retry_limit", String(retryLimit));
  }, [retryLimit]);

  useEffect(() => {
    localStorage.setItem("enrichment_auto_retry_backoff", String(backoffMinutes));
  }, [backoffMinutes]);

  const eligibleAutoRetryLeads = useMemo(() => {
    if (!autoRetryEnabled || failedLeads.length === 0) return [];
    const now = Date.now();
    return failedLeads.filter((lead) => {
      const record = localStorage.getItem(`enrichment_retry_${lead.id}`);
      if (!record) return true;
      try {
        const parsed = JSON.parse(record) as { count: number; last: number };
        if (parsed.count >= retryLimit) return false;
        if (parsed.last && now - parsed.last < backoffMinutes * 60 * 1000) return false;
        return true;
      } catch {
        return true;
      }
    });
  }, [autoRetryEnabled, backoffMinutes, failedLeads, retryLimit]);

  useEffect(() => {
    if (!autoRetryEnabled) return undefined;

    const timer = setInterval(async () => {
      if (retrying || eligibleAutoRetryLeads.length === 0) return;
      try {
        setRetrying(true);
        await apiClient.retryEnrichment(eligibleAutoRetryLeads.map((lead) => lead.id));
        const now = Date.now();
        eligibleAutoRetryLeads.forEach((lead) => {
          const record = localStorage.getItem(`enrichment_retry_${lead.id}`);
          let count = 0;
          try {
            if (record) {
              const parsed = JSON.parse(record) as { count: number };
              count = parsed.count || 0;
            }
          } catch {
            count = 0;
          }
          localStorage.setItem(
            `enrichment_retry_${lead.id}`,
            JSON.stringify({ count: count + 1, last: now })
          );
        });
        await loadData();
      } catch (error) {
        console.error("Failed to auto-retry enrichment:", error);
      } finally {
        setRetrying(false);
      }
    }, 120000);

    return () => clearInterval(timer);
  }, [autoRetryEnabled, eligibleAutoRetryLeads, loadData, retrying]);

  const failureSummary = useMemo(() => {
    if (failedLeads.length === 0) return [];
    const counts = failedLeads.reduce<Record<string, number>>((acc, lead) => {
      const key = lead.ai_last_error ? lead.ai_last_error.trim() : "Unknown error";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count }));
  }, [failedLeads]);

  const retrySummary = useMemo(() => {
    if (failedLeads.length === 0) {
      return {
        failed: 0,
        eligible: 0,
        atLimit: 0,
        coolingDown: 0,
      };
    }
    const now = Date.now();
    let atLimit = 0;
    let coolingDown = 0;
    failedLeads.forEach((lead) => {
      const record = localStorage.getItem(`enrichment_retry_${lead.id}`);
      if (!record) return;
      try {
        const parsed = JSON.parse(record) as { count: number; last?: number };
        if (parsed.count >= retryLimit) {
          atLimit += 1;
          return;
        }
        if (parsed.last && now - parsed.last < backoffMinutes * 60 * 1000) {
          coolingDown += 1;
        }
      } catch {
        // ignore parsing errors
      }
    });
    return {
      failed: failedLeads.length,
      eligible: eligibleAutoRetryLeads.length,
      atLimit,
      coolingDown,
    };
  }, [backoffMinutes, eligibleAutoRetryLeads.length, failedLeads, retryLimit]);

  const handleRetryAll = async () => {
    if (failedLeads.length === 0) return;
    try {
      setRetrying(true);
      const leadIds = failedLeads.map((lead) => lead.id);
      await apiClient.retryEnrichment(leadIds);
      const now = Date.now();
      leadIds.forEach((leadId) => {
        const record = localStorage.getItem(`enrichment_retry_${leadId}`);
        let count = 0;
        try {
          if (record) {
            const parsed = JSON.parse(record) as { count: number };
            count = parsed.count || 0;
          }
        } catch {
          count = 0;
        }
        localStorage.setItem(
          `enrichment_retry_${leadId}`,
          JSON.stringify({ count: count + 1, last: now })
        );
      });
      await loadData();
    } catch (error) {
      console.error("Failed to retry enrichment:", error);
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/60 p-6 shadow-2xl animate-pulse h-40" />
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/60 p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            AI Enrichment Progress
          </h3>
        </div>
        <button
          onClick={loadData}
          className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
        Track enrichment throughput, retry failed leads, and tune auto-retry safeguards.
      </p>

      {queue && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {[
            { label: "Pending", value: queue.pending },
            { label: "Processing", value: queue.processing },
            { label: "Enriched", value: queue.success },
            { label: "Failed", value: queue.failed },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-950/50 px-3 py-2">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{stat.label}</div>
              <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {queue && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          ETA: ~{etaMinutes} minutes at 20 leads/minute
        </div>
      )}

      {engineStatus && (
        <div className="mb-4 text-[11px] text-slate-500 dark:text-slate-400">
          Engine snapshot: {engineStatus.pending} pending, {engineStatus.processing} processing, {engineStatus.failed} failed.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 bg-white/80 dark:bg-slate-900/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Retry Queue
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetryAll}
            disabled={retrying || failedLeads.length === 0}
          >
            {retrying ? "Retrying..." : "Retry all"}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-4">
          <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/60 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide">Failed</div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{retrySummary.failed}</div>
          </div>
          <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/60 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide">Eligible</div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{retrySummary.eligible}</div>
          </div>
          <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/60 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide">Cooling</div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{retrySummary.coolingDown}</div>
          </div>
          <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/60 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide">Maxed</div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{retrySummary.atLimit}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Auto-retry checks every 2 minutes</span>
          <button
            onClick={() => setAutoRetryEnabled((value) => !value)}
            className={`px-2 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
              autoRetryEnabled
                ? "border-cyan-400 text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30"
                : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
            }`}
          >
            {autoRetryEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 dark:text-slate-400 mb-4">
          <label className="flex flex-col gap-1">
            Retry limit
            <input
              type="number"
              min={1}
              max={10}
              value={retryLimit}
              onChange={(e) => setRetryLimit(Math.max(1, Math.min(Number(e.target.value) || 1, 10)))}
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/40 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
            />
            <span className="text-[10px] text-slate-400">Per lead before pausing.</span>
          </label>
          <label className="flex flex-col gap-1">
            Backoff window (min)
            <input
              type="number"
              min={1}
              max={60}
              value={backoffMinutes}
              onChange={(e) => setBackoffMinutes(Math.max(1, Math.min(Number(e.target.value) || 1, 60)))}
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/40 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
            />
            <span className="text-[10px] text-slate-400">Wait time between retries.</span>
          </label>
        </div>

        {autoRetryEnabled && eligibleAutoRetryLeads.length === 0 && failedLeads.length > 0 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-4">
            Auto-retry paused: leads are cooling down or reached retry limit.
          </p>
        )}

        {failureSummary.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Top failure reasons
            </div>
            <div className="space-y-1">
              {failureSummary.map((summary) => (
                <div key={summary.reason} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="line-clamp-1">{summary.reason}</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-200">{summary.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {failedLeads.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No failed enrichments in the queue.
          </p>
        ) : (
          <div className="space-y-2">
            {failedLeads.map((lead) => (
              <div key={lead.id} className="flex items-start justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    {lead.name || lead.website || `Lead #${lead.id}`}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {lead.ai_last_error || "No error message"}
                  </p>
                </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      setRetrying(true);
                      await apiClient.retryEnrichment([lead.id]);
                      const now = Date.now();
                      const record = localStorage.getItem(`enrichment_retry_${lead.id}`);
                      let count = 0;
                      try {
                        if (record) {
                          const parsed = JSON.parse(record) as { count: number };
                          count = parsed.count || 0;
                        }
                      } catch {
                        count = 0;
                      }
                      localStorage.setItem(
                        `enrichment_retry_${lead.id}`,
                        JSON.stringify({ count: count + 1, last: now })
                      );
                      await loadData();
                      setRetrying(false);
                    }}
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                  >
                  Retry
                </motion.button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
