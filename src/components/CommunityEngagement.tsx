"use client";

import { useState, useEffect, useRef } from "react";
import {
  getReactions,
  toggleReaction,
  getComments,
  addComment,
  getCommentCount,
  getStatusVote,
  castStatusVote,
  timeAgoFromTs,
  type Reaction,
  type Comment,
  type StatusVote,
} from "@/lib/community";

// ── Reaction Bar (inline, shows emoji breakdown) ──────────────────

export function ReactionBar({ itemId, compact = false }: { itemId: string; compact?: boolean }) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [total, setTotal] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const r = getReactions(itemId);
    setReactions(r);
    setTotal(r.reduce((s, x) => s + x.count, 0));
  }, [itemId]);

  const handleToggle = (label: string) => {
    const updated = toggleReaction(itemId, label);
    setReactions(updated);
    setTotal(updated.reduce((s, x) => s + x.count, 0));
  };

  if (compact) {
    // Compact: just the emoji chips + total
    const nonZero = reactions.filter(r => r.count > 0);
    if (nonZero.length === 0 && total === 0) return null;

    return (
      <button
        onClick={() => setShowAll(!showAll)}
        className="inline-flex items-center gap-1 text-[11px] text-[var(--fc-muted)] hover:text-white transition-colors"
      >
        {nonZero.slice(0, 3).map(r => (
          <span key={r.label} className="text-[12px]">{r.emoji}</span>
        ))}
        {total > 0 && <span className="font-semibold ml-0.5">{total}</span>}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Summary row — shows top reactions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-0.5">
          {reactions.filter(r => r.count > 0).slice(0, 4).map(r => (
            <span key={r.label} className="text-[14px]">{r.emoji}</span>
          ))}
        </div>
        {total > 0 && (
          <span className="text-[12px] text-[var(--fc-muted)]">
            <span className="text-white font-semibold">{total}</span> reactions
          </span>
        )}
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[11px] text-[var(--fc-orange)] font-medium hover:underline ml-auto"
        >
          {showAll ? "Hide" : "React"}
        </button>
      </div>

      {/* Expanded reaction picker */}
      {showAll && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in">
          {reactions.map(r => (
            <button
              key={r.label}
              onClick={() => handleToggle(r.label)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] transition-all active:scale-95 ${
                r.userReacted
                  ? "bg-[var(--fc-orange)]/15 text-[var(--fc-orange)] border border-[var(--fc-orange)]/30"
                  : "bg-white/[0.04] text-[var(--fc-muted)] border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              <span className="text-[14px]">{r.emoji}</span>
              <span className="font-semibold">{r.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Comment Section ─────────────────────────────────────────────────

export function CommentSection({ itemId, maxVisible = 3 }: { itemId: string; maxVisible?: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newText, setNewText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setComments(getComments(itemId));
  }, [itemId]);

  const handleSubmit = () => {
    if (!newText.trim()) return;
    const updated = addComment(itemId, newText.trim(), replyTo || undefined);
    setComments(updated);
    setNewText("");
    setReplyTo(null);
  };

  const handleReply = (commentId: string, userName: string) => {
    setReplyTo(commentId);
    setNewText(`@${userName} `);
    inputRef.current?.focus();
  };

  // Separate root comments and replies
  const rootComments = comments.filter(c => !c.parentId);
  const replies = comments.filter(c => c.parentId);
  const getReplies = (parentId: string) => replies.filter(r => r.parentId === parentId);

  const visibleRoots = showAll ? rootComments : rootComments.slice(0, maxVisible);
  const hiddenCount = rootComments.length - maxVisible;

  return (
    <div className="space-y-3">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          Comments
          <span className="text-[10px] font-bold text-[var(--fc-orange)] bg-[var(--fc-orange)]/10 px-1.5 py-0.5 rounded-full">
            {comments.length}
          </span>
        </h3>
      </div>

      {/* Comment threads */}
      <div className="space-y-3">
        {visibleRoots.map(c => (
          <div key={c.id}>
            <CommentBubble
              comment={c}
              onReply={() => handleReply(c.id, c.user)}
            />
            {/* Replies */}
            {getReplies(c.id).map(reply => (
              <div key={reply.id} className="ml-10 mt-2 pl-3 border-l border-white/[0.06]">
                <CommentBubble
                  comment={reply}
                  onReply={() => handleReply(c.id, reply.user)}
                  isReply
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Show more */}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[12px] text-[var(--fc-orange)] font-medium hover:underline"
        >
          View {hiddenCount} more comment{hiddenCount !== 1 ? "s" : ""}
        </button>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 pt-1">
        <div className="w-7 h-7 rounded-full bg-[var(--fc-surface-2)] flex items-center justify-center shrink-0 text-[12px]">
          🐱
        </div>
        <div className="flex-1 flex items-center gap-2 h-9 rounded-full bg-[var(--fc-surface-2)] border border-white/[0.06] px-3">
          {replyTo && (
            <button
              onClick={() => { setReplyTo(null); setNewText(""); }}
              className="text-[9px] text-[var(--fc-orange)] font-bold shrink-0"
            >
              ✕
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
            className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/20 min-w-0"
          />
          {newText.trim() && (
            <button
              onClick={handleSubmit}
              className="text-[11px] text-[var(--fc-orange)] font-bold shrink-0 hover:text-[var(--fc-orange-hover)] transition-colors"
            >
              Post
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentBubble({
  comment,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  onReply: () => void;
  isReply?: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <div
        className={`${isReply ? "w-6 h-6" : "w-8 h-8"} rounded-full bg-[var(--fc-surface-2)] flex items-center justify-center shrink-0 text-[${isReply ? "11" : "14"}px]`}
      >
        {comment.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[${isReply ? "11" : "12"}px] font-semibold text-white`}>{comment.user}</span>
          {comment.watchdogBadge && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/15 text-[8px] text-[var(--fc-orange)] font-bold">
              🔍 {comment.watchdogBadge}
            </span>
          )}
          <span className="text-[10px] text-[var(--fc-muted)]">{timeAgoFromTs(comment.time)}</span>
        </div>
        <p className={`text-[${isReply ? "12" : "13"}px] text-white/70 mt-0.5 leading-snug`}>{comment.text}</p>
        <button
          onClick={onReply}
          className="text-[10px] text-[var(--fc-muted)] hover:text-[var(--fc-orange)] transition-colors font-medium mt-1"
        >
          Reply
        </button>
      </div>
    </div>
  );
}

// ── Comment Count Badge (for use in cards/headers) ──────────────────

export function CommentCountBadge({ itemId }: { itemId: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(getCommentCount(itemId));
  }, [itemId]);

  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--fc-muted)]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {count}
    </span>
  );
}

// ── Community Status Vote (for capital projects) ────────────────────

export function CommunityStatusVote({ itemId, label = "Is this project actually completed?" }: { itemId: string; label?: string }) {
  const [vote, setVote] = useState<StatusVote>({ yes: 0, no: 0, userVote: null });
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const v = getStatusVote(itemId);
    setVote(v);
    setShowResults(v.userVote !== null);
  }, [itemId]);

  const handleVote = (choice: "yes" | "no") => {
    const updated = castStatusVote(itemId, choice);
    setVote(updated);
    setShowResults(true);
  };

  const total = vote.yes + vote.no;
  const yesPct = total > 0 ? Math.round((vote.yes / total) * 100) : 0;

  return (
    <div className="glass-card p-4 space-y-3 border border-amber-500/10">
      <div className="flex items-center gap-2">
        <span className="text-[15px]">🏗️</span>
        <h3 className="text-[13px] font-semibold text-white">{label}</h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold uppercase tracking-wider ml-auto">
          Community Vote
        </span>
      </div>
      <p className="text-[11px] text-[var(--fc-muted)] leading-snug">
        Official data may be outdated. Help verify — your vote helps keep the record accurate.
      </p>

      {!showResults ? (
        <div className="flex gap-2">
          <button
            onClick={() => handleVote("yes")}
            className="flex-1 h-10 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[12px] font-semibold hover:bg-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>✅</span> Yes, completed
          </button>
          <button
            onClick={() => handleVote("no")}
            className="flex-1 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-semibold hover:bg-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>🚧</span> Still ongoing
          </button>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in">
          <span className={vote.userVote === "yes" ? "text-green-400 text-[12px]" : "text-amber-400 text-[12px]"}>
            {vote.userVote === "yes" ? "✅ You say it's completed" : "🚧 You say it's still ongoing"}
          </span>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all duration-500"
              style={{ width: `${yesPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--fc-muted)]">
            <span>{yesPct}% say completed</span>
            <span>{total} votes</span>
          </div>
        </div>
      )}
    </div>
  );
}
