"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname === "/") return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-[var(--top-bar-height)] transition-all duration-200 ${
        scrolled
          ? "bg-[var(--fc-bg)]/90 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-lg mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/assets/logo-64.png"
            alt="FatCats"
            width={28}
            height={28}
            className="group-hover:scale-105 transition-transform"
          />
          <span className="text-white font-bold text-[15px] tracking-wide">
            FatCats
          </span>
        </Link>

        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors active:scale-90">
          <BellIcon />
        </button>
      </nav>
    </header>
  );
}
