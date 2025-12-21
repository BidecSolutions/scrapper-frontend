"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { Template } from "@/types/templates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { CheckCircle2, XCircle, Inbox } from "lucide-react";

export default function TemplatesQueuePage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getTemplates({ status: "pending_approval" });
      setTemplates(res.items as Template[]);
    } catch (error) {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleApprove = async (id: number) => {
    try {
      await apiClient.approveTemplate(id);
      await loadTemplates();
      showToast({
        type: "success",
        title: "Template approved",
        message: "Template moved to approved list.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Approval failed",
        message: error?.response?.data?.detail || "Please try again",
      });
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Rejection reason (optional):") || undefined;
    try {
      await apiClient.rejectTemplate(id, reason);
      await loadTemplates();
      showToast({
        type: "success",
        title: "Template rejected",
        message: "Template removed from the queue.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Rejection failed",
        message: error?.response?.data?.detail || "Please try again",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Template Approval Queue"
        description="Review and approve pending templates"
        icon={Inbox}
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading queue...</p>
            ) : templates.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400">
                No pending templates.
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {template.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {template.description || "No description"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                          Kind: {template.kind} - Updated {new Date(template.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => handleApprove(template.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button variant="outline" onClick={() => handleReject(template.id)}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                    {template.subject && (
                      <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                        Subject: {template.subject}
                      </div>
                    )}
                    {template.body && (
                      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {template.body.slice(0, 160)}{template.body.length > 160 ? "..." : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
