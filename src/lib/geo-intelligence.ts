/**
 * Geo-Intelligence Module for FatCats
 * 
 * - Reverse geocoding (Mapbox) → nearest intersection, full address
 * - 311 cluster detection → how many issues nearby
 * - Cost estimation → average repair cost by category
 * - Repeat offender detection → how many times this location has been reported
 */

import { supabase } from "./supabase";
import type { Report } from "./types";
import { getCouncilMemberByNeighborhood, type CouncilMember } from "./council-districts";
import { getNeighborhoodFromLatLng } from "./device";

// ============================================================
// TYPES
// ============================================================

export interface NearbyReport {
  id: string;
  title: string;
  category: string;
  status: string;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface GeoIntelligence {
  // Location
  neighborhood: string;
  nearestIntersection: string | null;
  fullAddress: string | null;
  borough: string | null;
  
  // Council member
  councilMember: CouncilMember | null;
  
  // Cluster intelligence
  nearbyCount: number;
  nearbyOpenCount: number;
  oldestOpenDays: number | null;
  nearbyReports: NearbyReport[];
  
  // Cost intelligence
  estimatedCost: string | null;
  categoryAvgCost: string | null;
  totalAreaSpend: string | null;
  
  // Repeat offender
  repeatCount: number;
  isRepeatOffender: boolean;
}

export interface AIClassification {
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestedTitle: string;
  description: string;
  confidence: number;
}

// ============================================================
// AVERAGE REPAIR COSTS (NYC DOT / DEP public data estimates)
// ============================================================

const CATEGORY_COSTS: Record<string, { avg: number; range: string; unit: string }> = {
  pothole: { avg: 75, range: "$30-$150", unit: "per pothole" },
  road_damage: { avg: 3500, range: "$1,000-$10,000", unit: "per repair" },
  streetlight: { avg: 1200, range: "$400-$3,000", unit: "per fixture" },
  sidewalk: { avg: 1800, range: "$500-$5,000", unit: "per section" },
  trash: { avg: 250, range: "$50-$500", unit: "per cleanup" },
  water: { avg: 8500, range: "$2,000-$25,000", unit: "per incident" },
  sewer: { avg: 12000, range: "$3,000-$50,000", unit: "per repair" },
  traffic_signal: { avg: 2500, range: "$800-$5,000", unit: "per signal" },
  street_light: { avg: 1200, range: "$400-$3,000", unit: "per fixture" },
  other: { avg: 1500, range: "$200-$5,000", unit: "per incident" },
};

// ============================================================
// REVERSE GEOCODING (Mapbox)
// ============================================================

export async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string | null;
  intersection: string | null;
  neighborhood: string | null;
  borough: string | null;
}> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address,neighborhood,locality&access_token=${token}`
    );
    
    if (!res.ok) return { address: null, intersection: null, neighborhood: null, borough: null };
    
    const data = await res.json();
    const features = data.features || [];
    
    let address: string | null = null;
    let neighborhood: string | null = null;
    let borough: string | null = null;
    
    for (const f of features) {
      if (f.place_type?.includes("address") && !address) {
        address = f.place_name?.split(",")[0] || null;
      }
      if (f.place_type?.includes("neighborhood") && !neighborhood) {
        neighborhood = f.text || null;
      }
      if (f.place_type?.includes("locality") && !borough) {
        borough = f.text || null;
      }
    }
    
    // Try to build an intersection name from the address
    let intersection: string | null = null;
    if (address) {
      // Strip house numbers to get street name
      const street = address.replace(/^\d+\s+/, "");
      if (street) {
        intersection = `Near ${street}`;
      }
    }
    
    return { address, intersection, neighborhood, borough };
  } catch {
    return { address: null, intersection: null, neighborhood: null, borough: null };
  }
}

// ============================================================
// CLUSTER DETECTION
// ============================================================

export async function detectCluster(lat: number, lng: number, radiusBlocks: number = 3): Promise<{
  nearbyCount: number;
  nearbyOpenCount: number;
  oldestOpenDays: number | null;
  nearbyReports: Report[];
}> {
  // 1 NYC block ≈ 80 meters ≈ 0.00072 degrees lat, 0.00092 degrees lng
  const blockLat = 0.00072;
  const blockLng = 0.00092;
  const degLat = blockLat * radiusBlocks;
  const degLng = blockLng * radiusBlocks;
  
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .gte("lat", lat - degLat)
    .lte("lat", lat + degLat)
    .gte("lng", lng - degLng)
    .lte("lng", lng + degLng)
    .order("created_at", { ascending: true })
    .limit(100);
  
  if (error || !data) {
    return { nearbyCount: 0, nearbyOpenCount: 0, oldestOpenDays: null, nearbyReports: [] };
  }
  
  const openStatuses = ["unresolved", "open", "pending", "assigned", "in_progress"];
  const openReports = data.filter(r => openStatuses.includes(r.status));
  
  let oldestOpenDays: number | null = null;
  if (openReports.length > 0) {
    const oldest = new Date(openReports[0].created_at);
    oldestOpenDays = Math.floor((Date.now() - oldest.getTime()) / 86400000);
  }
  
  return {
    nearbyCount: data.length,
    nearbyOpenCount: openReports.length,
    oldestOpenDays,
    nearbyReports: data as Report[],
  };
}

// ============================================================
// REPEAT OFFENDER DETECTION
// ============================================================

export async function detectRepeatIssue(lat: number, lng: number, category: string): Promise<{
  repeatCount: number;
  isRepeatOffender: boolean;
  previousReports: Report[];
}> {
  // Tighter radius for repeat detection: 1 block
  const degLat = 0.00072;
  const degLng = 0.00092;
  
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("category", category)
    .not("lat", "is", null)
    .gte("lat", lat - degLat)
    .lte("lat", lat + degLat)
    .gte("lng", lng - degLng)
    .lte("lng", lng + degLng)
    .order("created_at", { ascending: false })
    .limit(20);
  
  if (error || !data) {
    return { repeatCount: 0, isRepeatOffender: false, previousReports: [] };
  }
  
  return {
    repeatCount: data.length,
    isRepeatOffender: data.length >= 3,
    previousReports: data as Report[],
  };
}

// ============================================================
// COST ESTIMATION
// ============================================================

export function estimateRepairCost(category: string): {
  estimated: string;
  range: string;
  unit: string;
} {
  const cost = CATEGORY_COSTS[category] || CATEGORY_COSTS.other;
  return {
    estimated: `$${cost.avg.toLocaleString()}`,
    range: cost.range,
    unit: cost.unit,
  };
}

export function estimateAreaSpend(nearbyCount: number, category: string): string {
  const cost = CATEGORY_COSTS[category] || CATEGORY_COSTS.other;
  const total = nearbyCount * cost.avg;
  if (total >= 1000000) return `$${(total / 1000000).toFixed(1)}M`;
  if (total >= 1000) return `$${(total / 1000).toFixed(0)}K`;
  return `$${total.toLocaleString()}`;
}

// ============================================================
// FULL GEO-INTELLIGENCE PIPELINE
// ============================================================

export async function getFullGeoIntelligence(
  lat: number,
  lng: number,
  category: string
): Promise<GeoIntelligence> {
  // Run all queries in parallel
  const [geocode, cluster, repeat] = await Promise.all([
    reverseGeocode(lat, lng),
    detectCluster(lat, lng, 3),
    detectRepeatIssue(lat, lng, category),
  ]);
  
  // Neighborhood from our local data (fallback)
  const localHood = getNeighborhoodFromLatLng(lat, lng);
  const neighborhood = geocode.neighborhood 
    ? `${geocode.neighborhood}, ${geocode.borough || "NYC"}`
    : localHood;
  
  // Council member lookup
  const councilMember = getCouncilMemberByNeighborhood(neighborhood);
  
  // Cost data
  const costData = estimateRepairCost(category);
  const areaSpend = estimateAreaSpend(cluster.nearbyCount, category);
  
  // Map nearby reports to lightweight NearbyReport type
  const nearbyReports: NearbyReport[] = cluster.nearbyReports.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    status: r.status,
    neighborhood: r.neighborhood,
    lat: r.lat,
    lng: r.lng,
    created_at: r.created_at,
  }));

  return {
    neighborhood,
    nearestIntersection: geocode.intersection,
    fullAddress: geocode.address,
    borough: geocode.borough,
    councilMember,
    nearbyCount: cluster.nearbyCount,
    nearbyOpenCount: cluster.nearbyOpenCount,
    oldestOpenDays: cluster.oldestOpenDays,
    nearbyReports,
    estimatedCost: costData.estimated,
    categoryAvgCost: costData.range,
    totalAreaSpend: areaSpend,
    repeatCount: repeat.repeatCount,
    isRepeatOffender: repeat.isRepeatOffender,
  };
}
