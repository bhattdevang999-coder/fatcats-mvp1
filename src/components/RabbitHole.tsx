"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Report } from "@/lib/types";
import { listReports, listNearbyReports } from "@/lib/reports";
import { estimateRepairCost } from "@/lib/geo-intelligence";
import { filterTitle, filterCost } from "@/lib/voice-filter";

// ─── MINI EXPOSÉ CARD ─────────────────────────────────────────────────
// Compact card designed for the rabbit hole sections. 
// Tabloid rule applies: shock number + one-line context + tap hook.

function MiniCard({ report, reason }: { report: Report; reason: string }) {
  const cost = estimateRepairCost(report.category);
  const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000));
  const title = filterTitle(report.title, report.category);
  const costStr = filterCost(cost.range, cost.avg);
  const isUrgent = daysOpen > 30;

  return (
    <Link href={`/expose/${report.id}`} className="block group" prefetch={false}>
      <div className="relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-[var(--fc-orange)]/30 rounded-2xl p-4 transition-all duration-200">
        {/* Reason tag */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-[var(--fc-orange)]/70 font-semibold uppercase tracking-wider">{reason}</span>
          {isUrgent && <span className="text-[10px] text-red-400 font-bold">🔴 {daysOpen}d</span>}
        </div>

        {/* Cost hero */}
        <div className="text-[var(--fc-orange)] text-[18px] font-bold leading-none mb-1.5">
          {costStr}
        </div>

        {/* Title — 2 lines max */}
        <div className="text-white/90 text-[13px] font-medium leading-snug line-clamp-2 mb-2">
          {title.length > 60 ? title.slice(0, 57) + "..." : title}
        </div>

        {/* Bottom row: neighborhood + affected */}
        <div className="flex items-center justify-between text-[11px] text-white/40">
          <span className="truncate max-w-[140px]">{report.neighborhood || "NYC"}</span>
          {report.supporters_count > 0 && (
            <span>{report.supporters_count} affected</span>
          )}
        </div>

        {/* Hover arrow */}
        <div className="absolute top-4 right-4 text-white/20 group-hover:text-[var(--fc-orange)] transition-colors text-[14px]">
          →
        </div>
      </div>
    </Link>
  );
}


// ─── "SAME BLOCK, SAME STORY" ─────────────────────────────────────────
// Shows nearby issues. Taps into proximity outrage: "you saw ONE — 
// there are 4 more within 3 blocks."

export function SameBlockSection({ 
  currentId, 
  lat, 
  lng, 
  neighborhood 
}: { 
  currentId: string; 
  lat?: number | null; 
  lng?: number | null; 
  neighborhood?: string | null;
}) {
  const [nearby, setNearby] = useState<Report[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    
    async function fetch() {
      if (lat && lng) {
        // Geo-based: within ~0.5km
        const results = await listNearbyReports({ lat, lng, radiusKm: 0.5, limit: 6 });
        setNearby(results.filter(r => r.id !== currentId).slice(0, 3));
      } else if (neighborhood) {
        // Fallback: same neighborhood
        const results = await listReports({ limit: 10 });
        setNearby(
          results
            .filter(r => r.id !== currentId && r.neighborhood === neighborhood)
            .slice(0, 3)
        );
      }
    }
    fetch();
  }, [currentId, lat, lng, neighborhood]);

  if (nearby.length === 0) return null;

  // Calculate total estimated cost for all nearby
  const totalEstCost = nearby.reduce((sum, r) => {
    return sum + estimateRepairCost(r.category).avg;
  }, 0);
  const totalStr = totalEstCost >= 1000 
    ? `$${Math.round(totalEstCost / 1000)}K` 
    : `$${totalEstCost}`;

  return (
    <div className="animate-fade-in">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white/90 text-[14px] font-bold">Same block. Same story.</h3>
          <p className="text-white/35 text-[11px] mt-0.5">
            Est. ~{totalStr} in unfixed issues within 3 blocks
          </p>
        </div>
        <Link 
          href="/map" 
          className="text-[11px] text-[var(--fc-orange)]/60 hover:text-[var(--fc-orange)] transition-colors font-medium"
        >
          See map →
        </Link>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {nearby.map((r) => (
          <MiniCard key={r.id} report={r} reason="Nearby" />
        ))}
      </div>
    </div>
  );
}


// ─── "THE WORST RIGHT NOW" ────────────────────────────────────────────
// Most outrageous open issues. The "you think THIS is bad?" hook.
// Sorted by: cost estimate × days open (outrage score).

export function WorstRightNow({ currentId }: { currentId: string }) {
  const [worst, setWorst] = useState<Report[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    
    async function fetch() {
      const results = await listReports({ limit: 30 });
      // Score by outrage: cost × days open
      const scored = results
        .filter(r => r.id !== currentId && r.status !== "resolved" && r.status !== "verified")
        .map(r => {
          const cost = estimateRepairCost(r.category).avg;
          const days = Math.max(1, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000));
          return { report: r, score: cost * days };
        })
        .sort((a, b) => b.score - a.score);

      setWorst(scored.slice(0, 4).map(s => s.report));
    }
    fetch();
  }, [currentId]);

  if (worst.length === 0) return null;

  return (
    <div className="animate-fade-in">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">🔥</span>
          <h3 className="text-white/90 text-[14px] font-bold">The worst right now</h3>
        </div>
        <Link 
          href="/feed" 
          className="text-[11px] text-[var(--fc-orange)]/60 hover:text-[var(--fc-orange)] transition-colors font-medium"
        >
          See all →
        </Link>
      </div>

      {/* Horizontal scroll on mobile, 2-col on desktop */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-2 md:overflow-x-visible">
        {worst.map((r) => (
          <div key={r.id} className="min-w-[260px] md:min-w-0 flex-shrink-0">
            <MiniCard report={r} reason="Trending" />
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── "BEFORE YOU GO" ──────────────────────────────────────────────────
// Single high-impact card that appears as user scrolls deep.
// The TikTok "just one more" mechanic — one compelling issue.

export function BeforeYouGo({ currentId }: { currentId: string }) {
  const [topIssue, setTopIssue] = useState<Report | null>(null);
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Load the single most compelling unfixed issue
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    
    async function fetch() {
      const results = await listReports({ limit: 20 });
      const unfixed = results
        .filter(r => r.id !== currentId && r.status !== "resolved" && r.status !== "verified")
        .sort((a, b) => {
          // Highest cost + most supporters = most compelling
          const scoreA = estimateRepairCost(a.category).avg + (a.supporters_count * 500);
          const scoreB = estimateRepairCost(b.category).avg + (b.supporters_count * 500);
          return scoreB - scoreA;
        });
      if (unfixed.length > 0) setTopIssue(unfixed[0]);
    }
    fetch();
  }, [currentId]);

  // Intersection observer — only show when user scrolls to this point
  useEffect(() => {
    if (!sentinelRef.current || !topIssue) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [topIssue]);

  if (!topIssue) return <div ref={sentinelRef} />;

  const cost = estimateRepairCost(topIssue.category);
  const costStr = filterCost(cost.range, cost.avg);
  const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(topIssue.created_at).getTime()) / 86400000));
  const title = filterTitle(topIssue.title, topIssue.category);

  return (
    <div ref={sentinelRef}>
      <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        {/* Divider with label */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-[10px] text-white/25 font-semibold uppercase tracking-widest">One more</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <Link href={`/expose/${topIssue.id}`} className="block group" prefetch={false}>
          <div className="relative bg-gradient-to-br from-[var(--fc-orange)]/[0.08] to-transparent border border-[var(--fc-orange)]/20 rounded-2xl p-5 transition-all duration-200 hover:border-[var(--fc-orange)]/40 hover:from-[var(--fc-orange)]/[0.12]">
            {/* Cost hero — big and bold */}
            <div className="text-[var(--fc-orange)] text-[28px] font-black leading-none mb-2">
              {costStr}
            </div>

            {/* Title */}
            <div className="text-white text-[16px] font-bold leading-snug mb-3">
              {title.length > 80 ? title.slice(0, 77) + "..." : title}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-[12px] text-white/50">
              {daysOpen > 1 && (
                <span className={daysOpen > 30 ? "text-red-400 font-semibold" : ""}>
                  {daysOpen} days open
                </span>
              )}
              {topIssue.supporters_count > 0 && (
                <span>{topIssue.supporters_count} affected</span>
              )}
              <span>{topIssue.neighborhood || "NYC"}</span>
            </div>

            {/* Tap to view */}
            <div className="absolute bottom-5 right-5 text-[var(--fc-orange)]/50 group-hover:text-[var(--fc-orange)] text-[12px] font-medium transition-colors">
              View exposé →
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}


// ─── SESSION DEPTH COUNTER ────────────────────────────────────────────
// Tracks how many exposés this user has viewed in the session.
// After 3+, shows a subtle "You've seen X exposés" motivator.
// After 5+, shows "You've uncovered more than most people."
// Pure dopamine — makes them feel like they're doing something important.

const SESSION_KEY = "fc_session_depth";

export function trackExposeView(): number {
  if (typeof window === "undefined") return 0;
  const current = parseInt(sessionStorage.getItem(SESSION_KEY) || "0", 10);
  const next = current + 1;
  sessionStorage.setItem(SESSION_KEY, String(next));
  return next;
}

export function getSessionDepth(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(sessionStorage.getItem(SESSION_KEY) || "0", 10);
}

export function SessionDepthBadge() {
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    const d = trackExposeView();
    setDepth(d);
  }, []);

  // Don't show for first 2 views
  if (depth < 3) return null;

  const messages = [
    "", // 0
    "", // 1
    "", // 2
    "3 exposés uncovered this session", // 3
    "4 exposés. You're digging.", // 4
    "5 exposés. You've seen more than most.", // 5
    "6 exposés. You're building the record.", // 6
  ];

  const msg = depth <= 6 
    ? messages[depth] 
    : `${depth} exposés uncovered. You're one of the most active citizens today.`;

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[var(--fc-orange)]/[0.06] border border-[var(--fc-orange)]/10 animate-fade-in">
      <span className="text-[14px]">🐱</span>
      <span className="text-[11px] text-[var(--fc-orange)]/80 font-medium">{msg}</span>
    </div>
  );
}
