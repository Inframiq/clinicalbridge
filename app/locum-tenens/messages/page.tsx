"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Person } from "@/components/dashboard/person";
import { cn } from "@/lib/utils";

const threads = [
  {
    id: "t1",
    name: "Nurse Team",
    preview: "New patient arriving in 10 mins",
    messages: [
      { fromMe: false, text: "New patient arriving in 10 mins, Room 5." },
      { fromMe: true, text: "Got it, on my way." },
    ],
  },
  {
    id: "t2",
    name: "Front Desk",
    preview: "Timesheet approved for May 25",
    messages: [
      { fromMe: false, text: "Your timesheet for May 25 has been approved." },
      { fromMe: true, text: "Thank you!" },
    ],
  },
  {
    id: "t3",
    name: "City Medical Center Admin",
    preview: "Welcome to the team",
    messages: [{ fromMe: false, text: "Welcome to City Medical Center! Let us know if you need anything." }],
  },
];

export default function MessagesPage() {
  const [activeId, setActiveId] = useState(threads[0].id);
  const [draft, setDraft] = useState("");
  const active = threads.find((t) => t.id === activeId)!;

  return (
    <div>
      <PageHeader title="Messages" description="Communicate with facility staff and support." />
      <Card className="overflow-hidden py-0">
        <div className="grid grid-cols-1 sm:grid-cols-[280px_minmax(0,1fr)]">
          <div className="max-h-[560px] overflow-y-auto border-b border-border sm:border-r sm:border-b-0">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors last:border-b-0",
                  activeId === t.id ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <Person name={t.name} subtitle={t.preview} size="sm" />
              </button>
            ))}
          </div>

          <div className="flex h-[560px] flex-col">
            <div className="border-b border-border p-4">
              <p className="font-medium text-foreground">{active.name}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((m, i) => (
                <div key={i} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                      m.fromMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <CardContent className="flex items-center gap-2 border-t border-border p-3">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") setDraft("");
                }}
              />
              <Button size="icon" onClick={() => setDraft("")}>
                <Send className="size-4" />
              </Button>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}
