import type { ReactNode } from "react";
import type { Tone } from "@/lib/labels";

/*
  Cuatro familias semánticas, y al final el neutro, que no es una quinta: es lo
  que se pinta cuando no hay nada que señalar.
*/
const FG: Record<Tone, string> = {
  success: "var(--tone-success-fg)",
  warning: "var(--tone-warning-fg)",
  danger: "var(--tone-danger-fg)",
  info: "var(--tone-info-fg)",
  neutral: "var(--tone-neutral-fg)",
};

const BG: Record<Tone, string> = {
  success: "var(--tone-success-bg)",
  warning: "var(--tone-warning-bg)",
  danger: "var(--tone-danger-bg)",
  info: "var(--tone-info-bg)",
  neutral: "var(--tone-neutral-bg)",
};

/**
 * Etiqueta de estado. El punto de color nunca va solo: siempre acompaña al
 * texto, para que el estado se entienda sin depender de distinguir colores.
 *
 * Dos variantes, y la discreta existe por una razón concreta: en una grilla de
 * cuarenta vehículos, cuarenta pastillas de color son ruido. El punto basta
 * para ubicar y la palabra informa.
 *
 *   quiet — punto + texto, sin fondo. Predeterminada en listas y fichas.
 *   solid — fondo tenue. Cuando el estado ES el dato principal de la fila,
 *           como el vencimiento de un documento.
 */
export function Badge({
  tone = "neutral",
  children,
  dot = false,
  variant = "solid",
  size = "md",
}: {
  tone?: Tone;
  children: ReactNode;
  /** Solo aplica a la variante sólida; la discreta siempre lleva punto. */
  dot?: boolean;
  variant?: "solid" | "quiet";
  size?: "md" | "lg";
}) {
  if (variant === "quiet") {
    return (
      <span
        className={`inline-flex items-center gap-2 whitespace-nowrap font-medium ${
          size === "lg" ? "text-base" : "text-sm"
        }`}
        style={{ color: FG[tone] }}
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: "currentColor" }}
          aria-hidden
        />
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-[var(--r-control)] font-semibold ${
        size === "lg" ? "px-3 py-1 text-base" : "px-2.5 py-1 text-sm"
      }`}
      style={{ background: BG[tone], color: FG[tone] }}
    >
      {dot && (
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: "currentColor" }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
