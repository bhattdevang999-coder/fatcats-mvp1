"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusPill from "@/components/StatusPill";
import { listReportsByDevice } from "@/lib/reports";
import { getDeviceHash } from "@/lib/device";
import {
  getStreak,
  getTotalVisits,
  computeCivicScore,
  computeBadges,
} from "@/lib/engagement";
import type { Report } from "@/lib/types";

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
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [displayName, setDisplayName] = useState("Founding Watchdog");
  const [bio, setBio] = useState("Keeping the city accountable");
  const [streak, setStreak] = useState(1);
  const [showShareToast, setShowShareToast] = useState(false);
  const impactCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const dh = getDeviceHash();
      const data = await listReportsByDevice(dh);
      setReports(data);
      setLoading(false);
    }
    load();
    const s = getStreak();
    setStreak(s.current);
  }, []);

  const totalWatchers = reports.reduce((sum, r) => sum + r.supporters_count, 0);
  const fixedCount = reports.filter((r) => r.status === "fixed").length;
  const visits = getTotalVisits();

  // Civic score
  const civic = computeCivicScore({
    reports: reports.length,
    watchers: totalWatchers,
    fixed: fixedCount,
    streak,
    visits,
  });

  // Badges
  const badges = computeBadges({
    reports: reports.length,
    watchers: totalWatchers,
    fixed: fixedCount,
    streak,
    visits,
    score: civic.score,
  });

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const handleShare = () => {
    const text = `I'm holding my city accountable on FatCats.\n\n🔥 ${streak}-day streak\n📸 ${reports.length} exposés filed\n👁️ ${totalWatchers} people watching\n⭐ ${civic.score} civic score (${civic.level})\n\nJoin me → fatcatsapp.com\nvia @FatCatsApp #FatCatsNYC #PointExposeFix`;
    if (navigator.share) {
      navigator.share({ title: "My FatCats Impact", text, url: "https://fatcatsapp.com" }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Profile header */}
        <div className="glass-card p-6 text-center mb-5 animate-slide-up relative">
          <button
            onClick={() => setShowEditProfile(!showEditProfile)}
            className="absolute top-3 right-3 text-[11px] text-[var(--fc-muted)] hover:text-white transition-colors"
          >
            Edit
          </button>
          <div className="w-20 h-20 rounded-2xl bg-[var(--fc-orange)]/10 flex items-center justify-center mx-auto mb-4">
            <Image
              src="/assets/logo-128.png"
              alt="FatCats"
              width={48}
              height={48}
            />
          </div>
          <h1 className="text-lg font-bold text-white mb-0.5">
            {displayName}
          </h1>
          <p className="text-[13px] text-[var(--fc-muted)]">
            {bio}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{
                color: civic.levelColor,
                background: `${civic.levelColor}15`,
                border: `1px solid ${civic.levelColor}25`,
              }}
            >
              {civic.level}
            </span>
            <span className="text-[11px] text-[var(--fc-muted)]">
              · {civic.score} pts
            </span>
          </div>
        </div>

        {/* Edit profile panel */}
        {showEditProfile && (
          <div className="glass-card p-4 mb-5 space-y-3 animate-scale-in">
            <div>
              <label className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider font-semibold">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider font-semibold">Bio</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full h-9 mt-1 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)]"
              />
            </div>
            <button
              onClick={() => setShowEditProfile(false)}
              className="w-full h-9 rounded-lg bg-[var(--fc-orange)] text-white text-[13px] font-semibold active:scale-95 transition-transform"
            >
              Save
            </button>
          </div>
        )}

        {/* ── Shareable Impact Card (Spotify Wrapped style) ── */}
        <div ref={impactCardRef} className="mb-5">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--fc-orange)]/15">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--fc-orange)]/10 via-[var(--fc-surface)] to-purple-500/5" />
            <div className="relative px-5 py-5">
              <div className="flex items-center gap-2 mb-4">
                <Image src="/assets/logo-64.png" alt="" width={20} height={20} />
                <span className="text-[10px] font-bold text-[var(--fc-muted)] uppercase tracking-widest">
                  Your Civic Footprint
                </span>
              </div>

              {/* Big stats row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <span className="text-3xl font-bold text-white block leading-none">{reports.length}</span>
                  <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider mt-1 block">Exposés</span>
                </div>
                <div className="text-center">
                  <span className="text-3xl font-bold text-[var(--fc-info)] block leading-none">{totalWatchers}</span>
                  <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider mt-1 block">Watchers</span>
                </div>
                <div className="text-center">
                  <span className="text-3xl font-bold text-[var(--fc-success)] block leading-none">{fixedCount}</span>
                  <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider mt-1 block">Fixed</span>
                </div>
              </div>

              {/* Streak + badges row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/15">
                  <span className="text-[13px]">🔥</span>
                  <span className="text-[14px] font-bold text-amber-400">{streak}</span>
                  <span className="text-[11px] text-amber-400/70">day streak</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/15">
                  <span className="text-[13px]">🏅</span>
                  <span className="text-[14px] font-bold text-purple-400">{unlockedCount}/{badges.length}</span>
                  <span className="text-[11px] text-purple-400/70">badges</span>
                </div>
              </div>

              {/* Civic score progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-white">Civic Score</span>
                  <span className="text-[11px] font-bold" style={{ color: civic.levelColor }}>
                    {civic.score} pts · {civic.level}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--fc-surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(civic.progress, 8)}%`,
                      background: `linear-gradient(90deg, ${civic.levelColor}, ${civic.levelColor}88)`,
                    }}
                  />
                </div>
                {civic.nextLevel && (
                  <p className="text-[10px] text-[var(--fc-muted)] mt-1">
                    {civic.pointsToNext} more to <span className="text-white font-medium">{civic.nextLevel}</span>
                  </p>
                )}
              </div>

              {/* Share CTA */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--fc-orange)]/15 border border-[var(--fc-orange)]/20 text-[var(--fc-orange)] text-[13px] font-semibold hover:bg-[var(--fc-orange)]/20 transition-colors active:scale-[0.98]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share your civic footprint
              </button>
            </div>
          </div>
        </div>

        {/* Watchdog Streak — detailed view */}
        <div className="glass-card p-4 mb-5 flex items-center gap-4 border border-amber-500/10">
          <div className="text-3xl">🔥</div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-white">
              Day {streak} Streak
            </p>
            <p className="text-[11px] text-[var(--fc-muted)]">
              Browsing, stamping, or verifying all count
            </p>
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <div
                key={d}
                className={`w-3 h-3 rounded-sm ${d <= (streak % 7 || 7) ? "bg-amber-400" : "bg-white/10"}`}
              />
            ))}
          </div>
        </div>

        {/* Achievement badges */}
        <div className="mb-5">
          <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider mb-3">
            Badges
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {badges.map((a) => (
              <div
                key={a.id}
                className={`flex flex-col items-center gap-1.5 ${
                  a.unlocked ? "" : "opacity-30"
                }`}
                title={a.hint}
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

        {/* Referral CTA */}
        <div className="glass-card p-4 mb-5 border border-[var(--fc-orange)]/10">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📣</div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-white">Recruit a watchdog</p>
              <p className="text-[11px] text-[var(--fc-muted)]">More watchdogs = more accountability. Spread the word.</p>
            </div>
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-lg bg-[var(--fc-orange)] text-white text-[11px] font-bold active:scale-95 transition-transform"
            >
              Share
            </button>
          </div>
        </div>

        {/* Recent activity */}
        <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider mb-3">
          Your exposés
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
            <p className="text-white text-[14px] font-semibold mb-1">
              No exposés yet
            </p>
            <p className="text-[var(--fc-muted)] text-sm mb-4">
              Spot something broken? You&apos;re the investigator now.
            </p>
            <Link
              href="/report/new"
              className="inline-flex h-10 items-center px-5 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white text-[13px] font-semibold transition-all active:scale-95"
            >
              File your first exposé
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
          Every exposé matters. You&apos;re early to something that changes everything.
        </p>
      </div>

      {/* Share toast */}
      {showShareToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-[var(--fc-surface)]/90 backdrop-blur-xl border border-white/10 text-white text-sm px-5 py-2.5 rounded-xl animate-slide-up z-[60] shadow-xl">
          Copied to clipboard
        </div>
      )}
    </AppShell>
  );
}
