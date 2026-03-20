"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import StatusPill from "@/components/StatusPill";
import { PipelineSteps } from "@/components/StatusPill";
import ShareSheet from "@/components/ShareSheet";
import { getReportById, addSupport, hasSupported, markAsFixed, deleteReport } from "@/lib/reports";
import { getDeviceHash } from "@/lib/device";
import { getPipelineIndex, getCategoryAgency, getAgencyHandle, FLAVOR_REACTIONS } from "@/lib/types";
import type { Report } from "@/lib/types";
import { getFullGeoIntelligence, estimateRepairCost } from "@/lib/geo-intelligence";
import { filterTitle, filterCost } from "@/lib/voice-filter";
import type { GeoIntelligence } from "@/lib/geo-intelligence";
import { IntelLogo } from "@/components/FatCatsIntel";
import FollowButton from "@/components/FollowButton";
import DeliveredTo from "@/components/DeliveredTo";
import { ReactionBar, CommentSection, CommentCountBadge } from "@/components/CommunityEngagement";
import { getCommunityProof } from "@/lib/social-proof";
import { SameBlockSection, WorstRightNow } from "@/components/RabbitHole";
import Image from "next/image";

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

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
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

  // Geo-intelligence state
  const [geoIntel, setGeoIntel] = useState<GeoIntelligence | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [geoLoading, setGeoLoading] = useState(false);

  // Delete exposé state
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Fetch geo-intelligence after report loads
  useEffect(() => {
    async function loadGeo() {
      if (!report || report.lat == null || report.lng == null) return;
      setGeoLoading(true);
      try {
        const intel = await getFullGeoIntelligence(report.lat, report.lng, report.category);
        setGeoIntel(intel);
      } catch {
        // Geo intel failed silently
      }
      setGeoLoading(false);
    }
    loadGeo();
  }, [report?.id, report?.lat, report?.lng, report?.category]);

  // Stamp toggle
  const handleStamp = useCallback(async () => {
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (!report) return;

    if (stamped) {
      setStamped(false);
      setStampCount((c) => Math.max(0, c - 1));
      setSelectedFlavor(null);
    } else {
      setStamped(true);
      setStampCount((c) => c + 1);
      setStampAnim(true);
      if (navigator.vibrate) navigator.vibrate(40);
      setTimeout(() => setStampAnim(false), 600);
      const dh = getDeviceHash();
      await addSupport(report.id, dh);
    }
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

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="intel-glow">
            <Image src="/assets/logo-64.png" alt="Loading" width={32} height={32} className="animate-pulse" />
          </div>
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
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const flavorEmoji = selectedFlavor ? FLAVOR_REACTIONS.find((r) => r.label === selectedFlavor)?.emoji : null;
  const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000));

  // Build "Delivered to" officials list
  const deliveredOfficials: { role: string; name?: string; handle?: string; type: "council" | "agency" | "contractor" }[] = [];
  if (geoIntel?.councilMember) {
    deliveredOfficials.push({
      role: `Council District ${geoIntel.councilMember.district}`,
      name: geoIntel.councilMember.name,
      handle: geoIntel.councilMember.twitterHandle || undefined,
      type: "council",
    });
  }
  const agencyName = getCategoryAgency(report.category);
  if (agencyName) {
    deliveredOfficials.push({
      role: agencyName,
      handle: getAgencyHandle(report.category) || undefined,
      type: "agency",
    });
  }
  if (report.contractor_name) {
    deliveredOfficials.push({
      role: report.contractor_name,
      name: report.contractor_name,
      type: "contractor",
    });
  }

  const costData = estimateRepairCost(report.category);
  const proof = getCommunityProof(report.id, stampCount);

  return (
    <AppShell>
      <div className="max-w-lg mx-auto animate-fade-in pb-20">

        {/* ═══ SECTION 1: HERO + TITLE + STATUS ═══ */}
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
          {daysOpen >= 14 && pipelineIdx < 3 && (
            <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 backdrop-blur-sm">
              <span className="text-[11px] font-bold text-red-400">Open {daysOpen} days</span>
            </div>
          )}
        </div>

        <div className="px-4 py-5 space-y-5">
          {/* Status bar + author menu */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <StatusPill status={report.status} />
              <span className="text-[11px] text-[var(--fc-muted)]">
                {report.source === "citizen" ? "Resident exposé" : "City data"}
              </span>
              {isAuthor && (
                <div className="ml-auto relative">
                  <button
                    onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--fc-muted)] hover:text-white hover:bg-white/[0.06] transition-all active:scale-90"
                    aria-label="More options"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                  {showDeleteMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDeleteMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[var(--fc-surface-2)] border border-white/[0.1] shadow-xl shadow-black/40 z-50 animate-scale-in overflow-hidden">
                        {report.status !== "fixed" && report.status !== "verified" && (
                          <button
                            onClick={() => { setShowDeleteMenu(false); handleMarkFixed(); }}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] text-green-400 hover:bg-white/[0.04] transition-colors"
                          >
                            <CheckIcon />
                            <span>Mark as fixed</span>
                          </button>
                        )}
                        <button
                          onClick={() => { setShowDeleteMenu(false); setShowDeleteConfirm(true); }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] text-red-400 hover:bg-red-500/[0.06] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Delete my exposé</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <PipelineSteps status={report.status} />
          </div>

          {/* Title + meta */}
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight mb-2">{filterTitle(report.title, report.category)}</h1>
            <div className="flex items-center gap-2 text-[13px] flex-wrap">
              {report.neighborhood && <span className="text-[var(--fc-info)] font-medium">{report.neighborhood}</span>}
              <span className="text-[var(--fc-muted)] opacity-40">·</span>
              <span className="text-[var(--fc-muted)]">{timeAgo(report.created_at)}</span>
              <span className="text-[var(--fc-muted)] opacity-40">·</span>
              <CommentCountBadge itemId={report.id} />
              {report.category && (
                <>
                  <span className="text-[var(--fc-muted)] opacity-40">·</span>
                  <span className="text-[var(--fc-muted)] capitalize">{report.category.replace(/_/g, " ")}</span>
                </>
              )}
            </div>
          </div>

          {report.description && <p className="text-[14px] text-white/75 leading-relaxed">{report.description}</p>}

          {/* ═══ SECTION 2: "I'M AFFECTED" CTA — The gateway drug ═══ */}
          <div className="space-y-3">
            {/* Social proof */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex -space-x-1.5">
                {["#E8652B", "#ff8c5a", "#F59E0B", "#22C55E"].map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border-2 border-[var(--fc-bg)]" style={{ background: c, opacity: 0.8 }} />
                ))}
              </div>
              <span className="text-[11px] text-[var(--fc-muted)]">
                <span className="text-white font-semibold">{proof.othersConfirmed} others</span> confirmed this issue
              </span>
            </div>

            <div className="relative">
              <button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                onClick={handleStamp}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[16px] font-bold transition-all active:scale-[0.97] select-none ${
                  stamped
                    ? "bg-[var(--fc-orange)]/15 text-[var(--fc-orange)] border-2 border-[var(--fc-orange)]/40 shadow-[0_0_20px_rgba(232,101,43,0.15)]"
                    : "bg-gradient-to-r from-[var(--fc-orange)] to-[#ff8c5a] text-white border-2 border-[var(--fc-orange)]/20 shadow-[0_4px_20px_rgba(232,101,43,0.3)] hover:shadow-[0_4px_30px_rgba(232,101,43,0.45)]"
                }`}
              >
                <span className={`text-[22px] transition-transform ${stampAnim ? "animate-heart-pop" : ""}`}>
                  {flavorEmoji || <PawIcon size={24} color={stamped ? "#E8652B" : "#ffffff"} />}
                </span>
                <span>{stamped ? `You + ${Math.max(0, stampCount - 1)} affected` : "I'm Affected Too"}</span>
                {!stamped && <span className="text-white/60 text-[13px] font-normal">+{stampCount}</span>}
              </button>
              <FlavorPopover visible={showFlavors} onSelect={handleFlavorSelect} onClose={() => setShowFlavors(false)} />
            </div>
          </div>

          {/* ═══ SECTION 3: DELIVERED TO — Who got notified ═══ */}
          {deliveredOfficials.length > 0 && (
            <DeliveredTo
              officials={deliveredOfficials}
              exposéUrl={shareUrl}
              exposéTitle={report.title}
              neighborhood={report.neighborhood}
              costRange={costData.range}
              daysOpen={daysOpen}
              stampCount={stampCount}
            />
          )}

          {/* ═══ SECTION 4: COST + WHO HANDLES — Merged intelligence ═══ */}
          <div className="glass-card-elevated p-4 space-y-3">
            <div className="flex items-center gap-2">
              <IntelLogo size={18} />
              <h3 className="text-sm font-semibold text-white">Intelligence</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Cost estimate */}
              <div>
                <span className="text-[11px] text-[var(--fc-muted)] block">Est. repair cost</span>
                <span className="text-[15px] text-[var(--fc-orange)] font-bold">{filterCost(costData.range, costData.avg)}</span>
                <span className="text-[11px] text-[var(--fc-muted)] block">{costData.unit}</span>
              </div>
              {/* Nearby issue count */}
              {geoIntel && geoIntel.nearbyCount > 0 && (
                <div>
                  <span className="text-[11px] text-[var(--fc-muted)] block">Nearby (~3 blocks)</span>
                  <span className="text-[15px] text-white font-bold">{geoIntel.nearbyCount} issues</span>
                  {geoIntel.totalAreaSpend && (
                    <span className="text-[11px] text-[var(--fc-muted)] block">{geoIntel.totalAreaSpend} spent</span>
                  )}
                </div>
              )}
            </div>

            {/* Responsible agency */}
            {hasLocation && (
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <span className="text-[11px] text-[var(--fc-muted)] uppercase tracking-wider font-semibold">Who handles this</span>
                {(geoIntel?.neighborhood || report.neighborhood) && (
                  <p className="text-[13px] text-[var(--fc-muted)]">
                    <span className="text-white font-medium">{geoIntel?.neighborhood || report.neighborhood}</span>
                    {geoIntel?.nearestIntersection && (
                      <span> — {geoIntel.nearestIntersection}</span>
                    )}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--fc-info)]/10 border border-[var(--fc-info)]/20 text-[12px] text-[var(--fc-info)] font-semibold">
                    {getCategoryAgency(report.category)}
                  </span>
                  {geoIntel?.councilMember && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] text-white font-medium">
                      🏛️ {geoIntel.councilMember.name}
                      {geoIntel.councilMember.twitterHandle && (
                        <span className="text-[var(--fc-info)]">{geoIntel.councilMember.twitterHandle}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Repeat offender alert */}
            {geoIntel?.isRepeatOffender && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="text-[14px]">🔄</span>
                <span className="text-[12px] text-red-400 font-semibold">
                  Repeat Issue — {geoIntel.repeatCount} times at this spot
                </span>
              </div>
            )}

            {/* Source citation */}
            <p className="text-[9px] text-[var(--fc-muted)] opacity-50 leading-snug">
              Estimates based on{" "}
              <a href="https://data.cityofnewyork.us/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">NYC Open Data</a>,{" "}
              <a href="https://www.dot.ny.gov/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">DOT</a>, and{" "}
              <a href="https://www.nyc.gov/site/dep/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">DEP</a>{" "}
              public data.
            </p>
          </div>

          {/* ═══ SECTION 5: COMMUNITY — Reactions + Comments ═══ */}
          <div className="space-y-4">
            <ReactionBar itemId={report.id} />
            <CommentSection itemId={report.id} maxVisible={3} />
          </div>

          <p className="text-[11px] text-[var(--fc-muted)] text-center pb-2">
            Every exposé is a receipt. Thanks for helping your city.
          </p>

          {/* ═══ SECTION 6: RABBIT HOLE — Keep them exploring ═══ */}
          <div className="space-y-4">
            <SameBlockSection
              currentId={report.id}
              lat={report.lat}
              lng={report.lng}
              neighborhood={report.neighborhood}
            />
            <WorstRightNow currentId={report.id} />
          </div>

          {/* Follow CTA — single inline button, not floating */}
          <div className="flex justify-center py-3">
            <FollowButton kind="report" id={report.id} variant="compact" />
          </div>
        </div>

        {/* Sticky share bar */}
        <ShareSheet
          title={report.title}
          neighborhood={report.neighborhood}
          url={shareUrl}
          category={report.category}
          stampCount={stampCount}
          createdAt={report.created_at}
          agencyHandle={getAgencyHandle(report.category)}
          councilMemberHandle={geoIntel?.councilMember?.twitterHandle || undefined}
          costRange={costData.range}
          totalAreaSpend={geoIntel?.totalAreaSpend || undefined}
          nearbyCount={geoIntel?.nearbyCount}
          variant="sticky"
          reportId={report.id}
          deliveredOfficials={deliveredOfficials.map(o => ({ role: o.role, name: o.name, handle: o.handle }))}
        />

        {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setShowDeleteConfirm(false)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-[var(--fc-surface-2)] border border-white/[0.1] shadow-2xl animate-modal-shake overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">Delete this exposé?</h3>
                    <p className="text-[12px] text-[var(--fc-muted)] mt-1">
                      {(report.cosign_count || 0) > 0
                        ? `${report.cosign_count} co-sign${report.cosign_count === 1 ? "" : "s"} and ${stampCount} affected people's voices will be removed.`
                        : `${stampCount} people's voices will be removed.`}
                      {" "}This can&apos;t be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-3.5 text-[13px] font-semibold text-white hover:bg-white/[0.04] transition-colors active:scale-[0.98]"
                >
                  Keep it
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={async () => {
                    setDeleting(true);
                    const dh = getDeviceHash();
                    const result = await deleteReport(report.id, dh);
                    if (result.success) {
                      setShowDeleteConfirm(false);
                      showToastMsg("Exposé deleted");
                      setTimeout(() => router.push("/feed"), 800);
                    } else {
                      showToastMsg(result.error || "Failed to delete");
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                  className="flex-1 py-3.5 text-[13px] font-bold text-red-400 hover:bg-red-500/[0.06] transition-colors active:scale-[0.98]"
                >
                  {deleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </span>
                  ) : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--fc-surface)]/90 backdrop-blur-xl border border-white/10 text-white text-sm px-5 py-2.5 rounded-xl animate-toast-up z-[60] shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}
