"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import type { Template } from "@/types/templates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { FileText, ArrowLeft, Save, CheckCircle2, XCircle, Loader2, Shield, Copy } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "deprecated", label: "Deprecated" },
  { value: "rejected", label: "Rejected" },
];

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const templateId = Number(params.id);

  const [template, setTemplate] = useState<Template | null>(null);
  const [governance, setGovernance] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [variantSeed, setVariantSeed] = useState(0);
  const [variants, setVariants] = useState<Array<{ id: number; name: string; subject: string; body: string }>>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("draft");
  const [tags, setTags] = useState("");

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const subjectLength = subject.length;
  const hasPersonalization = /\{(first_name|company|title)\}/i.test(subject + " " + body);
  const readingTime = wordCount > 0 ? Math.max(1, Math.round(wordCount / 180)) : 0;
  const mergeTags = ["{first_name}", "{last_name}", "{company}", "{title}", "{city}", "{website}"];

  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTemplate(templateId);
      setTemplate(data);
      setName(data.name || "");
      setDescription(data.description || "");
      setSubject(data.subject || "");
      setBody(data.body || "");
      setStatus(data.status || "draft");
      setTags((data.tags || []).join(", "));
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.response?.data?.detail || "Failed to load template.");
      showToast({
        type: "error",
        title: "Failed to load template",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, [templateId, showToast]);

  const loadGovernance = useCallback(async () => {
    try {
      const data = await apiClient.getTemplateGovernance();
      setGovernance(data);
    } catch (error) {
      setGovernance(null);
    }
  }, []);

  useEffect(() => {
    if (!templateId) return;
    loadTemplate();
    loadGovernance();
  }, [templateId, loadTemplate, loadGovernance]);

  const isDirty = useMemo(() => {
    if (!template) return false;
    const originalTags = (template.tags || []).join(", ");
    return (
      template.name !== name ||
      (template.description || "") !== description ||
      (template.subject || "") !== subject ||
      (template.body || "") !== body ||
      template.status !== status ||
      originalTags !== tags
    );
  }, [template, name, description, subject, body, status, tags]);

  const handleSave = async () => {
    if (!template) return;
    try {
      setSaving(true);
      const data = await apiClient.updateTemplate(template.id, {
        name,
        description,
        subject,
        body,
        status,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      setTemplate(data);
      showToast({
        type: "success",
        title: "Template saved",
        message: "Your changes have been saved.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Save failed",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!template) return;
    try {
      setApproving(true);
      const data = await apiClient.approveTemplate(template.id);
      setTemplate(data);
      setStatus(data.status);
      showToast({
        type: "success",
        title: "Template approved",
        message: "This template is now approved.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Approval failed",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!template) return;
    const reason = prompt("Rejection reason (optional):") || undefined;
    try {
      setRejecting(true);
      const data = await apiClient.rejectTemplate(template.id, reason);
      setTemplate(data);
      setStatus(data.status);
      showToast({
        type: "success",
        title: "Template rejected",
        message: "The template was rejected.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Rejection failed",
        message: error?.response?.data?.detail || "Please try again",
      });
    } finally {
      setRejecting(false);
    }
  };

  const handleGovernanceUpdate = async (key: string, value: boolean) => {
    try {
      const data = await apiClient.updateTemplateGovernance({ [key]: value });
      setGovernance(data);
      showToast({
        type: "success",
        title: "Governance updated",
        message: "Settings updated for this workspace.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Update failed",
        message: error?.response?.data?.detail || "Please try again",
      });
    }
  };

  const handleAddVariant = (fromCurrent: boolean) => {
    const nextId = variantSeed + 1;
    setVariantSeed(nextId);
    setVariants((prev) => [
      ...prev,
      {
        id: nextId,
        name: `Variant ${String.fromCharCode(64 + nextId)}`,
        subject: fromCurrent ? subject : "",
        body: fromCurrent ? body : "",
      },
    ]);
  };

  const handleVariantChange = (id: number, field: "subject" | "body" | "name", value: string) => {
    setVariants((prev) =>
      prev.map((variant) => (variant.id === id ? { ...variant, [field]: value } : variant))
    );
  };

  const handleSaveVariant = async (variant: { id: number; name: string; subject: string; body: string }) => {
    try {
      const created = await apiClient.createTemplate({
        name: `${name} - ${variant.name}`,
        description: description || undefined,
        kind: template?.kind || "email",
        subject: variant.subject,
        body: variant.body,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        scope: template?.scope || "workspace",
      });
      showToast({
        type: "success",
        title: "Variant saved",
        message: `Created template #${created.id} from ${variant.name}.`,
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Save failed",
        message: error?.response?.data?.detail || "Unable to save variant.",
      });
    }
  };

  const handleCopyMergeTags = async () => {
    try {
      await navigator.clipboard.writeText(mergeTags.join(", "));
      showToast({
        type: "success",
        title: "Tags copied",
        message: "Merge tags copied to clipboard.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Could not copy merge tags.",
      });
    }
  };

  if (loading && !template) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push("/templates")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Templates
        </Button>
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm text-amber-100">
          Template not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title={template.name}
        description="Edit template copy, status, and governance details"
        icon={FileText}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/templates")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {template.status === "pending_approval" && (
              <>
                <Button variant="outline" onClick={handleApprove} disabled={approving}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {approving ? "Approving..." : "Approve"}
                </Button>
                <Button variant="outline" onClick={handleReject} disabled={rejecting}>
                  <XCircle className="w-4 h-4 mr-2" />
                  {rejecting ? "Rejecting..." : "Reject"}
                </Button>
              </>
            )}
            <Button onClick={handleSave} disabled={!isDirty || saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {loadError && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center justify-between">
              <span>{loadError}</span>
              <Button variant="outline" size="sm" onClick={loadTemplate}>
                Try again
              </Button>
            </div>
          )}
          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <Input label="Template name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={STATUS_OPTIONS}
              className="max-w-xs"
            />
            <Input
              label="Tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="sales, enterprise, follow-up"
              helperText="Comma-separated tags"
            />
            <Input label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
            <Textarea
              label="Body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
              placeholder="Write your template body here"
            />
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Preview</h3>
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/50 p-4 text-sm text-slate-700 dark:text-slate-200">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Subject</p>
              <p className="mt-1 font-semibold">{subject || "No subject set"}</p>
              <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Body</p>
              <p className="mt-1 whitespace-pre-line">{body || "No body content"}</p>
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">A/B Variants</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleAddVariant(true)}>
                  Add from current
                </Button>
                <Button variant="outline" onClick={() => handleAddVariant(false)}>
                  New blank
                </Button>
              </div>
            </div>
            {variants.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create variants to test subject lines and message angles.
              </p>
            ) : (
              <div className="space-y-4">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/40 p-4 space-y-3"
                  >
                    <Input
                      label="Variant name"
                      value={variant.name}
                      onChange={(event) => handleVariantChange(variant.id, "name", event.target.value)}
                    />
                    <Input
                      label="Subject"
                      value={variant.subject}
                      onChange={(event) => handleVariantChange(variant.id, "subject", event.target.value)}
                    />
                    <Textarea
                      label="Body"
                      value={variant.body}
                      onChange={(event) => handleVariantChange(variant.id, "body", event.target.value)}
                      rows={6}
                    />
                    <div className="flex justify-end">
                      <Button onClick={() => handleSaveVariant(variant)}>
                        Save as new template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Merge Tags</h3>
              <Button variant="outline" size="sm" onClick={handleCopyMergeTags}>
                <Copy className="w-4 h-4 mr-2" />
                Copy tags
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use these placeholders to personalize your copy. Example: &quot;Hi {"{first_name}"}&quot;.
            </p>
            <div className="flex flex-wrap gap-2">
              {mergeTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-3 py-1 text-xs text-slate-600 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Performance Stats</h3>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Words</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{wordCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Subject length</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{subjectLength}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Reading time</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {readingTime ? `${readingTime} min` : "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Personalization</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {hasPersonalization ? "Yes" : "No"}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These stats are estimated from your current draft content.
            </p>
          </section>

          {governance && (
            <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Governance</h3>
              </div>
              {[
                { key: "require_approval_for_new_templates", label: "Require approval for new templates" },
                { key: "restrict_to_approved_only", label: "Restrict to approved only" },
                { key: "allow_personal_templates", label: "Allow personal templates" },
                { key: "require_unsubscribe", label: "Require unsubscribe" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={!!governance[item.key]}
                    onChange={(event) => handleGovernanceUpdate(item.key, event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
                  />
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
