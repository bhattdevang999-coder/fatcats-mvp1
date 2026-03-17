"use client";
import { motion } from "framer-motion";

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-xl bg-[var(--fc-surface)] overflow-hidden relative ${className}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.2 }}
    >
      <div className="absolute inset-0 skeleton-shimmer" />
    </motion.div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6">
      {/* Hot Topics skeleton */}
      <div className="space-y-3">
        <Shimmer className="h-4 w-32" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} className="min-w-[200px] h-24 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Cards skeleton */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-xl border border-white/[0.06] overflow-hidden"
        >
          <Shimmer className="h-48 w-full rounded-none" />
          <div className="p-4 space-y-3 bg-[var(--fc-surface)]">
            <div className="flex gap-2">
              <Shimmer className="h-5 w-16 rounded-full" />
              <Shimmer className="h-5 w-24 rounded-full" />
            </div>
            <Shimmer className="h-5 w-3/4" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-2/3" />
            <div className="flex gap-4 pt-2">
              <Shimmer className="h-4 w-16" />
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-4 w-12" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full relative">
      <Shimmer className="w-full h-full rounded-none" />
      {/* Fake filter bar */}
      <div className="absolute top-4 left-4 right-4 flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      {/* Fake legend */}
      <div className="absolute bottom-20 left-4">
        <Shimmer className="h-24 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      {/* Avatar card */}
      <div className="rounded-xl border border-white/[0.06] p-6 bg-[var(--fc-surface)]">
        <div className="flex flex-col items-center gap-3">
          <Shimmer className="w-16 h-16 rounded-full" />
          <Shimmer className="h-6 w-40" />
          <Shimmer className="h-4 w-24" />
        </div>
      </div>
      {/* Stats */}
      <div className="rounded-xl border border-white/[0.06] p-5 bg-[var(--fc-surface)] space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Shimmer className="h-8 w-12" />
              <Shimmer className="h-3 w-16" />
            </div>
          ))}
        </div>
        <Shimmer className="h-3 w-full rounded-full" />
      </div>
      {/* Badges */}
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Shimmer key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
