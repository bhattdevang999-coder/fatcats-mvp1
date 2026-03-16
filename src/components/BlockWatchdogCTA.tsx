"use client";

import { useState, useEffect } from "react";
import {
  claimBlockWatchdog,
  getWatchdogProfile,
  getClaimShareText,
  getWatchdogTitle,
  getWatchdogEmoji,
  getLevelProgress,
  addWatchdogInvite,
  getRecruitShareText,
  NYC_NEIGHBORHOODS,
  FOUNDING_LIMIT,
} from "@/lib/watchdog";
import type { WatchdogProfile } from "@/lib/watchdog";

// ── Claim CTA (shown when block has few/no reports) ──────────

interface ClaimCTAProps {
  detectedNeighborhood?: string | null;
  nearbyCount: number;
  totalCityReports: number;
}

export function BlockWatchdogClaimCTA({
  detectedNeighborhood,
  nearbyCount,
  totalCityReports,
}: ClaimCTAProps) {
  const [profile, setProfile] = useState<WatchdogProfile | null>(null);
  const [customNeighborhood, setCustomNeighborhood] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    const p = getWatchdogProfile();
    if (p) setProfile(p);
  }, []);

  // Already claimed — show status card instead
  if (profile) {
    return <WatchdogStatusCard profile={profile} />;
  }

  const neighborhoodName = detectedNeighborhood || "your neighborhood";
  const uncoveredPct = Math.round(
    ((NYC_NEIGHBORHOODS.length - Math.min(15, nearbyCount)) /
      NYC_NEIGHBORHOODS.length) *
      100
  );

  const handleClaim = (name: string) => {
    const p = claimBlockWatchdog(name);
    setProfile(p);
    setClaimed(true);

    // Auto-open share after a beat
    setTimeout(() => {
      const text = getClaimShareText(name);
      if (navigator.share) {
        navigator.share({ title: `Block Watchdog — ${name}`, text }).catch(() => {});
      } else {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
          "_blank"
        );
      }
    }, 800);
  };

  if (claimed && profile) {
    return <WatchdogStatusCard profile={profile} />;
  }

  return (
    <div className="glass-card-elevated p-5 space-y-4 border border-[var(--fc-orange)]/20 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/20 flex items-center justify-center text-[24px] shrink-0">
          🔍
        </div>
        <div className="flex-1">
          <h3 className="text-[16px] font-bold text-white leading-tight">
            {nearbyCount === 0
              ? `Nobody's watching ${neighborhoodName}`
              : `${neighborhoodName} needs a watchdog`}
          </h3>
          <p className="text-[13px] text-[var(--fc-muted)] mt-1 leading-snug">
            {nearbyCount === 0
              ? "Zero accountability record. That either means it's perfect... or nobody's looking."
              : `Only ${nearbyCount} reports nearby. ${totalCityReports} citywide. Your block is underrepresented.`}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex-1 text-center">
          <span className="text-[18px] font-bold text-[var(--fc-orange)] block">{uncoveredPct}%</span>
          <span className="text-[10px] text-[var(--fc-muted)]">blocks uncovered</span>
        </div>
        <div className="w-px h-8 bg-white/[0.08]" />
        <div className="flex-1 text-center">
          <span className="text-[18px] font-bold text-white block">{totalCityReports}</span>
          <span className="text-[10px] text-[var(--fc-muted)]">city reports</span>
        </div>
        <div className="w-px h-8 bg-white/[0.08]" />
        <div className="flex-1 text-center">
          <span className="text-[18px] font-bold text-white block">{nearbyCount}</span>
          <span className="text-[10px] text-[var(--fc-muted)]">your block</span>
        </div>
      </div>

      {/* How It Works button */}
      <button
        onClick={() => setShowHowItWorks(!showHowItWorks)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[12px] text-[var(--fc-muted)] hover:text-white hover:bg-white/[0.06] transition-all"
      >
        <span className="text-[13px]">❓</span>
        <span className="font-medium">How does Block Watchdog work?</span>
        <span className={`text-[10px] transition-transform ${showHowItWorks ? "rotate-180" : ""}`}>▾</span>
      </button>

      {/* How It Works explainer (expandable) */}
      {showHowItWorks && (
        <div className="space-y-3 px-1 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[var(--fc-orange)]/10 flex items-center justify-center text-[11px] shrink-0 mt-0.5">1</div>
            <div>
              <p className="text-[12px] text-white font-semibold">Claim your block</p>
              <p className="text-[11px] text-[var(--fc-muted)] leading-snug">First {FOUNDING_LIMIT} people per neighborhood get a permanent Founding Watchdog badge.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[var(--fc-orange)]/10 flex items-center justify-center text-[11px] shrink-0 mt-0.5">2</div>
            <div>
              <p className="text-[12px] text-white font-semibold">Report issues you see</p>
              <p className="text-[11px] text-[var(--fc-muted)] leading-snug">Snap photos, document problems. Every exposé builds your block&apos;s accountability record.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[var(--fc-orange)]/10 flex items-center justify-center text-[11px] shrink-0 mt-0.5">3</div>
            <div>
              <p className="text-[12px] text-white font-semibold">Recruit your neighbors</p>
              <p className="text-[11px] text-[var(--fc-muted)] leading-snug">Invite 3 people → Block Captain. 10 exposés + 5 invites → Neighborhood Lead.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[var(--fc-orange)]/10 flex items-center justify-center text-[11px] shrink-0 mt-0.5">4</div>
            <div>
              <p className="text-[12px] text-white font-semibold">Amplify together</p>
              <p className="text-[11px] text-[var(--fc-muted)] leading-snug">More watchdogs = louder voice. Officials pay attention when neighborhoods organize.</p>
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-[var(--fc-orange)]/5 border border-[var(--fc-orange)]/10">
            <p className="text-[10px] text-[var(--fc-orange)] font-medium text-center">
              🏆 First {FOUNDING_LIMIT} watchdogs per block get a founding badge that can never be taken away
            </p>
          </div>
        </div>
      )}

      {/* Claim button */}
      {detectedNeighborhood && !showPicker ? (
        <div className="space-y-2">
          <button
            onClick={() => handleClaim(detectedNeighborhood)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--fc-orange)] to-[#ff8c5a] text-white text-[15px] font-bold shadow-[0_4px_20px_rgba(232,101,43,0.3)] hover:shadow-[0_4px_30px_rgba(232,101,43,0.5)] transition-all active:scale-[0.97]"
          >
            🔍 Claim Block Watchdog — {detectedNeighborhood}
          </button>
          <button
            onClick={() => setShowPicker(true)}
            className="w-full text-center text-[12px] text-[var(--fc-muted)] hover:text-white transition-colors"
          >
            Not your neighborhood? Choose another →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[12px] text-[var(--fc-muted)] font-medium">
            Pick your block:
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto scrollbar-hide">
            {NYC_NEIGHBORHOODS.slice(0, 30).map((n) => (
              <button
                key={n}
                onClick={() => handleClaim(n)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-[var(--fc-muted)] hover:bg-[var(--fc-orange)]/10 hover:text-[var(--fc-orange)] hover:border-[var(--fc-orange)]/20 transition-all active:scale-95"
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Or type your neighborhood..."
              value={customNeighborhood}
              onChange={(e) => setCustomNeighborhood(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[13px] text-white placeholder:text-white/20 outline-none focus:border-[var(--fc-orange)]/30"
            />
            <button
              onClick={() => customNeighborhood && handleClaim(customNeighborhood)}
              disabled={!customNeighborhood}
              className="px-4 py-2 rounded-lg bg-[var(--fc-orange)] text-white text-[13px] font-bold disabled:opacity-30 hover:bg-[var(--fc-orange-hover)] transition-all active:scale-95"
            >
              Claim
            </button>
          </div>
        </div>
      )}

      {/* Social proof */}
      <p className="text-[11px] text-[var(--fc-muted)] text-center">
        First {FOUNDING_LIMIT} watchdogs per block = founding badge forever. Can&apos;t be taken away.
      </p>
    </div>
  );
}

// ── Inline Claim CTA for empty states (compact) ───────────────

export function InlineClaimCTA({ detectedNeighborhood }: { detectedNeighborhood?: string | null }) {
  const [profile, setProfile] = useState<WatchdogProfile | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    const p = getWatchdogProfile();
    if (p) setProfile(p);
  }, []);

  if (profile) return null;

  const neighborhoodName = detectedNeighborhood || "your block";

  const handleClaim = (name: string) => {
    const p = claimBlockWatchdog(name);
    setProfile(p);
    setTimeout(() => {
      const text = getClaimShareText(name);
      if (navigator.share) {
        navigator.share({ title: `Block Watchdog — ${name}`, text }).catch(() => {});
      } else {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
      }
    }, 600);
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Prominent claim button */}
      <button
        onClick={() => handleClaim(neighborhoodName)}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[var(--fc-orange)] to-[#ff8c5a] text-white text-[14px] font-bold shadow-[0_4px_20px_rgba(232,101,43,0.3)] hover:shadow-[0_4px_30px_rgba(232,101,43,0.5)] transition-all active:scale-[0.97]"
      >
        🔍 Claim {neighborhoodName} — Be the first watchdog
      </button>

      {/* How it works toggle */}
      <button
        onClick={() => setShowHowItWorks(!showHowItWorks)}
        className="w-full text-center text-[12px] text-[var(--fc-muted)] hover:text-[var(--fc-orange)] transition-colors font-medium"
      >
        {showHowItWorks ? "Hide details ▴" : "How does this work? ▾"}
      </button>

      {showHowItWorks && (
        <div className="glass-card p-4 space-y-2.5 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-[12px]">🔍</span>
            <span className="text-[11px] text-white font-semibold">Claim → Report → Recruit → Lead</span>
          </div>
          <p className="text-[11px] text-[var(--fc-muted)] leading-snug">
            Be the first to claim your block. Report issues you see. Recruit {3} neighbors to become Block Captain.
            First {FOUNDING_LIMIT} per neighborhood get a permanent founding badge.
          </p>
          <div className="flex items-center gap-3 text-[10px] text-[var(--fc-muted)]">
            <span>🔍 Watchdog</span>
            <span className="text-white/20">→</span>
            <span>⭐ Captain (3 invites)</span>
            <span className="text-white/20">→</span>
            <span>🏆 Lead (10 exposés + 5 invites)</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Status Card (shown after claiming) ────────────────────────

function WatchdogStatusCard({ profile }: { profile: WatchdogProfile }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [, setForceUpdate] = useState(0);
  const progress = getLevelProgress(profile);

  const handleInvite = () => {
    if (!inviteEmail.includes("@")) return;
    addWatchdogInvite(inviteEmail);
    setInviteEmail("");
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 2000);
    setForceUpdate((c) => c + 1);

    // Open share
    const text = getRecruitShareText(profile.neighborhood);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleShareClaim = () => {
    const text = getClaimShareText(profile.neighborhood);
    if (navigator.share) {
      navigator.share({ title: `Block Watchdog — ${profile.neighborhood}`, text }).catch(() => {});
    } else {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
  };

  return (
    <div className="glass-card-elevated p-4 space-y-3 border border-[var(--fc-orange)]/15 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/20 flex items-center justify-center text-[20px]">
          {getWatchdogEmoji(profile.level)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[var(--fc-orange)]">
              {getWatchdogTitle(profile.level)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/20 text-[var(--fc-orange)] font-bold uppercase tracking-wider">
              {profile.neighborhood}
            </span>
          </div>
          <p className="text-[11px] text-[var(--fc-muted)] mt-0.5">
            Claimed {new Date(profile.claimedAt).toLocaleDateString()} · Founding Watchdog
          </p>
        </div>
      </div>

      {/* Level progress */}
      {progress.nextLevel && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--fc-muted)]">
              Next: {getWatchdogTitle(progress.nextLevel)}
            </span>
            <span className="text-[11px] text-[var(--fc-orange)] font-bold">
              {progress.progress}%
            </span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--fc-orange)] to-[#ff8c5a] rounded-full transition-all duration-500"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--fc-muted)]">{progress.requirement}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href="/report/new"
          className="flex-1 py-2.5 rounded-xl bg-[var(--fc-orange)] text-white text-[13px] font-bold text-center hover:bg-[var(--fc-orange-hover)] transition-all active:scale-95"
        >
          File Exposé
        </a>
        <button
          onClick={handleShareClaim}
          className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-[13px] font-bold text-center hover:bg-white/[0.1] transition-all active:scale-95"
        >
          Recruit
        </button>
      </div>

      {/* Invite row */}
      <div className="flex items-center gap-2">
        <input
          type="email"
          placeholder="Invite someone to your block..."
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] text-white placeholder:text-white/20 outline-none focus:border-[var(--fc-orange)]/30"
        />
        <button
          onClick={handleInvite}
          disabled={!inviteEmail.includes("@")}
          className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[12px] text-[var(--fc-orange)] font-bold disabled:opacity-30 transition-all active:scale-95"
        >
          {inviteSent ? "✓" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ── Compact Watchdog Badge (for feed cards, comments) ─────────

export function WatchdogBadge({ small = false }: { small?: boolean }) {
  const [profile, setProfile] = useState<WatchdogProfile | null>(null);

  useEffect(() => {
    setProfile(getWatchdogProfile());
  }, []);

  if (!profile) return null;

  if (small) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/15 text-[9px] text-[var(--fc-orange)] font-bold">
        {getWatchdogEmoji(profile.level)} {profile.neighborhood}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/20">
      <span className="text-[12px]">{getWatchdogEmoji(profile.level)}</span>
      <span className="text-[11px] text-[var(--fc-orange)] font-bold">
        {getWatchdogTitle(profile.level)} — {profile.neighborhood}
      </span>
    </div>
  );
}

// ── Neighborhood Leaderboard ──────────────────────────────────

interface LeaderboardEntry {
  neighborhood: string;
  reportCount: number;
  affectedTotal: number;
  claimed: boolean;
}

export function NeighborhoodLeaderboard({
  reports,
}: {
  reports: { neighborhood?: string | null; supporters_count: number }[];
}) {
  const entries: LeaderboardEntry[] = [];
  const countMap: Record<string, { reports: number; affected: number }> = {};

  for (const r of reports) {
    const n = r.neighborhood || "Unknown";
    if (!countMap[n]) countMap[n] = { reports: 0, affected: 0 };
    countMap[n].reports += 1;
    countMap[n].affected += r.supporters_count || 0;
  }

  for (const neighborhood of Object.keys(countMap)) {
    const stats = countMap[neighborhood];
    entries.push({
      neighborhood,
      reportCount: stats.reports,
      affectedTotal: stats.affected,
      claimed: false,
    });
  }

  // Sort by report count desc
  entries.sort((a, b) => b.reportCount - a.reportCount);

  // Add some "unclaimed" neighborhoods for the land-grab vibe
  const covered = new Set(entries.map((e) => e.neighborhood));
  const unclaimed = NYC_NEIGHBORHOODS.filter((n) => !covered.has(n)).slice(0, 5);

  return (
    <div className="mb-4 -mx-4">
      <div className="flex items-center justify-between px-4 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">🏆</span>
          <h2 className="text-[13px] font-bold text-white uppercase tracking-wider">
            Top Neighborhoods
          </h2>
        </div>
        <span className="text-[10px] text-[var(--fc-muted)]">
          {unclaimed.length + (NYC_NEIGHBORHOODS.length - covered.size - unclaimed.length)} unclaimed
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {/* Top neighborhoods with data */}
        {entries.slice(0, 6).map((entry, i) => (
          <a
            key={entry.neighborhood}
            href={`/feed?neighborhood=${encodeURIComponent(entry.neighborhood)}`}
            className="shrink-0 w-[180px] p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.97]"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[14px] font-bold text-[var(--fc-orange)]">
                #{i + 1}
              </span>
              <span className="text-[12px] text-white font-semibold truncate">
                {entry.neighborhood}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[var(--fc-muted)]">
              <span>📸 {entry.reportCount}</span>
              <span>🐾 {entry.affectedTotal}</span>
            </div>
          </a>
        ))}

        {/* Unclaimed neighborhoods — the land grab */}
        {unclaimed.map((n) => (
          <div
            key={n}
            className="shrink-0 w-[180px] p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.1] hover:border-[var(--fc-orange)]/30 hover:bg-[var(--fc-orange)]/5 transition-all cursor-pointer active:scale-[0.97]"
            onClick={() => {
              const p = getWatchdogProfile();
              if (!p) claimBlockWatchdog(n);
              // Scroll to top / trigger refresh
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[14px]">🔓</span>
              <span className="text-[12px] text-[var(--fc-muted)] font-semibold truncate">
                {n}
              </span>
            </div>
            <p className="text-[10px] text-[var(--fc-muted)]/60">
              Unclaimed — be the first watchdog
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
