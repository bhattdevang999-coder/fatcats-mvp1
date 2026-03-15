"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Onboarding = dynamic(() => import("@/components/Onboarding"), { ssr: false });

export default function SplashPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"enter" | "exit" | "onboarding">("enter");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = typeof window !== "undefined" && window.sessionStorage?.getItem?.("fc_onboarded");

    if (seen) {
      // Skip onboarding
      const exitTimer = setTimeout(() => setPhase("exit"), 1200);
      const navTimer = setTimeout(() => router.replace("/feed"), 1800);
      return () => { clearTimeout(exitTimer); clearTimeout(navTimer); };
    } else {
      // Show onboarding after splash
      const timer = setTimeout(() => {
        setPhase("onboarding");
        setShowOnboarding(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [router]);

  const handleOnboardingComplete = () => {
    try { window.sessionStorage?.setItem?.("fc_onboarded", "1"); } catch {}
    setShowOnboarding(false);
    router.replace("/feed");
  };

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-6 transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "var(--fc-bg)" }}
    >
      {/* Logo */}
      <div className="animate-fade-in-up" style={{ animationDelay: "0.05s", animationFillMode: "forwards", opacity: 0 }}>
        <Image
          src="/assets/logo-256.png"
          alt="FatCats"
          width={100}
          height={100}
          priority
          className="mx-auto mb-6"
        />
      </div>

      {/* Tagline */}
      <h1
        className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight animate-fade-in-up"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards", opacity: 0 }}
      >
        Point. Expose. Fix.
      </h1>

      {/* Subtle pulse bar */}
      <div
        className="mt-8 w-12 h-[2px] bg-[var(--fc-orange)] rounded-full animate-fade-in"
        style={{ animationDelay: "0.5s", animationFillMode: "forwards", opacity: 0 }}
      />
    </div>
  );
}
