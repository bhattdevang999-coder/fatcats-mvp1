import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ExposeClient from "./ExposeClient";

interface PageProps {
  params: { id: string };
}

const COST_RANGES: Record<string, string> = {
  pothole: "$800–$5K",
  streetlight: "$2K–$8K",
  street_light: "$2K–$8K",
  sidewalk: "$1.5K–$6K",
  road_damage: "$3K–$15K",
  traffic_signal: "$5K–$25K",
  water: "$5K–$50K",
  sewer: "$10K–$80K",
  trash: "$200–$1K",
  other: "$500–$5K",
};

async function fetchReport(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("reports")
    .select("id,title,status,category,neighborhood,description,supporters_count,created_at")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const report = await fetchReport(params.id);

  if (!report) {
    return {
      title: "Exposé | FatCats",
      description: "Civic intelligence from FatCats — Point. Expose. Fix.",
    };
  }

  const cost = COST_RANGES[report.category] || COST_RANGES.other;
  const neighborhood = report.neighborhood ?? "NYC";
  const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000));
  const affected = report.supporters_count || 0;
  const isOpen = report.status !== "fixed" && report.status !== "verified";

  // Cost-led title: "Est. ~$3K to fix — Pothole Still Open — Brooklyn"
  const title = isOpen
    ? `Est. ${cost} to fix — ${report.title} — ${neighborhood}`
    : `${report.title} — ${neighborhood} | FatCats`;

  // Dharmaraj voice description — cold, factual
  const affectedLine = affected > 0 ? `${affected} people affected. ` : "";
  const daysLine = isOpen && daysOpen > 14
    ? `${daysOpen} days. No one's moved. `
    : isOpen && daysOpen > 1
    ? `Filed ${daysOpen} days ago. Still waiting. `
    : "";
  const description = `${affectedLine}${daysLine}Point. Expose. Fix.`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fatcats-mvp1.vercel.app";
  const ogImageUrl = `${siteUrl}/api/og/${report.id}`;
  const pageUrl = `${siteUrl}/expose/${report.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "FatCats",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: report.title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: "@FatCatsApp",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ExposePage() {
  return <ExposeClient />;
}
