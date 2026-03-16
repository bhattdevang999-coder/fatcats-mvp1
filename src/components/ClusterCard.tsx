"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Report } from "@/lib/types";
import type { ReportCluster } from "@/lib/feed-clustering";
import { getSeverityConfig } from "@/lib/feed-clustering";
import { getPipelineIndex, getAgencyHandle } from "@/lib/types";
import { estimateRepairCost } from "@/lib/geo-intelligence";
import StatusPill from "./StatusPill";

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

function getClusterMapUrl(lat: number, lng: number, w = 400, h = 140): string {
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+E8652B(${lng},${lat})/${lng},${lat},15,0/${w}x${h}@2x?access_token=${MAPBOX_TOKEN}`;
}

// ── Mini report row for expanded view ──────────────────────────────────

function MiniReportRow({ report }: { report: Report }) {
  const pIdx = getPipelineIndex(report.status);
  return (
    <Link href={`/expose/${report.id}`} className="block">
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all">
        {report.photo_url ? (
          <img src={report.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-white font-medium leading-tight line-clamp-1">{report.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--fc-muted)]">
            <span>{timeAgo(report.created_at)}</span>
            <span className="opacity-40">·</span>
            <span>{report.supporters_count} affected</span>
            {pIdx >= 3 && (
              <>
                <span className="opacity-40">·</span>
                <span className="text-emerald-400">Resolved</span>
              </>
            )}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}

// ── Severity Progress Ring ─────────────────────────────────────────────

function SeverityRing({ count, max = 15 }: { count: number; max?: number }) {
  const pct = Math.min(count / max, 1);
  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference * (1 - pct);
  const color =
    count >= 10
      ? "#EF4444"
      : count >= 6
      ? "#E8652B"
      : count >= 3
      ? "#F59E0B"
      : "#6B7280";

  return (
    <svg width="48" height="48" className="shrink-0">
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="3"
      />
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        className="transition-all duration-700"
      />
      <text
        x="24"
        y="27"
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontWeight="800"
        fontFamily="system-ui"
      >
        {count}
      </text>
    </svg>
  );
}

// ── X/Twitter icon ────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function ClusterCard({
  cluster,
  index = 0,
}: {
  cluster: ReportCluster;
  index?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const sevCfg = getSeverityConfig(cluster.severity);
  const costData = estimateRepairCost(cluster.category);
  const combinedCost = costData.avg
    ? `$${(costData.avg * cluster.reportCount).toLocaleString()}`
    : null;

  // Aggregate statuses
  const openCount = cluster.reports.filter(
    (r) => getPipelineIndex(r.status) < 3
  ).length;
  const resolvedCount = cluster.reports.filter(
    (r) => getPipelineIndex(r.status) >= 3
  ).length;

  const handlePostX = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const agencyHandle = getAgencyHandle(cluster.category);
      const text = `🚨 ${cluster.reportCount} ${cluster.category.replace("_", " ")} reports near ${cluster.neighborhood || "this area"} — ${cluster.daysActive} days and counting.\n\n${cluster.totalSupporters} people affected. Est. repair: ${combinedCost || "TBD"}\n\n${agencyHandle} this is a ${sevCfg.label.toLowerCase()} zone.\n\n#FatCatsNYC #PointExposeFix`;
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer"
      );
    },
    [cluster, combinedCost, sevCfg.label]
  );

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const text = `${cluster.reportCount} ${cluster.category.replace("_", " ")} reports near ${cluster.neighborhood || "NYC"} — tracked by FatCats`;
      if (navigator.share) {
        navigator.share({ title: "FatCats Cluster", text }).catch(() => {});
      } else {
        navigator.clipboard.writeText(text);
      }
    },
    [cluster]
  );

  // Show top 5 reports in expanded view
  const previewReports = cluster.reports
    .sort((a, b) => b.supporters_count - a.supporters_count)
    .slice(0, 5);

  return (
    <div
      className={`glass-card overflow-hidden animate-card-entrance ${
        sevCfg.pulse ? "ring-1 ring-red-500/30 animate-pulse-subtle" : ""
      }`}
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      {/* Severity header bar */}
      <div
        className={`flex items-center gap-2 px-3.5 py-2 ${sevCfg.bg} border-b ${sevCfg.border}`}
      >
        <span className="text-[14px]">{sevCfg.icon}</span>
        <span className={`text-[11px] font-bold ${sevCfg.color} uppercase tracking-wider`}>
          {sevCfg.label}
        </span>
        <span className={`text-[10px] ${sevCfg.color} opacity-70`}>
          · {cluster.reportCount} reports clustered
        </span>
        <span className="ml-auto text-[10px] text-[var(--fc-muted)]">
          {timeAgo(cluster.newestReport)}
        </span>
      </div>

      {/* Map preview */}
      {cluster.centroidLat !== 0 && cluster.centroidLng !== 0 && (
        <div className="w-full h-[120px] bg-[var(--fc-surface-2)] relative overflow-hidden">
          <img
            src={getClusterMapUrl(cluster.centroidLat, cluster.centroidLng)}
            alt=""
            className="w-full h-full object-cover opacity-80"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--fc-surface)]/80 via-transparent to-transparent" />

          {/* Cluster count overlay */}
          <div className="absolute bottom-3 right-3">
            <SeverityRing count={cluster.reportCount} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-3.5 pt-3 pb-2">
        <h3 className="text-[15px] font-bold text-white leading-tight">
          {cluster.title}
        </h3>

        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--fc-muted)]">
          {cluster.neighborhood && (
            <span className="truncate max-w-[160px]">
              {cluster.neighborhood}
            </span>
          )}
          <span className="opacity-40">·</span>
          <span>Active {cluster.daysActive}d</span>
          <span className="opacity-40">·</span>
          <span>{cluster.totalSupporters} affected</span>
        </div>

        {/* Intel badges */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {/* Open vs Resolved */}
          {openCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[var(--fc-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {openCount} open
            </span>
          )}
          {resolvedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {resolvedCount} resolved
            </span>
          )}

          {/* Estimated cost */}
          {combinedCost && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[var(--fc-muted)]">
              💰 Est. {combinedCost}
              <span
                className="beta-badge ml-0.5"
                style={{ fontSize: "7px", padding: "1px 3px" }}
              >
                Beta
              </span>
            </span>
          )}
        </div>

        {/* Lead report preview */}
        <div className="mt-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-1">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E8652B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[9px] text-[var(--fc-orange)] font-bold uppercase tracking-wider">
              Top Report
            </span>
          </div>
          <p className="text-[12px] text-white font-medium leading-snug line-clamp-2">
            {cluster.leadReport.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[var(--fc-muted)]">
            <StatusPill status={cluster.leadReport.status} />
            <span>· {cluster.leadReport.supporters_count} affected</span>
          </div>
        </div>
      </div>

      {/* Expandable report list */}
      {cluster.reportCount > 1 && (
        <div className="px-3.5 pb-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1.5 w-full py-2 text-[11px] font-semibold text-[var(--fc-muted)] hover:text-white transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {expanded
              ? "Hide reports"
              : `View all ${cluster.reportCount} reports`}
          </button>

          {expanded && (
            <div className="space-y-1.5 pb-1 animate-fade-in">
              {previewReports.map((r) => (
                <MiniReportRow key={r.id} report={r} />
              ))}
              {cluster.reportCount > 5 && (
                <p className="text-center text-[10px] text-[var(--fc-muted)] py-1.5">
                  +{cluster.reportCount - 5} more reports in this area
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-white/[0.04]">
        {/* Aggregate paw count */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-[var(--fc-orange)]/10 text-[var(--fc-orange)] border border-[var(--fc-orange)]/20">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="#E8652B"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="12" cy="17" rx="5" ry="4" />
            <circle cx="6.5" cy="10" r="2.5" />
            <circle cx="17.5" cy="10" r="2.5" />
            <circle cx="9" cy="6" r="2" />
            <circle cx="15" cy="6" r="2" />
          </svg>
          <span>{cluster.totalSupporters}</span>
          <span className="text-[9px] text-[var(--fc-muted)] font-normal ml-0.5">
            affected
          </span>
        </div>

        {/* Post on X */}
        <button
          onClick={handlePostX}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] text-white/60 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
          title="Post cluster on X"
        >
          <XIcon />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-[var(--fc-orange)] hover:bg-[var(--fc-orange)]/10 transition-all active:scale-95 ml-auto"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
