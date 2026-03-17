"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/AppShell";
import { IntelLogo, FatCatsIntelBadge } from "@/components/FatCatsIntel";
import FollowButton from "@/components/FollowButton";
import { ReactionBar, CommentCountBadge } from "@/components/CommunityEngagement";
import {
  fetchTrackedProjects,
  getContractStats,
  formatMoney,
  formatDays,
  phaseLabel,
  phaseColor,
  generateExposeSummary,
  type TrackedProject,
  type ProjectFilter,
} from "@/lib/capital-projects";
import { getUserStats, getCurrentRank, RANK_CONFIG } from "@/lib/gamification";

// ── Filter config ──────────────────────────────────────────────────────

const FILTER_TABS: { key: ProjectFilter; label: string; icon: string }[] = [
  { key: "budget_blowups", label: "Budget Blowups", icon: "🔥" },
  { key: "all", label: "All", icon: "" },
  { key: "over_budget", label: "Over Budget", icon: "🔴" },
  { key: "behind_schedule", label: "Behind Schedule", icon: "⏳" },
  { key: "construction", label: "Construction", icon: "🚧" },
  { key: "completed", label: "Completed", icon: "✅" },
  { key: "stalled", label: "Stalled", icon: "⏸" },
];

const BOROUGHS = ["All", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "Citywide"];

// ── SVG Icons ──────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Mini Sparkline ─────────────────────────────────────────────────────

function BudgetSparkline({ snapshots }: { snapshots: { total_budget: number }[] }) {
  if (snapshots.length < 2) return null;

  const budgets = snapshots.map(s => s.total_budget);
  const min = Math.min(...budgets);
  const max = Math.max(...budgets);
  const range = max - min || 1;

  const w = 80;
  const h = 24;
  const pad = 2;

  const points = budgets.map((b, i) => {
    const x = pad + (i / (budgets.length - 1)) * (w - pad * 2);
    const y = h - pad - ((b - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const increased = budgets[budgets.length - 1] > budgets[0];
  const color = increased ? "#EF4444" : "#22C55E";

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {points.map((pt, i) => (
        <circle key={i} cx={pt.split(",")[0]} cy={pt.split(",")[1]} r="2" fill={color} opacity="0.9" />
      ))}
    </svg>
  );
}

// ── Project Card ───────────────────────────────────────────────────────

function ProjectCard({ project, index, isBlowupView }: { project: TrackedProject; index: number; isBlowupView?: boolean }) {
  const spendPct = project.total_budget > 0
    ? Math.min((project.spend_to_date / project.total_budget) * 100, 100)
    : 0;

  const handleShare = () => {
    const delta = project.budget_delta > 0 ? `+${formatMoney(project.budget_delta)}` : formatMoney(project.budget_delta);
    const text = `NYC project "${project.project_name}" in ${project.borough}: ${formatMoney(project.total_budget)} budget, currently ${phaseLabel(project.current_phase)}. Budget changed ${delta} since tracking started. via @FatCatsApp #FatCatsNYC #PointExposeFix`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Contract Tracker — FatCats", text }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div
      className="glass-card p-4 animate-card-entrance"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      {/* Scope Creep badge (blowup view only) */}
      {isBlowupView && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 uppercase tracking-wider">
            Scope Creep
          </span>
        </div>
      )}

      {/* Top row: Phase + Borough + Agency */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${phaseColor(project.current_phase)}`}>
          {phaseLabel(project.current_phase)}
        </span>
        <span className="text-[10px] font-bold text-[var(--fc-orange)] bg-[var(--fc-orange)]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
          {project.borough}
        </span>
        {project.managing_agency && (
          <span className="text-[10px] text-[var(--fc-muted)] ml-auto">{project.managing_agency}</span>
        )}
      </div>

      {/* Project name */}
      <h3 className="text-[14px] font-bold text-white leading-snug mb-1 line-clamp-2">
        {project.project_name}
      </h3>

      {/* Description */}
      {project.project_description && (
        <p className="text-[12px] text-[var(--fc-muted)] leading-relaxed mb-3 line-clamp-2">
          {project.project_description}
        </p>
      )}

      {/* Original → Current budget (blowup view only) */}
      {isBlowupView && (
        <div className="mb-3 p-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/10">
          <div className="flex items-center gap-2 text-[12px] mb-1.5">
            <span className="text-[var(--fc-muted)]">Original:</span>
            <span className="font-bold text-white">{formatMoney(project.original_budget)}</span>
            <span className="text-red-400">→</span>
            <span className="text-[var(--fc-muted)]">Current:</span>
            <span className="font-bold text-red-400">{formatMoney(project.total_budget)}</span>
          </div>
          <p className="text-[11px] text-[var(--fc-muted)] leading-relaxed italic">
            {generateExposeSummary(project)}
          </p>
        </div>
      )}

      {/* Budget bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-[var(--fc-muted)]">
            Spent: <span className="text-[var(--fc-orange)] font-semibold">{formatMoney(project.spend_to_date)}</span>
          </span>
          <span className="text-[var(--fc-muted)]">
            of <span className="text-white font-semibold">{formatMoney(project.total_budget)}</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${spendPct}%`,
              background: spendPct > 90 ? "var(--fc-alert)" : "var(--fc-orange)",
            }}
          />
        </div>
        <div className="text-right text-[10px] text-[var(--fc-muted)] mt-0.5">
          {spendPct.toFixed(0)}% spent
        </div>
      </div>

      {/* Intelligence badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {project.is_over_budget && (
          <span className={`inline-flex items-center gap-1 font-semibold px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 ${isBlowupView ? "text-[12px]" : "text-[10px]"}`}>
            ↑ {formatMoney(Math.abs(project.budget_delta))} over (+{project.budget_delta_pct}%)
          </span>
        )}
        {!project.is_over_budget && project.budget_delta < 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
            ↓ {formatMoney(Math.abs(project.budget_delta))} under
          </span>
        )}
        {project.is_behind_schedule && project.is_overdue && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ⏳ {formatDays(project.days_overdue)} overdue
          </span>
        )}
        {project.is_behind_schedule && !project.is_overdue && project.schedule_slip_days > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Slipped {formatDays(project.schedule_slip_days)}
          </span>
        )}
      </div>

      {/* Community activity indicators */}
      <div className="flex items-center gap-3 mb-2">
        <ReactionBar itemId={`project_${project.fms_id}`} compact />
        <CommentCountBadge itemId={`project_${project.fms_id}`} />
      </div>

      {/* Sparkline + Actions */}
      <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.04]">
        <BudgetSparkline snapshots={project.snapshots} />
        <div className="flex items-center gap-1 ml-auto">
          <FollowButton kind="project" id={project.fms_id} variant="compact" />
          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[var(--fc-muted)] hover:bg-white/5 transition-all"
          >
            <ShareIcon />
          </button>
          <Link
            href={`/spending/${encodeURIComponent(project.fms_id)}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--fc-orange)] hover:bg-[var(--fc-orange)]/10 transition-all"
          >
            Detail <ChevronRightIcon />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Loading State ──────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Logo spinner */}
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="intel-glow">
          <Image src="/assets/logo-64.png" alt="Loading" width={48} height={48} className="opacity-60" />
        </div>
        <p className="text-[12px] text-[var(--fc-muted)]">Loading contracts...</p>
      </div>

      {/* Stat skeletons */}
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="glass-card p-4 h-20 skeleton-shimmer rounded-2xl" />
        ))}
      </div>

      {/* Card skeletons */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="glass-card p-4 h-44 skeleton-shimmer rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ContractTrackerPage() {
  const [projects, setProjects] = useState<TrackedProject[]>([]);
  const [stats, setStats] = useState<{
    totalProjects: number;
    overBudgetCount: number;
    behindScheduleCount: number;
    totalOverrunAmount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<ProjectFilter>("budget_blowups");
  const [activeBorough, setActiveBorough] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(20);
  const [topBlowups, setTopBlowups] = useState<TrackedProject[]>([]);
  const [nearYouProjects, setNearYouProjects] = useState<TrackedProject[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allStats, filtered, blowups] = await Promise.all([
        getContractStats(),
        fetchTrackedProjects({
          filter: activeFilter,
          borough: activeBorough === "All" ? undefined : activeBorough,
          search: searchQuery.trim() || undefined,
        }),
        fetchTrackedProjects({ filter: "budget_blowups", limit: 10 }),
      ]);

      setStats({
        totalProjects: allStats.totalProjects,
        overBudgetCount: allStats.overBudgetCount,
        behindScheduleCount: allStats.behindScheduleCount,
        totalOverrunAmount: allStats.totalOverrunAmount,
      });
      setProjects(filtered);
      setTopBlowups(blowups);
      // Use top blowups as "near you" default (most compelling projects)
      if (blowups.length > 0) {
        setNearYouProjects(blowups.slice(0, 5));
      }
      setDisplayCount(20);
    } catch {
      setError("Failed to load contract data. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, activeBorough, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Note: "Near You" projects are populated from topBlowups in loadData as a compelling default

  const visibleProjects = projects.slice(0, displayCount);
  const hasMore = displayCount < projects.length;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="intel-glow">
              <Image src="/assets/logo-64.png" alt="FatCats" width={32} height={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">
                My Block
              </h1>
              <p className="text-[12px] text-[var(--fc-muted)] flex items-center gap-1.5 mt-0.5">
                Follow the money. Every dollar. Every delay.
                <FatCatsIntelBadge size="sm" showBeta />
              </p>
            </div>
          </div>
        </div>

        {/* ── Your Activity ───────────────────────────────────── */}
        {(() => {
          const userStats = getUserStats();
          const rank = getCurrentRank();
          const rankConfig = RANK_CONFIG[rank];
          const uncovered = userStats.totalSpendingUncovered;
          const hasActivity = userStats.budgetViewsCount > 0 || userStats.exposesCount > 0;
          return (
            <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
              <h3 className="text-[11px] font-bold text-[var(--fc-muted)] uppercase tracking-wider mb-2">Your Activity</h3>
              {hasActivity ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/20 flex items-center justify-center text-[20px]">
                    {rankConfig?.icon || "🐱"}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-white">
                      {userStats.exposesCount} exposé{userStats.exposesCount !== 1 ? "s" : ""} filed
                    </p>
                    <p className="text-[11px] text-[var(--fc-muted)]">
                      Your reports are near {formatMoney(uncovered)} in city projects
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[20px]">
                    📸
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-white">No exposés yet</p>
                    <Link
                      href="/report/new"
                      className="text-[12px] text-[var(--fc-orange)] font-semibold hover:underline"
                    >
                      Start your first exposé →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Near You ──────────────────────────────────────── */}
        {!loading && nearYouProjects.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: "75ms" }}>
            <h3 className="text-[11px] font-bold text-[var(--fc-muted)] uppercase tracking-wider mb-2">Near You</h3>
            <p className="text-[10px] text-[var(--fc-muted)] mb-3">City projects in your area</p>
            <div className="space-y-2">
              {nearYouProjects.map((p) => (
                <Link
                  key={p.project_key}
                  href={`/spending/${encodeURIComponent(p.fms_id)}`}
                  className="block glass-card p-3 hover:bg-white/[0.06] transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      {/* LINE 1: The money jump */}
                      <p className="text-[15px] font-bold text-white leading-tight">
                        {formatMoney(p.original_budget)} → {formatMoney(p.total_budget)}
                      </p>
                      {/* LINE 2: Name + overrun */}
                      <p className="text-[12px] text-[var(--fc-muted)] mt-0.5 truncate">
                        {p.project_name.length > 35 ? p.project_name.slice(0, 35) + "..." : p.project_name}. +{p.budget_delta_pct.toLocaleString()}% over.
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${phaseColor(p.current_phase)}`}>
                      {phaseLabel(p.current_phase)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <a
              href="#big-picture"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("big-picture")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-[12px] text-[var(--fc-orange)] font-semibold mt-2 inline-block hover:underline"
            >
              See all projects →
            </a>
          </div>
        )}

        {/* ── The Big Picture ──────────────────────────────────── */}
        <h3 id="big-picture" className="text-[11px] font-bold text-[var(--fc-muted)] uppercase tracking-wider">The Big Picture</h3>

        {/* ── Stats Banner ───────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="glass-card p-4 h-[76px] skeleton-shimmer rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <div className="glass-card-elevated p-3 text-center">
              <p className="text-2xl font-black text-white">{(stats?.totalProjects ?? projects.length).toLocaleString()}</p>
              <p className="text-[10px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider mt-0.5">Tracked</p>
            </div>
            <div className="glass-card-elevated p-3 text-center border-red-500/10">
              <p className="text-2xl font-black text-red-400">{stats?.overBudgetCount ?? projects.filter(p => p.is_over_budget).length}</p>
              <p className="text-[10px] text-red-400/70 font-semibold uppercase tracking-wider mt-0.5">Over Budget</p>
            </div>
            <div className="glass-card-elevated p-3 text-center border-red-500/10">
              <p className="text-2xl font-black text-red-400">{formatMoney(stats?.totalOverrunAmount ?? projects.filter(p => p.is_over_budget).reduce((s, p) => s + Math.max(0, p.budget_delta), 0))}</p>
              <p className="text-[10px] text-red-400/70 font-semibold uppercase tracking-wider mt-0.5">Wasted</p>
            </div>
          </div>
        )}

        {/* ── Scope Creep Leaderboard — Top 10 ────────────────── */}
        {!loading && activeFilter === "budget_blowups" && topBlowups.length > 0 && (
          <div
            className="glass-card p-4 animate-fade-in-up"
            style={{
              animationDelay: "150ms",
              background: "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(249,115,22,0.04) 50%, rgba(239,68,68,0.06) 100%)",
            }}
          >
            <h3 className="text-[13px] font-black text-white mb-3 flex items-center gap-2">
              <span>🏆</span> Worst Scope Creep — Top 10
            </h3>
            <div className="space-y-1.5">
              {topBlowups.map((p, i) => (
                <Link
                  key={p.project_key}
                  href={`/spending/${encodeURIComponent(p.fms_id)}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all group"
                >
                  <span className="text-[11px] font-black text-[var(--fc-muted)] w-5 shrink-0">#{i + 1}</span>
                  <span className="text-[11px] text-white font-medium truncate flex-1 min-w-0 group-hover:text-[var(--fc-orange)] transition-colors">
                    {p.project_name.length > 40 ? p.project_name.slice(0, 40) + "..." : p.project_name}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--fc-orange)] bg-[var(--fc-orange)]/10 px-1.5 py-0.5 rounded uppercase shrink-0">
                    {p.borough.length > 6 ? p.borough.slice(0, 6) : p.borough}
                  </span>
                  <span className="text-[10px] text-[var(--fc-muted)] shrink-0">
                    {formatMoney(p.original_budget)} → {formatMoney(p.total_budget)}
                  </span>
                  <span className="text-[11px] font-black text-red-400 shrink-0">
                    +{p.budget_delta_pct.toLocaleString()}%
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Smart Filter Tabs ──────────────────────────────────── */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
          <div className="flex gap-2 w-max">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all shrink-0 ${
                  activeFilter === tab.key
                    ? "bg-[var(--fc-orange)] text-white shadow-lg shadow-[var(--fc-orange)]/20"
                    : "bg-[var(--fc-surface)] text-[var(--fc-muted)] border border-[var(--fc-glass-border)] hover:text-white hover:bg-white/10"
                }`}
              >
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Borough Filter ─────────────────────────────────────── */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
          <div className="flex gap-1.5 w-max">
            {BOROUGHS.map(b => (
              <button
                key={b}
                onClick={() => setActiveBorough(b)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                  activeBorough === b
                    ? "bg-white/10 text-white"
                    : "text-[var(--fc-muted)] hover:text-white hover:bg-white/5"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search Bar ─────────────────────────────────────────── */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search parks, roads, bridges..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-10 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-[13px] placeholder:text-[var(--fc-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)]/50 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fc-muted)] hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Results count ──────────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[var(--fc-muted)]">
              {projects.length.toLocaleString()} project{projects.length !== 1 ? "s" : ""}
              {activeFilter !== "all" && ` · ${FILTER_TABS.find(t => t.key === activeFilter)?.label}`}
              {activeBorough !== "All" && ` · ${activeBorough}`}
            </p>
            {searchQuery && (
              <p className="text-[10px] text-[var(--fc-muted)]">
                matching &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* ── Content ────────────────────────────────────────────── */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="glass-card p-8 text-center">
            <p className="text-[var(--fc-alert)] text-sm mb-3">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-xl bg-[var(--fc-orange)] text-white text-[13px] font-semibold hover:bg-[var(--fc-orange-hover)] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card p-10 text-center animate-fade-in">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-white font-semibold text-[14px] mb-1">No projects found</p>
            <p className="text-[var(--fc-muted)] text-[12px]">
              {searchQuery
                ? `Nothing matching "${searchQuery}". Try a different search.`
                : "No projects matching your filters."
              }
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {visibleProjects.map((p, i) => (
                <ProjectCard key={p.project_key} project={p} index={i} isBlowupView={activeFilter === "budget_blowups"} />
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => setDisplayCount(prev => prev + 20)}
                className="w-full py-3 rounded-xl bg-[var(--fc-surface)] border border-[var(--fc-glass-border)] text-[var(--fc-muted)] text-[13px] font-semibold hover:text-white hover:bg-white/10 transition-all"
              >
                Load more ({projects.length - displayCount} remaining)
              </button>
            )}
          </>
        )}

        {/* ── Data source ────────────────────────────────────────── */}
        <div className="pt-4 pb-2 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <IntelLogo size={14} />
            <p className="text-[10px] text-[var(--fc-muted)]">
              Powered by FatCats Intel
            </p>
            <span className="beta-badge animate-beta-pulse">Beta</span>
          </div>
          <p className="text-[9px] text-[var(--fc-muted)]/60">
            Data from{" "}
            <a
              href="https://data.cityofnewyork.us/City-Government/Capital-Projects-Dashboard-Citywide-Budget-and-Sch/fb86-vt7u"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              NYC Open Data — Capital Projects Dashboard
            </a>
            . Updated 3×/year by OMB.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
