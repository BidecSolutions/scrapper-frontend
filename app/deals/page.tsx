"use client";

import { useEffect, useState } from "react";
import { apiClient, type SavedView } from "@/lib/api";
import type { Deal, DealStage } from "@/types/deals";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Briefcase, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { SavedViewsBar } from "@/components/saved-views/SavedViewsBar";
import { Input } from "@/components/ui/Input";

const STAGES: DealStage[] = [
  "new",
  "contacted",
  "qualified",
  "meeting_scheduled",
  "proposal",
  "won",
  "lost",
];

const STAGE_LABELS: Record<DealStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  meeting_scheduled: "Meeting",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export default function DealsPipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  async function load(customFilters?: Record<string, any>) {
    setLoading(true);
    try {
      const res = await apiClient.getDeals({
        page_size: 1000,
        ...customFilters,
      });
      setDeals(res.items);
    } catch (error) {
      console.error("Failed to load deals:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleApplyView = (view: SavedView) => {
    if (view.filters.owner) {
      setOwnerFilter(view.filters.owner as "all" | "mine");
    }
    load(view.filters);
  };

  useEffect(() => {
    load(ownerFilter !== "all" ? { owner: ownerFilter } : undefined);
  }, [ownerFilter]);

  const filteredDeals = deals.filter((deal) => {
    if (!searchQuery.trim()) return true;
    const haystack = `${deal.name || ""} ${deal.stage || ""}`.toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  });

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = filteredDeals.filter((d) => d.stage === stage);
    return acc;
  }, {} as Record<DealStage, Deal[]>);

  function formatCurrency(value: number | null | undefined, currency: string = "USD"): string {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function getDaysOpen(deal: Deal): number {
    const created = new Date(deal.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  const openDeals = filteredDeals.filter((deal) => deal.stage !== "won" && deal.stage !== "lost");
  const openPipelineValue = openDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const wonDeals = filteredDeals.filter((deal) => deal.stage === "won").length;
  const lostDeals = filteredDeals.filter((deal) => deal.stage === "lost").length;
  const winRate =
    wonDeals + lostDeals > 0 ? `${Math.round((wonDeals / (wonDeals + lostDeals)) * 100)}%` : "0%";
  const avgAge =
    openDeals.length > 0
      ? Math.round(openDeals.reduce((sum, deal) => sum + getDaysOpen(deal), 0) / openDeals.length)
      : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Deals Pipeline"
        description="Drag deals between stages to update progress"
        icon={Briefcase}
        action={
          <div className="flex items-center gap-3">
            <Select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value as "all" | "mine")}
              options={[
                { value: "all", label: "All deals" },
                { value: "mine", label: "My deals" },
              ]}
              className="w-32"
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.push("/deals/new")}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Deal
              </Button>
            </motion.div>
          </div>
        }
      />

      <main className="flex-1 overflow-hidden px-6 pt-6 pb-10">
        <div className="mb-4 space-y-4">
          <SavedViewsBar
            pageType="deals"
            currentFilters={{
              owner: ownerFilter !== "all" ? ownerFilter : undefined,
            }}
            onApplyView={handleApplyView}
          />

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-4 shadow-lg">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Open Pipeline</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {openPipelineValue > 0 ? formatCurrency(openPipelineValue) : "-"}
              </p>
            </div>
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-4 shadow-lg">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Win Rate</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{winRate}</p>
            </div>
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-4 shadow-lg">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Avg Age (days)</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{avgAge}</p>
            </div>
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-4 shadow-lg">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Open Deals</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{openDeals.length}</p>
            </div>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-4 shadow-lg">
            <Input
              label="Search deals"
              icon={Search}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or stage"
            />
          </section>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading deals...</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 h-full custom-scrollbar">
            {STAGES.map((stage, index) => {
              const stageDeals = dealsByStage[stage];
              const totalValue = stageDeals.reduce(
                (sum, d) => sum + (d.value || 0),
                0
              );

              return (
                <motion.section
                  key={stage}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex-shrink-0 w-72 rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-4 flex flex-col h-fit shadow-xl"
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                        {STAGE_LABELS[stage]}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {stageDeals.length} deal{stageDeals.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                        {totalValue > 0 ? formatCurrency(totalValue) : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Deals list */}
                  <div className="mt-1 space-y-2 flex-1 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
                    {stageDeals.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-xs text-slate-500 dark:text-slate-400 py-8 px-4">
                        <span>No deals</span>
                        <span className="mt-1 text-[10px]">Drop deals here</span>
                      </div>
                    ) : (
                      stageDeals.map((deal, dealIndex) => (
                        <motion.article
                          key={deal.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: dealIndex * 0.03 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          className="rounded-xl glass border border-slate-200/50 dark:border-slate-800/50 px-3 py-2.5 shadow-lg cursor-pointer hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-xl transition-all duration-200 group"
                          onClick={() => router.push(`/deals/${deal.id}`)}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-50 truncate flex-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                              {deal.name}
                            </h3>
                            {deal.value && (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {formatCurrency(deal.value, deal.currency)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                            <span>{getDaysOpen(deal)}d ago</span>
                            {deal.owner_user_id && (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 border border-cyan-400/30 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                {deal.owner_user_id % 10}
                              </div>
                            )}
                          </div>
                        </motion.article>
                      ))
                    )}
                  </div>
                </motion.section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
