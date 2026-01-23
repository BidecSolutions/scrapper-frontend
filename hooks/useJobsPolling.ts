"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient, type GetJobsOptions, type Job } from "@/lib/api";

type JobsPollingOptions = {
  enabled?: boolean;
  intervalMs?: number;
  initialDelayMs?: number;
  pauseWhenHidden?: boolean;
  request?: GetJobsOptions;
};

export function useJobsPolling(intervalOrOptions: number | JobsPollingOptions = 30000) {
  const options = useMemo<JobsPollingOptions>(() => {
    if (typeof intervalOrOptions === "number") {
      return { intervalMs: intervalOrOptions };
    }
    return intervalOrOptions;
  }, [intervalOrOptions]);

  const enabled = options.enabled ?? true;
  const intervalMs = options.intervalMs ?? 30000;
  const initialDelayMs = options.initialDelayMs ?? 0;
  const pauseWhenHidden = options.pauseWhenHidden ?? true;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      if (!enabled) return;
      if (pauseWhenHidden && typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const requestOptions: GetJobsOptions = {
          limit: 100,
          include_ai: false,
          ...(options.request || {}),
        };
        const data = await apiClient.getJobs(requestOptions);
        if (!mountedRef.current) return;
        
        // Always set loading to false after receiving data (even if empty array)
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        if (!mountedRef.current) return;
        const errorMsg = err.response?.data?.detail || err.message || "Failed to load jobs";
        console.error("[useJobsPolling] Error loading jobs:", errorMsg, err);
        setError(errorMsg);
        setLoading(false);
        // Keep existing jobs on error (don't clear them)
      } finally {
        inFlightRef.current = false;
      }
    };

    const schedule = (delay: number) => {
      if (!mountedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await load();
        schedule(intervalMs);
      }, delay);
    };

    schedule(initialDelayMs);

    const onVisibility = () => {
      if (!mountedRef.current) return;
      if (!pauseWhenHidden) return;
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        schedule(0);
      }
    };

    if (pauseWhenHidden && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pauseWhenHidden && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [enabled, initialDelayMs, intervalMs, pauseWhenHidden]);

  return { jobs, loading, error };
}
