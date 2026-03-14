"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusPill from "@/components/StatusPill";
import { listReportsByDevice } from "@/lib/reports";
import { getDeviceHash } from "@/lib/device";
import type { Report } from "@/lib/types";

const IMPACT_LEVELS = [
  { min: 0, label: "Newcomer", color: "#8B95A8" },
  { min: 3, label: "Investigator", color: "#E8652B" },
  { min: 10, label: "Watchdog", color: "#FF7A3D" },
  { min: 25, label: "Legend", color: "#22C55E" },
];

const ACHIEVEMENTS = [
  { icon: "🐱", label: "Founding Watchdog", unlocked: true },
  { icon: "⚡", label: "Early Supporter", unlocked: true },
  { icon: "📸", label: "First Exposé", unlocked: false },
  { icon: "🔥", label: "Trending", unlocked: false },
  { icon: "🏆", label: "100 Watchers", unlocked: false },
  { icon: "✅", label: "Fixer", unlocked: false },
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function ProfilePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const dh = getDeviceHash();
      const data = await listReportsByDevice(dh);
      setReports(data);
      setLoading(false);
    }
    load();
  }, []);

  const totalWatchers = reports.reduce((sum, r) => sum + r.supporters_count, 0);
  const fixedCount = reports.filter((r) => r.status === "fixed").length;
  const totalReactions = 0; // placeholder — no backend yet

  // Impact score
  const score = reports.length + totalWatchers + fixedCount * 5;
  const currentLevel = [...IMPACT_LEVELS].reverse().find((l) => score >= l.min) || IMPACT_LEVELS[0];
  const nextLevel = IMPACT_LEVELS[IMPACT_LEVELS.indexOf(currentLevel) + 1];
  const progress = nextLevel
    ? Math.min(100, ((score - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
    : 100;

  // Unlock achievements dynamically
  const achievements = ACHIEVEMENTS.map((a) => {
    if (a.label === "First Exposé" && reports.length > 0) return { ...a, unlocked: true };
    if (a.label === "Fixer" && fixedCount > 0) return { ...a, unlocked: true };
    if (a.label === "100 Watchers" && totalWatchers >= 100) return { ...a, unlocked: true };
    return a;
  });

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Profile header */}
        <div className="glass-card p-6 text-center mb-5 animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-[var(--fc-orange)]/10 flex items-center justify-center mx-auto mb-4">
            <Image
              src="/assets/logo-128.png"
              alt="FatCats"
              width={48}
              height={48}
            />
          </div>
          <h1 className="text-lg font-bold text-white mb-0.5">
            Founding Watchdog
          </h1>
          <p className="text-[13px] text-[var(--fc-muted)]">
            Keeping the city accountable
          </p>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="glass-card p-4 text-center">
            <span className="text-2xl font-bold text-[var(--fc-orange)] block">{reports.length}</span>
            <span className="text-[11px] text-[var(--fc-muted)] uppercase tracking-wider">Exposés</span>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-2xl font-bold text-[var(--fc-info)] block">{totalWatchers}</span>
            <span className="text-[11px] text-[var(--fc-muted)] uppercase tracking-wider">Watchers</span>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-2xl font-bold text-[var(--fc-success)] block">{fixedCount}</span>
            <span className="text-[11px] text-[var(--fc-muted)] uppercase tracking-wider">Fixed</span>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-2xl font-bold text-amber-400 block">{totalReactions}</span>
            <span className="text-[11px] text-[var(--fc-muted)] uppercase tracking-wider">Reactions</span>
          </div>
        </div>

        {/* Impact score */}
        <div className="glass-card p-4 mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-white">Impact Score</span>
            <span className="text-[12px] font-semibold" style={{ color: currentLevel.color }}>
              {currentLevel.label}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--fc-surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${currentLevel.color}, ${nextLevel?.color || currentLevel.color})`,
              }}
            />
          </div>
          {nextLevel && (
            <p className="text-[10px] text-[var(--fc-muted)] mt-1.5">
              {nextLevel.min - score} more points to {nextLevel.label}
            </p>
          )}
        </div>

        {/* Achievement badges */}
        <div className="mb-5">
          <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider mb-3">
            Badges
          </h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {achievements.map((a) => (
              <div
                key={a.label}
                className={`shrink-0 flex flex-col items-center gap-1.5 w-[72px] ${
                  a.unlocked ? "" : "opacity-30"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[20px] ${
                  a.unlocked
                    ? "bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/20"
                    : "bg-[var(--fc-surface-2)] border border-white/[0.06]"
                }`}>
                  {a.icon}
                </div>
                <span className="text-[9px] text-[var(--fc-muted)] text-center leading-tight">{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider mb-3">
          Recent activity
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl h-16 skeleton-shimmer" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--fc-surface-2)] flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p className="text-[var(--fc-muted)] text-sm mb-4">
              You haven&apos;t filed any exposés yet
            </p>
            <Link
              href="/report/new"
              className="inline-flex h-10 items-center px-5 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white text-[13px] font-semibold transition-all active:scale-95"
            >
              File your first
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <Link key={r.id} href={`/expose/${r.id}`} className="block">
                <div className="glass-card p-4 active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--fc-orange)]/10 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fc-orange)" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-semibold text-white truncate">
                        {r.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[var(--fc-muted)]">
                          {timeAgo(r.created_at)}
                        </span>
                        <span className="text-[11px] text-[var(--fc-muted)]">
                          · {r.supporters_count} watching
                        </span>
                      </div>
                    </div>
                    <StatusPill status={r.status} source={r.source} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-[11px] text-[var(--fc-muted)] text-center mt-8 pb-2">
          We&apos;re just getting started. You&apos;re early.
        </p>
      </div>
    </AppShell>
  );
}
