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

function getStaticMapUrl(lat: number, lng: number, w = 120, h = 120): string {
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+E8652B(${lng},${lat})/${lng},${lat},14,0/${w}x${h}@2x?access_token=${MAPBOX_TOKEN}`;
}

// Inline SVG icons
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export default function ReportCard({ report }: { report: Report }) {
  const [watched, setWatched] = useState(false);
  const [watchCount, setWatchCount] = useState(report.supporters_count);

  const hasPhoto = !!report.photo_url;
  const hasLocation = report.lat != null && report.lng != null;

  const thumbnailSrc = hasPhoto
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
      <div className="glass-card p-3 animate-slide-up">
        <div className="flex gap-3">
          {/* Thumbnail — photo or static map */}
          <div className="w-[72px] h-[72px] rounded-xl bg-white/5 shrink-0 overflow-hidden">
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-white truncate leading-tight">
                {report.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <StatusPill status={report.status} source={report.source} />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[var(--fc-muted)] mt-1.5">
              {report.neighborhood && (
                <span className="truncate max-w-[120px]">{report.neighborhood}</span>
              )}
              <span className="opacity-40">·</span>
              <span>{timeAgo(report.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Inline social action bar */}
        <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-white/[0.04]">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[var(--fc-muted)] hover:bg-white/5 transition-all ml-auto"
          >
            <ShareIcon />
            <span>Share</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
