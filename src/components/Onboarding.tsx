"use client";

import { useState } from "react";
import Image from "next/image";

const SCREENS = [
  {
    icon: "📸",
    title: "See what's broken",
    subtitle: "Browse real issues reported by residents and city data across NYC.",
    accent: "from-amber-500/20 to-transparent",
  },
  {
    icon: "🐾",
    title: "Stamp what matters",
    subtitle: "One tap says 'me too.' Your stamp adds pressure and tracks impact.",
    accent: "from-[#E8652B]/20 to-transparent",
  },
  {
    icon: "✅",
    title: "Watch it get fixed",
    subtitle: "Track every issue through the pipeline — from reported to verified.",
    accent: "from-emerald-500/20 to-transparent",
  },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--fc-bg)] flex flex-col items-center justify-center px-6">
      {/* Progress dots */}
      <div className="absolute top-12 flex gap-2">
        {SCREENS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-[var(--fc-orange)]" : "w-2 bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col items-center text-center max-w-sm animate-fade-in" key={step}>
        {/* Logo */}
        <Image
          src="/assets/logo-128.png"
          alt="FatCats"
          width={56}
          height={56}
          className="mb-8 opacity-60"
        />

        {/* Icon */}
        <div className={`w-24 h-24 rounded-3xl bg-gradient-to-b ${SCREENS[step].accent} flex items-center justify-center mb-8`}>
          <span className="text-5xl">{SCREENS[step].icon}</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">{SCREENS[step].title}</h2>
        <p className="text-[15px] text-[var(--fc-muted)] leading-relaxed">{SCREENS[step].subtitle}</p>
      </div>

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
          <button
            onClick={onComplete}
            className="w-full h-13 py-3.5 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[15px] transition-colors active:scale-[0.98]"
          >
            Get started
          </button>
        )}
      </div>
    </div>
  );
}
