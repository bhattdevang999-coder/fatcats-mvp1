"use client";

import Link from "next/link";
import type { BlockIntel, DeduplicatedReport } from "@/lib/feed-intelligence";
import { categoryLabel, getSeverity, getSeverityConfig } from "@/lib/feed-intelligence";
import { getPipelineIndex } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function getBlockMapUrl(lat: number, lng: number, w = 400, h = 140): string {
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+E8652B(${lng},${lat})/${lng},${lat},15.5,0/${w}x${h}@2x?access_token=${MAPBOX_TOKEN}`;
}

function MiniIssue({ issue }: { issue: DeduplicatedReport }) {
  const pIdx = getPipelineIndex(issue.lead.status);
  const isResolved = pIdx >= 3;

  return (
    <Link href={`/expose/${issue.lead.id}`} className="block">
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 text-[14px]">
          {issue.lead.category === "pothole" ? "🕳️" :
           issue.lead.category === "road_damage" ? "🛣️" :
           issue.lead.category === "traffic_signal" ? "🚦" :
           issue.lead.category === "street_light" ? "💡" :
           issue.lead.category === "sidewalk" ? "🚶" :
           issue.lead.category === "water" ? "💧" :
           issue.lead.category === "sewer" ? "🚰" : "📍"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-white font-medium leading-tight line-clamp-1">
            {issue.lead.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--fc-muted)]">
            {issue.confirmations > 1 && (
              <>
                <span className="text-amber-400 font-semibold">
                  {issue.confirmations}x confirmed
                </span>
                <span className="opacity-40">·</span>
              </>
            )}
            <span>{issue.totalSupporters} affected</span>
            {isResolved && (
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

export default function BlockIntelCard({ intel }: { intel: BlockIntel }) {
  const openIssues = intel.issues.filter(
    (d) => getPipelineIndex(d.lead.status) < 3
  ).length;
  const resolvedIssues = intel.issueCount - openIssues;

  // Overall severity based on number of issues
  const severity = getSeverity(intel.issueCount);
  const sevCfg = getSeverityConfig(severity);

  return (
    <div
      className={`glass-card overflow-hidden animate-card-entrance col-span-full ${
        sevCfg.pulse ? "ring-1 ring-red-500/30 animate-pulse-subtle" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[var(--fc-orange)]/10 to-transparent border-b border-[var(--fc-orange)]/15">
        <span className="text-[14px]">🏘️</span>
        <span className="text-[11px] font-bold text-[var(--fc-orange)] uppercase tracking-wider">
          Your Block Intel
        </span>
        {intel.neighborhood && (
          <span className="text-[10px] text-[var(--fc-muted)]">
            · {intel.neighborhood}
          </span>
        )}
      </div>

      {/* Map */}
      {intel.centroidLat !== 0 && intel.centroidLng !== 0 && MAPBOX_TOKEN && (
        <div className="w-full h-[100px] bg-[var(--fc-surface-2)] relative overflow-hidden">
          <img
            src={getBlockMapUrl(intel.centroidLat, intel.centroidLng)}
            alt=""
            className="w-full h-full object-cover opacity-70"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--fc-surface)]/90 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-2">
            <span className="text-[22px] font-bold text-white leading-none">
              {intel.issueCount}
            </span>
            <span className="text-[11px] text-white/70">
              active issue{intel.issueCount !== 1 ? "s" : ""} on your block
            </span>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {intel.categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[var(--fc-muted)]"
            >
              {categoryLabel(cat)}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[var(--fc-muted)]">
            👥 {intel.totalReporters} reporter{intel.totalReporters !== 1 ? "s" : ""}
          </span>
          {openIssues > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/15 text-[10px] text-amber-400">
              {openIssues} open
            </span>
          )}
          {resolvedIssues > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/15 text-[10px] text-emerald-400">
              {resolvedIssues} resolved
            </span>
          )}
        </div>

        {/* Issue list */}
        <div className="space-y-1.5">
          {intel.issues.slice(0, 6).map((issue) => (
            <MiniIssue key={issue.lead.id} issue={issue} />
          ))}
          {intel.issues.length > 6 && (
            <p className="text-center text-[10px] text-[var(--fc-muted)] py-1.5">
              +{intel.issues.length - 6} more issues on your block
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
