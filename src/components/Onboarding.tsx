"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { IntelLogo } from "@/components/FatCatsIntel";

const SCREENS = [
  {
    icon: "📸",
    title: "Take a photo",
    subtitle: "Snap any infrastructure issue — pothole, broken light, flooding, anything.",
    accent: "from-amber-500/20 to-transparent",
    detail: null,
  },
  {
    icon: "intel",
    title: "FatCats Intel takes over",
    subtitle: "Our intelligence engine identifies the issue, rates severity, finds who's responsible, and estimates the cost to fix — instantly.",
    accent: "from-[#E8652B]/20 to-transparent",
    detail: [
      { icon: "📍", label: "Auto-detect location & intersection" },
      { icon: "🔍", label: "Classify issue type & severity" },
      { icon: "🏛️", label: "Find your council member" },
      { icon: "💰", label: "Estimate repair cost" },
    ],
  },
  {
    icon: "📊",
    title: "Track & expose",
    subtitle: "Watch your report move through the pipeline. See who's responsible, what it costs, and whether it gets fixed.",
    accent: "from-emerald-500/20 to-transparent",
    detail: null,
  },
  {
    icon: "🐾",
    title: "Your city, accountable",
    subtitle: "Information this specific, this local, this actionable — doesn't exist anywhere else. You're the investigator.",
    accent: "from-purple-500/20 to-transparent",
    detail: null,
  },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--fc-bg)] flex flex-col items-center justify-center px-6">
      {/* Progress dots */}
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
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          {/* Logo */}
          <Image
            src="/assets/logo-128.png"
            alt="FatCats"
            width={48}
            height={48}
            className="mb-6 opacity-50"
          />

          {/* Icon */}
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-b ${SCREENS[step].accent} flex items-center justify-center mb-6`}>
            {SCREENS[step].icon === "intel" ? (
              <IntelLogo size={48} />
            ) : (
              <span className="text-4xl">{SCREENS[step].icon}</span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">{SCREENS[step].title}</h2>
          <p className="text-[14px] text-[var(--fc-muted)] leading-relaxed">{SCREENS[step].subtitle}</p>

          {/* AI capabilities detail list (screen 2) */}
          {SCREENS[step].detail && (
            <div className="mt-5 w-full space-y-2">
              {SCREENS[step].detail!.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-left"
                >
                  <span className="text-[16px]">{item.icon}</span>
                  <span className="text-[13px] text-white/80 font-medium">{item.label}</span>
                  <span className="ml-auto text-[9px] text-[var(--fc-orange)] font-bold uppercase tracking-wider opacity-70">Intel</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* "Product in development" note on last screen */}
          {step === SCREENS.length - 1 && (
            <div className="mt-5 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-[11px] text-amber-400/70 leading-relaxed">
                Product is under active development. AI features are in beta — accuracy improves with every report.
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
              Next
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
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-13 py-3.5 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[15px] transition-colors active:scale-[0.98]"
          >
            Start exploring
          </motion.button>
        )}
      </div>
    </div>
  );
}
