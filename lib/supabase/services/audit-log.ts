import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reportSupabase, describeSupabaseError } from "../log";

export interface AuditEntry {
  id: number;
  occurredAt: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  targetTable: string;
  targetId: string | null;
  changes: Record<string, unknown>;
}

/** Most recent audit entries. RLS restricts this to the super admin (migration 024). */
export async function getAuditLog(
  limit = 500,
  client?: SupabaseClient
): Promise<{ data: AuditEntry[]; error: string | null }> {
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("audit_log")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) {
      reportSupabase("getAuditLog", error);
      return { data: [], error: describeSupabaseError(error) };
    }
    return {
      data: (data ?? []).map((row) => ({
        id: row.id,
        occurredAt: row.occurred_at,
        actorId: row.actor_id,
        actorRole: row.actor_role,
        action: row.action,
        targetTable: row.target_table,
        targetId: row.target_id,
        changes: row.changes ?? {},
      })),
      error: null,
    };
  } catch (err) {
    reportSupabase("getAuditLog", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}
