/**
 * FatCats Notification Engine
 * Push notification helpers + "While You Wait" in-app notification system.
 * All notifications stored in localStorage — max 1 new per session.
 */

// ── Push notification helpers (existing) ────────────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch {
    return null;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkGs-GDslQQnT39kE_FIZV5CqQPpF0Aoj6CdA0kAP8"
      ).buffer as ArrayBuffer,
    });
    return sub;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// ── In-app notification system ────────────────────────────────────────

export interface FatCatsNotification {
  id: string;
  type: "while_you_wait" | "scope_creep_alert" | "your_impact" | "did_you_know" | "the_receipts";
  title: string;
  body: string;
  icon: string;
  deepLink: string;
  createdAt: string;
  read: boolean;
}

const NOTIFICATIONS_KEY = "fc_notifications";
const NOTIF_SESSION_KEY = "fc_notif_session";

export function getNotifications(): FatCatsNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length;
}

export function markAllRead(): void {
  if (typeof window === "undefined") return;
  const notifs = getNotifications();
  for (const n of notifs) n.read = true;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
}

export function markRead(id: string): void {
  if (typeof window === "undefined") return;
  const notifs = getNotifications();
  const n = notifs.find(x => x.id === id);
  if (n) {
    n.read = true;
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  }
}

function addNotification(notif: FatCatsNotification): void {
  const notifs = getNotifications();
  // Don't duplicate
  if (notifs.some(n => n.id === notif.id)) return;
  notifs.unshift(notif);
  // Keep max 20
  if (notifs.length > 20) notifs.length = 20;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
}

function hasGeneratedThisSession(): boolean {
  if (typeof window === "undefined") return true;
  const sessionId = sessionStorage.getItem(NOTIF_SESSION_KEY);
  return !!sessionId;
}

function markSessionGenerated(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NOTIF_SESSION_KEY, "1");
}

// ── Notification generation (runs on app open) ────────────────────────

// Pre-built "Did You Know?" facts
const DID_YOU_KNOW_FACTS = [
  { title: "While you wait...", body: "43% of Brooklyn road projects blew their budget. Your taxes at work. 🐱", icon: "💰", deepLink: "/spending" },
  { title: "Did you know?", body: "The average NYC capital project takes 2.3x longer than planned. See the worst offenders.", icon: "🔍", deepLink: "/spending" },
  { title: "$38.3B in scope creep", body: "847 NYC projects went over budget. That's your taxes. We have the receipts.", icon: "📋", deepLink: "/spending" },
  { title: "57 days per change order", body: "That's just the paperwork. The average processing time for one budget change.", icon: "⏳", deepLink: "/spending" },
  { title: "Scope Creep Alert", body: "3 new projects crossed the 100% over-budget threshold this month.", icon: "🔴", deepLink: "/spending" },
  { title: "Your borough", body: "Queens has the most over-budget road projects — 47 and counting.", icon: "🗺️", deepLink: "/spending" },
];

export function generateSessionNotification(): FatCatsNotification | null {
  if (typeof window === "undefined") return null;
  if (hasGeneratedThisSession()) return null;
  markSessionGenerated();

  // Pick a random "Did You Know" fact
  const fact = DID_YOU_KNOW_FACTS[Math.floor(Math.random() * DID_YOU_KNOW_FACTS.length)];

  const notif: FatCatsNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "did_you_know",
    title: fact.title,
    body: fact.body,
    icon: fact.icon,
    deepLink: fact.deepLink,
    createdAt: new Date().toISOString(),
    read: false,
  };

  addNotification(notif);
  return notif;
}

/**
 * Generate a "While You Wait" notification if applicable.
 * Call this with nearby spending data after checking user's reports.
 */
export function generateWhileYouWaitNotification(
  reportType: string,
  street: string,
  daysOld: number,
  nearbyProjectName: string,
  nearbyProjectDelta: string,
  nearbyProjectId: string
): FatCatsNotification {
  const notif: FatCatsNotification = {
    id: `wyw_${Date.now()}`,
    type: "while_you_wait",
    title: "While you wait...",
    body: `Your ${reportType} on ${street} is ${daysOld} days old. Meanwhile, "${nearbyProjectName}" nearby just crept up ${nearbyProjectDelta}. 🐱`,
    icon: "🐱",
    deepLink: `/spending/${encodeURIComponent(nearbyProjectId)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };

  addNotification(notif);
  return notif;
}

/**
 * Generate a scope creep alert notification.
 */
export function generateScopeCreepAlert(
  projectName: string,
  deltaPct: number,
  originalBudget: string,
  currentBudget: string,
  projectId: string
): FatCatsNotification {
  const notif: FatCatsNotification = {
    id: `sca_${Date.now()}`,
    type: "scope_creep_alert",
    title: "🔴 Scope creep detected",
    body: `${projectName} just hit +${deltaPct}% over budget. ${originalBudget} → ${currentBudget}`,
    icon: "🔴",
    deepLink: `/spending/${encodeURIComponent(projectId)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };

  addNotification(notif);
  return notif;
}

// ── Time formatting helper ────────────────────────────────────────────

export function timeAgoNotif(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
