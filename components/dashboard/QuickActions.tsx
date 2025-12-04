"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, Upload, Search, Sparkles, Mail, MapPin, Users } from "lucide-react";

const actions = [
  { icon: Plus, label: "New Scrape Job", href: "/jobs/new", color: "from-cyan-500 to-blue-500" },
  { icon: Upload, label: "Upload CSV", href: "/leads/import", color: "from-emerald-500 to-green-500" },
  { icon: Search, label: "Find Emails", href: "/email-finder", color: "from-purple-500 to-pink-500" },
  { icon: Mail, label: "Verify Emails", href: "/verification", color: "from-amber-500 to-orange-500" },
  { icon: MapPin, label: "Google Maps", href: "/google-maps", color: "from-blue-500 to-cyan-500" },
  { icon: Sparkles, label: "AI Lookalikes", href: "/lookalike/new", color: "from-violet-500 to-purple-500" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href={action.href}>
              <div className={`
                relative p-4 rounded-xl bg-gradient-to-br ${action.color} 
                text-white shadow-lg hover:shadow-xl transition-all
                overflow-hidden group cursor-pointer
              `}>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <Icon className="w-5 h-5 mb-2" />
                  <p className="text-xs font-semibold">{action.label}</p>
                </div>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

