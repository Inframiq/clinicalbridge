import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Department } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDepartmentRow(item: Record<string, any>): Department {
  return {
    id: item.id,
    facilityId: item.facility_id,
    name: item.name,
  };
}

export async function getDepartments(
  client?: SupabaseClient
): Promise<{ data: Department[]; error: string | null }> {
  if (!isSupabaseConfigured) return { data: [], error: null };
  client ??= createClient();
  try {
    const { data, error } = await client.from("departments").select("*").order("name");
    if (error) {
      reportSupabase("getDepartments", error);
      return { data: [], error: describeSupabaseError(error) };
    }
    return { data: (data ?? []).map(mapDepartmentRow), error: null };
  } catch (err) {
    reportSupabase("getDepartments", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function createDepartmentInSupabase(
  department: Department,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(department.id) || !isUuid(department.facilityId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("createDepartmentInSupabase: skipped non-uuid id", department.id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("departments")
      .insert({ id: department.id, facility_id: department.facilityId, name: department.name })
      .select()
      .single();
    if (error) {
      reportSupabase(`createDepartmentInSupabase(${department.id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`createDepartmentInSupabase(${department.id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function renameDepartmentInSupabase(
  id: string,
  name: string,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) return { data: null, error: null };
  client ??= createClient();
  try {
    const { data, error } = await client.from("departments").update({ name }).eq("id", id).select().single();
    if (error) {
      reportSupabase(`renameDepartmentInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`renameDepartmentInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function deleteDepartmentInSupabase(
  id: string,
  client?: SupabaseClient
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  if (!isUuid(id)) return { error: null };
  client ??= createClient();
  try {
    const { error } = await client.from("departments").delete().eq("id", id);
    if (error) {
      reportSupabase(`deleteDepartmentInSupabase(${id})`, error);
      return { error: describeSupabaseError(error) };
    }
    return { error: null };
  } catch (err) {
    reportSupabase(`deleteDepartmentInSupabase(${id})`, err);
    return { error: describeSupabaseError(err) };
  }
}
