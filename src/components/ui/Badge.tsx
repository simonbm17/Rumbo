import type { ReactNode } from "react";
import type { Tone } from "@/lib/labels";

const TONE_STYLE: Record<Tone, { background: string; color: string }> = {
  green: { background: "var(--tone-green-bg)", color: "var(--tone-green-fg)" },
  blue: { background: "var(--tone-blue-bg)", color: "var(--tone-blue-fg)" },
  amber: { background: "var(--tone-amber-bg)", color: "var(--tone-amber-fg)" },
  red: { background: "var(--tone-red-bg)", color: "var(--tone-red-fg)" },
  slate: { background: "var(--tone-slate-bg)", color: "var(--tone-slate-fg)" },
  violet: { background: "var(--tone-violet-bg)", color: "var(--tone-violet-fg)" },
  teal: { background: "var(--tone-teal-bg)", color: "var(--tone-teal-fg)" },
};

/**
 * Etiqueta de estado. El punto de color nunca va solo: siempre acompaña al
 * texto, para que el estado se entienda sin depender de distinguir colores.
 */
export function Badge({
  tone = "slate",
  children,
  dot = false,
  size = "md",
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full font-semibold ${
        size === "lg" ? "px-3.5 py-1.5 text-base" : "px-3 py-1 text-sm"
      }`}
      style={TONE_STYLE[tone]}
    >
      {dot && (
        <span
          className="size-2 rounded-full"
          style={{ background: "currentColor" }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
