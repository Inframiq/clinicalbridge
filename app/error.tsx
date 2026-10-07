"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <div>
        <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An unexpected error occurred. You can try again, or reload the page if it persists.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
