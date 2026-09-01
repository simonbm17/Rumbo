import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { TRUCK_STATUS } from "@/lib/labels";
import { km } from "@/lib/format";
import type { VehicleCardData } from "@/components/VehicleCard";

/**
 * La vista «Tabla» por debajo de 768px.
 *
 * Una tabla de siete columnas en un teléfono se resuelve técnicamente con
 * desplazamiento horizontal, y eso basta para que no se rompa nada. No basta
 * para que sirva: obliga a arrastrar de lado para leer una fila, y quien más
 * necesita esta pantalla es justamente quien menos va a descubrir que ahí
 * dentro hay más columnas escondidas.
 *
 * Así que en móvil la tabla no se encoge: cambia de forma. Conserva su
 * propósito —comparar y administrar rápido— y suelta lo que no cabe. Tipo, VIN
 * y los datos técnicos no viajan; están en la ficha del vehículo, que es donde
 * se consultan.
 *
 * No es una VehicleCard chica. No hay fotografía: acá no se reconoce mirando,
 * se administra leyendo. La densidad es intencional.
 *
 * El kilometraje va alineado a la derecha en la misma línea que el conductor.
 * Ese es el único gesto de tabla que sobrevive, y sobrevive porque es el que
 * hace el trabajo: todas las cifras caen en la misma vertical, así que se
 * comparan bajando la vista, sin leer número por número.
 */
export function VehicleList({ vehiculos }: { vehiculos: VehicleCardData[] }) {
  return (
    <ul className="overflow-hidden rounded-[var(--r-surface)] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
      {vehiculos.map((v) => {
        const estado = TRUCK_STATUS[v.status];
        return (
          <li key={v.id}>
            <Link
              href={`/camiones/${v.id}`}
              className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] focus-ring"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-center justify-between gap-3">
                  <Plate value={v.plate} size="sm" />
                  <Badge
                    tone={v.archived ? "neutral" : estado.tone}
                    variant="quiet"
                  >
                    {v.archived ? "Archivado" : estado.label}
                  </Badge>
                </span>

                <span className="truncate text-sm text-[var(--text-muted)]">
                  {v.brand} {v.model} · {v.year}
                  {v.nickname ? ` · ${v.nickname}` : ""}
                </span>

                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate">
                    {v.currentDriver
                      ? `${v.currentDriver.firstName} ${v.currentDriver.lastName}`
                      : "Sin conductor"}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-[var(--text-muted)]">
                    {km(v.odometerKm)}
                  </span>
                </span>

                {/*
                  La alerta no estaba en la lista de campos prioritarios, pero
                  es lo único de esta fila que pide una acción. Ocupa una línea
                  y solo cuando existe; si molesta, se quita.
                */}
                {v.alerta && (
                  <span
                    className="flex items-start gap-1.5 text-sm font-medium"
                    style={{
                      color: v.alerta.urgente
                        ? "var(--tone-danger-fg)"
                        : "var(--tone-warning-fg)",
                    }}
                  >
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span className="min-w-0">{v.alerta.texto}</span>
                  </span>
                )}
              </span>

              <ChevronRight
                className="size-5 shrink-0 text-[var(--icon-muted)]"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
