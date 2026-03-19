"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/capital-projects";

interface MoneyPillProps {
  projectName: string;
  originalBudget: number;
  currentBudget: number;
  deltaPct: number;
  projectId: string;
}

export default function MoneyPill({
  projectName,
  originalBudget,
  currentBudget,
  // deltaPct kept in interface for backward compat
  projectId,
}: MoneyPillProps) {
  const overrun = currentBudget - originalBudget;
  const overrunStr = formatMoney(overrun);

  return (
    <Link
      href={`/spending/${encodeURIComponent(projectId)}`}
      className="block mt-3 px-3 py-3 rounded-xl bg-[rgba(255,107,53,0.08)] border border-[var(--fc-orange)]/20 hover:bg-[var(--fc-orange)]/10 transition-all active:scale-[0.98] group"
    >
      {/* LINE 1: The shock — real dollars, not percentages */}
      <p className="text-[15px] font-bold text-white leading-tight">
        💰 {formatMoney(currentBudget)} project — {overrunStr} over budget
      </p>
      {/* LINE 2: The context */}
      <p className="text-[12px] text-[var(--fc-muted)] mt-0.5 truncate">
        {projectName.length > 45 ? projectName.slice(0, 45) + "..." : projectName}. Was {formatMoney(originalBudget)}.
      </p>
      {/* LINE 3: The hook */}
      <p className="text-[12px] text-[var(--fc-orange)] font-semibold mt-1 group-hover:underline">
        Where&apos;s this money going? →
      </p>
    </Link>
  );
}
