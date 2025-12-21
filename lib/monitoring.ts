type ApiErrorContext = {
  url?: string;
  method?: string;
  status?: number;
  message?: string;
};

export function trackApiError(context: ApiErrorContext) {
  if (process.env.NEXT_PUBLIC_PERF_LOG === "true") {
    console.warn("[API Error]", context);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("leadflux:api-error", { detail: context }));
  }
}
