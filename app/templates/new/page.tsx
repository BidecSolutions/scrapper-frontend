"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  FileText,
  Mail,
  Tag,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Type,
  AlignLeft,
  X,
} from "lucide-react";
import type { TemplateKind, TemplateScope } from "@/types/templates";

export default function NewTemplatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    kind: "email" as TemplateKind,
    subject: "",
    body: "",
    tags: [] as string[],
    scope: "workspace" as TemplateScope,
  });
  const [tagInput, setTagInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError("Template name is required");
      setLoading(false);
      return;
    }

    if (formData.kind === "email" && !formData.body.trim()) {
      setError("Email body is required for email templates");
      setLoading(false);
      return;
    }

    try {
      const template = await apiClient.createTemplate({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        kind: formData.kind,
        subject: formData.subject.trim() || undefined,
        body: formData.body.trim() || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        scope: formData.scope,
      });

      showToast({
        type: "success",
        title: `Template "${formData.name}" created`,
        message: "Your template has been saved successfully",
        action: {
          label: "View Template →",
          onClick: () => router.push(`/templates/${template.id}`),
        },
      });

      router.push(`/templates/${template.id}`);
    } catch (error: any) {
      console.error("Failed to create template:", error);
      
      let errorMessage = "Failed to create template. Please try again.";
      if (error?.response?.data?.detail) {
        errorMessage = `Failed to create template: ${error.response.data.detail}`;
      } else if (error?.message) {
        errorMessage = `Failed to create template: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData({
          ...formData,
          tags: [...formData.tags, newTag],
        });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="New Template"
        description="Create a new email template for consistent messaging across your team"
        backUrl="/templates"
        icon={FileText}
      />

      <main className="max-w-5xl mx-auto px-6 pt-6 pb-12">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 px-5 py-4 flex items-start gap-3 shadow-lg"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-semibold">Error:</strong> {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Basic Information */}
          <FormCard
            title="Basic Information"
            description="Template name and description"
            icon={FileText}
            delay={0.1}
          >
            <div className="space-y-4">
              <Input
                label="Template Name"
                icon={FileText}
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cold Outreach - SaaS Companies"
              />
              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of when and how to use this template..."
                rows={3}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Template Type"
                  icon={Type}
                  value={formData.kind}
                  onChange={(e) => setFormData({ ...formData, kind: e.target.value as TemplateKind })}
                  options={[
                    { value: "email", label: "Email" },
                    { value: "subject", label: "Subject Line" },
                    { value: "sequence_step", label: "Sequence Step" },
                  ]}
                />
                <Select
                  label="Scope"
                  icon={Globe}
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value as TemplateScope })}
                  options={[
                    { value: "workspace", label: "Workspace" },
                    { value: "global", label: "Global" },
                  ]}
                />
              </div>
            </div>
          </FormCard>

          {/* Email Content */}
          {formData.kind === "email" && (
            <FormCard
              title="Email Content"
              description="Subject line and email body"
              icon={Mail}
              delay={0.2}
            >
              <div className="space-y-4">
                <Input
                  label="Subject Line"
                  icon={Type}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Quick question about [Company Name]"
                />
                <Textarea
                  label="Email Body"
                  required
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Hi {{first_name}},\n\nI noticed that {{company_name}}...\n\nBest regards,\n{{sender_name}}"
                  rows={12}
                  className="font-mono"
                  helperText='Use {{variable_name}} for dynamic content'
                />
              </div>
            </FormCard>
          )}

          {/* Tags */}
          <FormCard
            title="Tags"
            description="Add tags to organize and find templates easily"
            icon={Tag}
            delay={0.3}
          >
            <div className="space-y-4">
              {formData.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {formData.tags.map((tag) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 text-cyan-700 dark:text-cyan-300 text-sm font-semibold border border-cyan-200 dark:border-cyan-800"
                    >
                      {tag}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.2, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveTag(tag)}
                        className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </motion.button>
                    </motion.span>
                  ))}
                </div>
              )}
              <Input
                label="Add Tag"
                icon={Tag}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type a tag and press Enter..."
                helperText="Press Enter to add a tag"
              />
            </div>
          </FormCard>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-4 pt-4"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:via-blue-400 hover:to-cyan-400 text-white shadow-xl shadow-cyan-500/25 dark:shadow-cyan-500/40 text-base font-semibold py-6 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin relative z-10" />
                    <span className="relative z-10">Creating Template...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2 relative z-10" />
                    <span className="relative z-10">Create Template</span>
                  </>
                )}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="px-8 py-6 text-base"
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        </motion.form>
      </main>
    </div>
  );
}
