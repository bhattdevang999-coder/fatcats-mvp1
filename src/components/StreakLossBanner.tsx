"use client";

import { useState } from "react";
import Link from "next/link";

interface StreakLossBannerProps {
  previousStreak: number;
}

/**
 * Cold streak loss banner. No encouragement. Just the fact.
 * "Day 0. Your 12-day streak is gone."
 */
export default function StreakLossBanner({ previousStreak }: StreakLossBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || previousStreak <= 1) return null;

  return (
    <div className="mb-4 animate-slide-up">
      <div className="relative px-4 py-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20">
        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
            <span className="text-[20px]">💀</span>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-red-400">
              Day 0.
            </p>
            <p className="text-[12px] text-[var(--fc-muted)]">
              Your {previousStreak}-day streak is gone.
            </p>
          </div>
          <Link
            href="/report/new"
            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/20 text-red-400 text-[11px] font-bold active:scale-95 transition-transform hover:bg-red-500/20"
          >
            Start over
          </Link>
        </div>
      </div>
    </div>
  );
}
