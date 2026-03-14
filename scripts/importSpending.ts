import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const INFRA_KEYWORDS = [
  "road",
  "street",
  "bridge",
  "sidewalk",
  "sewer",
  "water",
  "highway",
  "paving",
  "reconstruction",
  "signal",
];

interface RawProject {
  maprojid?: string;
  descriptio?: string;
  magencyname?: string;
  totalplannedcommit?: string | number;
  spent_total?: string | number;
  mindate?: string;
  maxdate?: string;
  borough?: string;
  [key: string]: unknown;
}

function inferBorough(description: string): string {
  const d = description.toUpperCase();
  if (d.includes(" BX ") || d.includes("BX-") || d.includes("BRONX")) return "Bronx";
  if (d.includes(" BK ") || d.includes("BK-") || d.includes("BROOKLYN")) return "Brooklyn";
  if (d.includes(" MN ") || d.includes("MN-") || d.includes("MANHATTAN")) return "Manhattan";
  if (d.includes(" QN ") || d.includes("QN-") || d.includes("QUEENS")) return "Queens";
  if (d.includes("STATEN ISLAND") || d.includes(" SI ") || d.includes("SI-")) return "Staten Island";
  return "Citywide";
}

function toNumber(val: string | number | undefined): number {
  if (val === undefined || val === null) return 0;
  const n = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]/g, "")) : val;
  return isNaN(n) ? 0 : Math.round(n);
}

async function main() {
  console.log("Fetching capital projects from NYC Open Data...");
  const url =
    "https://data.cityofnewyork.us/resource/fi59-268w.json?$limit=2000";

  const resp = await fetch(url);
  if (!resp.ok) {
    console.error("Failed to fetch:", resp.status, resp.statusText);
    process.exit(1);
  }

  const raw: RawProject[] = await resp.json();
  console.log(`Fetched ${raw.length} total projects`);

  const filtered = raw.filter((p) => {
    const desc = (p.descriptio ?? "").toLowerCase();
    return INFRA_KEYWORDS.some((kw) => desc.includes(kw));
  });

  console.log(`Filtered to ${filtered.length} infrastructure projects`);

  const records = filtered.map((p) => {
    const description = p.descriptio ?? "";
    return {
      external_id: p.maprojid ?? null,
      description,
      agency: p.magencyname ?? null,
      planned_commit: toNumber(p.totalplannedcommit),
      spent_total: toNumber(p.spent_total),
      start_date: p.mindate ?? null,
      end_date: p.maxdate ?? null,
      borough: inferBorough(description),
      category: "infrastructure",
    };
  });

  // Upsert in batches of 100
  let inserted = 0;
  let failed = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("capital_projects")
      .upsert(batch, { onConflict: "external_id" });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
      process.stdout.write(`\rUpserted ${inserted} / ${records.length}`);
    }
  }

  console.log(`\nDone. Inserted/updated: ${inserted}, Failed: ${failed}`);
}

main().catch(console.error);
