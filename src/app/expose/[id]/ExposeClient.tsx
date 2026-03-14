"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import StatusPill from "@/components/StatusPill";
import { getReportById, addSupport, hasSupported, markAsFixed } from "@/lib/reports";
import { getDeviceHash } from "@/lib/device";
import type { Report } from "@/lib/types";

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

function getStaticMapUrl(lat: number, lng: number): string {
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+E8652B(${lng},${lat})/${lng},${lat},15,0/600x300@2x?access_token=${MAPBOX_TOKEN}`;
}

function getCategoryAgency(category: string): string {
  switch (category) {
    case "pothole":
    case "road_damage":
    case "sidewalk":
    case "street_light":
    case "traffic_signal":
      return "Dept of Transportation (DOT)";
    case "water":
    case "sewer":
      return "Dept of Environmental Protection (DEP)";
    default:
      return "311";
  }
}

// --- SVG Icons ---
function EyeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "#E8652B" : "none"} stroke={active ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
function BookmarkIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "#E8652B" : "none"} stroke={active ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ExposeClient() {
  const params = useParams();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [alreadyWatching, setAlreadyWatching] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getReportById(id);
      if (data) {
        setReport(data);
        const dh = getDeviceHash();
        setIsAuthor(data.author_device_hash === dh);
        const supported = await hasSupported(id, dh);
        setAlreadyWatching(supported);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleWatch = async () => {
    if (alreadyWatching || !report) return;
    setWatching(true);
    const dh = getDeviceHash();
    const ok = await addSupport(report.id, dh);
    if (ok) {
      setAlreadyWatching(true);
      setReport({ ...report, supporters_count: report.supporters_count + 1 });
    }
    setWatching(false);
  };

  const handleMarkFixed = async () => {
    if (!report) return;
    const ok = await markAsFixed(report.id);
    if (ok) {
      setReport({ ...report, status: "fixed" });
      showToast("Marked as fixed");
    }
  };

  const handleShare = async () => {
    if (!report) return;
    const url = window.location.href;
    const text = `🚨 ${report.title} — ${report.neighborhood || "NYC"}. See the exposé on FatCats: ${url} #FatCatsNYC #PointExposeFix`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Exposé on FatCats", text, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    }
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    showToast(bookmarked ? "Removed from watchlist" : "Saved to watchlist");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[var(--fc-orange)] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <h1 className="text-xl font-bold text-white mb-2">Not found</h1>
          <p className="text-[var(--fc-muted)] text-sm">This exposé doesn&apos;t exist.</p>
        </div>
      </AppShell>
    );
  }

  const hasPhoto = !!report.photo_url;
  const hasLocation = report.lat != null && report.lng != null;
  const heroSrc = hasPhoto
    ? report.photo_url!
    : hasLocation
    ? getStaticMapUrl(report.lat!, report.lng!)
    : null;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `🚨 ${report.title} — ${report.neighborhood || "NYC"}. See the exposé on FatCats:`;
  const encodedText = encodeURIComponent(`${shareText} ${shareUrl} #FatCatsNYC`);

  return (
    <AppShell>
      <div className="max-w-lg mx-auto animate-fade-in">
        {/* Hero image — photo or static map */}
        <div className="w-full aspect-[16/9] bg-white/5 overflow-hidden relative">
          {heroSrc ? (
            <img
              src={heroSrc}
              alt={report.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--fc-navy)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--fc-deep)] via-transparent to-transparent" />
        </div>

        {/* Social Action Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <button
            onClick={handleWatch}
            disabled={watching}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              alreadyWatching
                ? "text-[var(--fc-orange)] bg-[var(--fc-orange)]/10"
                : "text-[var(--fc-muted)] hover:bg-white/5 active:scale-95"
            }`}
          >
            <div className={alreadyWatching ? "animate-heart-pop" : ""}>
              <EyeIcon active={alreadyWatching} />
            </div>
            <span>{report.supporters_count}</span>
          </button>

          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[var(--fc-muted)] opacity-50 cursor-default">
            <CommentIcon />
            <span>0</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[var(--fc-muted)] hover:bg-white/5 active:scale-95 transition-all"
          >
            <ShareIcon />
            <span>Share</span>
          </button>

          <button
            onClick={handleBookmark}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
              bookmarked
                ? "text-[var(--fc-orange)] bg-[var(--fc-orange)]/10"
                : "text-[var(--fc-muted)] hover:bg-white/5"
            }`}
          >
            <div className={bookmarked ? "animate-heart-pop" : ""}>
              <BookmarkIcon active={bookmarked} />
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-5 space-y-5">
          {/* Status + source */}
          <div className="flex items-center gap-3">
            <StatusPill status={report.status} source={report.source} />
            <span className="text-[11px] text-[var(--fc-muted)]">
              {report.source === "citizen" ? "Citizen exposé" : "City data"}
            </span>
            {isAuthor && report.status !== "fixed" && (
              <button
                onClick={handleMarkFixed}
                className="ml-auto flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 transition-colors"
              >
                <CheckIcon />
                <span>Mark fixed</span>
              </button>
            )}
          </div>

          {/* Title + meta */}
          <div>
            <h1 className="text-xl font-bold text-white leading-tight mb-1.5">
              {report.title}
            </h1>
            <div className="flex items-center gap-2 text-[13px] text-[var(--fc-muted)]">
              {report.neighborhood && <span>{report.neighborhood}</span>}
              <span className="opacity-40">·</span>
              <span>{timeAgo(report.created_at)}</span>
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <p className="text-[14px] text-white/75 leading-relaxed">
              {report.description}
            </p>
          )}

          {/* Facts */}
          <div className="glass-card p-4 space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--fc-muted)]">First seen</span>
              <span className="text-white font-medium">{new Date(report.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--fc-muted)]">Source</span>
              <span className="text-white font-medium">{report.source === "citizen" ? "Citizen exposé" : "NYC 311 data"}</span>
            </div>
            {report.category && (
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[var(--fc-muted)]">Category</span>
                <span className="text-white font-medium capitalize">{report.category.replace(/_/g, " ")}</span>
              </div>
            )}
          </div>

          {/* Who's Responsible */}
          {hasLocation && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fc-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                Who handles this
              </h3>
              {report.neighborhood && (
                <p className="text-[13px] text-[var(--fc-muted)]">
                  This is in <span className="text-white font-medium">{report.neighborhood}</span>
                </p>
              )}
              <p className="text-[13px] text-[var(--fc-muted)]">
                Responsible agency: <span className="text-white font-medium">{getCategoryAgency(report.category)}</span>
              </p>
              <a
                href="https://council.nyc.gov/districts/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fc-orange)] font-medium hover:underline"
              >
                Look up your council member
                <ExternalLinkIcon />
              </a>
            </div>
          )}

          {/* Share Card */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleShare}
              className="w-full h-12 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[15px] transition-colors active:scale-[0.98]"
            >
              Share this exposé
            </button>

            <div className="flex items-center justify-center gap-4 text-[12px]">
              <a
                href={`https://wa.me/?text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fc-muted)] hover:text-white transition-colors"
              >
                WhatsApp
              </a>
              <span className="text-white/10">|</span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=FatCatsNYC`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fc-muted)] hover:text-white transition-colors"
              >
                Twitter/X
              </a>
              <span className="text-white/10">|</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  showToast("Link copied");
                }}
                className="text-[var(--fc-muted)] hover:text-white transition-colors"
              >
                Copy link
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[var(--fc-muted)] text-center pb-2">
            Every exposé is a receipt. Thanks for helping your city.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/10 text-white text-sm px-5 py-2.5 rounded-xl animate-slide-up z-[60] shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}
