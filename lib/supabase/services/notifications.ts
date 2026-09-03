import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { AppNotification } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";
import { mapNotificationRow } from "../mappers";

export async function getNotifications(
  userId: string,
  client?: SupabaseClient
): Promise<{ data: AppNotification[]; error: string | null }> {
  if (!isSupabaseConfigured) return { data: [], error: null };
  if (!isUuid(userId)) return { data: [], error: null };
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      reportSupabase("getNotifications", error);
      return { data: [], error: describeSupabaseError(error) };
    }

    return { data: (data ?? []).map((item) => mapNotificationRow(item)), error: null };
  } catch (err) {
    reportSupabase("getNotifications", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function markNotificationReadInSupabase(
  id: string,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("markNotificationReadInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`markNotificationReadInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`markNotificationReadInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function createNotificationInSupabase(
  userId: string,
  notification: Pick<AppNotification, "id" | "title" | "body" | "type">,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(userId) || !isUuid(notification.id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("createNotificationInSupabase: skipped non-uuid id", notification.id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("notifications")
      .insert({
        id: notification.id,
        user_id: userId,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        read: false,
      })
      .select()
      .single();
    if (error) {
      reportSupabase(`createNotificationInSupabase(${notification.id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`createNotificationInSupabase(${notification.id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
