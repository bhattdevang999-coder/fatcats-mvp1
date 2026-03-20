import { supabase } from "./supabase";
import type { Report } from "./types";

export async function createCitizenReport(data: {
  title: string;
  description?: string;
  category: string;
  lat?: number | null;
  lng?: number | null;
  neighborhood?: string | null;
  photo_url?: string | null;
  author_device_hash: string;
}): Promise<Report | null> {
  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      source: "citizen",
      status: "unresolved",
      title: data.title,
      description: data.description || null,
      category: data.category,
      lat: data.lat || null,
      lng: data.lng || null,
      neighborhood: data.neighborhood || null,
      photo_url: data.photo_url || null,
      author_device_hash: data.author_device_hash,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating report:", error);
    return null;
  }
  return report;
}

export async function getReportById(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function listReports(filters?: {
  category?: string;
  status?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<Report[]> {
  let query = supabase
    .from("reports")
    .select("*")
    .neq("status", "deleted")
    .order("supporters_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.source) {
    query = query.eq("source", filters.source);
  }
  query = query.limit(filters?.limit || 100);
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error listing reports:", error);
    return [];
  }
  return data || [];
}

export async function listNearbyReports(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}): Promise<Report[]> {
  const r = params.radiusKm || 2;
  const degLat = r / 111;
  const degLng = r / (111 * Math.cos((params.lat * Math.PI) / 180));

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .gte("lat", params.lat - degLat)
    .lte("lat", params.lat + degLat)
    .gte("lng", params.lng - degLng)
    .lte("lng", params.lng + degLng)
    .order("created_at", { ascending: false })
    .limit(params.limit || 50);

  if (error) {
    console.error("Error listing nearby:", error);
    return [];
  }
  return data || [];
}

export async function listReportsByDevice(
  deviceHash: string
): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("author_device_hash", deviceHash)
    .eq("source", "citizen")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function addSupport(
  reportId: string,
  deviceHash: string
): Promise<boolean> {
  const { error: insertError } = await supabase
    .from("report_supports")
    .insert({ report_id: reportId, device_hash: deviceHash });

  if (insertError) {
    if (insertError.code === "23505") return false; // duplicate
    console.error("Error adding support:", insertError);
    return false;
  }

  // Increment supporters_count
  const { data: current } = await supabase
    .from("reports")
    .select("supporters_count")
    .eq("id", reportId)
    .single();

  if (current) {
    await supabase
      .from("reports")
      .update({ supporters_count: (current.supporters_count || 0) + 1 })
      .eq("id", reportId);
  }

  return true;
}

export async function hasSupported(
  reportId: string,
  deviceHash: string
): Promise<boolean> {
  const { data } = await supabase
    .from("report_supports")
    .select("id")
    .eq("report_id", reportId)
    .eq("device_hash", deviceHash)
    .maybeSingle();

  return !!data;
}

export async function markAsFixed(reportId: string): Promise<boolean> {
  const { error } = await supabase
    .from("reports")
    .update({ status: "fixed" })
    .eq("id", reportId);

  return !error;
}

export async function listMapReports(filters?: {
  category?: string;
  status?: string;
}): Promise<Report[]> {
  let query = supabase
    .from("reports")
    .select("id,lat,lng,title,source,status,category,supporters_count,photo_url,created_at")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .neq("status", "deleted")
    .limit(1000);

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data as Report[]) || [];
}

/**
 * Soft-delete a report. Only the original author (matched by device hash) can delete.
 * Sets status to 'deleted' rather than hard-deleting, preserving the accountability record.
 * Also cleans up associated co-signs.
 */
export async function deleteReport(
  reportId: string,
  deviceHash: string
): Promise<{ success: boolean; error?: string }> {
  // Verify ownership
  const { data: report } = await supabase
    .from("reports")
    .select("id, author_device_hash")
    .eq("id", reportId)
    .single();

  if (!report) return { success: false, error: "Report not found" };
  if (report.author_device_hash !== deviceHash) {
    return { success: false, error: "Only the author can delete this exposé" };
  }

  // Soft-delete: set status to 'deleted'
  const { error } = await supabase
    .from("reports")
    .update({ status: "deleted" })
    .eq("id", reportId);

  if (error) {
    console.error("Error deleting report:", error);
    return { success: false, error: "Failed to delete" };
  }

  // Clean up co-signs
  await supabase.from("cosigns").delete().eq("report_id", reportId);

  return { success: true };
}

export async function uploadReportPhoto(
  file: File,
  deviceHash: string
): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${deviceHash}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("report-photos")
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("report-photos")
    .getPublicUrl(path);

  return urlData.publicUrl;
}
