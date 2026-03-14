"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ReportCard from "@/components/ReportCard";
import { listReports, listNearbyReports } from "@/lib/reports";
import type { Report } from "@/lib/types";

type FeedTab = "trending" | "near" | "following";

export default function FeedPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [nearby, setNearby] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FeedTab>("trending");
  const [locationRequested, setLocationRequested] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await listReports({ limit: 50 });
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

  const TABS: { key: FeedTab; label: string }[] = [
    { key: "trending", label: "Trending" },
    { key: "near", label: "Near You" },
    { key: "following", label: "Following" },
  ];

  const displayReports = tab === "near" && nearby.length > 0 ? nearby : reports;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Tab pills */}
        <div className="flex items-center gap-2 mb-4">
          {TABS.map((t) => (
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

        {/* Location banner — only if on "near" tab and location not yet enabled */}
        {tab === "near" && !locationRequested && (
          <div className="glass-card p-4 mb-4 flex items-center justify-between gap-3 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--fc-orange)]/10 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fc-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
              <p className="text-[13px] text-white/80">
                See what&apos;s happening near you
              </p>
            </div>
            <button
              onClick={handleLocation}
              className="shrink-0 px-4 py-2 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white text-[13px] font-semibold transition-all active:scale-95"
            >
              Enable
            </button>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider">
            {tab === "near" ? "Near you" : tab === "following" ? "Following" : "Open exposés"}
          </h2>
          {!loading && (
            <span className="text-[11px] text-[var(--fc-muted)] bg-[var(--fc-surface)] px-2 py-0.5 rounded-full border border-white/[0.06]">
              {displayReports.length}
            </span>
          )}
        </div>

        {/* Loading state */}
        {(loading || (tab === "near" && locationLoading)) ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl h-[280px] skeleton-shimmer"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : displayReports.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[var(--fc-surface)] flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">
              {tab === "near" ? "Nothing nearby yet" : tab === "following" ? "Not following anything yet" : "No reports yet"}
            </p>
            <p className="text-[var(--fc-muted)] text-xs">
              {tab === "following" ? "Watch an exposé to start following" : "Be the first to file an exposé"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayReports.map((r, i) => (
              <div
                key={r.id}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <ReportCard report={r} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
