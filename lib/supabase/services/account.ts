import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reportSupabase, describeSupabaseError } from "../log";

/** Everything the platform holds about the signed-in user (migration 025). */
export async function exportMyData(
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  client ??= createClient();
  try {
    const { data, error } = await client.rpc("export_my_data");
    if (error) {
      reportSupabase("exportMyData", error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase("exportMyData", err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

/**
 * Removes every file under the user's own folder in the `documents` bucket.
 * Must go through the Storage API - deleting storage.objects rows from SQL
 * would leave the files themselves behind.
 */
async function deleteMyDocuments(client: SupabaseClient, userId: string): Promise<string | null> {
  const bucket = client.storage.from("documents");
  const paths: string[] = [];
  const pending = [userId];
  while (pending.length) {
    const prefix = pending.pop()!;
    const { data, error } = await bucket.list(prefix, { limit: 1000 });
    if (error) return describeSupabaseError(error);
    for (const entry of data ?? []) {
      // Folders come back without an id.
      if (entry.id) paths.push(`${prefix}/${entry.name}`);
      else pending.push(`${prefix}/${entry.name}`);
    }
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await bucket.remove(paths.slice(i, i + 100));
    if (error) return describeSupabaseError(error);
  }
  return null;
}

/**
 * Deletes the signed-in user's uploaded files, then their account. The
 * database decides between a full delete and an anonymisation that keeps
 * payouts/ratings for the other party (migration 025).
 */
export async function deleteMyAccount(
  userId: string,
  client?: SupabaseClient
): Promise<{ data: "deleted" | "anonymised" | null; error: string | null }> {
  client ??= createClient();
  try {
    const storageError = await deleteMyDocuments(client, userId);
    if (storageError) {
      reportSupabase("deleteMyAccount.documents", storageError);
      return { data: null, error: storageError };
    }
    const { data, error } = await client.rpc("delete_my_account");
    if (error) {
      reportSupabase("deleteMyAccount", error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data: data as "deleted" | "anonymised", error: null };
  } catch (err) {
    reportSupabase("deleteMyAccount", err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
