"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormCard } from "@/components/ui/FormCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { ArrowDown, ArrowUp, Play, Sparkles } from "lucide-react";

export default function PlaybookBuilderPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("New Playbook");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState({
    includeLinkedIn: true,
    runEmailFinder: true,
    verifyEmails: true,
    scoreLeads: true,
    createList: true,
  });
  const [minScore, setMinScore] = useState(60);
  const [includeRisky, setIncludeRisky] = useState(false);
  const selectedSteps = Object.values(steps).filter(Boolean).length;
  const isValid = name.trim().length >= 3 && selectedSteps > 0;
  const validationMessage =
    name.trim().length < 3
      ? "Name must be at least 3 characters."
      : selectedSteps === 0
      ? "Select at least one step."
      : "";

  const stepOptions = [
    { key: "includeLinkedIn", label: "Include LinkedIn leads" },
    { key: "runEmailFinder", label: "Run Email Finder" },
    { key: "verifyEmails", label: "Verify emails" },
    { key: "scoreLeads", label: "Score leads" },
    { key: "createList", label: "Create output list" },
  ];

  const [stepOrder, setStepOrder] = useState(stepOptions.map((item) => item.key));

  const handlePreset = (preset: "default" | "fast" | "score") => {
    if (preset === "fast") {
      setSteps({
        includeLinkedIn: true,
        runEmailFinder: false,
        verifyEmails: false,
        scoreLeads: true,
        createList: true,
      });
      setMinScore(70);
    } else if (preset === "score") {
      setSteps({
        includeLinkedIn: true,
        runEmailFinder: true,
        verifyEmails: true,
        scoreLeads: true,
        createList: true,
      });
      setMinScore(80);
    } else {
      setSteps({
        includeLinkedIn: true,
        runEmailFinder: true,
        verifyEmails: true,
        scoreLeads: true,
        createList: true,
      });
      setMinScore(60);
    }
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const next = [...stepOrder];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setStepOrder(next);
  };

  const handleSave = () => {
    if (!isValid) {
      showToast({
        type: "error",
        title: "Fix validation errors",
        message: validationMessage || "Please fix errors before saving.",
      });
      return;
    }
    const payload = {
      id: `${Date.now()}`,
      name: name.trim() || "Untitled Playbook",
      description: description.trim(),
      steps,
      minScore,
      includeRisky,
      createdAt: new Date().toISOString(),
    };

    try {
      const existingRaw = localStorage.getItem("leadflux_custom_playbooks");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const next = Array.isArray(existing) ? [payload, ...existing] : [payload];
      localStorage.setItem("leadflux_custom_playbooks", JSON.stringify(next));
    } catch (error) {
      showToast({
        type: "error",
        title: "Save failed",
        message: "Could not save playbook to local storage.",
      });
      return;
    }

    showToast({
      type: "success",
      title: "Playbook saved",
      message: "Playbook saved locally.",
    });
    router.push("/playbooks");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Playbook Builder"
        description="Design automated workflows to transform raw leads"
        icon={Sparkles}
        backUrl="/playbooks"
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <FormCard title="Basics" description="Name and describe this workflow" icon={Sparkles}>
            <div className="space-y-4">
              <Input label="Playbook name" value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </FormCard>

          <FormCard title="Presets" description="Start from a proven playbook layout" icon={Sparkles}>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handlePreset("default")}>
                Balanced
              </Button>
              <Button variant="outline" onClick={() => handlePreset("fast")}>
                Fast enrichment
              </Button>
              <Button variant="outline" onClick={() => handlePreset("score")}>
                High score focus
              </Button>
            </div>
          </FormCard>

          <FormCard title="Steps" description="Choose the actions to run" icon={Sparkles}>
            <div className="grid gap-3 md:grid-cols-2">
              <Checkbox
                label="Include LinkedIn leads"
                description="Pull leads captured from the extension"
                checked={steps.includeLinkedIn}
                onChange={(e) => setSteps({ ...steps, includeLinkedIn: e.target.checked })}
              />
              <Checkbox
                label="Run Email Finder"
                description="Find missing emails for the lead set"
                checked={steps.runEmailFinder}
                onChange={(e) => setSteps({ ...steps, runEmailFinder: e.target.checked })}
              />
              <Checkbox
                label="Verify emails"
                description="Verify deliverability before export"
                checked={steps.verifyEmails}
                onChange={(e) => setSteps({ ...steps, verifyEmails: e.target.checked })}
              />
              <Checkbox
                label="Score leads"
                description="Recompute quality scoring"
                checked={steps.scoreLeads}
                onChange={(e) => setSteps({ ...steps, scoreLeads: e.target.checked })}
              />
              <Checkbox
                label="Create output list"
                description="Save results into a list"
                checked={steps.createList}
                onChange={(e) => setSteps({ ...steps, createList: e.target.checked })}
              />
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Step order</p>
              {stepOrder.map((stepKey, index) => {
                const step = stepOptions.find((item) => item.key === stepKey);
                if (!step) return null;
                const enabled = steps[stepKey as keyof typeof steps];
                return (
                  <div
                    key={step.key}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                      enabled
                        ? "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40"
                        : "border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/20 text-slate-400"
                    }`}
                  >
                    <span>{step.label}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMoveStep(index, "up")}
                        className="rounded-full border border-slate-300 dark:border-slate-700 p-1"
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveStep(index, "down")}
                        className="rounded-full border border-slate-300 dark:border-slate-700 p-1"
                        disabled={index === stepOrder.length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </FormCard>

          <FormCard title="Filters" description="Guardrails for output list" icon={Sparkles}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Minimum score"
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value || 0))}
              />
              <Checkbox
                label="Include risky emails"
                description="Add leads marked as risky"
                checked={includeRisky}
                onChange={(e) => setIncludeRisky(e.target.checked)}
              />
            </div>
          </FormCard>

          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1" disabled={!isValid}>
              Save playbook
            </Button>
            <Button variant="outline" onClick={() => router.push("/playbooks")}>
              Back to playbooks
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Summary</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              This playbook will gather leads, enrich emails, verify deliverability, and filter to score >= {minScore}
              {includeRisky ? " including risky emails" : ""}. Output is saved to a list.
            </p>
            {!isValid && (
              <p className="text-xs text-rose-500 mt-2">{validationMessage}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
