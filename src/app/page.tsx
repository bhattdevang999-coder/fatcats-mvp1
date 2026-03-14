"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Logo */}
      <div className="animate-fade-in-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
        <Image
          src="/assets/logo-256.png"
          alt="FatCats"
          width={140}
          height={140}
          priority
          className="mx-auto mb-8"
        />
      </div>

      {/* Headline */}
      <h1
        className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-4 animate-fade-in-up"
        style={{ animationDelay: "0.3s", opacity: 0 }}
      >
        Point. Expose. Fix.
      </h1>

      {/* Subline */}
      <p
        className="text-lg text-white/75 max-w-sm mb-3 animate-fade-in-up"
        style={{ animationDelay: "0.45s", opacity: 0 }}
      >
        Join the first watchdog network for your city.
      </p>

      {/* Small text */}
      <p
        className="text-sm text-[var(--fc-muted)] mb-12 animate-fade-in-up"
        style={{ animationDelay: "0.55s", opacity: 0 }}
      >
        NYC pilot · Public beta
      </p>

      {/* Start button */}
      <div
        className="w-full max-w-xs animate-fade-in-up"
        style={{ animationDelay: "0.7s", opacity: 0 }}
      >
        <button
          onClick={() => router.push("/report/new")}
          className="w-full h-14 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-lg transition-colors animate-pulse-glow active:scale-95 transition-transform"
        >
          Start
        </button>
      </div>

      {/* Quick nav */}
      <div
        className="flex gap-6 mt-8 animate-fade-in"
        style={{ animationDelay: "1s", opacity: 0 }}
      >
        <button
          onClick={() => router.push("/feed")}
          className="text-sm text-[var(--fc-muted)] hover:text-white transition-colors"
        >
          Feed
        </button>
        <button
          onClick={() => router.push("/map")}
          className="text-sm text-[var(--fc-muted)] hover:text-white transition-colors"
        >
          Map
        </button>
      </div>
    </div>
  );
}
