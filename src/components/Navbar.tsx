"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { registerServiceWorker, requestPushPermission } from "@/lib/notifications";
import { getUnreadCount, generateSessionNotification } from "@/lib/notifications";
import NotificationCenter from "@/components/NotificationCenter";
import { getStreak } from "@/lib/engagement";

function BellIcon({ enabled }: { enabled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={enabled ? "#E8652B" : "none"} stroke={enabled ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [streak, setStreak] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Register SW on mount + load streak
  useEffect(() => {
    registerServiceWorker();
    if ("Notification" in window && Notification.permission === "granted") {
      setNotifEnabled(true);
    }
    const s = getStreak();
    setStreak(s.current);
    // Generate session notification + update unread count
    generateSessionNotification();
    setUnreadCount(getUnreadCount());
  }, []);

  const handleBell = useCallback(async () => {
    // Always toggle the notification center panel
    setNotifOpen((prev) => !prev);
    // If push not yet enabled, request permission in the background (non-blocking)
    if (!notifEnabled && "Notification" in window && Notification.permission === "default") {
      requestPushPermission().then((granted) => {
        if (granted) {
          setNotifEnabled(true);
        }
      }).catch(() => {});
    }
  }, [notifEnabled]);

  const handleNotifClose = useCallback(() => {
    setNotifOpen(false);
    setUnreadCount(getUnreadCount());
  }, []);

  if (pathname === "/") return null;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-[var(--top-bar-height)] transition-all duration-200 ${
          scrolled
            ? "bg-[var(--fc-bg)]/90 backdrop-blur-xl border-b border-white/[0.06]"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-lg mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/assets/logo-64.png"
              alt="FatCats"
              width={28}
              height={28}
              className="group-hover:scale-105 transition-transform"
            />
            <span className="text-white font-bold text-[15px] tracking-wide">
              FatCats
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            {/* Watchdog Streak pill */}
            {streak > 0 && (
              <Link
                href="/profile"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/15 hover:bg-amber-500/15 transition-colors active:scale-95"
              >
                <span className="text-[12px]">🔥</span>
                <span className="text-[12px] font-bold text-amber-400">
                  {streak}
                </span>
              </Link>
            )}

            <button
              onClick={handleBell}
              className={`w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors active:scale-90 relative ${notifEnabled ? "bg-[var(--fc-orange)]/10" : ""}`}
            >
              <BellIcon enabled={notifEnabled} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[var(--fc-orange)] text-white text-[9px] font-bold px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </nav>
      </header>

      <NotificationCenter open={notifOpen} onClose={handleNotifClose} />
    </>
  );
}
