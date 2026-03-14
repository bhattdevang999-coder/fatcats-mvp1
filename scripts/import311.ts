/**
 * FatCats 311 Data Import Script
 * 
 * Fetches recent NYC 311 Service Requests and upserts into Supabase.
 * 
 * Usage:
 *   npx tsx scripts/import311.ts
 * 
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE env vars. Set them in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// NYC Open Data 311 API
const API_BASE = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";

// Complaint types we care about
const COMPLAINT_TYPES = [
  "Pothole",
  "Street Condition",
  "Street Light Condition",
  "Sidewalk Condition",
  "Sanitation Condition",
  "Dirty Conditions",
  "Overflowing Litter Baskets",
];

function mapCategory(complaintType: string): string {
  const lower = complaintType.toLowerCase();
  if (lower.includes("pothole")) return "pothole";
  if (lower.includes("street light")) return "streetlight";
  if (lower.includes("sidewalk")) return "sidewalk";
  if (
    lower.includes("sanitation") ||
    lower.includes("dirty") ||
    lower.includes("litter")
  )
    return "trash";
  if (lower.includes("street condition")) return "pothole";
  return "other";
}

function mapStatus(rawStatus: string): string {
  const lower = rawStatus.toLowerCase();
  if (lower.includes("closed")) return "closed";
  if (lower.includes("pending") || lower.includes("assigned")) return "pending";
  return "open";
}

function buildTitle(complaintType: string, descriptor?: string): string {
  if (descriptor) {
    return `${descriptor} (city data)`;
  }
  return `${complaintType} reported by city data`;
}

interface NYC311Record {
  unique_key: string;
  created_date: string;
  closed_date?: string;
  status: string;
  complaint_type: string;
  descriptor?: string;
  latitude?: string;
  longitude?: string;
  borough?: string;
  city?: string;
  incident_address?: string;
}

async function fetchRecords(limit: number, daysBack: number): Promise<NYC311Record[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const sinceStr = since.toISOString().split("T")[0] + "T00:00:00.000";

  const typeFilter = COMPLAINT_TYPES.map((t) => `'${t}'`).join(",");
  const where = `complaint_type in(${typeFilter}) AND created_date > '${sinceStr}'`;

  const url = `${API_BASE}?$where=${encodeURIComponent(where)}&$limit=${limit}&$order=created_date DESC`;

  console.log(`Fetching up to ${limit} records from last ${daysBack} days...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function run() {
  const LIMIT = 500;
  const DAYS_BACK = 60;

  const records = await fetchRecords(LIMIT, DAYS_BACK);
  console.log(`Fetched ${records.length} records from NYC 311`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const rec of records) {
    const lat = rec.latitude ? parseFloat(rec.latitude) : null;
    const lng = rec.longitude ? parseFloat(rec.longitude) : null;

    // Skip records without location
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      skipped++;
      continue;
    }

    const neighborhood = rec.borough
      ? `${rec.borough}${rec.city ? `, ${rec.city}` : ""}`
      : "New York City";

    const row = {
      external_id: rec.unique_key,
      source: "311" as const,
      status: mapStatus(rec.status),
      category: mapCategory(rec.complaint_type),
      title: buildTitle(rec.complaint_type, rec.descriptor),
      description: rec.incident_address
        ? `Near ${rec.incident_address}`
        : null,
      lat,
      lng,
      neighborhood,
      created_at: rec.created_date,
    };

    const { error } = await supabase
      .from("reports")
      .upsert(row, { onConflict: "external_id" });

    if (error) {
      errors++;
      if (errors <= 5) console.error(`Error upserting ${rec.unique_key}:`, error.message);
    } else {
      inserted++;
    }
  }

  console.log(`\nDone!`);
  console.log(`  Inserted/updated: ${inserted}`);
  console.log(`  Skipped (no location): ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
