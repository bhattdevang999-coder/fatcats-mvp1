"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ReportCard from "@/components/ReportCard";
import { listReports, listNearbyReports } from "@/lib/reports";
import { getPipelineIndex } from "@/lib/types";
import type { Report } from "@/lib/types";

type FeedTab = "trending" | "near" | "following";
type FilterKey = "all" | "open" | "in_progress" | "resolved" | "verify";

const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: "trending", label: "Trending" },
  { key: "near", label: "Near You" },
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

export default function FeedPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [nearby, setNearby] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FeedTab>("trending");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [locationRequested, setLocationRequested] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await listReports({ limit: 100 });
      setReports(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleLocation = () => {
    if (locationRequested) return;
    setLocationRequested(true);
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const data = await listNearbyReports({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
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

  const baseReports = tab === "near" && nearby.length > 0 ? nearby : reports;
  const displayReports = filterByPipeline(baseReports, filter);

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
      <div className="max-w-lg mx-auto px-4 py-4">
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
        </div>

        {/* Pipeline filter tabs */}
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
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
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ml-0.5 ${
                  filter === f.key ? "bg-white/20 text-white" : "bg-white/[0.06] text-[var(--fc-muted)]"
                }`}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card h-[340px] animate-pulse bg-white/[0.03]" />
            ))}
          </div>
        )}

        {/* Location loading */}
        {tab === "near" && locationLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--fc-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--fc-muted)]">Finding reports near you...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && displayReports.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">
              {filter === "verify" ? "✅" : "📭"}
            </div>
            <p className="text-[var(--fc-muted)] text-sm">
              {filter === "verify"
                ? "No reports waiting for verification right now."
                : filter === "all"
                ? "No reports found."
                : `No ${FILTER_TABS.find(f => f.key === filter)?.label.toLowerCase()} reports right now.`}
            </p>
          </div>
        )}

        {/* Report cards */}
        {!loading && (
          <div className="flex flex-col gap-4">
            {displayReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
