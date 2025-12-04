"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Bot, Sparkles, Loader2, Check, Globe, AlertTriangle, Code } from "lucide-react";

export default function NewRobotPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"prompt" | "review" | "saving">("prompt");
  const [formData, setFormData] = useState({
    prompt: "",
    sample_url: "",
  });
  const [generatedRobot, setGeneratedRobot] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [robotName, setRobotName] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prompt.trim()) {
      showToast({
        type: "error",
        title: "Prompt required",
        message: "Please enter a description of what you want to extract",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.createRobotFromPrompt(
        formData.prompt,
        formData.sample_url || undefined
      );
      setGeneratedRobot(result);
      setRobotName(result.name || "My Robot");
      setStep("review");
    } catch (error: any) {
      console.error("Failed to generate robot:", error);
      showToast({
        type: "error",
        title: "Generation failed",
        message: error?.response?.data?.detail || "Failed to generate robot. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedRobot) return;

    setSaving(true);
    try {
      const robot = await apiClient.saveRobot({
        name: robotName,
        description: `AI-generated robot: ${formData.prompt}`,
        prompt: formData.prompt,
        sample_url: formData.sample_url || undefined,
        schema: generatedRobot.schema || [],
        workflow_spec: generatedRobot.workflow_spec || {},
      });

      showToast({
        type: "success",
        title: "Robot created!",
        message: `"${robotName}" has been saved successfully`,
        action: {
          label: "View Robot →",
          onClick: () => router.push(`/robots/${robot.id}`),
        },
      });

      router.push(`/robots/${robot.id}`);
    } catch (error: any) {
      console.error("Failed to save robot:", error);
      showToast({
        type: "error",
        title: "Save failed",
        message: error?.response?.data?.detail || "Failed to save robot. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Create New Robot"
        description="Describe what data you want to extract, and AI will generate a custom scraper"
        backUrl="/robots"
        icon={Bot}
      />

      <main className="max-w-5xl mx-auto px-6 pt-6 pb-12">
        <AnimatePresence mode="wait">
          {step === "prompt" && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FormCard
                title="What do you want to extract?"
                description="Be specific about the fields you want to extract. AI will generate a schema and workflow."
                icon={Sparkles}
              >
                <form onSubmit={handleGenerate} className="space-y-6">
                  <Textarea
                    label="Extraction Description"
                    required
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="Example: Extract product name, price, description, and image URL from e-commerce product pages"
                    rows={6}
                    helperText="Describe the data fields you want to extract from web pages"
                  />

                  <Input
                    label="Sample URL (Optional)"
                    icon={Globe}
                    type="url"
                    value={formData.sample_url}
                    onChange={(e) => setFormData({ ...formData, sample_url: e.target.value })}
                    placeholder="https://example.com/product-page"
                    helperText="Provide a sample URL to help AI understand the page structure"
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                          Legal Notice
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          Only scrape websites that explicitly allow automated access. Check their{" "}
                          <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-mono text-xs">
                            robots.txt
                          </code>{" "}
                          and Terms of Service. Sites like YellowPages, LinkedIn, and many others explicitly forbid scraping.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
                          <span className="relative z-10">Generating robot...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2 relative z-10" />
                          <span className="relative z-10">Generate Robot</span>
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </FormCard>
            </motion.div>
          )}

          {step === "review" && generatedRobot && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FormCard
                title="Review Generated Robot"
                description="Review the AI-generated schema and workflow before saving"
                icon={Bot}
              >
                <div className="space-y-6">
                  <Input
                    label="Robot Name"
                    required
                    value={robotName}
                    onChange={(e) => setRobotName(e.target.value)}
                    placeholder="My Robot"
                  />

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Fields to Extract ({generatedRobot.schema?.length || 0} fields)
                    </label>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-4 max-h-80 overflow-y-auto custom-scrollbar">
                      {generatedRobot.schema && generatedRobot.schema.length > 0 ? (
                        <div className="space-y-3">
                          {generatedRobot.schema.map((field: any, idx: number) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Code className="w-4 h-4 text-cyan-500" />
                                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                    {field.name || field.field}
                                  </span>
                                  {field.type && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                      {field.type}
                                    </span>
                                  )}
                                </div>
                                {field.selector && (
                                  <code className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                                    {field.selector}
                                  </code>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                          No fields defined
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        onClick={() => setStep("prompt")}
                        variant="outline"
                        className="w-full"
                      >
                        Back
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        onClick={handleSave}
                        disabled={saving || !robotName.trim()}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Save Robot
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </FormCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
