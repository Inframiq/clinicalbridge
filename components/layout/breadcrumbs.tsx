"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function toLabel(segment: string) {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Breadcrumbs({ rootLabel }: { rootLabel: string }) {
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] is the role ("admin" | "doctor"), replace with rootLabel
  const rest = segments.slice(1);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {rest.length > 0 ? (
            <BreadcrumbLink asChild>
              <Link href={`/${segments[0]}`}>{rootLabel}</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{rootLabel}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {rest.length > 2 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
          </>
        )}
        {rest.slice(-2).map((seg, i, arr) => {
          const isLast = i === arr.length - 1;
          const href = `/${segments[0]}/${rest.slice(0, rest.length - arr.length + i + 1).join("/")}`;
          return (
            <div key={href} className="flex items-center gap-1.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{toLabel(seg)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{toLabel(seg)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
