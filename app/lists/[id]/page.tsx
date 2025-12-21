"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import type { List } from "@/types/lists";
import type { Lead } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { List as ListIcon, ArrowLeft, Save, Download, Loader2, RefreshCw, Copy } from "lucide-react";

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const listId = Number(params.id);

  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignReady, setCampaignReady] = useState(false);
  const [leadIdInput, setLeadIdInput] = useState("");
  const [actionLog, setActionLog] = useState<Array<{ action: string; leadId: number; time: string }>>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadTotal, setLeadTotal] = useState(0);
  const [leadOffset, setLeadOffset] = useState(0);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const lists = await apiClient.getLists();
      const found = lists.find((item) => item.id === listId) || null;
      setList(found);
      if (found) {
        setName(found.name);
        setDescription(found.description || "");
        setCampaignReady(!!found.is_campaign_ready);
      }
      setListError(null);
    } catch (error: any) {
      setListError(error?.response?.data?.detail || "Failed to load list.");
      showToast({
        type: "error",
        title: "Failed to load list",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, [listId, showToast]);

  const loadLeads = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!listId) return;
      try {
        setLoadingLeads(true);
        const data = await apiClient.getListLeads(listId, 50, nextOffset, leadSearch.trim() || undefined);
        setLeads((prev) => (append ? [...prev, ...data.leads] : data.leads));
        setLeadTotal(data.total || data.leads.length);
        setLeadOffset(nextOffset + data.leads.length);
        setLeadsError(null);
      } catch (error: any) {
        setLeadsError(error?.response?.data?.detail || "Failed to load leads.");
        showToast({
          type: "error",
          title: "Failed to load leads",
          message: error?.response?.data?.detail || "Please try again",
        });
      } finally {
        setLoadingLeads(false);
      }
    },
    [listId, leadSearch, showToast]
  );

  useEffect(() => {
    if (!listId) return;
    loadList();
    loadLeads(0, false);
  }, [listId, loadList, loadLeads]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads(0, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [leadSearch, loadLeads]);

  const filteredLeads = leads.filter((lead) => (lead.quality_score || 0) >= minScore);

  const isDirty = useMemo(() => {
    if (!list) return false;
    return (
      list.name !== name ||
      (list.description || "") !== description ||
      list.is_campaign_ready !== campaignReady
    );
  }, [list, name, description, campaignReady]);

  const handleSave = async () => {
    if (!list) return;
    try {
      setSaving(true);
      const updated = await apiClient.updateList(list.id, {
        name,
        description,
        is_campaign_ready: campaignReady,
      });
      setList(updated);
      showToast({
        type: "success",
        title: "List updated",
        message: "Your changes have been saved.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Failed to save",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!list) return;
    const rows = [
      ["name", "description", "total_leads", "campaign_ready", "created_at"],
      [
        list.name,
        list.description || "",
        String(list.total_leads || 0),
        list.is_campaign_ready ? "yes" : "no",
        list.created_at,
      ],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `list_${list.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLeads = () => {
    if (!list) return;
    if (!filteredLeads.length) {
      showToast({
        type: "error",
        title: "No leads to export",
        message: "No leads match the current filters.",
      });
      return;
    }
    const headers = ["name", "email", "phone", "website", "company", "score"];
    const rows = [
      headers,
      ...filteredLeads.map((lead) => [
        lead.name || "",
        lead.emails?.[0] || "",
        lead.phones?.[0] || "",
        lead.website || "",
        lead.company_name || "",
        String(lead.quality_score || 0),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `list_${list.id}_leads.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyEmails = async () => {
    const emails = filteredLeads
      .flatMap((lead) => lead.emails || [])
      .filter(Boolean);
    if (emails.length === 0) {
      showToast({
        type: "info",
        title: "No emails found",
        message: "No emails available in the current filter.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(Array.from(new Set(emails)).join("\n"));
      showToast({
        type: "success",
        title: "Emails copied",
        message: `Copied ${emails.length} emails.`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Could not copy emails.",
      });
    }
  };

  const handleAddLead = async () => {
    const leadId = Number(leadIdInput);
    if (!leadId || !list) return;
    try {
      await apiClient.addLeadToList(list.id, leadId);
      setActionLog((prev) => [
        { action: "Added", leadId, time: new Date().toLocaleString() },
        ...prev,
      ]);
      setLeadIdInput("");
      showToast({
        type: "success",
        title: "Lead added",
        message: `Lead #${leadId} added to this list.`,
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Add failed",
        message: error?.response?.data?.detail || "Unable to add lead.",
      });
    }
  };

  const handleRemoveLead = async () => {
    const leadId = Number(leadIdInput);
    if (!leadId || !list) return;
    try {
      await apiClient.removeLeadFromList(list.id, leadId);
      setActionLog((prev) => [
        { action: "Removed", leadId, time: new Date().toLocaleString() },
        ...prev,
      ]);
      setLeadIdInput("");
      showToast({
        type: "success",
        title: "Lead removed",
        message: `Lead #${leadId} removed from this list.`,
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Remove failed",
        message: error?.response?.data?.detail || "Unable to remove lead.",
      });
    }
  };

  if (loading && !list) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push("/lists")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lists
        </Button>
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm text-amber-100">
          List not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title={list.name}
        description={list.description || "List detail view and settings"}
        icon={ListIcon}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/lists")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={() => loadLeads(0, false)} disabled={loadingLeads}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {!loadingLeads && filteredLeads.length > 0 && (
              <>
                <Button variant="outline" onClick={handleCopyEmails}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy emails
                </Button>
                <Button variant="outline" onClick={handleExportLeads}>
                  <Download className="w-4 h-4 mr-2" />
                  Export filtered CSV
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export List
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {listError && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center justify-between">
              <span>{listError}</span>
              <Button variant="outline" size="sm" onClick={loadList}>
                Try again
              </Button>
            </div>
          )}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Leads</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{list.total_leads || 0}</p>
            </div>
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Campaign Ready</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {list.is_campaign_ready ? "Yes" : "No"}
              </p>
            </div>
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {new Date(list.created_at).toLocaleDateString()}
              </p>
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <Input
              label="List name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="List name"
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a description for this list"
              rows={4}
            />
            <div className="flex items-center gap-2">
              <input
                id="campaign-ready"
                type="checkbox"
                checked={campaignReady}
                onChange={(event) => setCampaignReady(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="campaign-ready" className="text-sm text-slate-600 dark:text-slate-400">
                Mark as campaign ready
              </label>
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <Input
                  label="Search leads"
                  value={leadSearch}
                  onChange={(event) => setLeadSearch(event.target.value)}
                  placeholder="Search by name, website, or email"
                  helperText="Press / to focus"
                  data-global-search="true"
                />
              </div>
              <div>
                <Input
                  label="Min score"
                  value={minScore.toString()}
                  onChange={(event) => setMinScore(Number(event.target.value || 0))}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLeadSearch("");
                    setMinScore(0);
                  }}
                  disabled={!leadSearch && minScore === 0}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear filters
                </Button>
              </div>
            </div>
            {leadsError && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center justify-between">
                <span>{leadsError}</span>
                <Button variant="outline" size="sm" onClick={() => loadLeads(0, false)}>
                  Try again
                </Button>
              </div>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredLeads.length} of {leadTotal} leads
            </div>
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
              {loadingLeads && leads.length === 0 ? (
                <div className="p-6">
                  <div className="space-y-3 animate-pulse">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={`list-lead-skeleton-${index}`}
                        className="h-10 rounded-xl bg-slate-200/70 dark:bg-slate-800/60"
                      />
                    ))}
                  </div>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-6 text-center text-slate-400">No leads match your filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr className="text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-3 text-left font-medium">Lead</th>
                        <th className="px-4 py-3 text-left font-medium">Website</th>
                        <th className="px-4 py-3 text-left font-medium">Email</th>
                        <th className="px-4 py-3 text-right font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-50">
                              {lead.name || "Unnamed lead"}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">#{lead.id}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {lead.website || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {lead.emails?.[0] || "-"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                            {lead.quality_score ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {leadOffset < leadTotal && (
                <div className="px-4 py-3 border-t border-slate-200/60 dark:border-slate-800/60">
                  <Button variant="outline" onClick={() => loadLeads(leadOffset, true)} disabled={loadingLeads}>
                    {loadingLeads ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Manage Membership</h3>
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Lead ID"
                  value={leadIdInput}
                  onChange={(event) => setLeadIdInput(event.target.value)}
                  placeholder="Enter a lead ID"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleAddLead}>
                  Add Lead
                </Button>
                <Button variant="outline" onClick={handleRemoveLead}>
                  Remove Lead
                </Button>
                <Button variant="outline" onClick={() => router.push(`/leads?list_id=${list.id}`)}>
                  Open Leads
                </Button>
              </div>
            </div>
            {actionLog.length > 0 && (
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Recent actions</p>
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  {actionLog.slice(0, 5).map((entry, index) => (
                    <div key={`${entry.leadId}-${index}`} className="flex items-center justify-between">
                      <span>
                        {entry.action} lead #{entry.leadId}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{entry.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
