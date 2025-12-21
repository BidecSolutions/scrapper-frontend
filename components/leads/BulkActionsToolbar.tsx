"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ThumbsUp, ThumbsDown, CheckCircle2, Sparkles, UserPlus, Tag, FileText, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onMarkGood?: () => void;
  onMarkBad?: () => void;
  onExport?: () => void;
  onAssignOwner?: () => void;
  onAddTag?: () => void;
  onExportTemplate?: () => void;
  onVerifyEmails?: () => void;
  onEnrichLeads?: () => void;
  onRetryEnrichment?: () => void;
  onBulkEdit?: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onClear,
  onMarkGood,
  onMarkBad,
  onExport,
  onAssignOwner,
  onAddTag,
  onExportTemplate,
  onVerifyEmails,
  onEnrichLeads,
  onRetryEnrichment,
  onBulkEdit,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl backdrop-blur-sm">
          <span className="text-sm font-medium text-slate-300">
            {selectedCount} lead{selectedCount !== 1 ? "s" : ""} selected
          </span>

          <div className="h-6 w-px bg-slate-700" />

          {onMarkGood && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkGood}
              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            >
              <ThumbsUp className="w-4 h-4 mr-1.5" />
              Good fit
            </Button>
          )}

          {onMarkBad && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkBad}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            >
              <ThumbsDown className="w-4 h-4 mr-1.5" />
              Not relevant
            </Button>
          )}

          {onVerifyEmails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onVerifyEmails}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Verify emails
            </Button>
          )}

          {onAssignOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAssignOwner}
              className="text-slate-200 hover:text-white hover:bg-slate-700/40"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Assign
            </Button>
          )}

          {onBulkEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBulkEdit}
              className="text-slate-200 hover:text-white hover:bg-slate-700/40"
            >
              <Sliders className="w-4 h-4 mr-1.5" />
              Bulk edit
            </Button>
          )}

          {onAddTag && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddTag}
              className="text-slate-200 hover:text-white hover:bg-slate-700/40"
            >
              <Tag className="w-4 h-4 mr-1.5" />
              Tag
            </Button>
          )}

          {onExportTemplate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportTemplate}
              className="text-slate-200 hover:text-white hover:bg-slate-700/40"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Export template
            </Button>
          )}

          {onEnrichLeads && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEnrichLeads}
              className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/10"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Enrich with AI
            </Button>
          )}

          {onRetryEnrichment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetryEnrichment}
              className="text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Retry failed
            </Button>
          )}

          {onExport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-slate-400 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

