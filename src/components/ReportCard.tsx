"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import type { Report } from "@/lib/types";
import { getPipelineIndex, getAgencyHandle, FLAVOR_REACTIONS } from "@/lib/types";
import StatusPill from "./StatusPill";
import { PipelineSteps } from "./StatusPill";

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

function getContractorScore(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0x7fffffff;
  }
  return 55 + (hash % 40);
}

// Cat paw SVG icon
function PawIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="17" rx="5" ry="4" />
      <circle cx="6.5" cy="10" r="2.5" />
      <circle cx="17.5" cy="10" r="2.5" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="6" r="2" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

// X/Twitter icon
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function ContractorBadge({ name }: { name: string }) {
  const score = getContractorScore(name);
  const scoreColor = score >= 80 ? "text-green-400" : score >= 65 ? "text-amber-400" : "text-red-400";

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] rounded-lg border border-white/[0.06]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="text-[10px] text-[var(--fc-muted)] truncate max-w-[120px]">{name}</span>
      <span className={`text-[10px] font-bold ${scoreColor} ml-auto`}>{score}%</span>
    </div>
  );
}

// Flavor reaction popover (appears on long-press of paw)
function FlavorPopover({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (label: string) => void;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-[var(--fc-surface-2)] border border-white/[0.1] shadow-xl shadow-black/40 z-50 animate-scale-in">
        {FLAVOR_REACTIONS.map((r) => (
          <button
            key={r.label}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(r.label);
            }}
            className="flex flex-col items-center px-2.5 py-1 rounded-xl hover:bg-white/[0.08] transition-all active:scale-110 group"
          >
            <span className="text-[22px] group-hover:scale-125 transition-transform">{r.emoji}</span>
            <span className="text-[8px] text-[var(--fc-muted)] mt-0.5">{r.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default function ReportCard({ report }: { report: Report }) {
  const [stamped, setStamped] = useState(false);
  const [stampCount, setStampCount] = useState(report.supporters_count);
  const [showFlavors, setShowFlavors] = useState(false);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
  const [stampAnim, setStampAnim] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const hasPhoto = !!report.photo_url;
  const hasLocation = report.lat != null && report.lng != null;
  const heroSrc = hasPhoto
    ? report.photo_url!
    : hasLocation
    ? getStaticMapUrl(report.lat!, report.lng!)
    : null;

  const pipelineIdx = getPipelineIndex(report.status);
  const isVerified = pipelineIdx >= 4;

  // Paw stamp tap
  const handleStamp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (!stamped) {
      setStamped(true);
      setStampCount((c) => c + 1);
      setStampAnim(true);
      setTimeout(() => setStampAnim(false), 600);
    }
  }, [stamped]);

  // Long-press start
  const handlePressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowFlavors(true);
    }, 500);
  }, []);

  // Long-press end
  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleFlavorSelect = useCallback((label: string) => {
    setSelectedFlavor(label);
    setShowFlavors(false);
    if (!stamped) {
      setStamped(true);
      setStampCount((c) => c + 1);
      setStampAnim(true);
      setTimeout(() => setStampAnim(false), 600);
    }
  }, [stamped]);

  // Pre-filled tweet
  const handleTweet = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/expose/${report.id}`;
    const agencyHandle = getAgencyHandle(report.category);
    const affected = stampCount > 0 ? `${stampCount} people affected. ` : "";
    const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000));
    const text = `🚨 ${report.title} — ${report.neighborhood || "NYC"}. Open ${daysOpen} days. ${affected}${agencyHandle} what's the plan?\n\n${url}\n#FatCatsNYC #PointExposeFix`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [report, stampCount]);

  // Share
  const handleShare = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/expose/${report.id}`;
    if (navigator.share) {
      navigator.share({ title: report.title, text: `${report.title} — ${report.neighborhood || "NYC"}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  }, [report]);

  const flavorEmoji = selectedFlavor
    ? FLAVOR_REACTIONS.find((r) => r.label === selectedFlavor)?.emoji
    : null;

  return (
    <Link href={`/expose/${report.id}`} className="block">
      <div className="glass-card overflow-hidden animate-slide-up">
        {/* Hero image */}
        <div className="w-full h-[180px] bg-[var(--fc-surface-2)] relative overflow-hidden">
          {heroSrc ? (
            <img src={heroSrc} alt="" className="w-full h-full object-cover" loading="lazy" />
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
            <StatusPill status={report.status} />
          </div>
          {isVerified && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[9px] font-bold text-emerald-300">COMMUNITY VERIFIED</span>
            </div>
          )}
        </div>

        {/* Pipeline progress bar */}
        <div className="px-3.5 pt-2.5">
          <PipelineSteps status={report.status} />
          <div className="flex justify-between mt-1 mb-0.5">
            <span className="text-[8px] text-[var(--fc-muted)] uppercase tracking-wide">Open</span>
            <span className="text-[8px] text-[var(--fc-muted)] uppercase tracking-wide">Verified</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-3.5 pt-1 pb-2">
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

        {/* Contractor info (if assigned) */}
        {report.contractor_name && (
          <div className="px-3.5 pb-2">
            <ContractorBadge name={report.contractor_name} />
          </div>
        )}

        {/* Action bar: Paw Stamp + Tweet + Share */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-white/[0.04]">
          {/* Paw stamp — tap to stamp, long-press for flavor reactions */}
          <div className="relative">
            <button
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onClick={handleStamp}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95 select-none ${
                stamped
                  ? "bg-[var(--fc-orange)]/15 text-[var(--fc-orange)] border border-[var(--fc-orange)]/25"
                  : "bg-white/[0.04] text-[var(--fc-muted)] border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              <span className={`transition-transform ${stampAnim ? "animate-heart-pop" : ""}`}>
                {flavorEmoji || <PawIcon size={16} color={stamped ? "#E8652B" : "#8B95A8"} />}
              </span>
              <span>{stampCount}</span>
              {stampCount > 0 && (
                <span className="text-[9px] text-[var(--fc-muted)] font-normal ml-0.5">affected</span>
              )}
            </button>
            <FlavorPopover
              visible={showFlavors}
              onSelect={handleFlavorSelect}
              onClose={() => setShowFlavors(false)}
            />
          </div>

          {/* Tweet to officials */}
          <button
            onClick={handleTweet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-white/[0.04] text-[var(--fc-muted)] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
          >
            <XIcon />
            <span>Tweet</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-[var(--fc-orange)] hover:bg-[var(--fc-orange)]/10 transition-all active:scale-95 ml-auto"
          >
            <ShareIcon />
            <span>Share</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
