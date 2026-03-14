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

// ── Money formatting ─────────────────────────────────────────────────────────

function formatMoney(cents: number): string {
  // Values from the API are already in dollars (not cents)
  const n = Math.abs(cents);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${n.toLocaleString()}`;
  return `$${n}`;
}

// ── Filter pills ─────────────────────────────────────────────────────────────

const BOROUGHS = ["All", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "Citywide"];

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs text-[var(--fc-muted)] uppercase tracking-widest font-semibold">
        {label}
      </span>
      <span className="text-2xl font-bold text-[var(--fc-orange)]">{value}</span>
    </div>
  );
}

// ── Borough Card ─────────────────────────────────────────────────────────────

function BoroughCard({ item }: { item: BoroughSpending }) {
  const pct = item.planned > 0 ? Math.min((item.spent / item.planned) * 100, 100) : 0;

  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-semibold text-sm">{item.borough}</span>
        <span className="text-xs text-[var(--fc-muted)]">
          {item.count} project{item.count !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {/* Planned bar */}
        <div>
          <div className="flex justify-between text-xs text-[var(--fc-muted)] mb-1">
            <span>Planned</span>
            <span className="text-white">{formatMoney(item.planned)}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--fc-orange)]/60 rounded-full"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Spent bar */}
        <div>
          <div className="flex justify-between text-xs text-[var(--fc-muted)] mb-1">
            <span>Spent</span>
            <span className="text-[var(--fc-orange)]">{formatMoney(item.spent)}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--fc-orange)] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: CapitalProject }) {
  const startYear = project.start_date
    ? new Date(project.start_date).getFullYear()
    : null;
  const endYear = project.end_date
    ? new Date(project.end_date).getFullYear()
    : null;
  const dateRange = startYear && endYear ? `${startYear}–${endYear}` : startYear ? `${startYear}` : null;

  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 shrink-0 w-[300px] md:w-auto">
      {/* Agency + Borough */}
      <div className="flex items-center gap-2 mb-2">
        {project.borough && (
          <span className="text-xs font-semibold text-[var(--fc-orange)] uppercase tracking-wider">
            {project.borough}
          </span>
        )}
        {project.agency && (
          <span className="text-xs text-[var(--fc-muted)] truncate">{project.agency}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-white text-sm font-medium leading-snug mb-3 line-clamp-2">
        {project.description ?? "Unnamed Project"}
      </p>

      {/* Financials */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-xs text-[var(--fc-muted)] block">Planned</span>
          <span className="text-sm font-bold text-white">
            {formatMoney(project.planned_commit)}
          </span>
        </div>
        <div>
          <span className="text-xs text-[var(--fc-muted)] block">Spent</span>
          <span className="text-sm font-bold text-[var(--fc-orange)]">
            {formatMoney(project.spent_total)}
          </span>
        </div>
      </div>

      {/* Date range */}
      {dateRange && (
        <p className="text-xs text-[var(--fc-muted)] mt-2">{dateRange}</p>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SpendingPage() {
  const [activeBorough, setActiveBorough] = useState("All");
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [boroughData, setBoroughData] = useState<BoroughSpending[]>([]);
  const [projects, setProjects] = useState<CapitalProject[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Re-fetch projects when borough filter changes
  useEffect(() => {
    async function loadFiltered() {
      const borough = activeBorough === "All" ? undefined : activeBorough;
      const p = await listCapitalProjects({ borough, limit: 200 });
      setProjects(p);
    }
    loadFiltered();
  }, [activeBorough]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div>
          <p className="text-xs font-bold text-[var(--fc-orange)] uppercase tracking-widest mb-1">
            City Data
          </p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">
            City Spending on Infrastructure
          </h1>
          <p className="text-sm text-[var(--fc-muted)] mt-1">
            Capital projects funded by New York City.
          </p>
        </div>

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 h-20 animate-pulse"
              />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Planned"
              value={formatMoney(summary.totalPlanned)}
            />
            <SummaryCard
              label="Total Spent"
              value={formatMoney(summary.totalSpent)}
            />
            <SummaryCard
              label="Projects"
              value={summary.projectCount.toLocaleString()}
            />
          </div>
        ) : null}

        {/* Borough breakdown */}
        {boroughData.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4">By Borough</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boroughData.map((item) => (
                <BoroughCard key={item.borough} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Filter pills */}
        <section>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {BOROUGHS.map((b) => (
              <button
                key={b}
                onClick={() => setActiveBorough(b)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
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
          <h2 className="text-lg font-bold text-white mb-4">
            Projects
            {activeBorough !== "All" && (
              <span className="ml-2 text-[var(--fc-orange)]">— {activeBorough}</span>
            )}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 h-24 animate-pulse"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center">
              <p className="text-[var(--fc-muted)]">No projects found.</p>
              <p className="text-xs text-[var(--fc-muted)] mt-1">
                Run <code className="text-[var(--fc-orange)]">npm run importSpending</code> to load data.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-x-auto">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
