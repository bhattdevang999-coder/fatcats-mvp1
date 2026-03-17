"use client";

import { useEffect, useState, useMemo } from "react";
import type { Report } from "@/lib/types";
import { getSinceYouLeft } from "@/lib/engagement";
import { findNearbyProjects, formatMoney } from "@/lib/capital-projects";

interface Props {
  reports: Report[];
}

export default function SinceYouLeftBanner({ reports }: Props) {
  const [sinceData, setSinceData] = useState<ReturnType<typeof getSinceYouLeft> | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [nearbySpending, setNearbySpending] = useState<{ count: number; totalBudget: number } | null>(null);

  useEffect(() => {
    setSinceData(getSinceYouLeft());
    // Fetch nearby spending for the banner
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const nearby = await findNearbyProjects(pos.coords.latitude, pos.coords.longitude);
            if (nearby && nearby.count > 0) {
              setNearbySpending({ count: nearby.count, totalBudget: nearby.totalBudget });
            }
          } catch {}
        },
        () => {}
      );
    }
  }, []);

  // Compute changes since last visit
  const changes = useMemo(() => {
    if (!sinceData?.lastVisit || !sinceData.isReturning) return null;

    const lastVisitMs = sinceData.lastVisit.getTime();
    const newReports = reports.filter(
      (r) => new Date(r.created_at).getTime() > lastVisitMs
    );
    const recentlyFixed = reports.filter(
      (r) =>
        (r.status === "closed" || r.status === "fixed" || r.status === "resolved" || r.status === "verified") &&
        new Date(r.created_at).getTime() > lastVisitMs
    );
    const hotspots = reports.filter((r) => r.supporters_count >= 10);
    const newHotspots = hotspots.filter(
      (r) => new Date(r.created_at).getTime() > lastVisitMs
    );

    if (newReports.length === 0 && recentlyFixed.length === 0 && newHotspots.length === 0) {
      return null;
    }

    return {
      newReports: newReports.length,
      fixed: recentlyFixed.length,
      hotspots: newHotspots.length,
      hoursAgo: sinceData.hoursAgo,
    };
  }, [sinceData, reports]);

  if (!changes || dismissed) return null;

  const timeLabel =
    changes.hoursAgo < 24
      ? `${changes.hoursAgo}h`
      : `${Math.floor(changes.hoursAgo / 24)}d`;

  return (
    <div className="mb-4 animate-slide-up">
      <div className="relative px-4 py-3 rounded-2xl bg-gradient-to-r from-[var(--fc-orange)]/8 to-[var(--fc-orange)]/3 border border-[var(--fc-orange)]/15">
        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <p className="text-[11px] text-[var(--fc-orange)] font-bold uppercase tracking-wider mb-1.5">
          Since you left ({timeLabel} ago)
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          {changes.newReports > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">📸</span>
              <span className="text-[13px] text-white font-semibold">
                {changes.newReports}
              </span>
              <span className="text-[12px] text-[var(--fc-muted)]">
                new report{changes.newReports !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {changes.fixed > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">✅</span>
              <span className="text-[13px] text-[var(--fc-success)] font-semibold">
                {changes.fixed}
              </span>
              <span className="text-[12px] text-[var(--fc-muted)]">
                fixed
              </span>
            </div>
          )}
          {changes.hotspots > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">🔥</span>
              <span className="text-[13px] text-amber-400 font-semibold">
                {changes.hotspots}
              </span>
              <span className="text-[12px] text-[var(--fc-muted)]">
                new hotspot{changes.hotspots !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {nearbySpending && (
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">💰</span>
              <span className="text-[13px] text-[var(--fc-orange)] font-semibold">
                {formatMoney(nearbySpending.totalBudget)}
              </span>
              <span className="text-[12px] text-[var(--fc-muted)]">
                in {nearbySpending.count} projects near you
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
