"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { buttonClass } from "./Button";

/**
 * Diálogo modal para los formularios rápidos (gastos, mantenimientos,
 * documentos, cargas). El contenido recibe `close` para poder cerrarse solo
 * cuando la server action termina bien.
 */
export function Modal({
  trigger,
  title,
  description,
  children,
  size = "md",
}: {
  trigger: { label: ReactNode; variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" };
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
  size?: "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);

    // Bloquea el scroll del fondo mientras el diálogo está abierto.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco al primer campo para poder escribir de una.
    const firstField = dialogRef.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]), select, textarea"
    );
    firstField?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass(trigger.variant ?? "primary", trigger.size ?? "sm")}
      >
        {trigger.label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center overflow-y-auto bg-black/55 p-4 py-10"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            ref={dialogRef}
            className={`card w-full ${
              size === "lg" ? "max-w-3xl" : "max-w-xl"
            } shadow-[var(--shadow-pop)]`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">{title}</h2>
                {description && (
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="-mr-1 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-ring"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="px-5 py-4">{children(() => setOpen(false))}</div>
          </div>
        </div>
      )}
    </>
  );
}
