/**
 * FatCats Engagement Engine
 * Tracks streaks, last visit, civic score, and generates "since you left" data
 */

const KEYS = {
  STREAK: "fc_streak",
  STREAK_DATE: "fc_streak_date",
  LAST_VISIT: "fc_last_visit",
  TOTAL_VISITS: "fc_total_visits",
  CIVIC_SCORE: "fc_civic_score",
} as const;

// ── Streak ──────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface StreakData {
  current: number;
  lastDate: string;
  isNewDay: boolean; // true if this is the first visit today
}

export function getStreak(): StreakData {
  if (typeof window === "undefined") return { current: 1, lastDate: getToday(), isNewDay: false };

  const stored = localStorage.getItem(KEYS.STREAK);
  const storedDate = localStorage.getItem(KEYS.STREAK_DATE);
  const today = getToday();
  const yesterday = getYesterday();

  // First visit ever
  if (!stored || !storedDate) {
    localStorage.setItem(KEYS.STREAK, "1");
    localStorage.setItem(KEYS.STREAK_DATE, today);
    return { current: 1, lastDate: today, isNewDay: true };
  }

  const streak = parseInt(stored, 10) || 1;

  if (storedDate === today) {
    // Already visited today
    return { current: streak, lastDate: today, isNewDay: false };
  }

  if (storedDate === yesterday) {
    // Consecutive day — increment
    const newStreak = streak + 1;
    localStorage.setItem(KEYS.STREAK, String(newStreak));
    localStorage.setItem(KEYS.STREAK_DATE, today);
    return { current: newStreak, lastDate: today, isNewDay: true };
  }

  // Streak broken — reset to 1
  localStorage.setItem(KEYS.STREAK, "1");
  localStorage.setItem(KEYS.STREAK_DATE, today);
  return { current: 1, lastDate: today, isNewDay: true };
}

// ── Last Visit / "Since You Left" ───────────────────────────────────────

export interface SinceYouLeft {
  lastVisit: Date | null;
  hoursAgo: number;
  isReturning: boolean; // true if >1 hour since last visit
}

export function getSinceYouLeft(): SinceYouLeft {
  if (typeof window === "undefined") return { lastVisit: null, hoursAgo: 0, isReturning: false };

  const stored = localStorage.getItem(KEYS.LAST_VISIT);
  const now = Date.now();

  // Update last visit to now
  localStorage.setItem(KEYS.LAST_VISIT, String(now));

  // Increment total visits
  const visits = parseInt(localStorage.getItem(KEYS.TOTAL_VISITS) || "0", 10);
  localStorage.setItem(KEYS.TOTAL_VISITS, String(visits + 1));

  if (!stored) {
    return { lastVisit: null, hoursAgo: 0, isReturning: false };
  }

  const lastMs = parseInt(stored, 10);
  const diffHours = (now - lastMs) / (1000 * 60 * 60);

  return {
    lastVisit: new Date(lastMs),
    hoursAgo: Math.round(diffHours),
    isReturning: diffHours > 1,
  };
}

export function getTotalVisits(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(KEYS.TOTAL_VISITS) || "0", 10);
}

// ── Civic Score ─────────────────────────────────────────────────────────

export interface CivicScoreData {
  score: number;
  level: string;
  levelColor: string;
  nextLevel: string | null;
  pointsToNext: number;
  progress: number; // 0-100
}

const LEVELS = [
  { min: 0, label: "Newcomer", color: "#8B95A8" },
  { min: 50, label: "Observer", color: "#3B82FF" },
  { min: 150, label: "Investigator", color: "#E8652B" },
  { min: 400, label: "Watchdog", color: "#FF7A3D" },
  { min: 1000, label: "Civic Legend", color: "#22C55E" },
];

export function computeCivicScore(stats: {
  reports: number;
  watchers: number;
  fixed: number;
  streak: number;
  visits: number;
}): CivicScoreData {
  const score =
    stats.reports * 10 +
    stats.watchers * 2 +
    stats.fixed * 25 +
    stats.streak * 5 +
    Math.min(stats.visits, 100) * 1;

  const current = [...LEVELS].reverse().find((l) => score >= l.min) || LEVELS[0];
  const nextIdx = LEVELS.indexOf(current) + 1;
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;

  return {
    score,
    level: current.label,
    levelColor: current.color,
    nextLevel: next?.label || null,
    pointsToNext: next ? next.min - score : 0,
    progress: next
      ? Math.min(100, ((score - current.min) / (next.min - current.min)) * 100)
      : 100,
  };
}

// ── Milestone Badges ────────────────────────────────────────────────────

export interface Badge {
  id: string;
  icon: string;
  label: string;
  hint: string;
  unlocked: boolean;
}

export function computeBadges(stats: {
  reports: number;
  watchers: number;
  fixed: number;
  streak: number;
  visits: number;
  score: number;
}): Badge[] {
  return [
    {
      id: "founding",
      icon: "🐱",
      label: "Founding Watchdog",
      hint: "Joined during beta",
      unlocked: true,
    },
    {
      id: "first_report",
      icon: "📸",
      label: "First Exposé",
      hint: "File your first exposé",
      unlocked: stats.reports >= 1,
    },
    {
      id: "investigator",
      icon: "🔍",
      label: "Investigator",
      hint: "File 10 exposés",
      unlocked: stats.reports >= 10,
    },
    {
      id: "streak_7",
      icon: "🔥",
      label: "7-Day Streak",
      hint: "Check in 7 days in a row",
      unlocked: stats.streak >= 7,
    },
    {
      id: "streak_30",
      icon: "⚡",
      label: "30-Day Streak",
      hint: "30 consecutive days",
      unlocked: stats.streak >= 30,
    },
    {
      id: "fixer",
      icon: "✅",
      label: "Fixer",
      hint: "Get an issue resolved",
      unlocked: stats.fixed >= 1,
    },
    {
      id: "amplifier",
      icon: "📣",
      label: "Amplifier",
      hint: "Attract 50+ total watchers",
      unlocked: stats.watchers >= 50,
    },
    {
      id: "block_captain",
      icon: "🏆",
      label: "Block Captain",
      hint: "Reach Watchdog level (400 pts)",
      unlocked: stats.score >= 400,
    },
  ];
}
