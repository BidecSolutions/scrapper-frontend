import axios, { AxiosInstance } from "axios";
import { trackApiError } from "@/lib/monitoring";

// Get API URL from environment variables
// Priority: NEXT_PUBLIC_API_URL > (NEXT_PUBLIC_API_HOST + NEXT_PUBLIC_API_PORT) > default
function getApiUrl(): string {
  // If full URL is provided, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Otherwise, construct from host and port
  const host = process.env.NEXT_PUBLIC_API_HOST || "localhost";
  const port = process.env.NEXT_PUBLIC_API_PORT || "8002";

  return `http://${host}:${port}`;
}

const API_URL = getApiUrl();

// Export API URL for use in other files (e.g., direct fetch calls)
export { API_URL };

// Types
export interface Lead {
  id: number;
  name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  source: string | null;
  quality_score: number | null;
  tags: string[];
  tech_stack: string[];
  matched_fields?: string[];
  created_at: string;
  updated_at: string;
  ai_status?: string | null;
  ai_last_error?: string | null;
  [key: string]: any;
}

export interface SavedView {
  id: number;
  name: string;
  filters: Record<string, any>;
  sort_by?: string;
  sort_order?: string;
  is_pinned?: boolean;
  is_shared?: boolean;
  share_token?: string | null;
  share_enabled?: boolean;
  created_at: string;
  [key: string]: any;
}

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "ai_pending" | "completed_with_warnings";

export interface Job {
  id: number;
  niche: string;
  location: string | null;
  status: JobStatus | string;
  total_leads: number;
  created_at: string;
  completed_at: string | null;
  started_at?: string | null;
  duration_seconds?: number | null;
  processed_targets?: number | null;
  total_targets?: number | null;
  ai_status?: "idle" | "running" | "ready" | "error" | "disabled";
  ai_summary?: string | null;
  ai_segments?: Array<{
    name: string;
    description: string;
    ideal_use_case: string;
    rough_percentage_of_leads: number;
  }> | null;
  ai_error?: string | null;
  [key: string]: any;
}

export interface JobLog {
  id: number;
  created_at: string | null;
  activity_type: string;
  description: string;
  meta: Record<string, any>;
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  status: "pending" | "active" | "suspended";
  is_super_admin: boolean;
  can_use_advanced: boolean;
  organization_id: number | null;
  current_workspace_id: number | null;
  created_at: string;
  last_login_at: string | null;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan_tier: string;
  logo_url?: string | null;
  brand_name?: string | null;
  tagline?: string | null;
  created_at: string;
}

export interface DuplicateGroup {
  id: number;
  leads: Lead[];
  similarity_score: number;
  confidence_score: number;
  match_reason?: string;
  status: string;
  created_at: string;
}

export interface SocialInsights {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  posts_per_month?: number;
  avg_engagement?: number;
  topic_distribution?: Record<string, number>;
  dominant_topics?: string[];
  sentiment_distribution?: Record<string, number>;
  growth_stage?: string;
  dominant_pain?: string;
  summary?: string;
  [key: string]: any;
}

export interface HealthScore {
  score: number;
  grade: string;
  breakdown?: Record<string, { status: string;[key: string]: any }>;
  recommendations?: any[];
  [key: string]: any;
}

export interface OnboardingStatus {
  total_leads: number;
  verified_emails: number;
  linkedin_leads: number;
  jobs_count: number;
  steps: Array<{
    id: string;
    label: string;
    completed: boolean;
    action_url?: string;
  }>;
}

export interface LeadScoreExplain {
  total: number;
  deliverability: { points: number; status?: string | null };
  fit: { points: number; segments: Array<{ segment_id: number; reply_rate: number }>; title?: string | null; company_size_bucket?: string | null };
  engagement: { points: number; opened_any: boolean; clicked_any: boolean; replied_any: boolean; bounced_any: boolean };
  source: { points: number; source: string };
  notes: string[];
}

export interface LlmHealth {
  configured: boolean;
  provider: string | null;
  status: "ok" | "missing_key" | "error";
  message: string;
}

export type GetJobsOptions = {
  status?: string;
  limit?: number;
  offset?: number;
  include_ai?: boolean;
};

// API Client
class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const cfg = config as any;
        if (!cfg.timeout) {
          cfg.timeout = 15000;
        }
        cfg.metadata = { startTime: Date.now() };
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        const cfg = response.config as any;
        const start = cfg?.metadata?.startTime;
        if (start) {
          const durationMs = Date.now() - start;
          if (process.env.NEXT_PUBLIC_PERF_LOG === "true" && durationMs > 1500) {
            console.warn("[API Perf] Slow request", {
              url: response.config.url,
              method: response.config.method,
              durationMs,
            });
          }
        }
        // Optional debug logging (avoid noisy console in dev by default)
        if (process.env.NEXT_PUBLIC_API_DEBUG === "true" && response.config.url?.includes("/api/jobs")) {
          console.log("[API Debug] Jobs response:", {
            url: response.config.url,
            status: response.status,
            dataType: typeof response.data,
            isArray: Array.isArray(response.data),
            dataLength: Array.isArray(response.data) ? response.data.length : "N/A",
          });
        }
        return response;
      },
      async (error) => {
        if (process.env.NEXT_PUBLIC_API_DEBUG === "true") {
          console.error("[API Debug] Request error:", {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
          });
        }
        trackApiError({
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
        });
        const config = error.config as any;
        if (config) {
          const method = (config.method || "get").toLowerCase();
          const status = error.response?.status;
          const isIdempotent = method === "get";
          const isRetryableStatus = !status || status >= 500 || status === 429;
          const isRetryableError = error.code === "ECONNABORTED" || error.message?.includes("timeout");
          if (isIdempotent && (isRetryableStatus || isRetryableError)) {
            config.__retryCount = config.__retryCount || 0;
            if (config.__retryCount < 2) {
              config.__retryCount += 1;
              const delayMs = status === 429 ? 800 * config.__retryCount : 300 * config.__retryCount;
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              return this.client.request(config);
            }
          }
        }
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.token = null;
          localStorage.removeItem("auth_token");
        }
        return Promise.reject(error);
      }
    );
  }

  async getLlmHealth(): Promise<LlmHealth> {
    const response = await this.client.get("/api/health/llm");
    return response.data;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common["Authorization"];
    }
  }

  // Auth endpoints
  async getMe(): Promise<User> {
    const response = await this.client.get("/api/me");
    return response.data;
  }

  async login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const response = await this.client.post("/api/auth/login", { email, password });
    return response.data;
  }

  // Organization endpoints
  async getOrganization(): Promise<Organization> {
    const response = await this.client.get("/api/organization");
    return response.data;
  }

  async updateOrganization(name: string, brandName?: string | null, tagline?: string | null): Promise<Organization> {
    const response = await this.client.patch("/api/organization", {
      name,
      brand_name: brandName || undefined,
      tagline: tagline || undefined,
    });
    return response.data;
  }

  // Lead endpoints
  async getLeads(workspaceId?: number, filters?: Record<string, any>): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (workspaceId) params.append("workspace_id", workspaceId.toString());
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const response = await this.client.get(`/api/leads?${params.toString()}`);
    return response.data;
  }

  async getJobLeads(jobId: number): Promise<Lead[]> {
    const response = await this.client.get(`/api/jobs/${jobId}/leads`);
    return response.data;
  }

  async getLead(leadId: number): Promise<Lead> {
    const response = await this.client.get(`/api/leads/${leadId}`);
    return response.data;
  }

  async getDossier(leadId: number): Promise<any> {
    const response = await this.client.get(`/api/leads/${leadId}/dossier`);
    return response.data;
  }

  async generateDossier(leadId: number): Promise<any> {
    const response = await this.client.post(`/api/leads/${leadId}/dossier/generate`);
    return response.data;
  }

  async getSimilarLeads(leadId: number, scope: string, limit?: number): Promise<any> {
    const params = new URLSearchParams();
    params.append("scope", scope);
    if (limit) params.append("limit", limit.toString());
    const response = await this.client.get(`/api/leads/${leadId}/similar?${params.toString()}`);
    return response.data;
  }

  async getNextAction(leadId: number): Promise<any> {
    const response = await this.client.get(`/api/leads/${leadId}/next-action`);
    return response.data;
  }

  async getLeadTechStack(leadId: number): Promise<any> {
    const response = await this.client.get(`/api/leads/${leadId}/tech-stack`);
    return response.data;
  }

  async getKeyPeople(leadId: number, limit?: number): Promise<any> {
    const params = limit ? `?limit=${limit}` : "";
    const response = await this.client.get(`/api/leads/${leadId}/key-people${params}`);
    return response.data;
  }

  async getLeadHealthScore(leadId: number): Promise<any> {
    const response = await this.client.get(`/api/leads/${leadId}/health-score`);
    return response.data;
  }

  async getLeadScoreExplain(leadId: number): Promise<LeadScoreExplain> {
    const response = await this.client.get(`/api/leads/${leadId}/score-explain`);
    return response.data;
  }

  async getLeadScoreHistory(leadId: number, limit?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    const queryString = params.toString();
    const response = await this.client.get(`/api/leads/${leadId}/score-history${queryString ? `?${queryString}` : ""}`);
    return response.data;
  }

  async verifyEmailForLead(email: string, leadId: number): Promise<any> {
    const response = await this.client.post(`/api/leads/${leadId}/emails/verify`, { email });
    return response.data;
  }

  async findEmailForLead(leadId: number, firstName: string, lastName: string, domain?: string): Promise<any> {
    const response = await this.client.post(`/api/leads/${leadId}/emails/find`, {
      first_name: firstName,
      last_name: lastName,
      domain,
    });
    return response.data;
  }

  async saveEmailToLeads(data: {
    first_name?: string;
    last_name?: string;
    email: string;
    domain?: string;
    company_name?: string;
    confidence?: number;
  }): Promise<any> {
    const response = await this.client.post("/api/leads/from-email", data);
    return response.data;
  }

  async bulkUpdateLeadTags(data: {
    lead_ids: number[];
    tag: string;
    action?: "add" | "remove";
  }): Promise<{ updated: number; tag: string }> {
    const response = await this.client.post("/api/leads/tags/bulk", data);
    return response.data;
  }

  // Email finder endpoints
  async findEmail(firstName: string, lastName: string, domain: string, skipSmtp?: boolean): Promise<any> {
    const response = await this.client.post("/api/email-finder/find", {
      first_name: firstName,
      last_name: lastName,
      domain,
      skip_smtp: skipSmtp,
    });
    return response.data;
  }

  async verifyEmail(email: string): Promise<{ status: string; reason: string }> {
    const response = await this.client.post("/api/email-finder/verify", { email });
    return response.data;
  }

  async verifyEmailsBulk(emails: string[]): Promise<{ results: any[]; total: number }> {
    const response = await this.client.post("/api/email-finder/verify-bulk", { emails });
    return response.data;
  }

  // Job endpoints
  async getJobs(statusOrOptions?: string | GetJobsOptions): Promise<Job[]> {
    const options: GetJobsOptions =
      typeof statusOrOptions === "string" ? { status: statusOrOptions } : statusOrOptions || {};

    const params = new URLSearchParams();
    if (options.status) params.append("status", options.status);
    if (options.limit !== undefined) params.append("limit", String(options.limit));
    if (options.offset !== undefined) params.append("offset", String(options.offset));
    if (options.include_ai) params.append("include_ai", "true");

    const url = `/api/jobs${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await this.client.get(url);

    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray((data as any).items)) return (data as any).items;
    return [];
  }

  async getJob(jobId: number): Promise<Job> {
    const response = await this.client.get(`/api/jobs/${jobId}`);
    return response.data;
  }

  async triggerJobAiInsights(jobId: number): Promise<Job> {
    const response = await this.client.post(`/api/jobs/${jobId}/ai-insights`);
    return response.data;
  }

  async createSavedViewFromSegment(jobId: number, segmentIndex: number): Promise<any> {
    const response = await this.client.post(`/api/jobs/${jobId}/ai-segments/${segmentIndex}/saved-view`);
    return response.data;
  }

  async createPlaybookFromSegment(jobId: number, segmentIndex: number): Promise<any> {
    const response = await this.client.post(`/api/jobs/${jobId}/ai-segments/${segmentIndex}/playbook`);
    return response.data;
  }

  async createJob(data: {
    niche: string;
    location?: string;
    max_results?: number;
    max_pages_per_site?: number;
    sources?: string[];
    extract?: {
      emails?: boolean;
      phones?: boolean;
      website_content?: boolean;
      services?: boolean;
      social_links?: boolean;
      social_numbers?: boolean;
    };
  }): Promise<Job> {
    const response = await this.client.post("/api/jobs/run-once", data);
    return response.data;
  }

  async retryJob(jobId: number): Promise<Job> {
    const response = await this.client.post(`/api/jobs/${jobId}/retry`);
    return response.data;
  }

  async getJobLogs(jobId: number): Promise<JobLog[]> {
    const response = await this.client.get(`/api/jobs/${jobId}/logs`);
    return response.data;
  }

  // Saved views
  async getSavedViews(pageType?: string): Promise<SavedView[]> {
    const params = pageType ? `?page_type=${pageType}` : "";
    const response = await this.client.get(`/api/saved-views${params}`);
    return response.data;
  }

  async createSavedView(data: {
    name: string;
    filters?: Record<string, any>;
    page_type?: string;
    sort_by?: string;
    sort_order?: string;
    is_pinned?: boolean;
    is_shared?: boolean;
  }): Promise<SavedView> {
    const response = await this.client.post("/api/saved-views", data);
    return response.data;
  }

  async updateSavedView(viewId: number, updates: {
    name?: string;
    filters?: Record<string, any>;
    sort_by?: string;
    sort_order?: string;
    is_pinned?: boolean;
    is_shared?: boolean;
  }): Promise<SavedView> {
    const response = await this.client.patch(`/api/saved-views/${viewId}`, updates);
    return response.data;
  }

  async deleteSavedView(viewId: number): Promise<any> {
    const response = await this.client.delete(`/api/saved-views/${viewId}`);
    return response.data;
  }

  async useSavedView(viewId: number): Promise<any> {
    const response = await this.client.post(`/api/saved-views/${viewId}/use`);
    return response.data;
  }

  async createSavedViewShareLink(viewId: number): Promise<{ share_token: string; share_enabled: boolean }> {
    const response = await this.client.post(`/api/saved-views/${viewId}/share`);
    return response.data;
  }

  async getSharedSavedView(token: string): Promise<SavedView> {
    const response = await this.client.get(`/api/saved-views/shared/${token}`);
    return response.data;
  }

  // Lookalike endpoints
  async createLookalikeJob(data: {
    lead_ids?: number[];
    source_segment_id?: number;
    source_list_id?: number;
    similarity_threshold?: number;
    min_score?: number;
    max_results?: number;
  }): Promise<Job> {
    const response = await this.client.post("/api/lookalike/jobs", data);
    return response.data;
  }

  // Social insights
  async getSocialInsights(leadId: number): Promise<SocialInsights> {
    const response = await this.client.get(`/api/v2/leads/${leadId}/social-insights`);
    return response.data;
  }

  // Duplicate detection
  async getDuplicateGroups(status?: string): Promise<DuplicateGroup[]> {
    const params = status ? `?status=${status}` : "";
    const response = await this.client.get(`/api/duplicates/groups${params}`);
    return response.data;
  }

  async getDuplicateStats(): Promise<any> {
    const response = await this.client.get("/api/duplicates/stats");
    return response.data;
  }

  async detectDuplicates(): Promise<any> {
    const response = await this.client.post("/api/duplicates/detect");
    return response.data;
  }

  async mergeDuplicates(groupId: number, canonicalLeadId: number): Promise<{ message: string }> {
    const response = await this.client.post(`/api/duplicates/groups/${groupId}/merge`, {
      canonical_lead_id: canonicalLeadId,
    });
    return response.data;
  }

  async ignoreDuplicateGroup(groupId: number): Promise<any> {
    const response = await this.client.post(`/api/duplicates/groups/${groupId}/ignore`);
    return response.data;
  }

  // Usage endpoints
  async getUsage(): Promise<any> {
    const response = await this.client.get("/api/usage/me/usage");
    return response.data;
  }

  // Export endpoints
  async exportLeads(format: "csv" | "json" | "excel" = "csv", filters?: Record<string, any>): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    params.append("format", format);
    const response = await this.client.get(`/api/leads/export?${params.toString()}`, {
      responseType: "blob",
    });
    return response.data;
  }

  // Admin endpoints
  async getAdminUsers(params?: {
    page?: number;
    page_size?: number;
    q?: string;
    status?: string;
  }): Promise<{ items: any[]; total: number; page: number; page_size: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.q) queryParams.append("q", params.q);
    if (params?.status) queryParams.append("status", params.status);

    const queryString = queryParams.toString();
    const url = `/api/admin/users${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async createUser(data: {
    email: string;
    password: string;
    full_name?: string;
    is_super_admin?: boolean;
    can_use_advanced?: boolean;
    status?: "pending" | "active" | "suspended";
  }): Promise<any> {
    const response = await this.client.post("/api/admin/users", data);
    return response.data;
  }

  async updateAdminUser(
    userId: number,
    updates: {
      status?: "pending" | "active" | "suspended";
      can_use_advanced?: boolean;
      is_super_admin?: boolean;
    }
  ): Promise<any> {
    const response = await this.client.patch(`/api/admin/users/${userId}`, updates);
    return response.data;
  }

  // Verification endpoints
  async getVerificationJobs(params?: { limit?: number; status?: string }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);

    const queryString = queryParams.toString();
    const url = `/api/verification/jobs${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async createBulkVerifyFromLeads(leadIds: number[]): Promise<any> {
    const response = await this.client.post("/api/verification/jobs/from-leads", {
      lead_ids: leadIds,
    });
    return response.data;
  }

  async createBulkVerifyFromCSV(emails: string[]): Promise<any> {
    const response = await this.client.post("/api/verification/jobs/from-csv", {
      emails,
    });
    return response.data;
  }

  async getVerificationSla(): Promise<any> {
    const response = await this.client.get("/api/verification/sla");
    return response.data;
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<any> {
    const response = await this.client.get("/api/dashboard/stats");
    return response.data;
  }

  async getHealthScoreStats(): Promise<any> {
    const response = await this.client.get("/api/health/stats");
    return response.data;
  }

  async getDeliverabilityStats(): Promise<any> {
    const response = await this.client.get("/api/dashboard/deliverability");
    return response.data;
  }

  async getOnboardingStatus(): Promise<OnboardingStatus> {
    const response = await this.client.get("/api/onboarding/status");
    return response.data;
  }

  async getLinkedInActivity(): Promise<any> {
    const response = await this.client.get("/api/dashboard/linkedin-activity");
    return response.data;
  }

  async getPipelineStats(): Promise<any> {
    const response = await this.client.get("/api/dashboard/pipeline");
    return response.data;
  }

  async getPipelineSummary(): Promise<any> {
    const response = await this.client.get("/api/dashboard/pipeline/summary");
    return response.data;
  }

  // Admin utilities
  async seedDemoData(): Promise<any> {
    const response = await this.client.post("/api/admin/seed-demo");
    return response.data;
  }

  // Enrichment queue endpoints
  async createBulkEnrichment(leadIds: number[], force?: boolean): Promise<any> {
    const response = await this.client.post("/api/enrichment/jobs", {
      lead_ids: leadIds,
      force: force || false,
    });
    return response.data;
  }

  async getEnrichmentQueue(): Promise<{ pending: number; processing: number; success: number; failed: number; total: number }> {
    const response = await this.client.get("/api/enrichment/queue");
    return response.data;
  }

  async listFailedEnrichment(limit?: number): Promise<any[]> {
    const params = limit ? `?limit=${limit}` : "";
    const response = await this.client.get(`/api/enrichment/failed${params}`);
    return response.data;
  }

  async retryEnrichment(leadIds: number[]): Promise<any> {
    const response = await this.client.post("/api/enrichment/retry", { lead_ids: leadIds });
    return response.data;
  }

  // Notifications endpoints
  async getNotifications(unreadOnly?: boolean, limit?: number): Promise<{ items: any[]; unread_count: number }> {
    const queryParams = new URLSearchParams();
    if (unreadOnly) queryParams.append("unread_only", "true");
    if (limit) queryParams.append("limit", limit.toString());

    const queryString = queryParams.toString();
    const url = `/api/notifications${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async markNotificationAsRead(notificationId: number): Promise<any> {
    const response = await this.client.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  }

  async updateNotification(notificationId: number, updates: { is_read?: boolean }): Promise<any> {
    const response = await this.client.patch(`/api/notifications/${notificationId}`, updates);
    return response.data;
  }

  async markAllNotificationsRead(): Promise<any> {
    const response = await this.client.post("/api/notifications/mark-all-read");
    return response.data;
  }

  // Activity endpoints
  async getWorkspaceActivity(params?: {
    page?: number;
    page_size?: number;
    type?: string;
    actor_user_id?: number;
    since?: string;
    until?: string;
  }): Promise<{ items: any[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.type) queryParams.append("type", params.type);
    if (params?.actor_user_id) queryParams.append("actor_user_id", params.actor_user_id.toString());
    if (params?.since) queryParams.append("since", params.since);
    if (params?.until) queryParams.append("until", params.until);

    const queryString = queryParams.toString();
    const url = `/api/activity/workspace${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async exportWorkspaceActivityCsv(params?: {
    type?: string;
    actor_user_id?: number;
    since?: string;
    until?: string;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append("type", params.type);
    if (params?.actor_user_id) queryParams.append("actor_user_id", params.actor_user_id.toString());
    if (params?.since) queryParams.append("since", params.since);
    if (params?.until) queryParams.append("until", params.until);
    const queryString = queryParams.toString();
    const url = `/api/activity/export/csv${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url, { responseType: "blob" });
    return response.data;
  }

  async getAdminActivity(params?: {
    page?: number;
    page_size?: number;
    workspace_id?: number;
    actor_user_id?: number;
    type?: string;
    since?: string;
    until?: string;
  }): Promise<{ items: any[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.workspace_id) queryParams.append("workspace_id", params.workspace_id.toString());
    if (params?.actor_user_id) queryParams.append("actor_user_id", params.actor_user_id.toString());
    if (params?.type) queryParams.append("type", params.type);
    if (params?.since) queryParams.append("since", params.since);
    if (params?.until) queryParams.append("until", params.until);

    const queryString = queryParams.toString();
    const url = `/api/admin/activity${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async exportAdminActivityCsv(params?: {
    workspace_id?: number;
    actor_user_id?: number;
    type?: string;
    since?: string;
    until?: string;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params?.workspace_id) queryParams.append("workspace_id", params.workspace_id.toString());
    if (params?.actor_user_id) queryParams.append("actor_user_id", params.actor_user_id.toString());
    if (params?.type) queryParams.append("type", params.type);
    if (params?.since) queryParams.append("since", params.since);
    if (params?.until) queryParams.append("until", params.until);
    const queryString = queryParams.toString();
    const url = `/api/admin/activity/export/csv${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url, { responseType: "blob" });
    return response.data;
  }

  // Settings endpoints
  async getApiKeys(): Promise<any> {
    const response = await this.client.get("/api/settings/api-keys");
    return response.data;
  }

  async getUsageStats(): Promise<any> {
    const response = await this.client.get("/api/usage/stats");
    return response.data;
  }

  async createApiKey(name?: string): Promise<any> {
    const response = await this.client.post("/api/settings/api-keys", { name });
    return response.data;
  }

  async revokeApiKey(keyId: number): Promise<any> {
    const response = await this.client.delete(`/api/settings/api-keys/${keyId}`);
    return response.data;
  }

  async uploadLogo(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await this.client.post("/api/organization/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async deleteLogo(): Promise<any> {
    const response = await this.client.delete("/api/organization/logo");
    return response.data;
  }

  // Templates endpoints
  async getTemplates(params?: {
    page?: number;
    page_size?: number;
    q?: string;
    status?: string;
    kind?: string;
    tag?: string;
  }): Promise<{ items: any[]; total: number; page: number; page_size: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.q) queryParams.append("q", params.q);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.kind) queryParams.append("kind", params.kind);
    if (params?.tag) queryParams.append("tag", params.tag);

    const queryString = queryParams.toString();
    const url = `/api/templates${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async getTemplate(templateId: number): Promise<any> {
    const response = await this.client.get(`/api/templates/${templateId}`);
    return response.data;
  }

  async createTemplate(data: any): Promise<any> {
    const response = await this.client.post("/api/templates", data);
    return response.data;
  }

  async updateTemplate(templateId: number, data: any): Promise<any> {
    const response = await this.client.patch(`/api/templates/${templateId}`, data);
    return response.data;
  }

  async approveTemplate(templateId: number): Promise<any> {
    const response = await this.client.post(`/api/templates/${templateId}/approve`);
    return response.data;
  }

  async rejectTemplate(templateId: number, reason?: string): Promise<any> {
    const response = await this.client.post(`/api/templates/${templateId}/reject`, { reason });
    return response.data;
  }

  async getTemplateGovernance(): Promise<any> {
    const response = await this.client.get("/api/templates/governance");
    return response.data;
  }

  async updateTemplateGovernance(data: {
    require_approval_for_new_templates?: boolean;
    restrict_to_approved_only?: boolean;
    allow_personal_templates?: boolean;
    require_unsubscribe?: boolean;
  }): Promise<any> {
    const response = await this.client.patch("/api/templates/governance", data);
    return response.data;
  }

  // Robots endpoints
  async getRobots(): Promise<any[]> {
    const response = await this.client.get("/api/robots");
    return response.data;
  }

  async getRobot(robotId: number): Promise<any> {
    const response = await this.client.get(`/api/robots/${robotId}`);
    return response.data;
  }

  async getRobotRuns(robotId: number): Promise<{ runs?: any[] }> {
    const response = await this.client.get(`/api/robots/${robotId}/runs`);
    const data = response.data;
    // Handle both array and object responses
    if (Array.isArray(data)) {
      return { runs: data };
    }
    return data;
  }

  async createRobotFromPrompt(prompt: string, sampleUrl?: string): Promise<any> {
    const response = await this.client.post("/api/robots/from-prompt", {
      prompt,
      sample_url: sampleUrl,
    });
    return response.data;
  }

  async saveRobot(data: any): Promise<any> {
    const response = await this.client.post("/api/robots", data);
    return response.data;
  }

  async testRobot(robotId: number, url: string, searchQuery?: string): Promise<any> {
    const response = await this.client.post(`/api/robots/${robotId}/test`, { url, search_query: searchQuery });
    return response.data;
  }

  // Playbook endpoints
  async getPlaybookJobs(limit?: number): Promise<any[]> {
    const params = limit ? `?limit=${limit}` : "";
    const response = await this.client.get(`/api/playbooks/jobs${params}`);
    return response.data;
  }

  async getPlaybookJob(jobId: number): Promise<any> {
    const response = await this.client.get(`/api/playbooks/jobs/${jobId}`);
    return response.data;
  }

  async runLinkedInCampaignPlaybook(data: any): Promise<any> {
    const response = await this.client.post("/api/playbooks/run-linkedin-campaign", data);
    return response.data;
  }

  // Lookalike endpoints
  async getLookalikeJob(jobId: number, limit?: number, offset?: number): Promise<any> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append("limit", limit.toString());
    if (offset) queryParams.append("offset", offset.toString());

    const queryString = queryParams.toString();
    const url = `/api/lookalike/jobs/${jobId}${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async listLookalikeJobs(): Promise<any[]> {
    const response = await this.client.get("/api/lookalike/jobs");
    return response.data;
  }

  // Health endpoints
  async getHealth(days?: number): Promise<any> {
    const params = days ? `?days=${days}` : "";
    const response = await this.client.get(`/api/health${params}`);
    return response.data;
  }

  async getAllWorkspacesHealth(): Promise<any> {
    const response = await this.client.get("/api/admin/health/all-workspaces");
    return response.data;
  }

  // Google Maps endpoints
  async searchGoogleMaps(params: {
    query: string;
    location?: string;
    max_results?: number;
    headless?: boolean;
    extract_emails?: boolean;
    aggressive_scroll?: boolean;
    signal?: AbortSignal;
  }): Promise<{
    success: boolean;
    results: Array<{
      name?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      rating?: number | null;
      reviews?: number | null;
      category?: string | null;
      open_status?: string | null;
    }>;
    total_found: number;
    query: string;
    location?: string | null;
  }> {
    const { signal, ...payload } = params;
    const response = await this.client.post("/api/google-maps/search", payload, { signal });
    return response.data;
  }

  async searchLinkedIn(params: {
    query: string;
    max_results?: number;
    headless?: boolean;
    signal?: AbortSignal;
  }): Promise<{
    success: boolean;
    results: Array<{
      full_name?: string | null;
      headline?: string | null;
      company_name?: string | null;
      location?: string | null;
      linkedin_url: string;
      success: boolean;
      error?: string | null;
    }>;
    total_found: number;
    query: string;
  }> {
    const { signal, ...payload } = params;
    const response = await this.client.post("/api/linkedin/search", payload, {
      signal,
      timeout: 300000
    });
    return response.data;
  }


  async checkGoogleMapsHealth(): Promise<{ status: string; message: string }> {
    const response = await this.client.get("/api/google-maps/health");
    return response.data;
  }

  async getGoogleMapsRecentImports(limit: number = 50): Promise<Array<{
    id: number;
    name?: string | null;
    website?: string | null;
    address?: string | null;
    emails: string[];
    phones: string[];
    created_at?: string | null;
  }>> {
    const response = await this.client.get(`/api/google-maps/imports/recent?limit=${encodeURIComponent(String(limit))}`);
    return response.data;
  }

  async enrichGoogleMapsLeads(leadIds: number[]): Promise<{ queued: number; skipped: number; lead_ids: number[] }> {
    const response = await this.client.post("/api/google-maps/enrich-leads", {
      lead_ids: leadIds,
      emails: true,
      phones: true,
      social_links: true,
    });
    return response.data;
  }

  // Deals endpoints
  async getDeals(params?: {
    page?: number;
    page_size?: number;
    q?: string;
    status?: string;
  }): Promise<{ items: any[]; total: number; page: number; page_size: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.q) queryParams.append("q", params.q);
    if (params?.status) queryParams.append("status", params.status);

    const queryString = queryParams.toString();
    const url = `/api/deals${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async getDeal(dealId: number): Promise<any> {
    const response = await this.client.get(`/api/deals/${dealId}`);
    return response.data;
  }

  async updateDeal(dealId: number, updates: {
    stage?: string;
    value?: number;
    currency?: string;
    name?: string;
    [key: string]: any;
  }): Promise<any> {
    const response = await this.client.patch(`/api/deals/${dealId}`, updates);
    return response.data;
  }

  // Segments endpoints
  async getSegments(): Promise<any[]> {
    const response = await this.client.get("/api/segments");
    return response.data;
  }

  async getSegment(segmentId: number): Promise<any> {
    const response = await this.client.get(`/api/segments/${segmentId}`);
    return response.data;
  }

  async createSegment(data: {
    name: string;
    description?: string;
    filter_json: Record<string, any>;
  }): Promise<any> {
    const response = await this.client.post("/api/segments", data);
    return response.data;
  }

  async updateSegment(segmentId: number, data: {
    name?: string;
    description?: string;
    filter_json?: Record<string, any>;
  }): Promise<any> {
    const response = await this.client.put(`/api/segments/${segmentId}`, data);
    return response.data;
  }

  async deleteSegment(segmentId: number): Promise<void> {
    await this.client.delete(`/api/segments/${segmentId}`);
  }

  async getSegmentLeads(segmentId: number, limit?: number, offset?: number): Promise<{ total: number; leads: any[] }> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    const queryString = params.toString();
    const url = `/api/segments/${segmentId}/leads${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  // Lists endpoints
  async getLists(): Promise<any[]> {
    const response = await this.client.get("/api/lists");
    return response.data;
  }

  async createList(data: {
    name: string;
    description?: string;
    is_campaign_ready?: boolean;
  }): Promise<any> {
    const response = await this.client.post("/api/lists", data);
    return response.data;
  }

  async updateList(listId: number, data: {
    name?: string;
    description?: string;
    is_campaign_ready?: boolean;
  }): Promise<any> {
    const response = await this.client.put(`/api/lists/${listId}`, data);
    return response.data;
  }

  async deleteList(listId: number): Promise<void> {
    await this.client.delete(`/api/lists/${listId}`);
  }

  async addLeadToList(listId: number, leadId: number): Promise<any> {
    const response = await this.client.post(`/api/lists/${listId}/leads/${leadId}`);
    return response.data;
  }

  async removeLeadFromList(listId: number, leadId: number): Promise<any> {
    const response = await this.client.delete(`/api/lists/${listId}/leads/${leadId}`);
    return response.data;
  }

  async getListLeads(
    listId: number,
    limit?: number,
    offset?: number,
    search?: string
  ): Promise<{ total: number; leads: any[] }> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    if (search) params.append("search", search);
    const queryString = params.toString();
    const url = `/api/lists/${listId}/leads${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async getListAutomationRules(): Promise<any[]> {
    const response = await this.client.get("/api/lists/automation/rules");
    return response.data;
  }

  async createListAutomationRule(data: {
    name: string;
    min_score: number;
    auto_sync: boolean;
    notify: boolean;
    conditions?: any[];
    schedule?: any;
  }): Promise<any> {
    const response = await this.client.post("/api/lists/automation/rules", data);
    return response.data;
  }

  async deleteListAutomationRule(ruleId: number): Promise<{ message: string }> {
    const response = await this.client.delete(`/api/lists/automation/rules/${ruleId}`);
    return response.data;
  }

  async getPlaybookEngineStatus(): Promise<any> {
    const response = await this.client.get("/api/engines/playbooks/status");
    return response.data;
  }

  async runListAutomationEngine(): Promise<any> {
    const response = await this.client.post("/api/engines/lists/run");
    return response.data;
  }

  async getListAutomationAudit(): Promise<any[]> {
    const response = await this.client.get("/api/engines/lists/audit");
    return response.data;
  }

  async getTemplateSla(slaHours?: number): Promise<any> {
    const query = slaHours ? `?sla_hours=${slaHours}` : "";
    const response = await this.client.get(`/api/engines/templates/sla${query}`);
    return response.data;
  }

  async getTemplateAlerts(): Promise<any> {
    const response = await this.client.get("/api/engines/templates/alerts");
    return response.data;
  }

  async getEnrichmentEngineStatus(): Promise<any> {
    const response = await this.client.get("/api/engines/enrichment/status");
    return response.data;
  }

  async getEngineOverview(): Promise<any> {
    const response = await this.client.get("/api/engines/overview");
    return response.data;
  }

  async getEngineAudit(): Promise<any[]> {
    const response = await this.client.get("/api/engines/audit");
    return response.data;
  }

  async exportEngineAudit(): Promise<Blob> {
    const response = await this.client.get("/api/engines/audit/export", { responseType: "blob" });
    return response.data;
  }

  async getEngineSettings(): Promise<any> {
    const response = await this.client.get("/api/engines/settings");
    return response.data;
  }

  async updateEngineSettings(data: Record<string, any>): Promise<any> {
    const response = await this.client.patch("/api/engines/settings", data);
    return response.data;
  }

  async getEngineWebhooks(): Promise<any[]> {
    const response = await this.client.get("/api/engines/alerts/webhooks");
    return response.data;
  }

  async createEngineWebhook(data: { url: string; events: string[]; enabled: boolean }): Promise<any> {
    const response = await this.client.post("/api/engines/alerts/webhooks", data);
    return response.data;
  }

  async deleteEngineWebhook(webhookId: string): Promise<any> {
    const response = await this.client.delete(`/api/engines/alerts/webhooks/${webhookId}`);
    return response.data;
  }

  async getWorkerQueue(): Promise<any[]> {
    const response = await this.client.get("/api/engines/workers/queue");
    return response.data;
  }

  async enqueueWorkerTask(data: { name: string; status?: string }): Promise<any> {
    const response = await this.client.post("/api/engines/workers/queue", data);
    return response.data;
  }

  // Workspaces endpoints
  async getWorkspaces(): Promise<any[]> {
    const response = await this.client.get("/api/workspaces");
    return response.data;
  }

  async createWorkspace(data: {
    name: string;
    description?: string;
  }): Promise<any> {
    const response = await this.client.post("/api/workspaces", data);
    return response.data;
  }

  async getWorkspaceMembers(workspaceId: number): Promise<any[]> {
    const response = await this.client.get(`/api/workspaces/${workspaceId}/members`);
    return response.data;
  }

  async inviteWorkspaceMember(workspaceId: number, email: string, role: string): Promise<any> {
    const response = await this.client.post(`/api/workspaces/${workspaceId}/members/invite`, {
      email,
      role,
    });
    return response.data;
  }

  async updateWorkspaceMember(workspaceId: number, memberId: number, role: string): Promise<any> {
    const response = await this.client.patch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      role,
    });
    return response.data;
  }

  async removeWorkspaceMember(workspaceId: number, memberId: number): Promise<void> {
    await this.client.delete(`/api/workspaces/${workspaceId}/members/${memberId}`);
  }

  async switchWorkspace(workspaceId: number): Promise<any> {
    const response = await this.client.post(`/api/workspaces/${workspaceId}/switch`);
    return response.data;
  }

  // Tasks & Notes endpoints
  async getLeadNotes(leadId: number): Promise<any[]> {
    const response = await this.client.get(`/api/leads/${leadId}/notes`);
    return response.data;
  }

  async createLeadNote(leadId: number, content: string): Promise<any> {
    const response = await this.client.post(`/api/leads/${leadId}/notes`, { content });
    return response.data;
  }

  async getLeadTasks(leadId: number, statusFilter?: string): Promise<any[]> {
    const params = statusFilter ? `?status_filter=${statusFilter}` : "";
    const response = await this.client.get(`/api/leads/${leadId}/tasks${params}`);
    return response.data;
  }

  async createLeadTask(leadId: number, data: {
    title: string;
    type?: string;
    due_at?: string;
    description?: string;
    assigned_to_user_id?: number;
  }): Promise<any> {
    const response = await this.client.post(`/api/leads/${leadId}/tasks`, data);
    return response.data;
  }

  async createTaskFromNBA(leadId: number): Promise<any> {
    const response = await this.client.post(`/api/leads/${leadId}/tasks/from-nba`);
    return response.data;
  }

  async updateTask(taskId: number, data: {
    title?: string;
    status?: string;
    due_at?: string;
    description?: string;
    assigned_to_user_id?: number;
  }): Promise<any> {
    const response = await this.client.patch(`/api/tasks/${taskId}`, data);
    return response.data;
  }

  async getTasks(params?: {
    workspace_id?: number;
    status_filter?: string;
    assigned_to_user_id?: number;
    due_filter?: string;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.workspace_id) queryParams.append("workspace_id", params.workspace_id.toString());
    if (params?.status_filter) queryParams.append("status_filter", params.status_filter);
    if (params?.assigned_to_user_id) queryParams.append("assigned_to_user_id", params.assigned_to_user_id.toString());
    if (params?.due_filter) queryParams.append("due_filter", params.due_filter);

    const queryString = queryParams.toString();
    const url = `/api/tasks${queryString ? `?${queryString}` : ""}`;
    const response = await this.client.get(url);
    return response.data;
  }
}

export const apiClient = new APIClient();

