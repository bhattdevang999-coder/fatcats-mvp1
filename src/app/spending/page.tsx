"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  listCapitalProjects,
  getSpendingSummary,
  getSpendingByBorough,
  type CapitalProject,
  type SpendingSummary,
  type BoroughSpending,
} from "@/lib/spending";

// ── Money formatting ─────────────────────────────────────────────────

function formatMoney(cents: number): string {
  const n = Math.abs(cents);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${n.toLocaleString()}`;
  return `$${n}`;
}

// ── Filter pills ─────────────────────────────────────────────────────

const BOROUGHS = ["All", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "Citywide"];

// ── SVG Icons ────────────────────────────────────────────────────────

function EyeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "#E8652B" : "none"} stroke={active ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function BookmarkIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "#E8652B" : "none"} stroke={active ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[var(--fc-orange)]/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <span className="text-[11px] text-[var(--fc-muted)] uppercase tracking-widest font-semibold block">
          {label}
        </span>
        <span className="text-lg font-bold text-white">{value}</span>
      </div>
    </div>
  );
}

// ── Borough Card ─────────────────────────────────────────────────────

function BoroughCard({ item }: { item: BoroughSpending }) {
  const pct = item.planned > 0 ? Math.min((item.spent / item.planned) * 100, 100) : 0;

  // Hide $0/$0 boroughs
  if (item.planned === 0 && item.spent === 0) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-semibold text-[13px]">{item.borough}</span>
        <span className="text-[11px] text-[var(--fc-muted)] bg-white/5 px-2 py-0.5 rounded-full">
          {item.count} project{item.count !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[11px] text-[var(--fc-muted)] mb-1">
            <span>Planned</span>
            <span className="text-white font-medium">{formatMoney(item.planned)}</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white/20 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-[var(--fc-muted)] mb-1">
            <span>Spent</span>
            <span className="text-[var(--fc-orange)] font-medium">{formatMoney(item.spent)}</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--fc-orange)] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Contract Card ────────────────────────────────────────────────────

function ContractCard({ project }: { project: CapitalProject }) {
  const [following, setFollowing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pctSpent = project.planned_commit > 0
    ? Math.min((project.spent_total / project.planned_commit) * 100, 100)
    : 0;

  const handleFollow = () => {
    setFollowing(!following);
    if (!following) {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 1500);
    }
  };

  const handleSave = () => {
    setSaved(!saved);
  };

  const handleShare = () => {
    const text = `NYC is spending ${formatMoney(project.planned_commit)} on ${project.description || "a capital project"}. See it on FatCats`;
    if (navigator.share) {
      navigator.share({ title: "Open Contract — FatCats", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="glass-card p-4 animate-slide-up relative">
      {/* Follow confirmation toast */}
      {showConfirm && (
        <div className="absolute top-2 right-2 text-[10px] text-[var(--fc-orange)] bg-[var(--fc-orange)]/10 px-2 py-1 rounded-md animate-scale-in">
          Following
        </div>
      )}

      {/* Top row: borough + agency */}
      <div className="flex items-center gap-2 mb-2">
        {project.borough && (
          <span className="text-[10px] font-bold text-[var(--fc-orange)] bg-[var(--fc-orange)]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            {project.borough}
          </span>
        )}
        {project.agency && (
          <span className="text-[11px] text-[var(--fc-muted)] truncate">{project.agency}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-white text-[13px] font-medium leading-snug mb-3 line-clamp-2">
        {project.description ?? "Unnamed Project"}
      </p>

      {/* Financial progress */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-[var(--fc-muted)]">
            Spent: <span className="text-[var(--fc-orange)] font-semibold">{formatMoney(project.spent_total)}</span>
          </span>
          <span className="text-[var(--fc-muted)]">
            of <span className="text-white font-semibold">{formatMoney(project.planned_commit)}</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--fc-orange)] rounded-full transition-all duration-700"
            style={{ width: `${pctSpent}%` }}
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 pt-2.5 border-t border-white/[0.04]">
        <button
          onClick={handleFollow}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            following
              ? "text-[var(--fc-orange)] bg-[var(--fc-orange)]/10"
              : "text-[var(--fc-muted)] hover:bg-white/5"
          }`}
        >
          <EyeIcon active={following} />
          <span>{following ? "Following" : "Follow"}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[var(--fc-muted)] hover:bg-white/5 transition-all"
        >
          <ShareIcon />
          <span>Share</span>
        </button>

        <button
          onClick={handleSave}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ml-auto ${
            saved
              ? "text-[var(--fc-orange)] bg-[var(--fc-orange)]/10"
              : "text-[var(--fc-muted)] hover:bg-white/5"
          }`}
        >
          <BookmarkIcon active={saved} />
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function SpendingPage() {
  const [activeBorough, setActiveBorough] = useState("All");
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [boroughData, setBoroughData] = useState<BoroughSpending[]>([]);
  const [projects, setProjects] = useState<CapitalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      const [s, b, p] = await Promise.all([
        getSpendingSummary(),
        getSpendingByBorough(),
        listCapitalProjects({ limit: 200 }),
      ]);
      setSummary(s);
      setBoroughData(b);
      setProjects(p);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadFiltered() {
      const borough = activeBorough === "All" ? undefined : activeBorough;
      const p = await listCapitalProjects({ borough, limit: 200 });
      setProjects(p);
    }
    loadFiltered();
  }, [activeBorough]);

  // Client-side search filter
  const filteredProjects = searchQuery.trim()
    ? projects.filter((p) =>
        (p.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.agency || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.borough || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-xl font-bold text-white leading-tight">
            Open Contracts
          </h1>
          <p className="text-[13px] text-[var(--fc-muted)] mt-1">
            Follow the money. See where your tax dollars go.
          </p>
        </div>

        {/* Weekly Spending Reveal banner */}
        <div className="glass-card p-4 border border-amber-500/10 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="text-2xl">💰</div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-white">Weekly Spending Reveal</p>
              <p className="text-[11px] text-[var(--fc-muted)]">
                This week in NYC: {summary ? formatMoney(Math.floor(summary.totalSpent * 0.02)) : "..."} on new projects.
                Updated every Monday.
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card p-5 h-16 skeleton-shimmer rounded-2xl" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 gap-3">
            <SummaryCard
              label="Total Planned"
              value={formatMoney(summary.totalPlanned)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fc-orange)" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <SummaryCard
              label="Total Spent"
              value={formatMoney(summary.totalSpent)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fc-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              }
            />
            <SummaryCard
              label="Projects"
              value={summary.projectCount.toLocaleString()}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fc-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
            />
          </div>
        ) : null}

        {/* Borough breakdown */}
        {boroughData.length > 0 && (
          <section>
            <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider mb-3">
              By Borough
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boroughData.map((item) => (
                <BoroughCard key={item.borough} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Search bar + Filter pills */}
        <section>
          {/* Search */}
          <div className="relative mb-4">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-[13px] placeholder:text-[var(--fc-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)] focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fc-muted)] hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap mb-4 no-scrollbar overflow-x-auto">
            {BOROUGHS.map((b) => (
              <button
                key={b}
                onClick={() => setActiveBorough(b)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all shrink-0 ${
                  activeBorough === b
                    ? "bg-[var(--fc-orange)] text-white"
                    : "bg-white/[0.06] text-[var(--fc-muted)] hover:text-white hover:bg-white/10"
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Project list */}
          <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider mb-3">
            Contracts
            {activeBorough !== "All" && (
              <span className="ml-2 text-[var(--fc-orange)] normal-case">— {activeBorough}</span>
            )}
            {searchQuery && (
              <span className="ml-2 text-[var(--fc-muted)] normal-case text-[11px]">
                ({filteredProjects.length} results)
              </span>
            )}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-4 h-28 skeleton-shimmer rounded-2xl" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-[var(--fc-muted)] text-sm">
                {searchQuery ? `No contracts matching "${searchQuery}"` : "No contracts found."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((p) => (
                <ContractCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
