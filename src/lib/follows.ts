/**
 * Follow System — localStorage-based follow/unfollow for reports and projects.
 *
 * Keys:
 *   fc_followed_reports  → string[] of report IDs
 *   fc_followed_projects → string[] of project FMS IDs
 *   fc_follow_nudge_seen → "1" once follow-nudge has been shown
 */

const REPORT_KEY = "fc_followed_reports";
const PROJECT_KEY = "fc_followed_projects";
const NUDGE_KEY = "fc_follow_nudge_seen";

// ── Helpers ───────────────────────────────────────────────────────────

function getList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setList(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(ids));
}

// ── Reports ───────────────────────────────────────────────────────────

export function isFollowingReport(id: string): boolean {
  return getList(REPORT_KEY).includes(id);
}

export function toggleFollowReport(id: string): boolean {
  const list = getList(REPORT_KEY);
  const idx = list.indexOf(id);
  if (idx >= 0) {
    list.splice(idx, 1);
    setList(REPORT_KEY, list);
    return false; // now unfollowed
  }
  list.push(id);
  setList(REPORT_KEY, list);
  return true; // now followed
}

export function getFollowedReportIds(): string[] {
  return getList(REPORT_KEY);
}

// ── Projects ──────────────────────────────────────────────────────────

export function isFollowingProject(fmsId: string): boolean {
  return getList(PROJECT_KEY).includes(fmsId);
}

export function toggleFollowProject(fmsId: string): boolean {
  const list = getList(PROJECT_KEY);
  const idx = list.indexOf(fmsId);
  if (idx >= 0) {
    list.splice(idx, 1);
    setList(PROJECT_KEY, list);
    return false;
  }
  list.push(fmsId);
  setList(PROJECT_KEY, list);
  return true;
}

export function getFollowedProjectIds(): string[] {
  return getList(PROJECT_KEY);
}

// ── Follow nudge ──────────────────────────────────────────────────────

export function hasSeenFollowNudge(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(NUDGE_KEY) === "1";
}

export function markFollowNudgeSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(NUDGE_KEY, "1");
}
