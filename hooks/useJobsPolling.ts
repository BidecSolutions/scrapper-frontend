"use client";

import { useEffect, useState, useRef } from "react";
import { apiClient, type Job } from "@/lib/api";

export function useJobsPolling(intervalMs = 30000) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const data = await apiClient.getJobs();
        if (!mountedRef.current) return;
        
        // Normalize data - handle both array and object responses
        const normalized = Array.isArray(data) 
          ? data 
          : (data as any)?.items || [];
        
        // Validate we got an array
        if (!Array.isArray(normalized)) {
          throw new Error(`Expected array but got ${typeof normalized}`);
        }
        
        // Always set loading to false after receiving data (even if empty array)
        setJobs(normalized);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        if (!mountedRef.current) return;
        const errorMsg = err.response?.data?.detail || err.message || "Failed to load jobs";
        console.error("[useJobsPolling] Error loading jobs:", errorMsg, err);
        setError(errorMsg);
        setLoading(false);
        // Keep existing jobs on error (don't clear them)
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
  }, [intervalMs]);

  return { jobs, loading, error };
}
