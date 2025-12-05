"use client";

import { forwardRef, TextareaHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, fullWidth = true, className, ...props }, ref) => {
    return (
      <div className={cn("space-y-1.5", fullWidth && "w-full")}>
        {label && (
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full rounded-xl border transition-all duration-200 resize-none",
            "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
            "border-slate-200 dark:border-slate-700",
            "text-slate-900 dark:text-slate-50",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/50",
            "focus:border-cyan-500 dark:focus:border-cyan-400",
            "focus:scale-[1.01]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "px-4 py-3",
            error && "border-rose-500 dark:border-rose-500 focus:ring-rose-500/50",
            className
          )}
          {...props}
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1"
          >
            <span>•</span>
            {error}
          </motion.p>
        )}
        {helperText && !error && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

