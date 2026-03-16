"use client";

import { useState, useEffect } from "react";
import {
  isFollowingReport,
  toggleFollowReport,
  isFollowingProject,
  toggleFollowProject,
} from "@/lib/follows";

// ── Bell Icon ─────────────────────────────────────────────────────────

function BellIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BellFilledIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────

interface FollowButtonProps {
  /** "report" follows a report by id; "project" follows a capital project by fmsId */
  kind: "report" | "project";
  id: string;
  variant?: "compact" | "prominent";
}

// ── Component ─────────────────────────────────────────────────────────

export default function FollowButton({
  kind,
  id,
  variant = "compact",
}: FollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setFollowing(
      kind === "report" ? isFollowingReport(id) : isFollowingProject(id)
    );
  }, [kind, id]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFollowing =
      kind === "report" ? toggleFollowReport(id) : toggleFollowProject(id);
    setFollowing(nowFollowing);
    if (nowFollowing) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 400);
    }
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90 ${
          following
            ? "bg-[var(--fc-orange)]/15 text-[var(--fc-orange)] border border-[var(--fc-orange)]/25"
            : "bg-white/[0.06] text-[var(--fc-muted)] border border-white/[0.08] hover:bg-white/[0.12] hover:text-white"
        } ${animating ? "scale-110" : ""}`}
        title={following ? "Unfollow" : "Follow for updates"}
      >
        {following ? <BellFilledIcon size={15} /> : <BellIcon size={15} />}
      </button>
    );
  }

  // prominent variant
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 h-11 rounded-xl font-bold text-[13px] transition-all active:scale-95 ${
        following
          ? "bg-[var(--fc-orange)] text-white"
          : "bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.12]"
      } ${animating ? "scale-105" : ""}`}
    >
      {following ? <BellFilledIcon size={16} /> : <BellIcon size={16} />}
      <span>{following ? "Following" : "Follow"}</span>
    </button>
  );
}
