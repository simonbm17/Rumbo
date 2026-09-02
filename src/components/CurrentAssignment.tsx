import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { TRUCK_STATUS } from "@/lib/labels";
import { date } from "@/lib/format";
import type { TruckStatus } from "@/generated/prisma/enums";

/**
 * VEHÍCULO ACTUAL — el bloque de más peso del expediente del conductor.
 *
 * Es lo que convierte una ficha de empleado en un actor operacional: no
 * interesa tanto quién es como qué está conduciendo ahora. Por eso ocupa una
 * franja propia, con la placa a tamaño grande y la fotografía del vehículo
 * como reconocimiento —la del vehículo, no la de la persona: la metáfora
 * VENTANA + LECTURA pertenece al activo, y aquí aparece en miniatura porque
 * quien manda es el conductor.
 *
 * El dato sale de DriverAssignment con `endedAt IS NULL`. Nunca del último
 * viaje ni de `Truck.currentDriverId`.
 */
export function CurrentAssignment({
  vehiculo,
  desde,
}: {
  vehiculo: {
    id: string;
    plate: string;
    nickname: string | null;
    brand: string;
    model: string;
    year: number;
    status: TruckStatus;
    photoUrl: string | null;
  } | null;
  /** `startedAt` de la asignación vigente. NULL en filas migradas. */
  desde: Date | null;
}) {
  if (!vehiculo) {
    /*
      Ausencia declarada, sin llamada a la acción gigante. Que alguien esté sin
      vehículo es un estado normal de la operación —acaba de terminar una
      asignación, está de descanso—, no un error que haya que corregir ya.
    */
    return (
      <section className="mb-6 rounded-[var(--r-surface)] border border-dashed border-[var(--border)] px-4 py-5">
        <h2 className="text-sm text-[var(--text-muted)]">Vehículo actual</h2>
        <p className="mt-1 text-lg">Sin vehículo asignado</p>
      </section>
    );
  }

  const estado = TRUCK_STATUS[vehiculo.status];

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm text-[var(--text-muted)]">Vehículo actual</h2>
      <Link
        href={`/camiones/${vehiculo.id}`}
        className="flex items-center gap-4 rounded-[var(--r-surface)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:bg-[var(--surface-hover)] focus-ring"
      >
        <span className="hidden w-28 shrink-0 overflow-hidden rounded-[var(--r-control)] bg-[var(--surface-2)] sm:block">
          <span className="window block">
            {vehiculo.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vehiculo.photoUrl} alt="" />
            ) : (
              <span className="flex size-full items-center justify-center px-2 text-center text-sm text-[var(--icon-muted)]">
                Sin foto
              </span>
            )}
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Plate value={vehiculo.plate} size="md" />
            <Badge tone={estado.tone} variant="quiet">
              {estado.label}
            </Badge>
          </span>
          <span className="truncate text-[var(--text-muted)]">
            {vehiculo.nickname && (
              <span className="font-medium text-[var(--text)]">
                {vehiculo.nickname}
                {" · "}
              </span>
            )}
            {vehiculo.brand} {vehiculo.model} · {vehiculo.year}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            {/*
              Sin `startedAt` la fila viene de la migración: se dice que no se
              conoce, no se inventa una fecha ni se toma la del primer viaje.
            */}
            {desde ? (
              <>Asignado desde el {date(desde)}</>
            ) : (
              <span className="italic">Inicio histórico no disponible</span>
            )}
          </span>
        </span>

        <ChevronRight
          className="size-5 shrink-0 text-[var(--icon-muted)]"
          aria-hidden
        />
      </Link>
    </section>
  );
}
