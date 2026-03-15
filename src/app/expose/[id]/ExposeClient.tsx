"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import StatusPill from "@/components/StatusPill";
import { PipelineSteps } from "@/components/StatusPill";
import { getReportById, addSupport, hasSupported, markAsFixed } from "@/lib/reports";
import { getDeviceHash } from "@/lib/device";
import { getPipelineIndex, getCategoryAgency, getAgencyHandle, FLAVOR_REACTIONS } from "@/lib/types";
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

function getContractorScore(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return 55 + (hash % 40);
}

// Cat paw SVG
function PawIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
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

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

const MOCK_COMMENTS = [
  { user: "watchdog_bk", avatar: "🐱", text: "Saw this on my way to work. Insane that it's been like this for weeks.", time: "2h ago" },
  { user: "nyc_fixer", avatar: "🔧", text: "Called 311 about this twice already. No response.", time: "5h ago" },
  { user: "street_eye", avatar: "👁️", text: "Same issue on the next block too. Whole area is neglected.", time: "1d ago" },
];

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ShareTopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
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

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// Pipeline timeline
function PipelineTimeline({ report }: { report: Report }) {
  const currentIdx = getPipelineIndex(report.status);
  const createdDate = new Date(report.created_at);

  const stages = [
    { label: "Reported", detail: `Filed via ${report.source === "citizen" ? "citizen" : "311"}`, date: createdDate, icon: "📍" },
    { label: "Assigned", detail: report.contractor_name || getCategoryAgency(report.category), date: currentIdx >= 1 ? new Date(createdDate.getTime() + 86400000 * 2) : null, icon: "📋" },
    { label: "In Progress", detail: report.contractor_name ? `${report.contractor_name} dispatched` : "Crew dispatched", date: currentIdx >= 2 ? new Date(createdDate.getTime() + 86400000 * 5) : null, icon: "🔧" },
    { label: "Resolved", detail: "Marked resolved", date: currentIdx >= 3 ? new Date(createdDate.getTime() + 86400000 * 12) : null, icon: "✅" },
    { label: "Verified", detail: "Community confirmed", date: currentIdx >= 4 ? new Date(createdDate.getTime() + 86400000 * 14) : null, icon: "🏆" },
  ];

  return (
    <div className="space-y-0">
      {stages.map((stage, i) => {
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const isLast = i === stages.length - 1;
        return (
          <div key={stage.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] shrink-0 ${
                isCompleted
                  ? isCurrent ? "bg-[var(--fc-orange)] ring-2 ring-[var(--fc-orange)]/30" : "bg-white/10"
                  : "bg-white/[0.04] border border-white/[0.08]"
              }`}>
                {isCompleted ? stage.icon : <span className="text-[10px] text-white/20">{i + 1}</span>}
              </div>
              {!isLast && (
                <div className={`w-[2px] flex-1 min-h-[28px] ${i < currentIdx ? "bg-[var(--fc-orange)]/40" : "bg-white/[0.06]"}`} />
              )}
            </div>
            <div className={`pb-4 ${!isCompleted ? "opacity-30" : ""}`}>
              <p className={`text-[13px] font-semibold ${isCurrent ? "text-[var(--fc-orange)]" : "text-white"}`}>{stage.label}</p>
              <p className="text-[11px] text-[var(--fc-muted)] mt-0.5">{stage.detail}</p>
              {stage.date && (
                <p className="text-[10px] text-[var(--fc-muted)] opacity-60 mt-0.5">
                  {stage.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Verify vote component
function VerifyVote({ onVerified }: { report: Report; onVerified: () => void }) {
  const [voted, setVoted] = useState<"yes" | "no" | null>(null);
  const [yesCount] = useState(Math.floor(Math.random() * 8) + 3);
  const [noCount] = useState(Math.floor(Math.random() * 3));

  const handleVote = (vote: "yes" | "no") => {
    if (voted) return;
    setVoted(vote);
    if (vote === "yes") onVerified();
  };

  const totalVotes = yesCount + noCount + (voted ? 1 : 0);
  const yesPercent = Math.round(((yesCount + (voted === "yes" ? 1 : 0)) / totalVotes) * 100);

  return (
    <div className="glass-card p-4 space-y-3 border border-green-500/10">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <h3 className="text-sm font-semibold text-white">Is this actually fixed?</h3>
      </div>
      <p className="text-[12px] text-[var(--fc-muted)]">
        This issue was marked resolved. Help verify — your vote builds the accountability record.
      </p>
      {!voted ? (
        <div className="flex gap-2">
          <button onClick={() => handleVote("yes")} className="flex-1 h-11 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[13px] font-semibold hover:bg-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
            <span>👍</span> Yes, it&apos;s fixed
          </button>
          <button onClick={() => handleVote("no")} className="flex-1 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] font-semibold hover:bg-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
            <span>👎</span> Nope, still broken
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <span className={voted === "yes" ? "text-green-400 text-[13px]" : "text-red-400 text-[13px]"}>
            {voted === "yes" ? "✅ You confirmed the fix" : "❌ You flagged this as unresolved"}
          </span>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all duration-500" style={{ width: `${yesPercent}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--fc-muted)]">
            <span>{yesPercent}% say fixed</span>
            <span>{totalVotes} votes</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Flavor reaction popover
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
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-[var(--fc-surface-2)] border border-white/[0.1] shadow-xl shadow-black/40 z-50 animate-scale-in">
        {FLAVOR_REACTIONS.map((r) => (
          <button
            key={r.label}
            onClick={() => onSelect(r.label)}
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

export default function ExposeClient() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Paw stamp state
  const [stamped, setStamped] = useState(false);
  const [stampCount, setStampCount] = useState(0);
  const [showFlavors, setShowFlavors] = useState(false);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
  const [stampAnim, setStampAnim] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  useEffect(() => {
    async function load() {
      const data = await getReportById(id);
      if (data) {
        setReport(data);
        setStampCount(data.supporters_count);
        const dh = getDeviceHash();
        setIsAuthor(data.author_device_hash === dh);
        const supported = await hasSupported(id, dh);
        if (supported) setStamped(true);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Paw stamp handlers
  const handleStamp = useCallback(async () => {
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (stamped || !report) return;
    setStamped(true);
    setStampCount((c) => c + 1);
    setStampAnim(true);
    setTimeout(() => setStampAnim(false), 600);
    const dh = getDeviceHash();
    await addSupport(report.id, dh);
  }, [stamped, report]);

  const handlePressStart = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowFlavors(true);
    }, 500);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const handleFlavorSelect = useCallback(async (label: string) => {
    setSelectedFlavor(label);
    setShowFlavors(false);
    if (!stamped && report) {
      setStamped(true);
      setStampCount((c) => c + 1);
      setStampAnim(true);
      setTimeout(() => setStampAnim(false), 600);
      const dh = getDeviceHash();
      await addSupport(report.id, dh);
    }
  }, [stamped, report]);

  const handleMarkFixed = async () => {
    if (!report) return;
    const ok = await markAsFixed(report.id);
    if (ok) {
      setReport({ ...report, status: "fixed" });
      showToastMsg("Marked as fixed");
    }
  };

  const handleShare = async () => {
    if (!report) return;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: report.title, text: `${report.title} — ${report.neighborhood || "NYC"}`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      showToastMsg("Link copied");
    }
  };

  // Pre-filled tweet with agency + council tags
  const handleTweet = useCallback(() => {
    if (!report) return;
    const url = window.location.href;
    const agencyHandle = getAgencyHandle(report.category);
    const affected = stampCount > 0 ? `${stampCount} people affected. ` : "";
    const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000));
    const text = `🚨 ${report.title} — ${report.neighborhood || "NYC"}. Open ${daysOpen} days. ${affected}${agencyHandle} what's the plan?\n\n${url}\n#FatCatsNYC #PointExposeFix`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }, [report, stampCount]);

  const showToastMsg = (msg: string) => {
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

  const hasLocation = report.lat != null && report.lng != null;
  const heroSrc = report.photo_url ? report.photo_url : hasLocation ? getStaticMapUrl(report.lat!, report.lng!) : null;
  const pipelineIdx = getPipelineIndex(report.status);
  const isResolved = pipelineIdx >= 3;
  const isVerified = pipelineIdx >= 4;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const flavorEmoji = selectedFlavor ? FLAVOR_REACTIONS.find((r) => r.label === selectedFlavor)?.emoji : null;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto animate-fade-in">
        {/* Hero image */}
        <div className="w-full aspect-[16/9] bg-[var(--fc-surface)] overflow-hidden relative">
          {heroSrc ? (
            <img src={heroSrc} alt={report.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--fc-bg)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--fc-bg)] via-transparent to-transparent" />
          <button onClick={() => router.back()} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
            <BackIcon />
          </button>
          <button onClick={handleShare} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[var(--fc-orange)] flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-[var(--fc-orange)]/30">
            <ShareTopIcon />
          </button>
        </div>

        <div className="px-4 py-5 space-y-5">
          {/* Status + pipeline */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <StatusPill status={report.status} />
              <span className="text-[11px] text-[var(--fc-muted)]">
                {report.source === "citizen" ? "Citizen exposé" : "City data"}
              </span>
              {isAuthor && report.status !== "fixed" && report.status !== "verified" && (
                <button onClick={handleMarkFixed} className="ml-auto flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 transition-colors">
                  <CheckIcon />
                  <span>Mark fixed</span>
                </button>
              )}
            </div>
            <PipelineSteps status={report.status} />
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-[var(--fc-muted)] uppercase tracking-wide">Open</span>
              <span className="text-[8px] text-[var(--fc-muted)] uppercase tracking-wide">Verified</span>
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight mb-2">{report.title}</h1>
            <div className="flex items-center gap-2 text-[13px]">
              {report.neighborhood && <span className="text-[var(--fc-info)] font-medium">{report.neighborhood}</span>}
              <span className="text-[var(--fc-muted)] opacity-40">·</span>
              <span className="text-[var(--fc-muted)]">{timeAgo(report.created_at)}</span>
            </div>
          </div>

          {report.description && <p className="text-[14px] text-white/75 leading-relaxed">{report.description}</p>}

          {/* Paw Stamp + Tweet CTA row */}
          <div className="flex items-center gap-3">
            {/* Paw stamp */}
            <div className="relative">
              <button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                onClick={handleStamp}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[14px] font-bold transition-all active:scale-95 select-none ${
                  stamped
                    ? "bg-[var(--fc-orange)]/15 text-[var(--fc-orange)] border-2 border-[var(--fc-orange)]/30"
                    : "bg-white/[0.06] text-white border-2 border-white/[0.08] hover:bg-white/[0.1]"
                }`}
              >
                <span className={`text-[18px] transition-transform ${stampAnim ? "animate-heart-pop" : ""}`}>
                  {flavorEmoji || <PawIcon size={20} color={stamped ? "#E8652B" : "#ffffff"} />}
                </span>
                <span>{stampCount}</span>
                <span className="text-[11px] font-normal text-[var(--fc-muted)]">affected</span>
              </button>
              <FlavorPopover visible={showFlavors} onSelect={handleFlavorSelect} onClose={() => setShowFlavors(false)} />
            </div>

            {/* Tweet to officials */}
            <button
              onClick={handleTweet}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[14px] font-bold bg-white/[0.06] text-white border-2 border-white/[0.08] hover:bg-white/[0.1] transition-all active:scale-95"
            >
              <XIcon />
              <span>Tweet Officials</span>
            </button>
          </div>

          {/* Contractor info card */}
          {report.contractor_name && (
            <div className="glass-card p-4 space-y-2">
              <h3 className="text-[12px] text-[var(--fc-muted)] uppercase tracking-wider font-semibold">Contractor</h3>
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-white font-medium">{report.contractor_name}</span>
                <span className={`text-[14px] font-bold ${
                  getContractorScore(report.contractor_name) >= 80 ? "text-green-400" :
                  getContractorScore(report.contractor_name) >= 65 ? "text-amber-400" : "text-red-400"
                }`}>
                  {getContractorScore(report.contractor_name)}% on-time
                </span>
              </div>
            </div>
          )}

          {/* Verify vote */}
          {isResolved && !isVerified && (
            <VerifyVote report={report} onVerified={() => showToastMsg("Vote recorded. Thanks for verifying.")} />
          )}

          {/* Verified badge */}
          {isVerified && (
            <div className="glass-card p-4 border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <div>
                  <p className="text-[13px] text-emerald-300 font-semibold">Community Verified</p>
                  <p className="text-[11px] text-[var(--fc-muted)]">Multiple people confirmed this fix. This is now part of the permanent accountability record.</p>
                </div>
              </div>
            </div>
          )}

          {/* Pipeline timeline */}
          <div className="glass-card p-4">
            <h3 className="text-[12px] text-[var(--fc-muted)] uppercase tracking-wider font-semibold mb-4">Timeline</h3>
            <PipelineTimeline report={report} />
          </div>

          {/* 2x2 Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-3.5">
              <span className="text-[11px] text-[var(--fc-muted)] block mb-1">First seen</span>
              <span className="text-[13px] text-white font-medium">{new Date(report.created_at).toLocaleDateString()}</span>
            </div>
            <div className="glass-card p-3.5">
              <span className="text-[11px] text-[var(--fc-muted)] block mb-1">Source</span>
              <span className="text-[13px] text-white font-medium">{report.source === "citizen" ? "Citizen exposé" : "NYC 311 data"}</span>
            </div>
            {report.category && (
              <div className="glass-card p-3.5">
                <span className="text-[11px] text-[var(--fc-muted)] block mb-1">Category</span>
                <span className="text-[13px] text-white font-medium capitalize">{report.category.replace(/_/g, " ")}</span>
              </div>
            )}
            <div className="glass-card p-3.5">
              <span className="text-[11px] text-[var(--fc-muted)] block mb-1">People affected</span>
              <span className="text-[13px] text-white font-medium">{stampCount}</span>
            </div>
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
                <p className="text-[13px] text-[var(--fc-muted)]">This is in <span className="text-white font-medium">{report.neighborhood}</span></p>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--fc-info)]/10 border border-[var(--fc-info)]/20">
                <span className="text-[12px] text-[var(--fc-info)] font-semibold">{getCategoryAgency(report.category)}</span>
              </div>
              <div>
                <a href="https://council.nyc.gov/districts/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fc-orange)] font-medium hover:underline">
                  Look up your council member
                  <ExternalLinkIcon />
                </a>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider">Comments</h3>
            <div className="space-y-3">
              {MOCK_COMMENTS.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--fc-surface-2)] flex items-center justify-center shrink-0 text-[14px]">{c.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-white">{c.user}</span>
                      <span className="text-[10px] text-[var(--fc-muted)]">{c.time}</span>
                    </div>
                    <p className="text-[13px] text-white/70 mt-0.5 leading-snug">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="w-8 h-8 rounded-full bg-[var(--fc-surface-2)] flex items-center justify-center shrink-0 text-[12px]">😺</div>
              <div className="flex-1 h-9 rounded-full bg-[var(--fc-surface-2)] border border-white/[0.06] flex items-center px-3">
                <span className="text-[12px] text-[var(--fc-muted)]">Add a comment...</span>
              </div>
            </div>
          </div>

          {/* Share section */}
          <div className="space-y-3 pt-2">
            <button onClick={handleShare} className="w-full h-12 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[15px] transition-colors active:scale-[0.98]">
              Share this exposé
            </button>
            <div className="flex items-center justify-center gap-4 text-[12px]">
              <a href={`https://wa.me/?text=${encodeURIComponent(`🚨 ${report.title} — ${report.neighborhood || "NYC"}. ${shareUrl} #FatCatsNYC`)}`} target="_blank" rel="noopener noreferrer" className="text-[var(--fc-muted)] hover:text-white transition-colors">WhatsApp</a>
              <span className="text-white/10">|</span>
              <button onClick={handleTweet} className="text-[var(--fc-muted)] hover:text-white transition-colors">Twitter/X</button>
              <span className="text-white/10">|</span>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); showToastMsg("Link copied"); }} className="text-[var(--fc-muted)] hover:text-white transition-colors">Copy link</button>
            </div>
          </div>

          <p className="text-[11px] text-[var(--fc-muted)] text-center pb-2">
            Every exposé is a receipt. Thanks for helping your city.
          </p>
        </div>

        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--fc-surface)]/90 backdrop-blur-xl border border-white/10 text-white text-sm px-5 py-2.5 rounded-xl animate-slide-up z-[60] shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}
