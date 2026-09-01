"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span
        className="flex size-14 items-center justify-center rounded-full"
        style={{
          background: "var(--tone-danger-bg)",
          color: "var(--tone-danger-fg)",
        }}
      >
        <AlertTriangle className="size-7" />
      </span>
      <div>
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">
          {error.message ||
            "No pudimos completar la operación. Probá de nuevo en unos segundos."}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-sm text-[var(--text-muted)]">
            Código: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
