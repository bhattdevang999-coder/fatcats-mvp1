"use client";

import { useState } from "react";
import Image from "next/image";

const SCREENS = [
  {
    icon: "📸",
    title: "Take a photo",
    subtitle: "Snap any infrastructure issue — pothole, broken light, flooding, anything.",
    accent: "from-amber-500/20 to-transparent",
    detail: null,
  },
  {
    icon: "🧠",
    title: "We do the rest",
    subtitle: "Our AI identifies what it is, rates severity, finds who's responsible, and estimates the cost to fix — instantly.",
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
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-[var(--fc-orange)]" : i < step ? "w-4 bg-[var(--fc-orange)]/40" : "w-2 bg-white/20"
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
          width={48}
          height={48}
          className="mb-6 opacity-50"
        />

        {/* Icon */}
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-b ${SCREENS[step].accent} flex items-center justify-center mb-6`}>
          <span className="text-4xl">{SCREENS[step].icon}</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">{SCREENS[step].title}</h2>
        <p className="text-[14px] text-[var(--fc-muted)] leading-relaxed">{SCREENS[step].subtitle}</p>

        {/* AI capabilities detail list (screen 2) */}
        {SCREENS[step].detail && (
          <div className="mt-5 w-full space-y-2">
            {SCREENS[step].detail!.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-left"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="text-[16px]">{item.icon}</span>
                <span className="text-[13px] text-white/80 font-medium">{item.label}</span>
                <span className="ml-auto text-[9px] text-[var(--fc-orange)] font-bold uppercase tracking-wider opacity-70">Beta</span>
              </div>
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
            Start exploring
          </button>
        )}
      </div>
    </div>
  );
}
