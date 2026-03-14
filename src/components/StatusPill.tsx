import { getPipelineIndex, getStatusLabel } from "@/lib/types";

interface StatusPillProps {
  status: string;
  source?: string;
  compact?: boolean;
}

const STAGE_COLORS: Record<number, { bg: string; text: string; border: string; dot: string }> = {
  0: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400" },
  1: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-400" },
  2: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/20", dot: "bg-purple-400" },
  3: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/20", dot: "bg-green-400" },
  4: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-400/20", dot: "bg-emerald-300" },
};

export default function StatusPill({ status }: StatusPillProps) {
  const idx = getPipelineIndex(status);
  const label = getStatusLabel(status);
  const colors = STAGE_COLORS[idx] || STAGE_COLORS[0];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
}

// Mini pipeline step indicator for report cards
export function PipelineSteps({ status }: { status: string }) {
  const currentIdx = getPipelineIndex(status);
  const labels = ["Open", "Assigned", "In Progress", "Resolved", "Verified"];

  return (
    <div className="flex items-center gap-0.5 w-full">
      {labels.map((label, i) => {
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={label} className="flex items-center flex-1">
            {/* Step dot/bar */}
            <div className="flex-1 relative">
              <div
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  isCompleted
                    ? i === 4
                      ? "bg-emerald-400"
                      : i === 3
                      ? "bg-green-400"
                      : "bg-[var(--fc-orange)]"
                    : "bg-white/[0.08]"
                }`}
              />
              {isCurrent && (
                <div
                  className={`absolute -top-[3px] right-0 w-[9px] h-[9px] rounded-full border-2 border-[var(--fc-bg)] ${
                    i === 4
                      ? "bg-emerald-400"
                      : i === 3
                      ? "bg-green-400"
                      : "bg-[var(--fc-orange)]"
                  }`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
