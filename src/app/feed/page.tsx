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
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Location banner */}
        {!showNearby && (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-white/70">
              See what&apos;s happening near you.
            </p>
            <button
              onClick={handleLocation}
              disabled={locationRequested && !showNearby}
              className="shrink-0 px-4 py-2 rounded-lg bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white text-sm font-semibold transition-colors active:scale-95"
            >
              {locationRequested ? "Locating..." : "Use my location"}
            </button>
          </div>
        )}

        {/* Near you section */}
        {showNearby && nearby.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[var(--fc-orange)] uppercase tracking-wider mb-4">
              Near you
            </h2>
            <div className="space-y-3">
              {nearby.slice(0, 5).map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          </div>
        )}

        {/* Main feed */}
        <h2 className="text-sm font-semibold text-[var(--fc-orange)] uppercase tracking-wider mb-4">
          Open issues people are watching
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--fc-orange)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--fc-muted)] text-sm">
              No reports yet. Be the first to file an exposé.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
