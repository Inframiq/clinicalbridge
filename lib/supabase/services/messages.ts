import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Message, MessageThread } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapThreadRow(item: Record<string, any>): MessageThread {
  return {
    id: item.id,
    participantOne: item.participant_one,
    participantTwo: item.participant_two,
    lastMessageAt: item.last_message_at,
    createdAt: item.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessageRow(item: Record<string, any>): Message {
  return {
    id: item.id,
    threadId: item.thread_id,
    senderId: item.sender_id,
    body: item.body,
    read: Boolean(item.read),
    createdAt: item.created_at,
  };
}

export async function getThreadsForUser(
  userId: string,
  client?: SupabaseClient
): Promise<{ data: MessageThread[]; error: string | null }> {
  if (!isSupabaseConfigured || !isUuid(userId)) return { data: [], error: null };
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("message_threads")
      .select("*")
      .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      reportSupabase("getThreadsForUser", error);
      return { data: [], error: describeSupabaseError(error) };
    }
    return { data: (data ?? []).map(mapThreadRow), error: null };
  } catch (err) {
    reportSupabase("getThreadsForUser", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function getMessagesForThread(
  threadId: string,
  client?: SupabaseClient
): Promise<{ data: Message[]; error: string | null }> {
  if (!isSupabaseConfigured || !isUuid(threadId)) return { data: [], error: null };
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      reportSupabase("getMessagesForThread", error);
      return { data: [], error: describeSupabaseError(error) };
    }
    return { data: (data ?? []).map(mapMessageRow), error: null };
  } catch (err) {
    reportSupabase("getMessagesForThread", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

/**
 * Looks up a display name for each profile id, trying `doctors`
 * (first + last name) then `facilities` (name) - a thread's other
 * participant is always exactly one of the two. RLS already restricts each
 * table to rows the caller has a real relationship with, so an id that
 * resolves to neither simply means the caller cannot (or should not) see
 * that identity; callers should fall back to a generic label in that case.
 */
export async function getProfileDisplayNames(
  profileIds: string[],
  client?: SupabaseClient
): Promise<Record<string, string>> {
  const ids = Array.from(new Set(profileIds.filter(isUuid)));
  if (!isSupabaseConfigured || ids.length === 0) return {};
  client ??= createClient();
  const result: Record<string, string> = {};
  try {
    const [{ data: doctorRows }, { data: facilityRows }] = await Promise.all([
      client.from("doctors").select("profile_id, first_name, last_name").in("profile_id", ids),
      client.from("facilities").select("profile_id, name").in("profile_id", ids),
    ]);
    for (const row of doctorRows ?? []) {
      result[row.profile_id] = `Dr. ${row.first_name} ${row.last_name}`;
    }
    for (const row of facilityRows ?? []) {
      if (!result[row.profile_id]) result[row.profile_id] = row.name;
    }
  } catch (err) {
    reportSupabase("getProfileDisplayNames", err);
  }
  return result;
}

/**
 * Finds the existing thread between two profiles, or creates one. Fails
 * (via the RLS INSERT policy) unless the two profiles have a real
 * doctor<->facility relationship - see migration 014.
 */
export async function startOrGetThread(
  profileA: string,
  profileB: string,
  client?: SupabaseClient
): Promise<{ data: MessageThread | null; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(profileA) || !isUuid(profileB) || profileA === profileB) {
    return { data: null, error: "Invalid participants" };
  }
  const [participantOne, participantTwo] = [profileA, profileB].sort();
  client ??= createClient();
  try {
    const { data: existing, error: findError } = await client
      .from("message_threads")
      .select("*")
      .eq("participant_one", participantOne)
      .eq("participant_two", participantTwo)
      .maybeSingle();

    if (findError) {
      reportSupabase("startOrGetThread.find", findError);
      return { data: null, error: describeSupabaseError(findError) };
    }
    if (existing) return { data: mapThreadRow(existing), error: null };

    const { data: created, error: insertError } = await client
      .from("message_threads")
      .insert({ participant_one: participantOne, participant_two: participantTwo })
      .select()
      .single();

    if (insertError) {
      reportSupabase("startOrGetThread.insert", insertError);
      return { data: null, error: describeSupabaseError(insertError) };
    }
    return { data: mapThreadRow(created), error: null };
  } catch (err) {
    reportSupabase("startOrGetThread", err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function sendMessageInSupabase(
  threadId: string,
  senderId: string,
  body: string,
  client?: SupabaseClient
): Promise<{ data: Message | null; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(threadId) || !isUuid(senderId) || !body.trim()) {
    return { data: null, error: "Invalid message" };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("messages")
      .insert({ thread_id: threadId, sender_id: senderId, body: body.trim() })
      .select()
      .single();

    if (error) {
      reportSupabase("sendMessageInSupabase", error);
      return { data: null, error: describeSupabaseError(error) };
    }

    await client
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);

    return { data: mapMessageRow(data), error: null };
  } catch (err) {
    reportSupabase("sendMessageInSupabase", err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function markThreadReadInSupabase(
  threadId: string,
  readerId: string,
  client?: SupabaseClient
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  if (!isUuid(threadId) || !isUuid(readerId)) return { error: null };
  client ??= createClient();
  try {
    const { error } = await client
      .from("messages")
      .update({ read: true })
      .eq("thread_id", threadId)
      .eq("read", false)
      .neq("sender_id", readerId);

    if (error) {
      reportSupabase("markThreadReadInSupabase", error);
      return { error: describeSupabaseError(error) };
    }
    return { error: null };
  } catch (err) {
    reportSupabase("markThreadReadInSupabase", err);
    return { error: describeSupabaseError(err) };
  }
}
