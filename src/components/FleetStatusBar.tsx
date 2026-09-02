import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { TruckStatus } from "@/generated/prisma/enums";
import { TRUCK_STATUS } from "@/lib/labels";

const TONE_COLOR = {
  success: "var(--tone-success-fg)",
  info: "var(--tone-info-fg)",
  warning: "var(--tone-warning-fg)",
  danger: "var(--tone-danger-fg)",
  neutral: "var(--tone-neutral-fg)",
} as const;

export type ConteoEstado = { status: TruckStatus; total: number };

/**
 * Resumen operacional de la flota: una sola franja, no cuatro tarjetas de
 * indicador.
 *
 * Responde «¿cómo está mi flota?» de un vistazo y cada segmento filtra la
 * lista. La barra proporcional de arriba deja ver el reparto sin leer los
 * números; los números están debajo para quien necesita el dato exacto.
 *
 * El segmento activo se marca con el acento y con `aria-current`, no solo con
 * color.
 *
 * EN MÓVIL la franja se aprieta, no se recorta: siguen los cuatro estados y las
 * alertas, y cada uno sigue filtrando. Lo que cambia es el tamaño de la cifra
 * (22px → 18px) y la separación entre columnas (24px → 12px), que es lo que
 * hace que quepan en dos filas en vez de tres. Medido a 390px: 84px menos por
 * encima del primer vehículo, sin bajar de 16px de texto ni de 44px de altura
 * tocable.
 */
export function FleetStatusBar({
  conteos,
  conAlertas,
  estadoActivo,
  basePath,
  queryString,
  etiquetaAlertas = (n) => (n === 1 ? "con alerta" : "con alertas"),
}: {
  conteos: ConteoEstado[];
  /** Vehículos con documento vencido o mantenimiento próximo. */
  conAlertas: number;
  estadoActivo: string;
  basePath: string;
  /** Query string vigente: filtrar por estado no puede borrar el contexto. */
  queryString: string;
  /*
    Cómo se nombra el recuento de alertas. Opcional y con el texto de siempre
    por defecto, así Vehículos no cambia. Existe porque en el Panel esta franja
    convive con otro recuento —el de la sección «Necesita atención»— que cuenta
    otra unidad, y dos números vecinos que no dicen qué cuentan se leen como una
    contradicción. Acá la unidad son VEHÍCULOS; allá, situaciones.
  */
  etiquetaAlertas?: (n: number) => string;
}) {
  const total = conteos.reduce((acc, c) => acc + c.total, 0);
  if (total === 0) return null;

  const visibles = conteos.filter((c) => c.total > 0);

  /*
    Cada segmento conserva la búsqueda, el tipo y la vista elegida. Tocar un
    estado acota la lista; no reinicia la pantalla.
  */
  function href(status: string | null) {
    const p = new URLSearchParams(queryString);
    p.delete("page");
    if (status) p.set("status", status);
    else p.delete("status");
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="mb-4 sm:mb-6">
      {/* Reparto proporcional. Decorativo para el lector de pantalla: los
          números de abajo dicen exactamente lo mismo. */}
      <div
        className="mb-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full sm:mb-3"
        aria-hidden
      >
        {visibles.map((c) => (
          <span
            key={c.status}
            style={{
              width: `${(c.total / total) * 100}%`,
              background: TONE_COLOR[TRUCK_STATUS[c.status].tone],
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-6 sm:gap-y-3">
        {visibles.map((c) => {
          const meta = TRUCK_STATUS[c.status];
          const activo = estadoActivo === c.status;
          return (
            <Link
              key={c.status}
              href={activo ? href(null) : href(c.status)}
              aria-current={activo ? "true" : undefined}
              className="group flex min-h-11 items-center gap-2 rounded-[var(--r-control)] px-1 focus-ring sm:gap-2.5"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: TONE_COLOR[meta.tone] }}
                aria-hidden
              />
              <span className="font-mono text-lg font-semibold tabular-nums text-[var(--text)] sm:text-xl">
                {c.total}
              </span>
              <span
                className={`text-sm ${
                  activo
                    ? "font-semibold text-[var(--accent)] underline decoration-2 underline-offset-4"
                    : "text-[var(--text-muted)] group-hover:text-[var(--text)]"
                }`}
              >
                {meta.label}
              </span>
            </Link>
          );
        })}

        {/*
          Sin barra separadora. Cuando la fila se parte en dos —pasa desde una
          tableta hacia abajo— la barra queda colgando sola al final de la
          primera línea, como un renglón cortado. El bloque de alertas ya se
          distingue por el ícono, el color y el subrayado; no necesita que algo
          lo separe.
        */}
        {conAlertas > 0 && (
          <>
            <Link
              href="/documentos"
              className="flex min-h-11 items-center gap-2 rounded-[var(--r-control)] px-1 text-[var(--tone-danger-fg)] focus-ring"
            >
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              <span className="font-mono text-lg font-semibold tabular-nums sm:text-xl">
                {conAlertas}
              </span>
              <span className="text-sm font-medium underline decoration-2 underline-offset-4">
                {etiquetaAlertas(conAlertas)}
              </span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
