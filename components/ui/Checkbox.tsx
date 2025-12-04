"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, ...props }, ref) => {
    return (
      <label className={cn("flex items-start gap-3 cursor-pointer group", className)}>
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            className="sr-only"
            {...props}
          />
          <motion.div
            className={cn(
              "w-5 h-5 rounded-lg border-2 transition-all duration-200",
              "border-slate-300 dark:border-slate-600",
              "bg-white dark:bg-slate-800",
              props.checked && "bg-cyan-500 border-cyan-500 dark:bg-cyan-500 dark:border-cyan-500",
              "group-hover:border-cyan-400 dark:group-hover:border-cyan-500"
            )}
            animate={{
              scale: props.checked ? [1, 1.1, 1] : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {props.checked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-white" />
              </motion.div>
            )}
          </motion.div>
        </div>
        <div className="flex-1">
          {label && (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
              {description}
            </span>
          )}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

