"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import AppShell from "@/components/AppShell";
import { IntelLogo, IntelHeader } from "@/components/FatCatsIntel";
import FollowButton from "@/components/FollowButton";
import { ReactionBar, CommentSection, CommunityStatusVote, CommentCountBadge } from "@/components/CommunityEngagement";
import {
  getProjectByFmsId,
  formatMoney,
  formatDays,
  phaseLabel,
  phaseColor,
  agencyName,
  type TrackedProject,
  type ProjectSnapshot,
} from "@/lib/capital-projects";

// ── Phase timeline config ──────────────────────────────────────────────

const PHASE_ORDER = ["Design", "Construction Procurement", "Construction", "Close-out", "(Completed)"];

function phaseIndex(phase: string): number {
  const i = PHASE_ORDER.findIndex(p => p === phase);
  return i >= 0 ? i : -1;
}

// ── SVG Icons ──────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatPeriod(rp: string): string {
  // "202509" → "Sep 2025"
  if (rp.length !== 6) return rp;
  const y = rp.slice(0, 4);
  const m = parseInt(rp.slice(4), 10);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1] || rp.slice(4)} ${y}`;
}

function computeScheduleLabel(project: TrackedProject): { text: string; color: string } {
  if (project.current_phase === "(Completed)" || project.current_phase === "Close-out") {
    return { text: "Completed", color: "text-green-400" };
  }
  if (project.is_overdue && project.days_overdue > 0) {
    return { text: `${formatDays(project.days_overdue)} overdue`, color: "text-red-400" };
  }
  if (project.schedule_slip_days > 90) {
    return { text: `Slipped ${formatDays(project.schedule_slip_days)}`, color: "text-amber-400" };
  }
  return { text: "On track", color: "text-green-400" };
}

// ── Budget Timeline ────────────────────────────────────────────────────

function BudgetTimeline({ snapshots }: { snapshots: ProjectSnapshot[] }) {
  // Show most recent first
  const sorted = [...snapshots].sort((a, b) =>
    b.reporting_period.localeCompare(a.reporting_period)
  );

  return (
    <div className="relative">
      {sorted.map((snap, i) => {
        const prev = sorted[i + 1]; // previous chronologically (next in reversed array)
        const delta = prev ? snap.total_budget - prev.total_budget : 0;
        const isIncrease = delta > 0;
        const isFirst = i === sorted.length - 1; // earliest snapshot

        return (
          <div key={snap.reporting_period} className="flex gap-3 relative">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center shrink-0 w-4">
              <div
                className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                  i === 0
                    ? "bg-[var(--fc-orange)] border-[var(--fc-orange)]"
                    : "bg-[var(--fc-surface-2)] border-[var(--fc-muted)]/30"
                }`}
              />
              {i < sorted.length - 1 && (
                <div className="w-px flex-1 bg-white/10 min-h-[40px]" />
              )}
            </div>

            {/* Content */}
            <div className="pb-5 flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] text-[var(--fc-muted)]">
                  {formatPeriod(snap.reporting_period)}
                  {i === 0 && (
                    <span className="ml-1.5 text-[9px] font-bold text-[var(--fc-orange)] uppercase">Latest</span>
                  )}
                  {isFirst && (
                    <span className="ml-1.5 text-[9px] font-bold text-[var(--fc-muted)] uppercase">Original</span>
                  )}
                </span>
                <span className="text-[13px] font-bold text-white shrink-0">
                  {formatMoney(snap.total_budget)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {delta !== 0 && (
                  <span className={`text-[10px] font-semibold ${
                    isIncrease ? "text-red-400" : "text-green-400"
                  }`}>
                    {isIncrease ? "+" : ""}{formatMoney(delta)}
                  </span>
                )}
                {snap.spend_to_date > 0 && (
                  <span className="text-[10px] text-[var(--fc-muted)]">
                    Spent: {formatMoney(snap.spend_to_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Phase Progress ─────────────────────────────────────────────────────

function PhaseProgress({ currentPhase }: { currentPhase: string }) {
  const currentIdx = phaseIndex(currentPhase);

  return (
    <div className="flex items-center gap-0">
      {PHASE_ORDER.map((phase, i) => {
        const isComplete = currentIdx > i;
        const isCurrent = currentIdx === i;
        const label = phaseLabel(phase);

        return (
          <div key={phase} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                  isComplete
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-[var(--fc-orange)] text-white ring-2 ring-[var(--fc-orange)]/30"
                    : "bg-[var(--fc-surface-2)] text-[var(--fc-muted)] border border-white/10"
                }`}
              >
                {isComplete ? "✓" : i + 1}
              </div>
              <span className={`text-[8px] text-center leading-tight truncate w-full ${
                isCurrent ? "text-[var(--fc-orange)] font-bold" : isComplete ? "text-green-400/70" : "text-[var(--fc-muted)]"
              }`}>
                {label}
              </span>
            </div>

            {/* Connector */}
            {i < PHASE_ORDER.length - 1 && (
              <div className={`h-0.5 flex-1 min-w-1 mt-[-18px] ${
                isComplete ? "bg-green-500/50" : "bg-white/10"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Loading State ──────────────────────────────────────────────────────

function DetailLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="intel-glow">
        <Image src="/assets/logo-64.png" alt="Loading" width={48} height={48} className="opacity-60" />
      </div>
      <p className="text-[12px] text-[var(--fc-muted)]">Loading project data...</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fmsId = typeof params.id === "string" ? decodeURIComponent(params.id) : "";

  const [project, setProject] = useState<TrackedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!fmsId) return;
    async function load() {
      try {
        setLoading(true);
        const p = await getProjectByFmsId(fmsId);
        if (!p) {
          setError("Project not found.");
        } else {
          setProject(p);
        }
      } catch {
        setError("Failed to load project data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fmsId]);

  const handleShare = () => {
    if (!project) return;
    const delta = project.budget_delta > 0 ? `+${formatMoney(project.budget_delta)}` : formatMoney(project.budget_delta);
    const text = `NYC project "${project.project_name}" in ${project.borough}: ${formatMoney(project.total_budget)} budget, currently ${phaseLabel(project.current_phase)}. Budget changed ${delta} since tracking started. via @FatCatsApp #FatCatsNYC #PointExposeFix`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: project.project_name, text }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const scheduleStatus = project ? computeScheduleLabel(project) : null;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Back button ────────────────────────────────────────── */}
        <button
          onClick={() => router.push("/spending")}
          className="flex items-center gap-1.5 text-[var(--fc-muted)] text-[13px] font-medium hover:text-white transition-colors -ml-1"
        >
          <ArrowLeftIcon />
          Back to tracker
        </button>

        {loading ? (
          <DetailLoading />
        ) : error || !project ? (
          <div className="glass-card p-10 text-center animate-fade-in">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-white font-semibold text-[14px] mb-1">{error || "Not found"}</p>
            <p className="text-[var(--fc-muted)] text-[12px] mb-4">This project may not exist or data is unavailable.</p>
            <button
              onClick={() => router.push("/spending")}
              className="px-4 py-2 rounded-xl bg-[var(--fc-orange)] text-white text-[13px] font-semibold"
            >
              Back to tracker
            </button>
          </div>
        ) : (
          <>
            {/* ── Phase Banner ────────────────────────────────────── */}
            <div className={`w-full rounded-xl px-4 py-2.5 flex items-center justify-between border ${phaseColor(project.current_phase)} animate-fade-in-up`}>
              <span className="text-[12px] font-bold uppercase tracking-wider">
                {phaseLabel(project.current_phase)}
              </span>
              {project.is_over_budget && (
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  Over Budget
                </span>
              )}
            </div>

            {/* ── Project Header ──────────────────────────────────── */}
            <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
              <h1 className="text-2xl font-black text-white leading-tight mb-2">
                {project.project_name}
              </h1>
              {project.project_description && (
                <p className="text-[13px] text-[var(--fc-muted)] leading-relaxed mb-3">
                  {project.project_description}
                </p>
              )}
              {/* Metadata row */}
              <div className="flex flex-wrap gap-2">
                {project.managing_agency && (
                  <span className="text-[10px] font-semibold text-[var(--fc-info)] bg-[var(--fc-info)]/10 px-2.5 py-1 rounded-lg border border-[var(--fc-info)]/20">
                    {project.managing_agency} · {agencyName(project.managing_agency)}
                  </span>
                )}
                <span className="text-[10px] font-bold text-[var(--fc-orange)] bg-[var(--fc-orange)]/10 px-2.5 py-1 rounded-lg">
                  {project.borough}
                </span>
                {project.community_board && (
                  <span className="text-[10px] text-[var(--fc-muted)] bg-white/5 px-2.5 py-1 rounded-lg">
                    CB {project.community_board}
                  </span>
                )}
              </div>

              {/* Activity indicators */}
              <div className="flex items-center gap-3 mt-2">
                <CommentCountBadge itemId={`project_${project.fms_id}`} />
              </div>

              {/* Action row: Follow + Share */}
              <div className="flex items-center gap-2 mt-3">
                <FollowButton kind="project" id={project.fms_id} variant="prominent" />
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 h-11 rounded-xl font-bold text-[13px] bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.12] transition-all active:scale-95"
                >
                  <ShareIcon />
                  <span>{copied ? "Copied!" : "Share"}</span>
                </button>
              </div>
            </div>

            {/* ── At-a-Glance Stats (2x2) ────────────────────────── */}
            <div className="grid grid-cols-2 gap-2.5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              {/* Total Budget */}
              <div className="glass-card p-3.5">
                <p className="text-[10px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider mb-1">Total Budget</p>
                <p className="text-lg font-black text-white">{formatMoney(project.total_budget)}</p>
              </div>

              {/* Spent to Date */}
              <div className="glass-card p-3.5">
                <p className="text-[10px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider mb-1">Spent to Date</p>
                <p className="text-lg font-black text-[var(--fc-orange)]">{formatMoney(project.spend_to_date)}</p>
                <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[var(--fc-orange)] rounded-full"
                    style={{ width: `${Math.min(project.spend_pct, 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-[var(--fc-muted)] mt-0.5">{project.spend_pct.toFixed(0)}%</p>
              </div>

              {/* Budget Change */}
              <div className="glass-card p-3.5">
                <p className="text-[10px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider mb-1">Budget Change</p>
                <p className={`text-lg font-black ${
                  project.budget_delta > 0 ? "text-red-400" : project.budget_delta < 0 ? "text-green-400" : "text-white"
                }`}>
                  {project.budget_delta > 0 ? "+" : ""}{formatMoney(project.budget_delta)}
                </p>
                {project.budget_delta_pct !== 0 && (
                  <p className={`text-[10px] ${project.budget_delta > 0 ? "text-red-400/70" : "text-green-400/70"}`}>
                    {project.budget_delta > 0 ? "+" : ""}{project.budget_delta_pct}% from original
                  </p>
                )}
              </div>

              {/* Schedule */}
              <div className="glass-card p-3.5">
                <p className="text-[10px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider mb-1">Schedule</p>
                <p className={`text-lg font-black ${scheduleStatus?.color}`}>{scheduleStatus?.text}</p>
                {project.forecast_completion && (
                  <p className="text-[10px] text-[var(--fc-muted)]">
                    Forecast: {project.forecast_completion}
                  </p>
                )}
              </div>
            </div>

            {/* ── Phase Progress ──────────────────────────────────── */}
            <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              <h3 className="text-[12px] font-semibold text-[var(--fc-muted)] uppercase tracking-wider mb-4">Phase Progress</h3>
              <PhaseProgress currentPhase={project.current_phase} />
              {project.actual_construction_start && (
                <p className="text-[10px] text-[var(--fc-muted)] mt-3 pt-2 border-t border-white/[0.04]">
                  Construction started: {project.actual_construction_start}
                  {project.actual_construction_end && ` · Ended: ${project.actual_construction_end}`}
                </p>
              )}
            </div>

            {/* ── Budget History Timeline ─────────────────────────── */}
            {project.snapshots.length > 1 && (
              <div className="glass-card-elevated p-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <IntelHeader title="Budget History" showBeta />
                <div className="mt-4">
                  <BudgetTimeline snapshots={project.snapshots} />
                </div>
              </div>
            )}

            {/* ── Who's Managing This ────────────────────────────── */}
            <div className="glass-card-elevated p-4 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <div className="flex items-center gap-2 mb-3">
                <IntelLogo size={20} />
                <h3 className="text-sm font-semibold text-white">Who&apos;s Managing This</h3>
              </div>
              <div className="space-y-2.5">
                {project.managing_agency && (
                  <div>
                    <p className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">Managing Agency</p>
                    <p className="text-[13px] text-white font-medium">{agencyName(project.managing_agency)}</p>
                  </div>
                )}
                {project.sponsor_agency && (
                  <div>
                    <p className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">Sponsor Agency</p>
                    <p className="text-[13px] text-white font-medium">{agencyName(project.sponsor_agency)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">FMS ID</p>
                  <p className="text-[13px] text-[var(--fc-muted)] font-mono">{project.fms_id}</p>
                </div>
              </div>
            </div>

            {/* ── Intelligence Summary ───────────────────────────── */}
            <div className="glass-card-elevated p-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <IntelHeader title="Intelligence Summary" showBeta />
              <div className="mt-3 space-y-3">
                {/* Budget assessment */}
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    project.is_over_budget ? "bg-red-400" : "bg-green-400"
                  }`} />
                  <p className="text-[12px] text-[var(--fc-text)] leading-relaxed">
                    {project.is_over_budget
                      ? `This project is over budget by ${formatMoney(Math.abs(project.budget_delta))} (+${project.budget_delta_pct}%). The budget has increased ${project.snapshots.length > 1 ? `across ${project.snapshots.length} reporting periods` : "since initial tracking"}.`
                      : project.budget_delta < 0
                      ? `This project is under its original budget by ${formatMoney(Math.abs(project.budget_delta))}. Good fiscal management.`
                      : "This project's budget is within normal variance of the original estimate."
                    }
                  </p>
                </div>

                {/* Schedule assessment */}
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    project.is_behind_schedule ? "bg-amber-400" : "bg-green-400"
                  }`} />
                  <p className="text-[12px] text-[var(--fc-text)] leading-relaxed">
                    {project.is_overdue && project.days_overdue > 0
                      ? `This project is ${formatDays(project.days_overdue)} past its forecasted completion date.`
                      : project.schedule_slip_days > 90
                      ? `The completion forecast has slipped ${formatDays(project.schedule_slip_days)} from the original date.`
                      : "This project appears to be on schedule based on current forecasts."
                    }
                  </p>
                </div>

                {/* Source */}
                <p className="text-[10px] text-[var(--fc-muted)] pt-2 border-t border-white/[0.04]">
                  Data from NYC Capital Projects Dashboard. Updated 3×/year.
                </p>
              </div>
            </div>

            {/* ── Bottom Note ─────────────────────────────────────── */}
            {/* Community Status Vote */}
            <div className="animate-fade-in-up" style={{ animationDelay: "350ms" }}>
              <CommunityStatusVote
                itemId={`project_${project.fms_id}`}
                label={project.current_phase === "(Completed)" || project.current_phase === "Close-out"
                  ? "Is this project actually completed?"
                  : "Does this project look on track to you?"
                }
              />
            </div>

            {/* Reactions */}
            <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "375ms" }}>
              <ReactionBar itemId={`project_${project.fms_id}`} />
            </div>

            {/* Comments */}
            <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
              <CommentSection itemId={`project_${project.fms_id}`} maxVisible={3} />
            </div>

            <div className="pt-2 pb-2 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5">
                <IntelLogo size={14} />
                <p className="text-[10px] text-[var(--fc-muted)]">Powered by FatCats Intel</p>
                <span className="beta-badge animate-beta-pulse">Beta</span>
              </div>
              <p className="text-[9px] text-[var(--fc-muted)]/60 max-w-xs mx-auto leading-relaxed">
                Data sourced from{" "}
                <a
                  href="https://data.cityofnewyork.us/City-Government/Capital-Projects-Dashboard-Citywide-Budget-and-Sch/fb86-vt7u"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white transition-colors"
                >
                  NYC Open Data — Capital Projects Dashboard (fb86-vt7u)
                </a>
                . FatCats Intel computes budget changes and schedule flags automatically.
              </p>
            </div>

            {/* Spacer for sticky bar */}
            <div className="h-16" />
          </>
        )}
      </div>

      {/* Sticky bottom bar */}
      {project && (
        <div className="fixed bottom-[var(--bottom-bar-height)] left-0 right-0 z-40 px-4 pb-3 pt-2 bg-gradient-to-t from-[var(--fc-bg)] via-[var(--fc-bg)]/95 to-transparent">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <FollowButton kind="project" id={project.fms_id} variant="prominent" />
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[14px] transition-all active:scale-[0.97]"
            >
              <ShareIcon />
              <span>{copied ? "Copied!" : "Share"}</span>
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
