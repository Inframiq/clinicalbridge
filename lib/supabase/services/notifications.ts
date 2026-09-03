import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";
import { mapNotificationRow } from "../mappers";

export async function getNotifications(
  userId: string,
  client: SupabaseClient = createClient()
): Promise<{ data: AppNotification[]; error: string | null }> {
  if (!isUuid(userId)) return { data: [], error: null };
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

export async function markNotificationReadInSupabase(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = createClient();
  try {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  } catch (err) {
    reportSupabase(`markNotificationReadInSupabase(${id})`, err);
  }
}

export async function createNotificationInSupabase(
  userId: string,
  notification: Pick<AppNotification, "id" | "title" | "body" | "type">
): Promise<void> {
  if (!isUuid(userId) || !isUuid(notification.id)) return;
  const supabase = createClient();
  try {
    await supabase.from("notifications").insert({
      id: notification.id,
      user_id: userId,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      read: false,
    });
  } catch (err) {
    reportSupabase("createNotificationInSupabase", err);
  }
}
