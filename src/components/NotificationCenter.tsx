"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getNotifications,
  markAllRead,
  markRead,
  timeAgoNotif,
  type FatCatsNotification,
} from "@/lib/notifications";

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<FatCatsNotification[]>([]);

  useEffect(() => {
    if (open) {
      setNotifications(getNotifications());
    }
  }, [open]);

  const handleMarkAllRead = () => {
    markAllRead();
    setNotifications(getNotifications());
  };

  const handleTap = (notif: FatCatsNotification) => {
    markRead(notif.id);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[70] bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-[80] animate-slide-up max-h-[80vh]">
        <div className="max-w-lg mx-auto mx-3 mb-3">
          <div className="glass-card border border-white/10 shadow-2xl overflow-hidden rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-bold text-white">Updates</h2>
              <div className="flex items-center gap-2">
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[var(--fc-orange)] font-medium hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-[60vh] p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-2xl mb-2">👁️</p>
                  <p className="text-[13px] text-[var(--fc-muted)]">Nothing yet.</p>
                  <p className="text-[11px] text-[var(--fc-muted)] mt-1">
                    Activity near your reports will show up here.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <Link
                    key={notif.id}
                    href={notif.deepLink}
                    onClick={() => handleTap(notif)}
                    className={`block px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-all active:scale-[0.98] ${
                      !notif.read ? "border-l-2 border-l-[var(--fc-orange)]" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="text-[18px] shrink-0 mt-0.5">{notif.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[14px] font-semibold leading-snug ${
                          !notif.read ? "text-white" : "text-white/70"
                        }`}>
                          {notif.title}
                        </p>
                        <p className="text-[13px] text-[var(--fc-muted)] mt-0.5 line-clamp-2">
                          {notif.body}
                        </p>
                        <p className="text-[11px] text-[var(--fc-muted)] mt-1">
                          {timeAgoNotif(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
