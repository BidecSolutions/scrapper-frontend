"use client";

import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api";
import type { NotificationItem } from "@/types/notifications";
import { useRouter } from "next/navigation";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiClient.getNotifications(false, 20);
      setItems(res.items);
      setUnreadCount(res.unread_count);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Poll every 45 seconds for new notifications
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  async function handleClickItem(n: NotificationItem) {
    if (!n.is_read) {
      try {
        const updated = await apiClient.updateNotification(n.id, { is_read: true });
        setItems((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("Error updating notification:", err);
      }
    }
    if (n.target_url) {
      router.push(n.target_url);
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    try {
      await apiClient.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative rounded-full p-2 text-slate-300 hover:bg-slate-800 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <span className="inline-block h-5 w-5">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-semibold text-slate-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Notifications
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                {items.length} recent
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 py-1">
            {loading && (
              <div className="px-3 py-4 text-xs text-slate-500 text-center">
                Loading…
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="px-3 py-4 text-xs text-slate-500 text-center">
                No notifications yet.
              </div>
            )}
            {!loading &&
              items.map((n) => (
                <button
                  key={n.id}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-900 transition-colors"
                  onClick={() => handleClickItem(n)}
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      n.is_read ? "bg-slate-600" : "bg-cyan-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-100">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

