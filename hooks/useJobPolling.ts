"use client";

import { useEffect, useState, useRef } from "react";
import { apiClient, type Job } from "@/lib/api";

export function useJobPolling(jobId: number | string, intervalMs = 3000) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const data = await apiClient.getJob(Number(jobId));
        if (!mountedRef.current) return;
        
        setJob(data);
        setLoading(false);
        setError(null);
        
        // Stop polling when job is finished AND AI is not running
        const isJobFinished = data.status === "completed" || data.status === "failed" || data.status === "completed_with_warnings";
        const isAiRunning = data.ai_status === "running";
        
        if (isJobFinished && !isAiRunning && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (err: any) {
        if (!mountedRef.current) return;
        setError(err.message || "Failed to load job");
        setLoading(false);
        // Don't stop polling on error - might be temporary
      }
    };

    // Initial load
    load();
    
    // Set up polling
    timerRef.current = setInterval(load, intervalMs);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [jobId, intervalMs]);

  return { job, loading, error };
}

