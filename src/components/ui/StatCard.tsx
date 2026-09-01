import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import type { Tone } from "@/lib/labels";

const TONE_FG: Record<Tone, string> = {
  success: "var(--tone-success-fg)",
  info: "var(--tone-info-fg)",
  warning: "var(--tone-warning-fg)",
  danger: "var(--tone-danger-fg)",
  neutral: "var(--tone-neutral-fg)",
};

/**
 * Una cifra con su rótulo. El número manda: va primero en la jerarquía visual
 * y grande, porque es lo único que la persona busca cuando mira de reojo.
 *
 * El ícono ya no lleva pastilla de color de fondo: era decoración repetida en
 * cada tarjeta y competía con el dato.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "info",
  trend,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  /** Variación porcentual contra el periodo anterior. */
  trend?: number | null;
  href?: string;
}) {
  const showTrend = typeof trend === "number" && Number.isFinite(trend);

  const body = (
    <>
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        {icon && (
          <span style={{ color: TONE_FG[tone] }} aria-hidden>
            {icon}
          </span>
        )}
        <span className="font-medium">{label}</span>
      </div>

      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[var(--text)] sm:text-3xl">
        {value}
      </p>

      {(showTrend || hint) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)]">
          {showTrend && (
            <span
              className="inline-flex items-center gap-1 font-semibold"
              style={{
                color:
                  trend >= 0 ? "var(--tone-success-fg)" : "var(--tone-danger-fg)",
              }}
            >
              {trend >= 0 ? (
                <TrendingUp className="size-4" aria-hidden />
              ) : (
                <TrendingDown className="size-4" aria-hidden />
              )}
              {trend >= 0 ? "+" : ""}
              {trend.toFixed(1)}% vs. mes pasado
            </span>
          )}
          {hint && <span>{hint}</span>}
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="card pressable group flex h-full flex-col p-5 focus-ring"
      >
        {body}
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand)]">
          Ver detalle
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </Link>
    );
  }

  return <div className="card flex h-full flex-col p-5">{body}</div>;
}
