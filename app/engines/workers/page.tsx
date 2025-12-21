"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EnginesNav } from "@/components/engines/EnginesNav";
import { Cpu } from "lucide-react";

export default function WorkerQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskName, setTaskName] = useState("Recompute scores");

  const loadQueue = () => {
    setLoading(true);
    apiClient
      .getWorkerQueue()
      .then((data) => setQueue(data || []))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleEnqueue = async () => {
    await apiClient.enqueueWorkerTask({ name: taskName, status: "queued" });
    loadQueue();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Worker Queue"
        description="Monitor background tasks and queue depth"
        icon={Cpu}
        action={
          <Button variant="outline" size="sm" onClick={loadQueue}>
            Refresh
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <EnginesNav />
          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Enqueue test task</h3>
            <input
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
            />
            <Button onClick={handleEnqueue}>Add to queue</Button>
          </section>

          <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Queue</h3>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading queue...</p>
            ) : queue.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Queue is empty.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                {queue.map((task) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">{task.name}</span>
                    <span>{task.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
