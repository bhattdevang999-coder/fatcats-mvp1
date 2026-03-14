"use client";

import { useState } from "react";
import Link from "next/link";
import type { Report } from "@/lib/types";
import StatusPill from "./StatusPill";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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

function getStaticMapUrl(lat: number, lng: number, w = 400, h = 200): string {
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+E8652B(${lng},${lat})/${lng},${lat},14,0/${w}x${h}@2x?access_token=${MAPBOX_TOKEN}`;
}

const EMOJI_REACTIONS = [
  { emoji: "🔥", label: "fire" },
  { emoji: "😤", label: "angry" },
  { emoji: "💀", label: "dead" },
  { emoji: "💪", label: "strong" },
  { emoji: "👀", label: "eyes" },
];

function EyeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "#E8652B" : "none"} stroke={active ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8652B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export default function ReportCard({ report }: { report: Report }) {
  const [watched, setWatched] = useState(false);
  const [watchCount, setWatchCount] = useState(report.supporters_count);
  const [reactions, setReactions] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    EMOJI_REACTIONS.forEach((r) => { init[r.label] = 0; });
    return init;
  });
  const [reacted, setReacted] = useState<Record<string, boolean>>({});

  const hasPhoto = !!report.photo_url;
  const hasLocation = report.lat != null && report.lng != null;
  const heroSrc = hasPhoto
    ? report.photo_url!
    : hasLocation
    ? getStaticMapUrl(report.lat!, report.lng!)
    : null;

  const handleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!watched) {
      setWatched(true);
      setWatchCount((c) => c + 1);
    }
  };

  const handleReaction = (e: React.MouseEvent, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (reacted[label]) return;
    setReactions((prev) => ({ ...prev, [label]: prev[label] + 1 }));
    setReacted((prev) => ({ ...prev, [label]: true }));
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/expose/${report.id}`;
    const text = `🚨 ${report.title} — ${report.neighborhood || "NYC"}. See the exposé on FatCats: ${url} #FatCatsNYC #PointExposeFix`;
    if (navigator.share) {
      navigator.share({ title: "Exposé on FatCats", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <Link href={`/expose/${report.id}`} className="block">
      <div className="glass-card overflow-hidden animate-slide-up">
        {/* Hero image */}
        <div className="w-full h-[180px] bg-[var(--fc-surface-2)] relative overflow-hidden">
          {heroSrc ? (
            <img
              src={heroSrc}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--fc-surface)]/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3">
            <StatusPill status={report.status} source={report.source} />
          </div>
        </div>

        {/* Content */}
        <div className="px-3.5 pt-3 pb-2">
          <h3 className="text-[14px] font-semibold text-white leading-tight line-clamp-2">
            {report.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--fc-muted)]">
            {report.neighborhood && (
              <span className="truncate max-w-[140px]">{report.neighborhood}</span>
            )}
            <span className="opacity-40">·</span>
            <span>{timeAgo(report.created_at)}</span>
            <span className="opacity-40">·</span>
            <span>{report.source === "citizen" ? "Citizen" : "311"}</span>
          </div>
        </div>

        {/* Emoji reaction bar */}
        <div className="px-3.5 py-2 flex items-center gap-1.5">
          {EMOJI_REACTIONS.map((r) => (
            <button
              key={r.label}
              onClick={(e) => handleReaction(e, r.label)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] transition-all active:scale-90 ${
                reacted[r.label]
                  ? "bg-[var(--fc-orange)]/15 border border-[var(--fc-orange)]/30"
                  : "bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              <span className={reacted[r.label] ? "animate-heart-pop" : ""}>{r.emoji}</span>
              {reactions[r.label] > 0 && (
                <span className="text-[10px] text-white/60">{reactions[r.label]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Social bar */}
        <div className="flex items-center gap-1 px-3.5 py-2 border-t border-white/[0.04]">
          <button
            onClick={handleWatch}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              watched
                ? "text-[var(--fc-orange)] bg-[var(--fc-orange)]/10"
                : "text-[var(--fc-muted)] hover:bg-white/5"
            }`}
          >
            <EyeIcon active={watched} />
            <span>{watchCount}</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[var(--fc-muted)] opacity-50 cursor-default">
            <CommentIcon />
            <span>0</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--fc-orange)] hover:bg-[var(--fc-orange)]/10 transition-all ml-auto"
          >
            <ShareIcon />
            <span>Share</span>
          </button>
        </div>

        {/* Mock comment preview */}
        <div className="px-3.5 pb-3 pt-0.5">
          <p className="text-[11px] text-[var(--fc-muted)] truncate">
            <span className="text-white/70 font-medium">user_nyc</span>{" "}
            This has been like this for months...
          </p>
        </div>
      </div>
    </Link>
  );
}
