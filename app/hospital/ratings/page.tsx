"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Person } from "@/components/dashboard/person";
import { DataTable } from "@/components/data-table/data-table";
import { doctors } from "@/lib/mock-data/doctors";
import type { Doctor } from "@/types";

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex text-warning">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`size-3.5 ${i < Math.round(value) ? "fill-current" : ""}`} />
        ))}
      </div>
      <span className="text-sm font-medium text-foreground">{value.toFixed(1)}</span>
    </div>
  );
}

export default function RatingsPage() {
  const avgRating = doctors.reduce((sum, d) => sum + d.rating, 0) / doctors.length;
  const totalReviews = doctors.reduce((sum, d) => sum + d.reviewCount, 0);

  const columns: ColumnDef<Doctor>[] = useMemo(
    () => [
      {
        id: "doctor",
        header: "Doctor",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => (
          <Person name={`Dr. ${row.original.firstName} ${row.original.lastName}`} subtitle={row.original.specialty} className="max-w-[220px]" />
        ),
      },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => <StarRating value={row.original.rating} />,
      },
      {
        accessorKey: "reviewCount",
        header: "Reviews",
      },
      {
        accessorKey: "employmentType",
        header: "Type",
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader title="Ratings" description="Doctor performance ratings and reviews." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Average Rating" value={avgRating.toFixed(1)} icon={Star} iconTone="brand" helpText="Across all doctors" />
        <StatCard label="Total Reviews" value={String(totalReviews)} icon={Star} iconTone="warning" />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} data={doctors} searchPlaceholder="Search doctors..." />
      </div>
    </div>
  );
}
