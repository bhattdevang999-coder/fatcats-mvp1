"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import AppShell from "@/components/AppShell";
import ReportCard from "@/components/ReportCard";
import AnimatedCard from "@/components/AnimatedCard";
import { FeedSkeleton } from "@/components/Skeletons";
import SinceYouLeftBanner from "@/components/SinceYouLeft";
import { listReports, listNearbyReports } from "@/lib/reports";
import { getPipelineIndex } from "@/lib/types";
import { clusterReports } from "@/lib/feed-clustering";
import { getFollowedReportIds } from "@/lib/follows";
import { estimateRepairCost } from "@/lib/geo-intelligence";
import { BlockWatchdogClaimCTA, InlineClaimCTA, NeighborhoodLeaderboard } from "@/components/BlockWatchdogCTA";
import type { Report } from "@/lib/types";
import type { FeedItem } from "@/lib/feed-clustering";

type FeedTab = "trending" | "near" | "following";
type FilterKey = "all" | "open" | "in_progress" | "resolved" | "verify";

const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: "trending", label: "Trending" },
  { key: "near", label: "Your Block" },
  { key: "following", label: "Following" },
];

const FILTER_TABS: { key: FilterKey; label: string; emoji?: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "verify", label: "Verify It", emoji: "✅" },
];

function filterByPipeline(reports: Report[], filter: FilterKey): Report[] {
  if (filter === "all") return reports;
  return reports.filter((r) => {
    const idx = getPipelineIndex(r.status);
    switch (filter) {
      case "open":
        return idx === 0;
      case "in_progress":
        return idx === 1 || idx === 2; // assigned + in progress
      case "resolved":
        return idx === 3 || idx === 4; // resolved + verified
      case "verify":
        return idx === 3; // resolved but not yet verified — needs community check
      default:
        return true;
    }
  });
}

// ── Cluster Stats Banner ──────────────────────────────────────────────

function ClusterStatsBanner({ feedItems }: { feedItems: FeedItem[] }) {
  const clusters = feedItems.filter((f) => f.type === "cluster");
  if (clusters.length === 0) return null;

  const totalClustered = clusters.reduce(
    (sum, f) => sum + (f.cluster?.reportCount || 0),
    0
  );
  const emergencyCount = clusters.filter(
    (f) => f.cluster?.severity === "emergency"
  ).length;
  const criticalCount = clusters.filter(
    (f) => f.cluster?.severity === "critical"
  ).length;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-3 animate-fade-in">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#E8652B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
      <span className="text-[11px] text-[var(--fc-muted)]">
        <span className="text-white font-semibold">{totalClustered}</span>{" "}
        reports grouped into{" "}
        <span className="text-white font-semibold">{clusters.length}</span>{" "}
        cluster{clusters.length !== 1 ? "s" : ""}
      </span>
      {emergencyCount > 0 && (
        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20">
          🚨 {emergencyCount}
        </span>
      )}
      {criticalCount > 0 && (
        <span className="text-[10px] font-bold text-[var(--fc-orange)] bg-[var(--fc-orange)]/10 px-1.5 py-0.5 rounded-md border border-[var(--fc-orange)]/20">
          🔥 {criticalCount}
        </span>
      )}
    </div>
  );
}

// ── Hot Topics Bar ───────────────────────────────────────────────────

function HotTopicsBar({ reports }: { reports: Report[] }) {
  const hotReports = useMemo(() => {
    return [...reports]
      .filter((r) => getPipelineIndex(r.status) < 3)
      .map((r) => {
        const cost = estimateRepairCost(r.category);
        const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000));
        const heat = (r.supporters_count + 1) * cost.avg * Math.log2(daysOpen + 1);
        return { ...r, heat, costRange: cost.range, daysOpen };
      })
      .sort((a, b) => b.heat - a.heat)
      .slice(0, 8);
  }, [reports]);

  if (hotReports.length === 0) return null;

  return (
    <div className="mb-4 -mx-4">
      <div className="flex items-center gap-2 px-4 mb-2.5">
        <span className="text-[14px]">🔥</span>
        <h2 className="text-[13px] font-bold text-white uppercase tracking-wider">Hot Right Now</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {hotReports.map((r) => (
          <a
            key={r.id}
            href={`/expose/${r.id}`}
            className="shrink-0 w-[220px] p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-[var(--fc-orange)]/20 transition-all active:scale-[0.97] group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px] font-bold text-[var(--fc-orange)]">{r.costRange}</span>
              <span className="text-[10px] text-red-400 font-medium bg-red-500/10 px-1.5 py-0.5 rounded-md">
                {r.daysOpen}d open
              </span>
            </div>
            <p className="text-[12px] text-white font-medium leading-snug line-clamp-2 group-hover:text-[var(--fc-orange)] transition-colors">
              {r.title}
            </p>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--fc-muted)]">
              <span>{r.neighborhood || "NYC"}</span>
              {r.supporters_count > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span>🐾 {r.supporters_count}</span>
                </>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Flatten feed items to reports ─────────────────────────────────────

function flattenFeedItems(feedItems: FeedItem[]): Report[] {
  const reports: Report[] = [];
  for (const item of feedItems) {
    if (item.type === "cluster" && item.cluster) {
      // Show lead report from each cluster
      reports.push(item.cluster.leadReport);
    } else if (item.report) {
      reports.push(item.report);
    }
  }
  return reports;
}

// ── Page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [nearby, setNearby] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FeedTab>("trending");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [locationRequested, setLocationRequested] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [detectedNeighborhood, setDetectedNeighborhood] = useState<string | null>(null);
  const [nearbyRadius, setNearbyRadius] = useState<number>(3);

  const loadReports = useCallback(async () => {
    const data = await listReports({ limit: 200 });
    setReports(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Hide scroll hint after user scrolls filter row
  useEffect(() => {
    const el = filterScrollRef.current;
    if (!el) return;
    const handler = () => setShowScrollHint(false);
    el.addEventListener("scroll", handler, { once: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadReports();
  }, [loadReports]);

  const handleLocation = () => {
    if (locationRequested) return;
    setLocationRequested(true);
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // Reverse geocode to get neighborhood name
          try {
            const geoRes = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
            );
            const geoData = await geoRes.json();
            if (geoData.features?.[0]?.text) {
              setDetectedNeighborhood(geoData.features[0].text);
            }
          } catch {}

          // Expanding radius: try 3km, then 10km, then 25km
          let data = await listNearbyReports({ lat, lng, radiusKm: 3 });
          let radius = 3;

          if (data.length < 3) {
            data = await listNearbyReports({ lat, lng, radiusKm: 10 });
            radius = 10;
          }
          if (data.length < 3) {
            data = await listNearbyReports({ lat, lng, radiusKm: 25 });
            radius = 25;
          }

          setNearbyRadius(radius);
          setNearby(data);
          setLocationLoading(false);
          setTab("near");
        },
        () => {
          setLocationLoading(false);
        }
      );
    }
  };

  // ── Clustering ──────────────────────────────────────────────────────

  const baseReports = useMemo(() => {
    if (tab === "near" && nearby.length > 0) return nearby;
    if (tab === "following") {
      const ids = new Set(getFollowedReportIds());
      return reports.filter((r) => ids.has(r.id));
    }
    return reports;
  }, [tab, reports, nearby]);
  const filteredReports = filterByPipeline(baseReports, filter);

  const feedItems = useMemo(
    () => clusterReports(filteredReports),
    [filteredReports]
  );

  // Flatten clusters into individual reports for rendering
  const displayReports = useMemo(
    () => flattenFeedItems(feedItems),
    [feedItems]
  );

  // Count reports in each filter for badges
  const counts: Record<FilterKey, number> = {
    all: baseReports.length,
    open: filterByPipeline(baseReports, "open").length,
    in_progress: filterByPipeline(baseReports, "in_progress").length,
    resolved: filterByPipeline(baseReports, "resolved").length,
    verify: filterByPipeline(baseReports, "verify").length,
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Feed type tabs */}
        <div className="flex items-center gap-2 mb-3">
          {FEED_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                if (t.key === "near" && !locationRequested) {
                  handleLocation();
                }
              }}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-95 ${
                tab === t.key
                  ? "bg-[var(--fc-orange)] text-white"
                  : "bg-[var(--fc-surface)] text-[var(--fc-muted)] border border-white/[0.06] hover:bg-[var(--fc-surface-2)]"
              }`}
            >
              {t.label}
            </button>
          ))}

          {/* Pull-to-refresh button (mobile friendly) */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors active:scale-90"
            title="Refresh feed"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8B95A8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={refreshing ? "animate-spin" : ""}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        {/* Pipeline filter tabs with scroll indicator */}
        <div className="relative mb-4">
          <div
            ref={filterScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1"
          >
            {FILTER_TABS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all active:scale-95 ${
                  filter === f.key
                    ? "bg-white/[0.12] text-white border border-white/[0.15]"
                    : "bg-white/[0.03] text-[var(--fc-muted)] border border-white/[0.04] hover:bg-white/[0.06]"
                }`}
              >
                {f.emoji && <span className="text-[10px]">{f.emoji}</span>}
                {f.label}
                {counts[f.key] > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full ml-0.5 ${
                      filter === f.key
                        ? "bg-white/20 text-white"
                        : "bg-white/[0.06] text-[var(--fc-muted)]"
                    }`}
                  >
                    {counts[f.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Scroll fade indicator */}
          {showScrollHint && (
            <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[var(--fc-bg)] to-transparent pointer-events-none" />
          )}
        </div>

        {/* Since You Left banner */}
        {!loading && <SinceYouLeftBanner reports={reports} />}

        {/* 🔥 Hot Topics — trending horizontal scroll */}
        {!loading && tab === "trending" && <HotTopicsBar reports={reports} />}

        {/* 🏆 Neighborhood Leaderboard */}
        {!loading && tab === "trending" && <NeighborhoodLeaderboard reports={reports} />}

        {/* 🔍 Block Watchdog CTA (Your Block tab — when thin/empty) */}
        {!loading && tab === "near" && nearby.length < 5 && (
          <div className="mb-4">
            {nearbyRadius > 3 && (
              <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[13px]">📡</span>
                <span className="text-[12px] text-amber-400">
                  {nearby.length === 0
                    ? "No reports near your location. Showing citywide data."
                    : `Only ${nearby.length} reports within ${nearbyRadius}km. Expanded search radius.`}
                </span>
              </div>
            )}
            <BlockWatchdogClaimCTA
              detectedNeighborhood={detectedNeighborhood}
              nearbyCount={nearby.length}
              totalCityReports={reports.length}
            />
          </div>
        )}

        {/* Cluster stats summary */}
        {!loading && <ClusterStatsBanner feedItems={feedItems} />}

        {/* Loading state */}
        {loading && <FeedSkeleton />}

        {/* Location loading */}
        {tab === "near" && locationLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--fc-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--fc-muted)]">
              Finding reports near you...
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && displayReports.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">
              {tab === "following"
                ? "🔔"
                : tab === "near"
                ? "🗺️"
                : filter === "verify"
                ? "✅"
                : filter === "resolved"
                ? "🎉"
                : filter === "in_progress"
                ? "🔧"
                : "📭"}
            </div>
            <p className="text-white text-[15px] font-semibold mb-1">
              {tab === "following"
                ? "No followed reports yet"
                : tab === "near"
                ? "Your block is uncharted territory"
                : filter === "verify"
                ? "Nothing to verify yet"
                : filter === "resolved"
                ? "No fixes confirmed yet"
                : filter === "in_progress"
                ? "No active investigations"
                : filter === "open"
                ? "No open cases"
                : "Intel feed is quiet"}
            </p>
            <p className="text-[var(--fc-muted)] text-sm mb-6">
              {tab === "following"
                ? "Tap the bell on any report to follow it and get updates here."
                : tab === "near"
                ? "No reports near you yet. Be the first to cover this territory."
                : filter === "all"
                ? "Spot something broken? You're the investigator now."
                : "Try a different filter or check back later."}
            </p>
            {/* Inline Claim CTA — visible button right in the empty state */}
            {tab === "near" && (
              <div className="max-w-sm mx-auto">
                <InlineClaimCTA detectedNeighborhood={detectedNeighborhood} />
              </div>
            )}
          </div>
        )}

        {/* Feed items — individual report cards */}
        {!loading && displayReports.length > 0 && (
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-5">
            {displayReports.map((report, i) => (
              <AnimatedCard key={report.id} index={i}>
                <ReportCard report={report} />
              </AnimatedCard>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
