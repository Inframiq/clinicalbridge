"use client";

import { useMemo, useState } from "react";
import { Send, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Person } from "@/components/dashboard/person";
import { useAuthRole } from "@/context/auth-provider";
import { useMessages } from "@/context/messages-provider";
import { useFacilities } from "@/hooks/use-facilities";
import { useDoctors } from "@/hooks/use-doctors";
import { formatDistance } from "date-fns";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Shared "Messages" page body for every role. Who a user can start a new
 * thread with is derived from the same relationship-scoped data the RLS
 * layer already restricts them to: a doctor's `useFacilities()` list only
 * ever contains facilities they're employed by, applied to, or assigned a
 * shift at (see migration 013), and a hospital's `useDoctors()` list is the
 * mirror of that - so this list is exactly who they're allowed to message.
 */
export function MessagesPanel() {
  const { user, role } = useAuthRole();
  const { threads, activeThreadId, openThread, messages, sendMessage, startThreadWith } = useMessages();
  const { facilities } = useFacilities();
  const { doctors } = useDoctors();
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const candidates = useMemo(() => {
    if (role === "hospital") {
      return doctors
        .filter((d) => d.profileId && !threads.some((t) => t.otherParticipantId === d.profileId))
        .map((d) => ({ profileId: d.profileId!, name: `Dr. ${d.firstName} ${d.lastName}` }));
    }
    return facilities
      .filter((f) => f.profileId && !threads.some((t) => t.otherParticipantId === f.profileId))
      .map((f) => ({ profileId: f.profileId!, name: f.name }));
  }, [role, doctors, facilities, threads]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return (
    <Card className="overflow-hidden py-0">
      <div className="grid grid-cols-1 sm:grid-cols-[280px_minmax(0,1fr)]">
        <div className="max-h-[560px] overflow-y-auto border-b border-border sm:border-r sm:border-b-0">
          <div className="flex items-center justify-between border-b border-border p-3">
            <p className="text-sm font-medium text-foreground">Conversations</p>
            <Button variant="ghost" size="icon" onClick={() => setPickerOpen((v) => !v)} aria-label="Start conversation">
              <Plus className="size-4" />
            </Button>
          </div>

          {pickerOpen && (
            <div className="border-b border-border p-2">
              {candidates.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">
                  No one new to message yet — conversations open up once you have an application or assignment in common.
                </p>
              ) : (
                candidates.map((c) => (
                  <button
                    key={c.profileId}
                    onClick={() => {
                      startThreadWith(c.profileId);
                      setPickerOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
                  >
                    <Person name={c.name} size="sm" />
                  </button>
                ))
              )}
            </div>
          )}

          {threads.length === 0 && !pickerOpen ? (
            <div className="p-6">
              <EmptyState icon={MessageSquare} title="No conversations yet" description="Start one from the + above." />
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors last:border-b-0",
                  activeThreadId === t.id ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <Person
                  name={t.otherParticipantName}
                  subtitle={formatDistance(new Date(t.lastMessageAt), new Date(), { addSuffix: true })}
                  size="sm"
                />
                {t.unreadCount > 0 && (
                  <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-brand-foreground">
                    {t.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex h-[560px] flex-col">
          {!activeThread ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="border-b border-border p-4">
                <p className="font-medium text-foreground">{activeThread.otherParticipantName}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground">No messages yet — say hello.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.senderId === user?.id ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                          m.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        )}
                      >
                        {m.body}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <CardContent className="flex items-center gap-2 border-t border-border p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={MAX_MESSAGE_LENGTH}
                  onKeyDown={(e) => {
                    const trimmed = draft.trim();
                    if (e.key === "Enter" && trimmed && trimmed.length <= MAX_MESSAGE_LENGTH) {
                      sendMessage(trimmed);
                      setDraft("");
                    }
                  }}
                />
                <Button
                  size="icon"
                  disabled={!draft.trim() || draft.trim().length > MAX_MESSAGE_LENGTH}
                  onClick={() => {
                    sendMessage(draft.trim());
                    setDraft("");
                  }}
                >
                  <Send className="size-4" />
                </Button>
              </CardContent>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
