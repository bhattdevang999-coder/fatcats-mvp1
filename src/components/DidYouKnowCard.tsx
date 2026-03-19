"use client";

import Link from "next/link";

interface DidYouKnowProps {
  shock: string;
  context: string;
  hook: string;
  href: string;
}

const FACTS: DidYouKnowProps[] = [
  { shock: "$38.3B", context: "in scope creep across 847 projects. Your taxes.", hook: "The receipts →", href: "/spending" },
  { shock: "$1.7M", context: "for one sidewalk project in Queens. Original bid was $22K.", hook: "See the paper trail →", href: "/spending" },
  { shock: "$2.1B", context: "spent in Brooklyn alone on 347 capital projects last year", hook: "Track them →", href: "/spending" },
  { shock: "$1.9M", context: "One playground in Staten Island. Started at $200K. 12 change orders later.", hook: "The full story →", href: "/spending" },
  { shock: "57 days", context: "to process one change order. That's just the paperwork.", hook: "See why →", href: "/spending" },
  { shock: "$4.2M", context: "for a playground that's still broken. Queens, District 24.", hook: "See the receipts →", href: "/spending" },
  { shock: "847 projects", context: "went over budget. The average overrun: $4.5M per project.", hook: "See the data →", href: "/spending" },
  { shock: "$12M", context: "in change orders on one road project. Brooklyn. Still not done.", hook: "The paper trail →", href: "/spending" },
];

export function getDidYouKnowFact(index: number): DidYouKnowProps {
  return FACTS[index % FACTS.length];
}

export default function DidYouKnowCard({ shock, context, hook, href }: DidYouKnowProps) {
  return (
    <Link
      href={href}
      className="block w-full glass-card p-4 border border-blue-500/10 hover:border-[var(--fc-orange)]/20 transition-all active:scale-[0.98] group"
      style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(30,41,59,0.8) 100%)" }}
    >
      {/* Label */}
      <p className="text-[10px] font-bold text-[var(--fc-muted)] uppercase tracking-widest mb-2">
        🐱 DID YOU KNOW?
      </p>
      {/* LINE 1: The shock */}
      <p className="text-[22px] font-black text-white leading-tight">
        {shock}
      </p>
      {/* LINE 2: The context */}
      <p className="text-[13px] text-[var(--fc-muted)] mt-1">
        {context}
      </p>
      {/* LINE 3: The hook */}
      <p className="text-[13px] text-[var(--fc-orange)] font-semibold mt-2 group-hover:underline">
        {hook}
      </p>
    </Link>
  );
}
