import axios, { AxiosInstance } from "axios";

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
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface SavedView {
  id: number;
  name: string;
  filters: Record<string, any>;
  created_at: string;
}

export interface Job {
  id: number;
  niche: string;
  location: string | null;
  status: string;
  total_leads: number;
  created_at: string;
  completed_at: string | null;
  [key: string]: any;
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
  status: string;
  created_at: string;
}

export interface SocialInsights {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  [key: string]: any;
}

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
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.token = null;
          localStorage.removeItem("auth_token");
        }
        return Promise.reject(error);
      }
    );
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

  async updateOrganization(name: string, brandName?: string, tagline?: string): Promise<Organization> {
    const response = await this.client.patch("/api/organization", {
      name,
      brand_name: brandName,
      tagline,
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

  async getLead(leadId: number): Promise<Lead> {
    const response = await this.client.get(`/api/leads/${leadId}`);
    return response.data;
  }

  // Job endpoints
  async getJobs(status?: string): Promise<Job[]> {
    const params = status ? `?status=${status}` : "";
    const response = await this.client.get(`/api/jobs${params}`);
    return response.data;
  }

  async getJob(jobId: number): Promise<Job> {
    const response = await this.client.get(`/api/jobs/${jobId}`);
    return response.data;
  }

  async createJob(data: {
    niche: string;
    location?: string;
    max_results?: number;
    max_pages_per_site?: number;
  }): Promise<Job> {
    const response = await this.client.post("/api/jobs/run-once", data);
    return response.data;
  }

  // Saved views
  async getSavedViews(): Promise<SavedView[]> {
    const response = await this.client.get("/api/saved-views");
    return response.data;
  }

  async createSavedView(name: string, filters: Record<string, any>): Promise<SavedView> {
    const response = await this.client.post("/api/saved-views", { name, filters });
    return response.data;
  }

  // Lookalike endpoints
  async createLookalikeJob(data: {
    lead_ids: number[];
    similarity_threshold?: number;
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

  // Usage endpoints
  async getUsage(): Promise<any> {
    const response = await this.client.get("/api/usage/me/usage");
    return response.data;
  }

  // Export endpoints
  async exportLeads(format: "csv" | "json" = "csv", filters?: Record<string, any>): Promise<Blob> {
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
}

export const apiClient = new APIClient();

