"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import AppShell from "@/components/AppShell";
import ReportCard from "@/components/ReportCard";
import ClusterCard from "@/components/ClusterCard";
import NearbyAlertBanner from "@/components/NearbyAlert";
import SinceYouLeftBanner from "@/components/SinceYouLeft";
import { listReports, listNearbyReports } from "@/lib/reports";
import { getPipelineIndex } from "@/lib/types";
import { clusterReports, checkNearbyAlerts } from "@/lib/feed-clustering";
import type { Report } from "@/lib/types";
import type { FeedItem, NearbyAlert, ReportCluster } from "@/lib/feed-clustering";

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

  // Nearby alerts
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [nearbyAlerts, setNearbyAlerts] = useState<NearbyAlert[]>([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);

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
          setUserLat(lat);
          setUserLng(lng);

          const data = await listNearbyReports({
            lat,
            lng,
            radiusKm: 3,
          });
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

  const baseReports = tab === "near" && nearby.length > 0 ? nearby : reports;
  const filteredReports = filterByPipeline(baseReports, filter);

  const feedItems = useMemo(
    () => clusterReports(filteredReports),
    [filteredReports]
  );

  // Check nearby alerts when we have clusters + user location
  useEffect(() => {
    if (userLat == null || userLng == null) return;
    const clusters = feedItems
      .filter((f): f is FeedItem & { cluster: ReportCluster } => f.type === "cluster" && f.cluster != null)
      .map((f) => f.cluster);
    const alerts = checkNearbyAlerts(clusters, userLat, userLng);
    setNearbyAlerts(alerts);
  }, [feedItems, userLat, userLng]);

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

        {/* Nearby alerts banner */}
        {!alertsDismissed && nearbyAlerts.length > 0 && (
          <NearbyAlertBanner
            alerts={nearbyAlerts}
            onDismiss={() => setAlertsDismissed(true)}
          />
        )}

        {/* Since You Left banner */}
        {!loading && <SinceYouLeftBanner reports={reports} />}

        {/* Cluster stats summary */}
        {!loading && <ClusterStatsBanner feedItems={feedItems} />}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card h-[340px] animate-pulse bg-white/[0.03]"
              />
            ))}
          </div>
        )}

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
        {!loading && feedItems.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">
              {filter === "verify"
                ? "✅"
                : filter === "resolved"
                ? "🎉"
                : filter === "in_progress"
                ? "🔧"
                : "📭"}
            </div>
            <p className="text-white text-[15px] font-semibold mb-1">
              {filter === "verify"
                ? "Nothing to verify yet"
                : filter === "resolved"
                ? "No fixes confirmed yet"
                : filter === "in_progress"
                ? "No active investigations"
                : filter === "open"
                ? "No open cases"
                : "Intel feed is quiet"}
            </p>
            <p className="text-[var(--fc-muted)] text-sm">
              {filter === "all"
                ? "Spot something broken? You're the investigator now."
                : "Try a different filter or check back later."}
            </p>
          </div>
        )}

        {/* Feed items — clusters + individual reports */}
        {!loading && feedItems.length > 0 && (
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-5">
            {feedItems.map((item, idx) =>
              item.type === "cluster" && item.cluster ? (
                <ClusterCard
                  key={item.cluster.id}
                  cluster={item.cluster}
                  index={idx}
                />
              ) : item.report ? (
                <ReportCard key={item.report.id} report={item.report} />
              ) : null
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
