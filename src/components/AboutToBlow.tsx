"use client";

import type { ScoredReport } from "@/lib/feed-engine";
import CoSignButton from "./CoSignButton";

interface AboutToBlowProps {
  reports: ScoredReport[];
}

/**
 * Inline alert cards for exposés gaining rapid momentum.
 * Rendered between feed cards when velocity is detected.
 */
export default function AboutToBlow({ reports }: AboutToBlowProps) {
  if (reports.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-4">
      {reports.slice(0, 2).map((r) => (
        <a
          key={r.id}
          href={`/expose/${r.id}`}
          className="block p-4 rounded-xl bg-red-500/[0.06] border border-red-500/20 hover:bg-red-500/[0.10] transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/25">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                About to blow
              </span>
            </span>
            {r.velocityLabel && (
              <span className="text-[11px] text-red-300 font-medium">
                {r.velocityLabel}
              </span>
            )}
          </div>
          <p className="text-[14px] text-white font-semibold leading-snug line-clamp-2 mb-2">
            {r.title}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--fc-muted)]">
              {r.neighborhood || "NYC"} · {r.daysOpen}d open
            </span>
            <CoSignButton
              reportId={r.id}
              initialCount={r.cosign_count || 0}
              compact
            />
          </div>
        </a>
      ))}
    </div>
  );
}
