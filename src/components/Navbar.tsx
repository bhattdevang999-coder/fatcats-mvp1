"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const pathname = usePathname();

  // Hide on splash
  if (pathname === "/") return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[var(--top-bar-height)] border-b border-white/5 backdrop-blur-xl bg-[var(--fc-deep)]/85">
      <nav className="max-w-lg mx-auto px-4 h-full flex items-center">
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
      </nav>
    </header>
  );
}
