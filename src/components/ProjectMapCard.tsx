"use client";

import Link from "next/link";
import { formatMoney, type TrackedProject } from "@/lib/capital-projects";

interface ProjectMapCardProps {
  project: TrackedProject;
  onClose: () => void;
}

export default function ProjectMapCard({ project, onClose }: ProjectMapCardProps) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="fixed bottom-[var(--bottom-bar-height)] left-0 right-0 z-30 animate-slide-up">
        <div className="max-w-lg mx-auto mx-3 mb-3">
          <div className="glass-card p-4 border border-white/10 shadow-2xl">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
            {/* TABLOID RULE: 3 lines */}
            {/* LINE 1: The shock */}
            <p className="text-[16px] font-bold text-white">
              {formatMoney(project.original_budget)} → {formatMoney(project.total_budget)}
            </p>
            {/* LINE 2: The context */}
            <p className="text-[12px] text-[var(--fc-muted)] mt-1 truncate">
              {project.project_name.length > 30 ? project.project_name.slice(0, 30) + "..." : project.project_name}. {project.borough}. +{project.budget_delta_pct.toLocaleString()}%.
            </p>
            {/* LINE 3: The hook */}
            <Link
              href={`/spending/${encodeURIComponent(project.fms_id)}`}
              className="text-[12px] text-[var(--fc-orange)] font-semibold mt-2 inline-block hover:underline"
            >
              The receipts →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
