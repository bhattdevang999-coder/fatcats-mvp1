/**
 * Co-Sign Engine
 *
 * A co-sign is NOT a "like." It's a citizen saying:
 * "I see this too. I confirm this is real. Add my voice."
 *
 * Co-signs carry political weight — they show officials how many
 * citizens are affected by a single issue. More co-signs = more pressure.
 */

import { supabase } from "./supabase";

export interface CoSignResult {
  success: boolean;
  cosignNumber: number; // "You're co-signer #N"
  totalCosigns: number;
  isMilestone: boolean; // true at 5, 10, 25, 50, 100
  milestoneLabel: string | null; // e.g. "🔥 50 citizens strong"
  alreadyCosigned: boolean;
}

const MILESTONES = [5, 10, 25, 50, 100, 250, 500];

export async function addCoSign(
  reportId: string,
  deviceHash: string,
  userLat?: number | null,
  userLng?: number | null,
  userNeighborhood?: string | null
): Promise<CoSignResult> {
  // Insert co-sign
  const { error: insertError } = await supabase.from("cosigns").insert({
    report_id: reportId,
    device_hash: deviceHash,
    user_lat: userLat || null,
    user_lng: userLng || null,
    user_neighborhood: userNeighborhood || null,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      // Already co-signed
      const { data: current } = await supabase
        .from("reports")
        .select("cosign_count")
        .eq("id", reportId)
        .single();
      return {
        success: false,
        cosignNumber: 0,
        totalCosigns: current?.cosign_count || 0,
        isMilestone: false,
        milestoneLabel: null,
        alreadyCosigned: true,
      };
    }
    console.error("Error adding co-sign:", insertError);
    return {
      success: false,
      cosignNumber: 0,
      totalCosigns: 0,
      isMilestone: false,
      milestoneLabel: null,
      alreadyCosigned: false,
    };
  }

  // Increment cosign_count + update last_cosign_at
  const { data: current } = await supabase
    .from("reports")
    .select("cosign_count")
    .eq("id", reportId)
    .single();

  const newCount = (current?.cosign_count || 0) + 1;

  await supabase
    .from("reports")
    .update({
      cosign_count: newCount,
      last_cosign_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  const isMilestone = MILESTONES.includes(newCount);
  let milestoneLabel: string | null = null;
  if (isMilestone) {
    milestoneLabel = `🔥 ${newCount} citizens co-signed this exposé`;
  }

  return {
    success: true,
    cosignNumber: newCount,
    totalCosigns: newCount,
    isMilestone,
    milestoneLabel,
    alreadyCosigned: false,
  };
}

export async function hasCosigned(
  reportId: string,
  deviceHash: string
): Promise<boolean> {
  const { data } = await supabase
    .from("cosigns")
    .select("id")
    .eq("report_id", reportId)
    .eq("device_hash", deviceHash)
    .maybeSingle();

  return !!data;
}

export async function getCosignCount(reportId: string): Promise<number> {
  const { data } = await supabase
    .from("reports")
    .select("cosign_count")
    .eq("id", reportId)
    .single();

  return data?.cosign_count || 0;
}

/**
 * Get velocity: how many co-signs in the last N hours.
 * Used for "About to Blow" detection.
 */
export async function getRecentCosignVelocity(
  reportId: string,
  hoursBack: number = 24
): Promise<number> {
  const since = new Date(Date.now() - hoursBack * 3600000).toISOString();

  const { count, error } = await supabase
    .from("cosigns")
    .select("*", { count: "exact", head: true })
    .eq("report_id", reportId)
    .gte("created_at", since);

  if (error) return 0;
  return count || 0;
}

/**
 * Find near-duplicates: same category within ~1 block, last 30 days.
 * Used in the camera/upload flow to show "co-sign instead of re-report".
 */
export async function findNearDuplicates(
  lat: number,
  lng: number,
  category: string,
  excludeReportId?: string
): Promise<
  {
    id: string;
    title: string;
    cosign_count: number;
    supporters_count: number;
    created_at: string;
    neighborhood: string | null;
    photo_url: string | null;
    days_open: number;
  }[]
> {
  const degLat = 0.00072; // ~1 block
  const degLng = 0.00092;
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 86400000
  ).toISOString();

  let query = supabase
    .from("reports")
    .select(
      "id,title,cosign_count,supporters_count,created_at,neighborhood,photo_url"
    )
    .eq("category", category)
    .not("lat", "is", null)
    .gte("lat", lat - degLat)
    .lte("lat", lat + degLat)
    .gte("lng", lng - degLng)
    .lte("lng", lng + degLng)
    .gte("created_at", thirtyDaysAgo)
    .in("status", ["unresolved", "open", "pending", "assigned", "in_progress"])
    .order("cosign_count", { ascending: false })
    .limit(5);

  if (excludeReportId) {
    query = query.neq("id", excludeReportId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((r) => ({
    ...r,
    cosign_count: r.cosign_count || 0,
    days_open: Math.max(
      1,
      Math.floor(
        (Date.now() - new Date(r.created_at).getTime()) / 86400000
      )
    ),
  }));
}
