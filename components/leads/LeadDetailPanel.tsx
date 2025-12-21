"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Sparkles, ExternalLink, Copy, Globe, Mail, Phone } from "lucide-react";
import { type Lead } from "@/lib/api";
import { SimilarLeadsModal } from "./SimilarLeadsModal";
import { LeadTechCard } from "./LeadTechCard";
import { QaBadge } from "./QaBadge";
import { FeedbackButtons } from "./FeedbackButtons";
import { DossierCard } from "./DossierCard";
import { LeadNextActionStrip } from "./LeadNextActionStrip";
import { LeadKeyPeople } from "./LeadKeyPeople";
import { LeadSocialInsights } from "./LeadSocialInsights";
import { LeadTechAndAdsCard } from "./LeadTechAndAdsCard";
import { LeadSimilarLeadsCard } from "./LeadSimilarLeadsCard";
import { LeadEmailsCard, type LeadEmail } from "./LeadEmailsCard";
import { HealthScoreBadge } from "./HealthScoreBadge";
import { LeadScoreExplainCard } from "./LeadScoreExplainCard";
import { LeadScoreTimelineCard } from "./LeadScoreTimelineCard";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface LeadDetailPanelProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onTagUpdate?: (leadId: number, tags: string[]) => void;
}

export function LeadDetailPanel({
  open,
  onClose,
  lead,
  onTagUpdate,
}: LeadDetailPanelProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [similarModalOpen, setSimilarModalOpen] = useState(false);
  const [leadEmails, setLeadEmails] = useState<LeadEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [retryingEnrichment, setRetryingEnrichment] = useState(false);
  const [retryHistory, setRetryHistory] = useState<{ count: number; last: number | null } | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagList, setTagList] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<Array<{ id: string; label: string; time: string }>>([]);
  
  const loadLeadEmails = useCallback(async () => {
    if (!lead?.id) return;
    
    try {
      setLoadingEmails(true);
      // For now, convert legacy emails array to LeadEmail format
      // TODO: Fetch from /api/leads/{id}/emails endpoint when available
      const emails: LeadEmail[] = (lead.emails || []).map((email: any, idx: number) => ({
        id: idx,
        email: typeof email === 'string' ? email : email.email || '',
        label: idx === 0 ? 'primary' : 'secondary',
      }));
      setLeadEmails(emails);
    } catch (error) {
      console.error("Failed to load lead emails:", error);
    } finally {
      setLoadingEmails(false);
    }
  }, [lead?.id, lead?.emails]);

  // Load email records when lead changes
  useEffect(() => {
    if (lead?.id) {
      loadLeadEmails();
    }
  }, [lead?.id, loadLeadEmails]);

  useEffect(() => {
    setTagList(lead?.tags || []);
    setTagInput("");
  }, [lead?.id, lead?.tags]);

  useEffect(() => {
    if (!lead?.id) {
      setRetryHistory(null);
      return;
    }
    const record = localStorage.getItem(`enrichment_retry_${lead.id}`);
    if (!record) {
      setRetryHistory(null);
      return;
    }
    try {
      const parsed = JSON.parse(record) as { count?: number; last?: number };
      setRetryHistory({
        count: parsed.count || 0,
        last: parsed.last || null,
      });
    } catch {
      setRetryHistory(null);
    }
  }, [lead?.id]);

  useEffect(() => {
    if (!lead?.id) {
      setTimeline([]);
      return;
    }
    const stored = localStorage.getItem(`lead_timeline_${lead.id}`);
    if (!stored) {
      setTimeline([]);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setTimeline(Array.isArray(parsed) ? parsed : []);
    } catch {
      setTimeline([]);
    }
  }, [lead?.id]);
  
  if (!lead) return null;
  
  // Extract domain from website
  const domain = lead.website 
    ? lead.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    : undefined;
  
  // Extract contact name (use contact_person_name or name)
  const contactName = lead.contact_person_name || lead.name || undefined;

  const handleRetryEnrichment = async () => {
    if (!lead?.id) return;
    try {
      setRetryingEnrichment(true);
      await apiClient.retryEnrichment([lead.id]);
      const now = Date.now();
      const record = localStorage.getItem(`enrichment_retry_${lead.id}`);
      let count = 0;
      try {
        if (record) {
          const parsed = JSON.parse(record) as { count: number };
          count = parsed.count || 0;
        }
      } catch {
        count = 0;
      }
      const nextHistory = { count: count + 1, last: now };
      localStorage.setItem(`enrichment_retry_${lead.id}`, JSON.stringify(nextHistory));
      setRetryHistory(nextHistory);
      const timelineEntry = {
        id: `${Date.now()}`,
        label: "Queued AI enrichment retry",
        time: new Date().toISOString(),
      };
      setTimeline((prev) => {
        const next = [timelineEntry, ...prev].slice(0, 12);
        localStorage.setItem(`lead_timeline_${lead.id}`, JSON.stringify(next));
        return next;
      });
      showToast({
        type: "success",
        title: "Enrichment retry queued",
        message: "AI enrichment has been queued for this lead.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Retry failed",
        message: error?.response?.data?.detail || "Failed to retry AI enrichment.",
      });
    } finally {
      setRetryingEnrichment(false);
    }
  };

  const handleCopy = async (label: string, value?: string | null) => {
    if (!value) {
      showToast({
        type: "error",
        title: "Nothing to copy",
        message: `No ${label.toLowerCase()} available for this lead.`,
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showToast({
        type: "success",
        title: `${label} copied`,
        message: value,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Clipboard access was denied.",
      });
    }
  };

  const handleAddTag = async () => {
    if (!lead?.id) return;
    const nextTag = tagInput.trim();
    if (!nextTag) return;
    if (tagList.includes(nextTag)) {
      showToast({
        type: "info",
        title: "Tag already added",
        message: "This lead already has that tag.",
      });
      return;
    }
    try {
      setTagSaving(true);
      await apiClient.bulkUpdateLeadTags({
        lead_ids: [lead.id],
        tag: nextTag,
        action: "add",
      });
      const nextTags = [...tagList, nextTag];
      setTagList(nextTags);
      setTagInput("");
      onTagUpdate?.(lead.id, nextTags);
      const timelineEntry = {
        id: `${Date.now()}`,
        label: `Tag added: ${nextTag}`,
        time: new Date().toISOString(),
      };
      setTimeline((prev) => {
        const next = [timelineEntry, ...prev].slice(0, 12);
        localStorage.setItem(`lead_timeline_${lead.id}`, JSON.stringify(next));
        return next;
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Tag failed",
        message: error?.response?.data?.detail || "Failed to add tag.",
      });
    } finally {
      setTagSaving(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!lead?.id) return;
    try {
      setTagSaving(true);
      await apiClient.bulkUpdateLeadTags({
        lead_ids: [lead.id],
        tag,
        action: "remove",
      });
      const nextTags = tagList.filter((item) => item !== tag);
      setTagList(nextTags);
      onTagUpdate?.(lead.id, nextTags);
      const timelineEntry = {
        id: `${Date.now()}`,
        label: `Tag removed: ${tag}`,
        time: new Date().toISOString(),
      };
      setTimeline((prev) => {
        const next = [timelineEntry, ...prev].slice(0, 12);
        localStorage.setItem(`lead_timeline_${lead.id}`, JSON.stringify(next));
        return next;
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Remove failed",
        message: error?.response?.data?.detail || "Failed to remove tag.",
      });
    } finally {
      setTagSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-950 border-l border-slate-800 z-50 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
              <div className="flex-1">
                <p className="text-xs text-slate-500">Lead Detail</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-semibold">{lead.name || "Unknown business"}</p>
                  <HealthScoreBadge leadId={lead.id} size="sm" showDetails={true} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSimilarModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-500 hover:text-cyan-200 transition-colors"
                >
                  <Search className="w-3 h-3" />
                  Find similar
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            <motion.div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.06 },
                },
              }}
            >
              {/* LinkedIn Source Badge */}
              {lead.source === "linkedin_extension" && (
                <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-[11px] text-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold mb-1 flex items-center gap-1">
                        <span>in</span>
                        <span>Captured from LinkedIn</span>
                      </div>
                      {lead.social_links?.linkedin && (
                        <a
                          href={lead.social_links.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                        >
                          <span>Open profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* QA Status Alert */}
              {lead.qa_status && lead.qa_status !== "ok" && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                  <div className="font-semibold mb-1">Needs review</div>
                  <div>{lead.qa_reason || "AI flagged this lead for manual check."}</div>
                </div>
              )}

              <Section title="Quick Actions">
                <div className="grid gap-2">
                  <button
                    onClick={() => handleCopy("Email", lead.emails?.[0] || null)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-cyan-500 hover:text-cyan-200 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-slate-400" />
                    Copy primary email
                    <Copy className="w-3 h-3 ml-auto text-slate-500" />
                  </button>
                  <button
                    onClick={() => handleCopy("Phone", lead.phones?.[0] || null)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-cyan-500 hover:text-cyan-200 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-slate-400" />
                    Copy primary phone
                    <Copy className="w-3 h-3 ml-auto text-slate-500" />
                  </button>
                  <button
                    onClick={() => {
                      if (lead.website) {
                        window.open(lead.website, "_blank", "noopener,noreferrer");
                      } else {
                        showToast({
                          type: "error",
                          title: "No website",
                          message: "This lead does not have a website URL.",
                        });
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-cyan-500 hover:text-cyan-200 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-slate-400" />
                    Open website
                    <ExternalLink className="w-3 h-3 ml-auto text-slate-500" />
                  </button>
                </div>
              </Section>

              <Section title="Tags">
                <div className="space-y-3">
                  {tagList.length === 0 ? (
                    <p className="text-xs text-slate-500">No tags yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tagList.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleRemoveTag(tag)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:border-rose-500/60 hover:text-rose-200 transition-colors"
                          disabled={tagSaving}
                        >
                          <span>{tag.replace(/_/g, " ")}</span>
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      placeholder="Add tag"
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={tagSaving || !tagInput.trim()}
                      className="rounded-lg border border-cyan-500/50 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
                    >
                      {tagSaving ? "Saving..." : "Add"}
                    </button>
                  </div>
                </div>
              </Section>

              <Section title="Recent activity">
                {timeline.length === 0 ? (
                  <p className="text-xs text-slate-500">No recent activity.</p>
                ) : (
                  <div className="space-y-2 text-xs text-slate-400">
                    {timeline.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-slate-200">{item.label}</span>
                        <span className="text-slate-500">
                          {new Date(item.time).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <LeadScoreExplainCard leadId={lead.id} />
              <LeadScoreTimelineCard leadId={lead.id} />

              {lead.ai_status === "failed" && (
                <Section title="Enrichment Issues">
                  <div className="text-xs text-slate-400 space-y-3">
                    {(() => {
                      const errorText = lead.ai_last_error || "AI enrichment failed. Retry to attempt again.";
                      const displayText =
                        errorText.length > 120 ? `${errorText.slice(0, 117)}...` : errorText;
                      return (
                        <p title={errorText}>
                          {displayText}
                        </p>
                      );
                    })()}
                    {(() => {
                      const storedBackoff = localStorage.getItem("enrichment_auto_retry_backoff");
                      const parsedBackoff = storedBackoff ? Number(storedBackoff) : 10;
                      const backoffValue = Number.isNaN(parsedBackoff) ? 10 : Math.min(Math.max(parsedBackoff, 1), 60);
                      if (!retryHistory || retryHistory.count === 0) {
                        return <div className="text-[11px] text-slate-500">No retry attempts yet.</div>;
                      }
                      const lastRetry = retryHistory.last ? new Date(retryHistory.last) : null;
                      const elapsedMinutes = lastRetry ? Math.floor((Date.now() - lastRetry.getTime()) / 60000) : null;
                      const remaining = elapsedMinutes !== null ? Math.max(backoffValue - elapsedMinutes, 0) : null;
                      return (
                        <div className="space-y-1 text-[11px] text-slate-500">
                          <div>Retry attempts: {retryHistory.count}</div>
                          {lastRetry ? <div>Last retry: {lastRetry.toLocaleString()}</div> : null}
                          {remaining !== null ? (
                            <div>{remaining > 0 ? `Backoff: ${remaining}m remaining` : "Backoff: ready"}</div>
                          ) : null}
                        </div>
                      );
                    })()}
                    <button
                      onClick={handleRetryEnrichment}
                      disabled={retryingEnrichment}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-500 hover:text-cyan-200 transition-colors disabled:opacity-60"
                    >
                      {retryingEnrichment ? "Retrying..." : "Retry AI enrichment"}
                    </button>
                  </div>
                </Section>
              )}

              {/* Feedback Buttons */}
              <Section title="Feedback">
                <FeedbackButtons
                  leadId={lead.id}
                  currentFeedback={lead.fit_label as "good" | "bad" | "won" | null}
                  variant="buttons"
                  size="sm"
                />
              </Section>

              <Section title="Contact Information">
                <Field label="Phone" value={lead.phones?.join(", ") || undefined} />
                <Field label="Address" value={lead.address || undefined} />
                <Field
                  label="Location"
                  value={
                    [lead.city, lead.country].filter(Boolean).join(", ") || undefined
                  }
                />
                <Field label="Website" value={lead.website || undefined} />
              </Section>

              {/* Email Records Card - New component */}
              <LeadEmailsCard
                leadId={lead.id}
                emails={leadEmails}
                contactName={contactName}
                domain={domain}
                onEmailAdded={loadLeadEmails}
              />

              {lead.metadata?.services && lead.metadata.services.length > 0 && (
                <Section title="Services (AI)">
                  <div className="flex flex-wrap gap-1">
                    {lead.metadata.services.map((service: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-200"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {lead.metadata?.languages && lead.metadata.languages.length > 0 && (
                <Section title="Languages">
                  <div className="flex flex-wrap gap-1">
                    {lead.metadata.languages.map((lang: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-200"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {lead.social_links && Object.keys(lead.social_links).length > 0 && (
                <Section title="Social Links">
                  <div className="space-y-1">
                    {Object.entries(lead.social_links)
                      .filter(([_, url]) => url)
                      .map(([platform, url]: [string, any]) => (
                        <div key={platform} className="flex justify-between text-xs py-0.5">
                          <span className="text-slate-500 capitalize">{platform}</span>
                          <a
                            href={String(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 truncate max-w-[200px]"
                          >
                            {String(url)}
                          </a>
                        </div>
                      ))}
                  </div>
                </Section>
              )}

              {/* Tech Stack & Digital Maturity */}
              <LeadTechCard
                tech_stack={
                  typeof lead.tech_stack === "object" && lead.tech_stack !== null && !Array.isArray(lead.tech_stack)
                    ? lead.tech_stack
                    : undefined
                }
                digital_maturity={lead.digital_maturity}
              />

              {/* AI Features Section Header */}
              <div className="pt-2 pb-1 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    AI-Powered Insights
                  </h3>
                </div>
              </div>

              {/* Next Best Action Strip - Show first as it's most actionable */}
              <LeadNextActionStrip leadId={lead.id} />

              {/* Score + QA summary */}
              <Section title="Score & Quality">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs py-0.5">
                    <span className="text-slate-500">Quality Score</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-semibold">
                        {Math.round(lead.quality_score || 0)} / 100
                      </span>
                      <QaBadge status={lead.qa_status} />
                    </div>
                  </div>
                  {lead.smart_score !== null && lead.smart_score !== undefined && (
                    <div className="flex justify-between text-xs py-0.5">
                      <span className="text-slate-500">AI Smart Score</span>
                      <span className="text-cyan-300 font-semibold">
                        {Math.round(lead.smart_score * 100)} / 100
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-500">Quality Label</span>
                    <span className="text-slate-200 font-semibold uppercase">
                      {lead.quality_label || "low"}
                    </span>
                  </div>
                </div>
              </Section>

              {/* Key People (AI) - New component */}
              <LeadKeyPeople leadId={lead.id} />

              {/* Social Insights - New component */}
              <LeadSocialInsights leadId={lead.id} />

              {/* Tech & Ads - New component */}
              <LeadTechAndAdsCard leadId={lead.id} />

              {/* Deep AI Dossier */}
              <DossierCard leadId={lead.id} leadName={lead.name || undefined} />

              {/* Similar Leads / Lookalike - New component */}
              <LeadSimilarLeadsCard leadId={lead.id} />

              <Section title="AI Notes">
                <p className="text-sm text-slate-300">
                  {lead.metadata?.notes || "No notes generated yet."}
                </p>
              </Section>

              <Section title="Metadata">
                <div className="space-y-1 text-xs">
                  <Field label="Source" value={lead.source || undefined} />
                  <Field label="Niche" value={lead.niche || undefined} />
                  {lead.cms && <Field label="CMS" value={lead.cms} />}
                </div>
              </Section>
            </motion.div>
          </motion.div>

          {/* Similar Leads Modal */}
          <SimilarLeadsModal
            leadId={lead.id}
            open={similarModalOpen}
            onClose={() => setSimilarModalOpen(false)}
            onLeadClick={(leadId) => {
              setSimilarModalOpen(false);
              // Could navigate to that lead or refresh
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={{
        hidden: { opacity: 0, y: 4 },
        visible: { opacity: 1, y: 0 },
      }}
      className="border border-slate-800 rounded-xl px-3 py-2.5 bg-slate-900/60"
    >
      <h3 className="text-xs font-semibold text-slate-400 mb-2">{title}</h3>
      <div>{children}</div>
    </motion.section>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 truncate max-w-[180px] text-right">
        {value || "-"}
      </span>
    </div>
  );
}

