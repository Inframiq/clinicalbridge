import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/types";
import { isUuid } from "./utils";

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
      console.warn("Supabase notifications query error:", error?.message);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((item: Record<string, any>) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      timestamp: formatDistanceToNow(new Date(item.created_at), { addSuffix: true }),
      read: Boolean(item.read),
      type: item.type,
    }));
  } catch (err) {
    console.error("Failed to fetch notifications from Supabase:", err);
    return null;
  }
}

export async function markNotificationReadInSupabase(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = createClient();
  try {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  } catch (err) {
    console.error("Supabase mark notification read error:", err);
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
    console.error("Supabase insert notification error:", err);
  }
}
