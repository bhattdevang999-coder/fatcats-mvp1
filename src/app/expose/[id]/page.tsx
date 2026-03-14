import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ExposeClient from "./ExposeClient";

interface PageProps {
  params: { id: string };
}

async function fetchReport(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("reports")
    .select("id,title,status,category,neighborhood,description")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const report = await fetchReport(params.id);

  if (!report) {
    return {
      title: "Exposé | FatCats",
      description: "Street issue report on FatCats NYC.",
    };
  }

  const title = `${report.title} | FatCats`;
  const description = report.description
    ? `${report.description.slice(0, 150)}...`
    : `${report.status} issue in ${report.neighborhood ?? "New York City"}. Filed on FatCats.`;

  const ogImageUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://fatcats.nyc"
  }/api/og/${report.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
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
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ExposePage() {
  return <ExposeClient />;
}
