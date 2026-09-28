"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useDoctors } from "@/hooks/use-doctors";
import { useFacilities } from "@/hooks/use-facilities";
import { getAuditLog, type AuditEntry } from "@/lib/supabase/services/audit-log";
import { getProfileDisplayNames } from "@/lib/supabase/services/messages";

const ACTION_META: Record<string, { label: string; tone: "info" | "success" | "warning" | "danger" | "neutral" }> = {
  admin_update: { label: "Admin change", tone: "info" },
  admin_insert: { label: "Admin create", tone: "info" },
  admin_delete: { label: "Admin delete", tone: "danger" },
  payout_status: { label: "Payout status", tone: "warning" },
  account_deleted: { label: "Account deleted", tone: "danger" },
  account_anonymised: { label: "Account anonymised", tone: "danger" },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function describeChanges(entry: AuditEntry): string[] {
  if (!entry.action.endsWith("update") && entry.action !== "payout_status") return [];
  return Object.entries(entry.changes).map(([column, diff]) => {
    const { old: before, new: after } = (diff ?? {}) as { old?: unknown; new?: unknown };
    return `${column}: ${formatValue(before)} → ${formatValue(after)}`;
  });
}

export default function SuperAdminAuditLogPage() {
  const { doctors } = useDoctors();
  const { facilities } = useFacilities();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getAuditLog();
      if (cancelled) return;
      setEntries(data);
      setError(error);
      setLoading(false);
      const names = await getProfileDisplayNames(data.map((e) => e.actorId ?? ""));
      if (!cancelled) setActorNames(names);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const targetNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const d of doctors) {
      names[d.id] = `Dr. ${d.firstName} ${d.lastName}`;
      if (d.profileId) names[d.profileId] = names[d.id];
    }
    for (const f of facilities) {
      names[f.id] = f.name;
      if (f.profileId) names[f.profileId] = f.name;
    }
    return names;
  }, [doctors, facilities]);

  const columns: ColumnDef<AuditEntry>[] = useMemo(
    () => [
      {
        id: "when",
        header: "When",
        accessorFn: (row) => row.occurredAt,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{new Date(row.original.occurredAt).toLocaleString()}</span>
        ),
      },
      {
        id: "who",
        header: "Who",
        accessorFn: (row) =>
          row.actorId ? actorNames[row.actorId] ?? (row.actorRole === "super_admin" ? "Super Admin" : row.actorId) : "System",
        cell: ({ getValue }) => <span className="text-sm text-foreground">{getValue() as string}</span>,
      },
      {
        id: "action",
        header: "Action",
        accessorFn: (row) => ACTION_META[row.action]?.label ?? row.action,
        cell: ({ row }) => {
          const meta = ACTION_META[row.original.action] ?? { label: row.original.action, tone: "neutral" as const };
          return <StatusBadge label={meta.label} tone={meta.tone} />;
        },
      },
      {
        id: "record",
        header: "Record",
        accessorFn: (row) => `${row.targetTable} ${row.targetId ? targetNames[row.targetId] ?? "" : ""}`,
        cell: ({ row }) => (
          <div>
            <p className="text-sm text-foreground">
              {(row.original.targetId && targetNames[row.original.targetId]) || row.original.targetId || "—"}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.targetTable}</p>
          </div>
        ),
      },
      {
        id: "changes",
        header: "Changes",
        accessorFn: (row) => describeChanges(row).join(" "),
        cell: ({ row }) => {
          const lines = describeChanges(row.original);
          if (lines.length === 0) return <span className="text-muted-foreground">—</span>;
          return (
            <ul className="max-w-md space-y-0.5 text-xs text-muted-foreground">
              {lines.map((line) => (
                <li key={line} className="truncate" title={line}>
                  {line}
                </li>
              ))}
            </ul>
          );
        },
      },
    ],
    [actorNames, targetNames]
  );

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every verification decision, document review and payout status change, with who made it. Entries cannot be edited or deleted."
      />
      {error ? (
        <p className="text-sm text-destructive">Couldn&apos;t load the audit log: {error}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading audit log...</p>
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          pageSize={20}
          searchPlaceholder="Search by person, action or record..."
          emptyTitle="No audited actions yet"
          emptyDescription="Admin decisions and payout changes will appear here."
        />
      )}
    </div>
  );
}
