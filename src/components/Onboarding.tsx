"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Onboarding v2 — Dharmaraj Voice
 *
 * Old: 4 explanation slides (tutorial energy)
 * New: 2 emotion-first screens (primal energy)
 *
 * Screen 1: The punch. Show the problem. Make them feel "that's fucked up."
 * Screen 2: The weapon. You're the investigator now.
 *
 * No feature explanations. No capability lists. Feel first, understand later.
 */

const SCREENS = [
  {
    // SCREEN 1: The punch
    topline: "$2.1 billion",
    headline: "went missing from NYC projects last year.",
    subline: "Exposed by people with a phone camera. Not politicians.",
    accent: "from-red-500/20 to-transparent",
  },
  {
    // SCREEN 2: The weapon
    topline: "Point. Expose. Fix.",
    headline: "See something broken? You're the investigator now.",
    subline: null,
    accent: "from-[#E8652B]/20 to-transparent",
  },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--fc-bg)] flex flex-col items-center justify-center px-6">
      {/* Progress dots — just 2 now */}
      <div className="absolute top-12 flex gap-2">
        {SCREENS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === step ? 32 : i < step ? 16 : 8,
              backgroundColor: i === step ? "var(--fc-orange)" : i < step ? "rgba(232, 101, 43, 0.4)" : "rgba(255, 255, 255, 0.2)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="h-1 rounded-full"
          />
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          {/* Logo */}
          <Image
            src="/assets/logo-128.png"
            alt="FatCats"
            width={48}
            height={48}
            className="mb-8 opacity-60"
          />

          {/* The number / punch / topline */}
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className={`text-[36px] font-black leading-none mb-3 ${
              step === 0 ? "text-red-400" : "text-[var(--fc-orange)]"
            }`}
          >
            {SCREENS[step].topline}
          </motion.p>

          {/* Headline */}
          <h2 className="text-[18px] font-bold text-white leading-snug mb-4">
            {SCREENS[step].headline}
          </h2>

          {/* Subline (only screen 1) */}
          {SCREENS[step].subline && (
            <p className="text-[14px] text-[var(--fc-muted)] leading-relaxed">
              {SCREENS[step].subline}
            </p>
          )}

          {/* Product in development note (screen 2 only) */}
          {step === SCREENS.length - 1 && (
            <div className="mt-6 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[11px] text-[var(--fc-muted)] leading-relaxed">
                Product is under active development. Real NYC data. Real accountability.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="absolute bottom-12 w-full max-w-sm px-6 space-y-3">
        {step < SCREENS.length - 1 ? (
          <>
            <button
              onClick={() => setStep(step + 1)}
              className="w-full h-13 py-3.5 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[15px] transition-colors active:scale-[0.98]"
            >
              Show me
            </button>
            <button
              onClick={onComplete}
              className="w-full py-2 text-[13px] text-[var(--fc-muted)] hover:text-white transition-colors"
            >
              Skip
            </button>
          </>
        ) : (
          <motion.button
            onClick={onComplete}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-13 py-3.5 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[15px] transition-colors active:scale-[0.98]"
          >
            Start investigating
          </motion.button>
        )}
      </div>
    </div>
  );
}
