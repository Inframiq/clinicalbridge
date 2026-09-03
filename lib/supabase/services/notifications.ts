import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/types";
import { isUuid } from "./utils";
import { reportSupabase } from "../log";
import { mapNotificationRow } from "../mappers";

export async function getNotifications(userId: string): Promise<AppNotification[] | null> {
  if (!isUuid(userId)) return null;
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      reportSupabase("getNotifications", error);
      return null;
    }

    return data.map((item) => mapNotificationRow(item));
  } catch (err) {
    reportSupabase("getNotifications", err);
    return null;
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
