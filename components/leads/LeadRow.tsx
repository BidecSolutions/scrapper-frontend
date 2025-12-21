"use client";

import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { apiClient, type Lead } from "@/lib/api";
import { LeadDetailPanel } from "./LeadDetailPanel";
import { QaBadge } from "./QaBadge";
import { SmartScoreBadge } from "./SmartScoreBadge";
import { HealthScoreBadge } from "./HealthScoreBadge";
import { useToast } from "@/components/ui/Toast";
import { Plus, X } from "lucide-react";

function SourceBadge({ source }: { source: string }) {
  if (source === "linkedin_extension" || source?.includes("linkedin")) {
    return (
      <Badge
        variant="outline"
        className="border-blue-500/50 bg-blue-500/10 text-blue-300 text-[10px] px-2 py-0.5 flex items-center gap-1"
      >
        <span>in</span>
        <span>LinkedIn</span>
      </Badge>
    );
  }
  
  if (source === "csv" || source?.includes("csv")) {
    return (
      <Badge
        variant="outline"
        className="border-slate-600 bg-slate-800/60 text-slate-300 text-[10px] px-2 py-0.5"
      >
        CSV
      </Badge>
    );
  }
  
  if (source === "manual") {
    return (
      <Badge
        variant="outline"
        className="border-slate-600 bg-slate-800/60 text-slate-300 text-[10px] px-2 py-0.5"
      >
        Manual
      </Badge>
    );
  }
  
  // Default: show source as-is or "Unknown"
  return (
    <Badge
      variant="outline"
      className="border-slate-600 bg-slate-800/60 text-slate-300 text-[10px] px-2 py-0.5"
    >
      {source || "Unknown"}
    </Badge>
  );
}

interface LeadRowProps {
  lead: Lead;
  onOpenDetail: (lead: Lead) => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onTagUpdate?: (leadId: number, tags: string[]) => void;
  onScoreUpdate?: (leadId: number, score: number, label: "low" | "medium" | "high") => void;
}

export const LeadRow = memo(function LeadRow({
  lead,
  onOpenDetail,
  selected = false,
  onSelect,
  onTagUpdate,
}: LeadRowProps) {
  const { showToast } = useToast();
  const [retryMeta, setRetryMeta] = useState<{ count: number; last: number | null } | null>(null);
  const [backoffMinutes, setBackoffMinutes] = useState(10);
  const [tagEditing, setTagEditing] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(lead.tags || []);
  const [scoreEditing, setScoreEditing] = useState(false);
  const [scoreInput, setScoreInput] = useState<number>(lead.quality_score || 0);

  useEffect(() => {
    if (!lead?.id || lead.ai_status !== "failed") {
      setRetryMeta(null);
      return;
    }
    const record = localStorage.getItem(`enrichment_retry_${lead.id}`);
    if (!record) {
      setRetryMeta(null);
      return;
    }
    try {
      const parsed = JSON.parse(record) as { count?: number; last?: number };
      setRetryMeta({ count: parsed.count || 0, last: parsed.last || null });
    } catch {
      setRetryMeta(null);
    }
    const storedBackoff = localStorage.getItem("enrichment_auto_retry_backoff");
    if (storedBackoff) {
      const parsed = Number(storedBackoff);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setBackoffMinutes(Math.min(parsed, 60));
      }
    }
  }, [lead?.id, lead.ai_status]);

  useEffect(() => {
    setLocalTags(lead.tags || []);
  }, [lead.tags]);

  useEffect(() => {
    setScoreInput(lead.quality_score || 0);
  }, [lead.quality_score]);

  const cooldownText = (() => {
    if (!retryMeta?.last) return null;
    const elapsedMinutes = Math.floor((Date.now() - retryMeta.last) / 60000);
    const remaining = Math.max(backoffMinutes - elapsedMinutes, 0);
    return remaining > 0 ? `Cooldown ${remaining}m` : "Ready";
  })();

  const handleAddTag = async () => {
    const value = tagInput.trim();
    if (!value || !lead?.id) return;
    if (localTags.includes(value)) {
      showToast({
        type: "info",
        title: "Tag exists",
        message: "This lead already has that tag.",
      });
      return;
    }
    try {
      setTagSaving(true);
      await apiClient.bulkUpdateLeadTags({
        lead_ids: [lead.id],
        tag: value,
        action: "add",
      });
      const next = [...localTags, value];
      setLocalTags(next);
      setTagInput("");
      onTagUpdate?.(lead.id, next);
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
      const next = localTags.filter((item) => item !== tag);
      setLocalTags(next);
      onTagUpdate?.(lead.id, next);
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
    <motion.tr
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      whileHover={{ backgroundColor: "rgba(15,23,42,0.9)" }}
      className={`border-b border-slate-800 text-sm transition-colors ${
        selected ? "bg-cyan-500/10" : ""
      }`}
    >
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </td>
      <td
        className="px-3 py-2 cursor-pointer"
        onClick={() => onOpenDetail(lead)}
      >
        <div className="flex flex-col gap-1">
          <span className="font-medium">{lead.name || "Unknown"}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">
              {lead.niche || "-"}
              {lead.city && ` - ${lead.city}`}
            </span>
            {/* Source badges (for scraping sources) */}
            {(lead.sources && lead.sources.length > 0 && lead.source !== "linkedin_extension") && (
              <div className="flex gap-1">
                 {lead.sources.map((source: string) => (
                  <Badge
                    key={source}
                    variant="outline"
                    className="border-slate-700 bg-slate-800/60 text-[10px] text-slate-300 px-1.5 py-0"
                  >
                    {source === "google_search" ? "G Search" :
                     source === "google_places" ? "G Maps" :
                     source === "yellowpages" ? "YP" :
                     source === "web_search" ? "Bing" :
                     source}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
      <td
        className="px-3 py-2 text-xs text-slate-300 cursor-pointer"
        onClick={() => onOpenDetail(lead)}
      >
        {lead.emails[0] || "-"}
      </td>
      <td
        className="px-3 py-2 text-xs text-slate-300 cursor-pointer"
        onClick={() => onOpenDetail(lead)}
      >
        {lead.phones[0] || "-"}
      </td>
      <td
        className="px-3 py-2 cursor-pointer"
        onClick={() => onOpenDetail(lead)}
      >
        <SourceBadge source={lead.source || ""} />
      </td>
      <td
        className="px-3 py-2 cursor-pointer"
        onClick={() => onOpenDetail(lead)}
      >
             <div className="flex items-center gap-2 flex-wrap">
               <HealthScoreBadge leadId={lead.id} size="sm" showDetails={true} />
               {scoreEditing ? (
                 <div
                   className="flex items-center gap-2"
                   onClick={(e) => e.stopPropagation()}
                 >
                   <input
                     type="number"
                     min={0}
                     max={100}
                     value={scoreInput}
                     onChange={(e) => setScoreInput(Number(e.target.value || 0))}
                     className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
                   />
                   <button
                     onClick={() => {
                       const scoreValue = Math.max(0, Math.min(scoreInput, 100));
                       const label =
                         scoreValue >= 80 ? "high" : scoreValue >= 50 ? "medium" : "low";
                       onScoreUpdate?.(lead.id, scoreValue, label);
                       setScoreEditing(false);
                     }}
                     className="text-[11px] text-cyan-300"
                   >
                     Save
                   </button>
                   <button
                     onClick={() => setScoreEditing(false)}
                     className="text-[11px] text-slate-400"
                   >
                     Cancel
                   </button>
                 </div>
               ) : (
                 <>
                   <ScorePill
                     score={lead.quality_score || 0}
                     label={lead.quality_label || "low"}
                   />
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setScoreEditing(true);
                     }}
                     className="text-[11px] text-slate-400 hover:text-cyan-300"
                   >
                     Edit
                   </button>
                 </>
               )}
                 {lead.smart_score !== null && lead.smart_score !== undefined && (
                 <SmartScoreBadge
                   score={lead.smart_score}
                   mode="smart"
                 />
               )}
               <QaBadge status={lead.qa_status} />
               {lead.ai_status === "failed" && (
                 <Badge
                   variant="outline"
                   className="border-amber-500/40 bg-amber-500/10 text-amber-200 text-[10px] px-2 py-0.5"
                   title={`Retries: ${retryMeta?.count || 0}${cooldownText ? ` | ${cooldownText}` : ""}`}
                 >
                   Retry {retryMeta?.count || 0}
                 </Badge>
               )}
             </div>
           </td>
      <td
        className="px-3 py-2 cursor-pointer"
        onClick={() => onOpenDetail(lead)}
      >
        <div className="flex flex-wrap gap-1">
          {localTags.slice(0, tagEditing ? localTags.length : 3).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="border-slate-700 bg-slate-900/80 text-[11px] text-slate-200 flex items-center gap-1"
            >
              {tag.replace(/_/g, " ")}
              {tagEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag);
                  }}
                  className="text-slate-400 hover:text-rose-300"
                  disabled={tagSaving}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
          {!tagEditing && localTags.length > 3 && (
            <span className="text-[11px] text-slate-500">
              +{localTags.length - 3} more
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTagEditing((prev) => !prev);
            }}
            className="text-[11px] text-cyan-400 border border-cyan-500/40 rounded-full px-2 py-0.5 hover:bg-cyan-500/10"
          >
            {tagEditing ? "Done" : "Edit"}
          </button>
        </div>
        {tagEditing && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add tag"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddTag();
              }}
              disabled={tagSaving || !tagInput.trim()}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        )}
      </td>
    </motion.tr>
  );
});

export function ScorePill({
  score,
  label,
}: {
  score: number;
  label: "low" | "medium" | "high";
}) {
  const colorMap: Record<typeof label, string> = {
    low: "from-rose-500 to-amber-500",
    medium: "from-amber-400 to-cyan-400",
    high: "from-emerald-400 to-cyan-400",
  };

  return (
    <div className="inline-flex items-center gap-2">
      <motion.div
        className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${colorMap[label]} px-2 py-0.5 text-[11px] font-semibold text-slate-950`}
        whileHover={{ scale: 1.03 }}
      >
        <span>{Math.round(score)}</span>
        <span className="uppercase tracking-[0.16em]">{label}</span>
      </motion.div>
    </div>
  );
}

