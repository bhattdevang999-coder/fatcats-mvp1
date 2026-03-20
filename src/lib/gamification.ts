/**
 * FatCats Gamification Engine
 * Ranks, stats, streaks, discoveries, achievements — all localStorage-based.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface UserStats {
  exposesCount: number;
  discoveriesCount: number;
  sharesCount: number;
  contextAdded: number;
  fixesVerified: number;
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  totalSpendingUncovered: number;
  budgetViewsCount: number;
  joinedAt: string;
}

export type CivicRank =
  | "kitten"
  | "street_cat"
  | "alley_cat"
  | "night_owl"
  | "digger"
  | "watchdog"
  | "investigator"
  | "muckraker"
  | "founding_watchdog";

export interface RankConfig {
  label: string;
  icon: string;
  description: string;
  requirement: string;
}

export const RANK_CONFIG: Record<CivicRank, RankConfig> = {
  kitten: { label: "Witness", icon: "👁️", description: "You saw something.", requirement: "Sign up" },
  street_cat: { label: "Recorder", icon: "📸", description: "First receipt filed.", requirement: "1 exposé" },
  alley_cat: { label: "Tracker", icon: "🔦", description: "5 receipts. They're noticing.", requirement: "5 exposés" },
  night_owl: { label: "Auditor", icon: "🧾", description: "Found where the money went.", requirement: "1 discovery" },
  digger: { label: "Digger", icon: "⛏️", description: "10 budgets opened. No one does this.", requirement: "10 budget views" },
  watchdog: { label: "Watchdog", icon: "🐕", description: "They know your device.", requirement: "10 exposés + 5 discoveries" },
  investigator: { label: "Investigator", icon: "🔍", description: "Following the money.", requirement: "25 exposés + 10 shares" },
  muckraker: { label: "Muckraker", icon: "📰", description: "The system sees you seeing it.", requirement: "50 exposés + 5 contexts" },
  founding_watchdog: { label: "Founding Watchdog", icon: "👑", description: "Here before anyone.", requirement: "Pre-launch user" },
};

const RANK_ORDER: CivicRank[] = [
  "kitten",
  "street_cat",
  "alley_cat",
  "night_owl",
  "digger",
  "watchdog",
  "investigator",
  "muckraker",
  "founding_watchdog",
];

const STATS_KEY = "fc_gamification_stats";
const RANKS_KEY = "fc_gamification_ranks";
const STREAK_DAYS_KEY = "fc_gamification_streak_days";

// ── Stats ──────────────────────────────────────────────────────────────

function defaultStats(): UserStats {
  return {
    exposesCount: 0,
    discoveriesCount: 0,
    sharesCount: 0,
    contextAdded: 0,
    fixesVerified: 0,
    currentStreakWeeks: 0,
    longestStreakWeeks: 0,
    totalSpendingUncovered: 0,
    budgetViewsCount: 0,
    joinedAt: new Date().toISOString(),
  };
}

export function getUserStats(): UserStats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      const stats = defaultStats();
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
      return stats;
    }
    return { ...defaultStats(), ...JSON.parse(raw) };
  } catch {
    return defaultStats();
  }
}

export function incrementStat(key: keyof UserStats, amount = 1): void {
  if (typeof window === "undefined") return;
  const stats = getUserStats();
  if (typeof stats[key] === "number") {
    (stats[key] as number) += amount;
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function setStatValue(key: keyof UserStats, value: number): void {
  if (typeof window === "undefined") return;
  const stats = getUserStats();
  if (typeof stats[key] === "number") {
    (stats[key] as number) = value;
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// ── Ranks ──────────────────────────────────────────────────────────────

function getUnlockedRankSet(): Set<CivicRank> {
  if (typeof window === "undefined") return new Set<CivicRank>(["kitten", "founding_watchdog"]);
  try {
    const raw = localStorage.getItem(RANKS_KEY);
    if (!raw) return new Set<CivicRank>(["kitten", "founding_watchdog"]);
    return new Set<CivicRank>(JSON.parse(raw));
  } catch {
    return new Set<CivicRank>(["kitten", "founding_watchdog"]);
  }
}

function saveUnlockedRanks(ranks: Set<CivicRank>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RANKS_KEY, JSON.stringify(Array.from(ranks)));
}

export function getUnlockedRanks(): CivicRank[] {
  return Array.from(getUnlockedRankSet());
}

export function getCurrentRank(): CivicRank {
  const unlocked = getUnlockedRankSet();
  // Return the highest rank that's unlocked (by RANK_ORDER position)
  let highest: CivicRank = "kitten";
  for (const rank of RANK_ORDER) {
    if (unlocked.has(rank) && rank !== "founding_watchdog") {
      highest = rank;
    }
  }
  // founding_watchdog always takes precedence if unlocked and they've hit at least watchdog
  if (unlocked.has("founding_watchdog") && RANK_ORDER.indexOf(highest) >= RANK_ORDER.indexOf("watchdog")) {
    return "founding_watchdog";
  }
  return highest;
}

function rankMet(rank: CivicRank, stats: UserStats): boolean {
  switch (rank) {
    case "kitten": return true;
    case "founding_watchdog": return true; // always for current users
    case "street_cat": return stats.exposesCount >= 1;
    case "alley_cat": return stats.exposesCount >= 5;
    case "night_owl": return stats.discoveriesCount >= 1;
    case "digger": return stats.budgetViewsCount >= 10;
    case "watchdog": return stats.exposesCount >= 10 && stats.discoveriesCount >= 5;
    case "investigator": return stats.exposesCount >= 25 && stats.sharesCount >= 10;
    case "muckraker": return stats.exposesCount >= 50 && stats.contextAdded >= 5;
    default: return false;
  }
}

export function checkAndUnlockNewRank(): CivicRank | null {
  const stats = getUserStats();
  const unlocked = getUnlockedRankSet();
  let newRank: CivicRank | null = null;

  for (const rank of RANK_ORDER) {
    if (!unlocked.has(rank) && rankMet(rank, stats)) {
      unlocked.add(rank);
      newRank = rank; // return the latest one unlocked
    }
  }

  if (newRank) {
    saveUnlockedRanks(unlocked);
  }
  return newRank;
}

export function getNextRank(): { rank: CivicRank; progress: number; remaining: string } | null {
  const stats = getUserStats();
  const unlocked = getUnlockedRankSet();

  for (const rank of RANK_ORDER) {
    if (rank === "founding_watchdog") continue;
    if (unlocked.has(rank)) continue;

    // Calculate progress toward this rank
    let progress = 0;
    let remaining = "";

    switch (rank) {
      case "street_cat":
        progress = Math.min(100, (stats.exposesCount / 1) * 100);
        remaining = `${Math.max(0, 1 - stats.exposesCount)} exposé to go`;
        break;
      case "alley_cat":
        progress = Math.min(100, (stats.exposesCount / 5) * 100);
        remaining = `${Math.max(0, 5 - stats.exposesCount)} exposés to go`;
        break;
      case "night_owl":
        progress = Math.min(100, (stats.discoveriesCount / 1) * 100);
        remaining = `${Math.max(0, 1 - stats.discoveriesCount)} discovery to go`;
        break;
      case "digger":
        progress = Math.min(100, (stats.budgetViewsCount / 10) * 100);
        remaining = `${Math.max(0, 10 - stats.budgetViewsCount)} budget views to go`;
        break;
      case "watchdog": {
        const expProg = Math.min(1, stats.exposesCount / 10);
        const discProg = Math.min(1, stats.discoveriesCount / 5);
        progress = ((expProg + discProg) / 2) * 100;
        const needs: string[] = [];
        if (stats.exposesCount < 10) needs.push(`${10 - stats.exposesCount} exposés`);
        if (stats.discoveriesCount < 5) needs.push(`${5 - stats.discoveriesCount} discoveries`);
        remaining = needs.join(" + ") + " to go";
        break;
      }
      case "investigator": {
        const expProg = Math.min(1, stats.exposesCount / 25);
        const shrProg = Math.min(1, stats.sharesCount / 10);
        progress = ((expProg + shrProg) / 2) * 100;
        remaining = `${Math.max(0, 25 - stats.exposesCount)} exposés + ${Math.max(0, 10 - stats.sharesCount)} shares to go`;
        break;
      }
      case "muckraker": {
        const expProg = Math.min(1, stats.exposesCount / 50);
        const ctxProg = Math.min(1, stats.contextAdded / 5);
        progress = ((expProg + ctxProg) / 2) * 100;
        remaining = `${Math.max(0, 50 - stats.exposesCount)} exposés + ${Math.max(0, 5 - stats.contextAdded)} contexts to go`;
        break;
      }
      default:
        break;
    }

    return { rank, progress: Math.round(progress), remaining };
  }

  return null;
}

// ── Streak (weekly) ────────────────────────────────────────────────────

export function recordStreakDay(): void {
  if (typeof window === "undefined") return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(STREAK_DAYS_KEY);
    const days: string[] = raw ? JSON.parse(raw) : [];
    if (!days.includes(today)) {
      days.push(today);
      // Keep last 60 days only
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 60);
      const filtered = days.filter(d => new Date(d) >= cutoff);
      localStorage.setItem(STREAK_DAYS_KEY, JSON.stringify(filtered));
    }
    // Recalculate weekly streak
    updateWeeklyStreak();
  } catch {
    // Silent fail
  }
}

function updateWeeklyStreak(): void {
  try {
    const raw = localStorage.getItem(STREAK_DAYS_KEY);
    const days: string[] = raw ? JSON.parse(raw) : [];
    if (days.length === 0) return;

    const sorted = [...days].sort().reverse();
    const dayDates = sorted.map(d => new Date(d));

    // Count consecutive weeks with 3+ active days
    let weekStreak = 0;
    const now = new Date();

    for (let w = 0; w < 20; w++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const daysInWeek = dayDates.filter(d => d >= weekStart && d < weekEnd).length;
      if (daysInWeek >= 3) {
        weekStreak++;
      } else if (w > 0) {
        break; // Streak broken
      }
    }

    const stats = getUserStats();
    stats.currentStreakWeeks = weekStreak;
    if (weekStreak > stats.longestStreakWeeks) {
      stats.longestStreakWeeks = weekStreak;
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Silent fail
  }
}

// ── Spending Uncovered Calculator ──────────────────────────────────────

export function calculateSpendingUncovered(reportLocations: { lat: number; lng: number }[], projects: { lat?: number; lng?: number; budget_delta: number }[]): number {
  let total = 0;
  for (const report of reportLocations) {
    for (const proj of projects) {
      if (!proj.lat || !proj.lng) continue;
      const dist = haversine(report.lat, report.lng, proj.lat, proj.lng);
      if (dist <= 800 && proj.budget_delta > 0) {
        total += proj.budget_delta;
      }
    }
  }
  return total;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
