"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ReportCard from "@/components/ReportCard";
import { listReports, listNearbyReports } from "@/lib/reports";
import type { Report } from "@/lib/types";

export default function FeedPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [nearby, setNearby] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNearby, setShowNearby] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await listReports({ limit: 50 });
      setReports(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleLocation = () => {
    setLocationRequested(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const data = await listNearbyReports({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            radiusKm: 3,
          });
          setNearby(data);
          setShowNearby(true);
        },
        () => {
          setShowNearby(false);
        }
      );
    }
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-5">
        {/* Location banner */}
        {!showNearby && (
          <div className="glass-card p-4 mb-5 flex items-center justify-between gap-3 animate-slide-up">
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
              disabled={locationRequested && !showNearby}
              className="shrink-0 px-4 py-2 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white text-[13px] font-semibold transition-all active:scale-95"
            >
              {locationRequested ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Enable"
              )}
            </button>
          </div>
        )}

        {/* Near you section */}
        {showNearby && nearby.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[var(--fc-orange)] animate-pulse" />
              <h2 className="text-[13px] font-semibold text-[var(--fc-orange)] uppercase tracking-wider">
                Near you
              </h2>
            </div>
            <div className="space-y-3">
              {nearby.slice(0, 5).map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          </div>
        )}

        {/* Main feed */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider">
            Open exposés
          </h2>
          {!loading && (
            <span className="text-[11px] text-[var(--fc-muted)] bg-white/5 px-2 py-0.5 rounded-full">
              {reports.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card p-4 h-28 skeleton-shimmer rounded-2xl"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p className="text-[var(--fc-muted)] text-sm mb-1">
              No reports yet
            </p>
            <p className="text-[var(--fc-muted)] text-xs">
              Be the first to file an exposé
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r, i) => (
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
