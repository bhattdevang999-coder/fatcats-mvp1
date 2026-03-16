import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const fmsId = decodeURIComponent(params.id);
  const ogUrl = `/api/og/spending/${encodeURIComponent(fmsId)}`;

  return {
    title: `Contract Tracker — FatCats`,
    description: `Follow the money on NYC capital project ${fmsId}. Track budgets, schedules, and accountability.`,
    openGraph: {
      title: `Contract Tracker — FatCats`,
      description: `Follow the money on NYC capital project ${fmsId}`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Contract Tracker — FatCats`,
      description: `Follow the money on NYC capital project ${fmsId}`,
      images: [ogUrl],
    },
  };
}

export default function SpendingDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
