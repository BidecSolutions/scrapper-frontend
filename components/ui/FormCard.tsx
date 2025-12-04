"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: React.ElementType;
  className?: string;
  delay?: number;
}

export function FormCard({ children, title, description, icon: Icon, className, delay = 0 }: FormCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl",
        className
      )}
    >
      {(title || description) && (
        <div className="mb-6 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
          {title && (
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-1">
              {Icon && <Icon className="w-5 h-5 text-cyan-500" />}
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

