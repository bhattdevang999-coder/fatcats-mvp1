"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const pathname = usePathname();

  // Hide on splash
  if (pathname === "/") return null;

  const links = [
    { href: "/feed", label: "Feed" },
    { href: "/map", label: "Map" },
    { href: "/spending", label: "Spending" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 backdrop-blur-md bg-[var(--fc-navy)]/80">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/assets/logo-64.png"
            alt="FatCats"
            width={24}
            height={24}
            className="group-hover:scale-105 transition-transform"
          />
          <span className="text-white font-bold text-sm tracking-wider">
            FATCATS
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                pathname === link.href || pathname?.startsWith(link.href + "/")
                  ? "text-[var(--fc-orange)] bg-white/5"
                  : "text-[var(--fc-muted)] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
