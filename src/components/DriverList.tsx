import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { DRIVER_STATUS } from "@/lib/labels";
import { fullName, initials } from "@/lib/format";
import type { DriverStatus, TruckStatus } from "@/generated/prisma/enums";

export type DriverRowData = {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  photoUrl: string | null;
  status: DriverStatus;
  archived: boolean;
  licenseClass: string | null;
  viajes: number;
  /**
   * El vehículo VIGENTE según DriverAssignment con `endedAt IS NULL`.
   * No sale de `Truck.currentDriverId` ni del último viaje.
   */
  vehiculo: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    status: TruckStatus;
  } | null;
};

/**
 * El listado de conductores es UNA lista, no dos vistas.
 *
 * En Vehículos las dos vistas se ganaron su sitio porque la fotografía de un
 * camión es dato operacional: se reconoce mirando. Un conductor no tiene ese
 * equivalente —lo que hay en `photoUrl` son retratos que la empresa puede o no
 * subir, no una señal de flota—, así que un muro de tarjetas no aportaría un
 * modo de lectura distinto: sería la misma información con más espacio. Copiar
 * el patrón por simetría habría sido replicar una forma sin su motivo.
 *
 * Lo que sí necesita esta pantalla es que la relación PERSONA ↔ VEHÍCULO se lea
 * de un golpe. Por eso la fila reserva una columna entera para el vehículo
 * asignado, con su placa dibujada como placa, y no lo esconde en una línea de
 * metadatos.
 */
export function DriverList({ conductores }: { conductores: DriverRowData[] }) {
  return (
    <ul className="overflow-hidden rounded-[var(--r-surface)] border border-[var(--border)] bg-[var(--surface)]">
      {conductores.map((c) => {
        const estado = DRIVER_STATUS[c.status];
        return (
          <li
            key={c.id}
            className="border-b border-[var(--border)] last:border-b-0"
          >
            <Link
              href={`/conductores/${c.id}`}
              className="flex min-h-11 items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] focus-ring"
            >
              {/* ---------- quién ---------- */}
              <span
                className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-2)] font-semibold text-[var(--text-muted)]"
                aria-hidden
              >
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  initials(c.firstName, c.lastName)
                )}
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <span className="flex min-w-0 flex-col gap-1 md:flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="truncate font-medium">{fullName(c)}</span>
                    <Badge
                      tone={c.archived ? "neutral" : estado.tone}
                      variant="quiet"
                    >
                      {c.archived ? "Archivado" : estado.label}
                    </Badge>
                  </span>
                  <span className="truncate text-sm text-[var(--text-muted)]">
                    <span className="font-mono">{c.documentId}</span>
                    {c.licenseClass ? ` · Licencia ${c.licenseClass}` : ""}
                    {` · ${c.viajes} ${c.viajes === 1 ? "viaje" : "viajes"}`}
                  </span>
                </span>

                {/* ---------- qué vehículo tiene ---------- */}
                <span className="flex min-w-0 items-center gap-3 md:w-[46%] md:shrink-0">
                  {c.vehiculo ? (
                    <>
                      <Plate value={c.vehiculo.plate} size="sm" />
                      <span className="min-w-0 truncate text-sm text-[var(--text-muted)]">
                        {c.vehiculo.brand} {c.vehiculo.model}
                      </span>
                    </>
                  ) : (
                    /*
                      «Sin vehículo asignado» escrito, nunca un guion. Es un
                      hecho operacional —esta persona está libre— y merece
                      leerse, no adivinarse.
                    */
                    <span className="text-sm text-[var(--text-muted)]">
                      Sin vehículo asignado
                    </span>
                  )}
                </span>
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
