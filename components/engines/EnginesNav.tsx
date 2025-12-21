"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, Cpu, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/engines", label: "Monitor", icon: Cpu },
  { href: "/engines/workers", label: "Workers", icon: Activity },
  { href: "/engines/audit", label: "Audit", icon: FileText },
  { href: "/engines/settings", label: "Settings", icon: Settings },
  { href: "/engines/alerts", label: "Alerts", icon: Bell },
];

export function EnginesNav() {
  const pathname = usePathname() || "";

  return (
    <section className="grid gap-3 md:grid-cols-5">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-2xl border px-4 py-3 shadow-lg transition-colors",
              "bg-white/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50",
              "hover:border-cyan-500/40",
              active && "border-cyan-500/60 bg-cyan-500/10"
            )}
          >
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Icon className={cn("w-4 h-4", active ? "text-cyan-400" : "text-cyan-500")} />
              {item.label}
            </div>
          </Link>
        );
      })}
    </section>
  );
}
