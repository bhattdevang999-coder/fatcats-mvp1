"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import PageTransition from "./PageTransition";

function FeedIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? "#E8652B" : "none"} stroke={active ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="4" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? "#E8652B" : "none"} stroke={active ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ContractsIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? "#E8652B" : "none"} stroke={active ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? "#E8652B" : "none"} stroke={active ? "#E8652B" : "#8B95A8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/feed", Icon: FeedIcon },
  { href: "/map", Icon: MapIcon },
  { href: "/report/new", Icon: ReportIcon, isCenter: true },
  { href: "/spending", Icon: ContractsIcon },
  { href: "/profile", Icon: ProfileIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSplash = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        className="flex-1"
        style={{
          paddingTop: isSplash ? 0 : "var(--top-bar-height)",
          paddingBottom: isSplash ? 0 : "var(--bottom-bar-height)",
        }}
      >
        <PageTransition>{children}</PageTransition>
      </main>

      {!isSplash && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] backdrop-blur-xl bg-[var(--fc-bg)]/90 pb-safe">
          <div className="max-w-lg mx-auto flex items-end justify-around h-[var(--bottom-bar-height)] px-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (pathname?.startsWith(item.href + "/") ?? false);

              if (item.isCenter) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center justify-center -mt-5 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-[var(--fc-orange)] flex items-center justify-center shadow-lg shadow-[var(--fc-orange)]/30 group-hover:shadow-[var(--fc-orange)]/50 group-active:scale-90 transition-all animate-pulse-glow">
                      <item.Icon />
                    </div>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center py-2 px-3 group"
                >
                  <div className="transition-transform group-active:scale-90">
                    <item.Icon active={isActive} />
                  </div>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-[var(--fc-orange)] mt-1.5" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
