"use client";

import { formatMoney, type TrackedProject } from "@/lib/capital-projects";

interface SpendingShareCardProps {
  project: TrackedProject;
}

export default function SpendingShareCard({ project }: SpendingShareCardProps) {
  const handleCopyLink = () => {
    const url = `https://fatcatsapp.com/spending/${encodeURIComponent(project.fms_id)}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const handleShareTwitter = () => {
    const text = `${formatMoney(project.original_budget)} → ${formatMoney(project.total_budget)} (+${project.budget_delta_pct}%). ${project.project_name}. The receipts → fatcatsapp.com/spending/${encodeURIComponent(project.fms_id)}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareNative = () => {
    const text = `I just found a ${formatMoney(project.total_budget)} project that was supposed to cost ${formatMoney(project.original_budget)}. That's +${project.budget_delta_pct}% over budget. Your taxes. Your receipts. 🐱 fatcatsapp.com/spending/${encodeURIComponent(project.fms_id)}`;
    if (navigator.share) {
      navigator.share({ title: project.project_name, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleCopyLink}
        className="w-full flex items-center gap-3 px-4 h-11 rounded-xl bg-white/[0.06] text-white text-[13px] font-medium border border-white/[0.08] hover:bg-white/[0.1] transition-all active:scale-[0.98]"
      >
        <span className="text-[16px]">🔗</span>
        Copy Link
      </button>
      <button
        onClick={handleShareTwitter}
        className="w-full flex items-center gap-3 px-4 h-11 rounded-xl bg-white/[0.06] text-white text-[13px] font-medium border border-white/[0.08] hover:bg-white/[0.1] transition-all active:scale-[0.98]"
      >
        <span className="text-[16px]">𝕏</span>
        Share to X / Twitter
      </button>
      <button
        onClick={handleShareNative}
        className="w-full flex items-center gap-3 px-4 h-11 rounded-xl bg-[var(--fc-orange)] text-white text-[13px] font-bold hover:bg-[var(--fc-orange-hover)] transition-all active:scale-[0.98]"
      >
        <span className="text-[16px]">📤</span>
        Share to Messages
      </button>
    </div>
  );
}
