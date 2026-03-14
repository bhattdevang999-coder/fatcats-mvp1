import { supabase } from "./supabase";

export interface CapitalProject {
  id: string;
  external_id: string | null;
  description: string | null;
  agency: string | null;
  planned_commit: number;
  spent_total: number;
  start_date: string | null;
  end_date: string | null;
  category: string | null;
  borough: string | null;
}

export interface SpendingSummary {
  totalPlanned: number;
  totalSpent: number;
  projectCount: number;
}

export interface BoroughSpending {
  borough: string;
  planned: number;
  spent: number;
  count: number;
}

export async function listCapitalProjects(filters?: {
  borough?: string;
  limit?: number;
}): Promise<CapitalProject[]> {
  let query = supabase
    .from("capital_projects")
    .select("*")
    .order("planned_commit", { ascending: false })
    .limit(filters?.limit ?? 200);

  if (filters?.borough && filters.borough !== "all") {
    query = query.eq("borough", filters.borough);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error listing capital projects:", error);
    return [];
  }
  return data ?? [];
}

export async function getSpendingSummary(): Promise<SpendingSummary> {
  const { data, error } = await supabase
    .from("capital_projects")
    .select("planned_commit,spent_total");

  if (error || !data) {
    return { totalPlanned: 0, totalSpent: 0, projectCount: 0 };
  }

  let totalPlanned = 0;
  let totalSpent = 0;
  for (const row of data) {
    totalPlanned += row.planned_commit ?? 0;
    totalSpent += row.spent_total ?? 0;
  }

  return {
    totalPlanned,
    totalSpent,
    projectCount: data.length,
  };
}

export async function getSpendingByBorough(): Promise<BoroughSpending[]> {
  const { data, error } = await supabase
    .from("capital_projects")
    .select("borough,planned_commit,spent_total");

  if (error || !data) return [];

  const map = new Map<string, BoroughSpending>();

  for (const row of data) {
    const borough = row.borough ?? "Citywide";
    const existing = map.get(borough) ?? { borough, planned: 0, spent: 0, count: 0 };
    existing.planned += row.planned_commit ?? 0;
    existing.spent += row.spent_total ?? 0;
    existing.count += 1;
    map.set(borough, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.planned - a.planned);
}
