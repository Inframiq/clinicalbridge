"use client";

import * as React from "react";
import { useAuthRole } from "@/context/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { reportSupabase } from "@/lib/supabase/log";
import {
  getThreadsForUser,
  getMessagesForThread,
  getProfileDisplayNames,
  startOrGetThread,
  sendMessageInSupabase,
  markThreadReadInSupabase,
} from "@/lib/supabase/services/messages";
import type { Message, MessageThread } from "@/types";

export interface ThreadSummary extends MessageThread {
  otherParticipantId: string;
  otherParticipantName: string;
  unreadCount: number;
}

interface MessagesContextValue {
  threads: ThreadSummary[];
  totalUnread: number;
  activeThreadId: string | null;
  openThread: (threadId: string) => void;
  messages: Message[];
  sendMessage: (body: string) => Promise<void>;
  startThreadWith: (otherProfileId: string) => Promise<string | null>;
  loading: boolean;
}

const MessagesContext = React.createContext<MessagesContextValue | null>(null);

async function fetchThreadsAndNames(userId: string) {
  const { data: threads } = await getThreadsForUser(userId);
  const otherIds = threads.map((t) => (t.participantOne === userId ? t.participantTwo : t.participantOne));
  const names = await getProfileDisplayNames(otherIds);
  return { threads, names };
}

async function fetchUnreadCounts(userId: string): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("thread_id")
    .eq("read", false)
    .neq("sender_id", userId);
  if (error) {
    reportSupabase("MessagesProvider.unread", error);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { thread_id: string }[]) {
    counts[row.thread_id] = (counts[row.thread_id] ?? 0) + 1;
  }
  return counts;
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthRole();
  const userId = user?.id;
  const [threadRows, setThreadRows] = React.useState<MessageThread[]>([]);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [unreadByThread, setUnreadByThread] = React.useState<Record<string, number>>({});
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(false);

  const activeThreadIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  // Initial load + reload whenever the signed-in user changes.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured || !userId) {
        if (!cancelled) {
          setThreadRows([]);
          setUnreadByThread({});
        }
        return;
      }
      const [{ threads, names: displayNames }, counts] = await Promise.all([
        fetchThreadsAndNames(userId),
        fetchUnreadCounts(userId),
      ]);
      if (cancelled) return;
      setThreadRows(threads);
      setNames((prev) => ({ ...prev, ...displayNames }));
      setUnreadByThread(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Realtime: any message or thread change refreshes the list; a change to
  // the currently-open thread also refreshes its message log.
  React.useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;
    const supabase = createClient();

    const refresh = () => {
      fetchThreadsAndNames(userId).then(({ threads, names: displayNames }) => {
        setThreadRows(threads);
        setNames((prev) => ({ ...prev, ...displayNames }));
      });
      fetchUnreadCounts(userId).then(setUnreadByThread);
    };

    const channel = supabase
      .channel("messages-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { thread_id?: string } | null;
          refresh();
          if (row?.thread_id && row.thread_id === activeThreadIdRef.current) {
            getMessagesForThread(row.thread_id).then(({ data }) => setMessages(data));
          }
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_threads" }, refresh)
      .subscribe((status, err) => {
        if (status !== "SUBSCRIBED" && status !== "CLOSED")
          reportSupabase("MessagesProvider.realtime", err ?? `channel status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const openThread = React.useCallback(
    (threadId: string) => {
      setActiveThreadId(threadId);
      setLoading(true);
      getMessagesForThread(threadId).then(({ data }) => {
        setMessages(data);
        setLoading(false);
      });
      if (userId) {
        markThreadReadInSupabase(threadId, userId).then(() => {
          fetchUnreadCounts(userId).then(setUnreadByThread);
        });
      }
    },
    [userId]
  );

  const sendMessage = React.useCallback(
    async (body: string) => {
      if (!activeThreadId || !userId || !body.trim()) return;
      const { data, error } = await sendMessageInSupabase(activeThreadId, userId, body);
      if (!error && data) {
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
        fetchThreadsAndNames(userId).then(({ threads, names: displayNames }) => {
          setThreadRows(threads);
          setNames((prev) => ({ ...prev, ...displayNames }));
        });
      }
    },
    [activeThreadId, userId]
  );

  const startThreadWith = React.useCallback(
    async (otherProfileId: string) => {
      if (!userId) return null;
      const { data } = await startOrGetThread(userId, otherProfileId);
      if (!data) return null;
      const { threads, names: displayNames } = await fetchThreadsAndNames(userId);
      setThreadRows(threads);
      setNames((prev) => ({ ...prev, ...displayNames }));
      openThread(data.id);
      return data.id;
    },
    [userId, openThread]
  );

  const threads: ThreadSummary[] = React.useMemo(
    () =>
      threadRows.map((t) => {
        const otherParticipantId = t.participantOne === userId ? t.participantTwo : t.participantOne;
        return {
          ...t,
          otherParticipantId,
          otherParticipantName: names[otherParticipantId] ?? "Unknown",
          unreadCount: unreadByThread[t.id] ?? 0,
        };
      }),
    [threadRows, names, unreadByThread, userId]
  );

  const totalUnread = React.useMemo(
    () => Object.values(unreadByThread).reduce((sum, n) => sum + n, 0),
    [unreadByThread]
  );

  const value = React.useMemo(
    () => ({
      threads,
      totalUnread,
      activeThreadId,
      openThread,
      messages,
      sendMessage,
      startThreadWith,
      loading,
    }),
    [threads, totalUnread, activeThreadId, openThread, messages, sendMessage, startThreadWith, loading]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = React.useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}
