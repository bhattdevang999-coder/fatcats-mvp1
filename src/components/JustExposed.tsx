"use client";

import type { ScoredReport } from "@/lib/feed-engine";
import { filterCost } from "@/lib/voice-filter";
import { estimateRepairCost } from "@/lib/geo-intelligence";
import CoSignButton from "./CoSignButton";

interface JustExposedProps {
  reports: ScoredReport[];
}

export default function JustExposed({ reports }: JustExposedProps) {
  if (reports.length === 0) return null;

  return (
    <div className="mb-4 -mx-4">
      <div className="flex items-center gap-2 px-4 mb-2.5">
        <span className="text-[14px]">📡</span>
        <h2 className="text-[13px] font-bold text-white uppercase tracking-wider">
          Just Dropped
        </h2>
        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 ml-1">
          {reports.length} new
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {reports.map((r) => {
          const cost = estimateRepairCost(r.category);
          const cosigns = r.cosign_count || 0;
          return (
            <a
              key={r.id}
              href={`/expose/${r.id}`}
              className="shrink-0 w-[240px] p-3.5 rounded-xl bg-white/[0.04] border border-emerald-500/10 hover:bg-white/[0.08] hover:border-[var(--fc-orange)]/30 transition-all active:scale-[0.97] group"
            >
              {/* Lead: cost + time */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-[var(--fc-orange)]">
                  💰 {filterCost(cost.range, cost.avg)}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                  NEW
                </span>
              </div>
              {/* Title */}
              <p className="text-[12px] text-white font-semibold leading-snug line-clamp-2 group-hover:text-[var(--fc-orange)] transition-colors mb-2">
                {r.title}
              </p>
              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--fc-muted)]">
                  {r.neighborhood || "NYC"}
                </span>
                {cosigns === 0 ? (
                  <span className="text-[10px] font-bold text-[var(--fc-orange)]/70">
                    🐾 Be first
                  </span>
                ) : (
                  <CoSignButton
                    reportId={r.id}
                    initialCount={cosigns}
                    compact
                  />
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
