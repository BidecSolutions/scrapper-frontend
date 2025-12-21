"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

interface PageHeaderProps {
  title: string;
  description?: string;
  backUrl?: string;
  action?: ReactNode;
  icon?: React.ElementType;
}

export function PageHeader({ title, description, backUrl, action, icon: Icon }: PageHeaderProps) {
  const router = useRouter();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-20 glass border-b border-slate-200/50 dark:border-slate-800/50 shadow-lg mb-6"
    >
      <div className="px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {backUrl && (
            <motion.button
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(backUrl)}
              aria-label="Go back"
              className="p-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </motion.button>
          )}
          <div className="flex-1 min-w-0">
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-50 dark:via-slate-100 dark:to-slate-50 bg-clip-text text-transparent flex items-center gap-2"
            >
              {Icon && <Icon className="w-7 h-7 text-cyan-500" />}
              {title}
            </motion.h1>
            {description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-slate-600 dark:text-slate-400 mt-1.5"
              >
                {description}
              </motion.p>
            )}
          </div>
        </div>
        {action && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {action}
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}

