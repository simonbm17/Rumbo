"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "./Button";

/**
 * Botón de envío destructivo: pide confirmación antes de dejar que el
 * formulario dispare la server action.
 */
export function ConfirmButton({
  message,
  children,
  variant = "danger",
  size = "sm",
  className = "",
  title,
}: {
  message: string;
  children: ReactNode;
  variant?: "danger" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={`${buttonClass(variant, size)} ${className}`}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}
