// ============================================================
// COMMUNITY ENGAGEMENT SYSTEM
// localStorage-based reactions (with breakdown), comments, 
// community status votes
// ============================================================

export interface Reaction {
  emoji: string;
  label: string;
  count: number;
  userReacted: boolean;
}

export interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  time: number;       // timestamp
  parentId?: string;  // for threading
  watchdogBadge?: string;
}

export interface StatusVote {
  yes: number;
  no: number;
  userVote: "yes" | "no" | null;
}

// ── Reaction system ──────────────────────────────────────────

const REACTION_EMOJIS = [
  { emoji: "😤", label: "Outraged" },
  { emoji: "😱", label: "Shocked" },
  { emoji: "🤦", label: "Facepalm" },
  { emoji: "📢", label: "Amplify" },
  { emoji: "💪", label: "On it" },
  { emoji: "👀", label: "Watching" },
];

export function getReactionEmojis() {
  return REACTION_EMOJIS;
}

export function getReactions(itemId: string): Reaction[] {
  if (typeof window === "undefined") return REACTION_EMOJIS.map(r => ({ ...r, count: 0, userReacted: false }));
  
  const key = `fc_reactions_${itemId}`;
  const stored = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, number>;
  const userKey = `fc_user_reactions_${itemId}`;
  const userReactions = JSON.parse(localStorage.getItem(userKey) || "[]") as string[];
  
  // Seed some mock data for demo
  return REACTION_EMOJIS.map(r => {
    const baseCount = stored[r.label] || seedCount(itemId, r.label);
    return {
      ...r,
      count: baseCount + (userReactions.includes(r.label) ? 1 : 0),
      userReacted: userReactions.includes(r.label),
    };
  });
}

export function toggleReaction(itemId: string, label: string): Reaction[] {
  if (typeof window === "undefined") return [];
  
  const key = `fc_reactions_${itemId}`;
  const stored = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, number>;
  const userKey = `fc_user_reactions_${itemId}`;
  const userReactions = JSON.parse(localStorage.getItem(userKey) || "[]") as string[];
  
  if (userReactions.includes(label)) {
    // Remove reaction
    const idx = userReactions.indexOf(label);
    userReactions.splice(idx, 1);
  } else {
    // Add reaction
    userReactions.push(label);
  }
  
  localStorage.setItem(userKey, JSON.stringify(userReactions));
  
  // Ensure base counts exist
  if (!stored[label]) {
    stored[label] = seedCount(itemId, label);
  }
  localStorage.setItem(key, JSON.stringify(stored));
  
  return getReactions(itemId);
}

// Deterministic seed count so each item has slightly different base reactions
function seedCount(itemId: string, label: string): number {
  let hash = 0;
  const str = `${itemId}_${label}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  // Some reactions should be 0 for realism
  if (hash % 5 === 0) return 0;
  return hash % 12;
}

export function getTotalReactions(itemId: string): number {
  return getReactions(itemId).reduce((sum, r) => sum + r.count, 0);
}

// ── Comment system ──────────────────────────────────────────

export function getComments(itemId: string): Comment[] {
  if (typeof window === "undefined") return [];
  
  const key = `fc_comments_${itemId}`;
  const stored = JSON.parse(localStorage.getItem(key) || "null");
  
  if (stored) return stored as Comment[];
  
  // Seed with realistic mock comments
  const seed = seedComments(itemId);
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

export function addComment(itemId: string, text: string, parentId?: string): Comment[] {
  if (typeof window === "undefined") return [];
  
  const key = `fc_comments_${itemId}`;
  const comments = getComments(itemId);
  
  // Get watchdog badge if available
  const watchdogNeighborhood = localStorage.getItem("fc_watchdog_neighborhood");
  
  const newComment: Comment = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user: "you",
    avatar: watchdogNeighborhood ? "🔍" : "🐱",
    text,
    time: Date.now(),
    parentId,
    watchdogBadge: watchdogNeighborhood || undefined,
  };
  
  comments.push(newComment);
  localStorage.setItem(key, JSON.stringify(comments));
  return comments;
}

export function getCommentCount(itemId: string): number {
  return getComments(itemId).length;
}

function seedComments(itemId: string): Comment[] {
  // Generate 2-4 realistic comments based on item ID
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = (hash * 31 + itemId.charCodeAt(i)) & 0x7fffffff;
  }
  
  const commentPool = [
    { user: "block_watch_bk", avatar: "🔍", text: "Saw this on my way to work. How is this still not fixed?", badge: "Bedford-Stuyvesant" },
    { user: "nyc_taxpayer42", avatar: "💰", text: "Our tax dollars hard at work... doing nothing.", badge: undefined },
    { user: "concerned_mom", avatar: "👩", text: "My kid almost tripped over this yesterday. Dangerous.", badge: undefined },
    { user: "transit_rider", avatar: "🚇", text: "Called 311 about this twice already. Zero response.", badge: undefined },
    { user: "street_eye_nyc", avatar: "👁️", text: "Same issue on the next block too. Whole area is neglected.", badge: "Williamsburg" },
    { user: "cyclist_queens", avatar: "🚴", text: "This is a safety hazard. Has anyone contacted the council member?", badge: undefined },
    { user: "bushwick_watch", avatar: "🔍", text: "I documented three more like this within 2 blocks. Pattern.", badge: "Bushwick" },
    { user: "downtown_walker", avatar: "🏙️", text: "Been walking past this for months. Classic NYC neglect.", badge: undefined },
  ];
  
  const count = 2 + (hash % 3); // 2-4 comments
  const comments: Comment[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count && i < commentPool.length; i++) {
    const idx = (hash + i * 7) % commentPool.length;
    const c = commentPool[idx];
    const hoursAgo = 1 + ((hash + i * 13) % 48);
    
    comments.push({
      id: `seed_${itemId.slice(0, 8)}_${i}`,
      user: c.user,
      avatar: c.avatar,
      text: c.text,
      time: now - hoursAgo * 3600000,
      watchdogBadge: c.badge,
    });
    
    // Sometimes add a reply
    if ((hash + i) % 3 === 0 && i > 0) {
      const replyPool = [
        { user: "nyc_fixer", avatar: "🔧", text: "Same. I walk past this every day." },
        { user: "local_voice", avatar: "📣", text: "Shared this with my council member." },
        { user: "east_village_99", avatar: "🏘️", text: "Can confirm, it's gotten worse this week." },
      ];
      const rIdx = (hash + i * 11) % replyPool.length;
      const reply = replyPool[rIdx];
      comments.push({
        id: `seed_r_${itemId.slice(0, 8)}_${i}`,
        user: reply.user,
        avatar: reply.avatar,
        text: reply.text,
        time: now - (hoursAgo - 1) * 3600000,
        parentId: comments[comments.length - 1].id,
      });
    }
  }
  
  return comments;
}

// ── Community Status Votes (for capital projects) ────────────

export function getStatusVote(itemId: string): StatusVote {
  if (typeof window === "undefined") return { yes: 0, no: 0, userVote: null };
  
  const key = `fc_status_vote_${itemId}`;
  const stored = JSON.parse(localStorage.getItem(key) || "null");
  
  if (stored) return stored as StatusVote;
  
  // Seed with mock data
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = (hash * 31 + itemId.charCodeAt(i)) & 0x7fffffff;
  }
  
  return {
    yes: 3 + (hash % 8),
    no: hash % 4,
    userVote: null,
  };
}

export function castStatusVote(itemId: string, vote: "yes" | "no"): StatusVote {
  if (typeof window === "undefined") return { yes: 0, no: 0, userVote: null };
  
  const key = `fc_status_vote_${itemId}`;
  const current = getStatusVote(itemId);
  
  if (current.userVote === vote) return current; // already voted same
  
  // If changing vote, remove old
  if (current.userVote === "yes") current.yes--;
  if (current.userVote === "no") current.no--;
  
  // Add new vote
  if (vote === "yes") current.yes++;
  if (vote === "no") current.no++;
  current.userVote = vote;
  
  localStorage.setItem(key, JSON.stringify(current));
  return current;
}

// ── Time formatting helper ───────────────────────────────────

export function timeAgoFromTs(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
