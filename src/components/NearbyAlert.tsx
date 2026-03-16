"use client";

import { type NearbyAlert } from "@/lib/feed-clustering";
import { getSeverityConfig } from "@/lib/feed-clustering";

export default function NearbyAlertBanner({
  alerts,
  onDismiss,
}: {
  alerts: NearbyAlert[];
  onDismiss?: () => void;
}) {
  if (alerts.length === 0) return null;

  const topAlert = alerts[0]; // closest cluster
  const sevCfg = getSeverityConfig(topAlert.cluster.severity);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl mb-4 ${sevCfg.bg} border ${sevCfg.border} animate-fade-in-up`}
    >
      {/* Pulsing background for emergency */}
      {sevCfg.pulse && (
        <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
      )}

      <div className="relative px-4 py-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{sevCfg.icon}</span>
            <span
              className={`text-[11px] font-bold ${sevCfg.color} uppercase tracking-wider`}
            >
              Nearby Alert
            </span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[var(--fc-muted)] hover:text-white transition-colors p-1"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Alert message */}
        <p className="text-[13px] text-white font-semibold leading-snug">
          {topAlert.message}
        </p>

        {/* Additional context */}
        <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--fc-muted)]">
          <span>
            {topAlert.cluster.totalSupporters} people affected
          </span>
          <span className="opacity-40">·</span>
          <span>Active {topAlert.cluster.daysActive}d</span>
          {topAlert.cluster.neighborhood && (
            <>
              <span className="opacity-40">·</span>
              <span>{topAlert.cluster.neighborhood}</span>
            </>
          )}
        </div>

        {/* Multiple alerts indicator */}
        {alerts.length > 1 && (
          <p className="text-[10px] text-[var(--fc-muted)] mt-1.5">
            +{alerts.length - 1} more alert{alerts.length > 2 ? "s" : ""}{" "}
            nearby
          </p>
        )}
      </div>
    </div>
  );
}
