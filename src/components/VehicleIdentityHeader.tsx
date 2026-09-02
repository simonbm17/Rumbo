import Link from "next/link";
import { User } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { TRUCK_KIND, TRUCK_STATUS } from "@/lib/labels";
import { km, number } from "@/lib/format";
import type { TruckKind, TruckStatus } from "@/generated/prisma/enums";

export type VehicleIdentity = {
  plate: string;
  nickname: string | null;
  brand: string;
  model: string;
  year: number;
  kind: TruckKind;
  status: TruckStatus;
  archived: boolean;
  odometerKm: number;
  capacityKg: number | null;
  axles: number | null;
  fuelType: string | null;
  photoUrl: string | null;
};

/**
 * La cabecera del expediente: VENTANA + LECTURA, la misma firma de la ficha de
 * la lista, en grande.
 *
 * Que sea la misma composición no es economía de código: es lo que hace que
 * abrir un vehículo desde la grilla se sienta como acercarse al mismo objeto y
 * no como saltar a otra pantalla. La fotografía conserva su 3:2 y su mantel
 * neutro; la placa no se superpone a ella y sigue siendo el componente Plate.
 *
 * Desde 768px las dos zonas van lado a lado; por debajo se apilan con la
 * ventana arriba, porque en un teléfono se reconoce mirando antes que leyendo.
 * El umbral es 768 y no 1024 por una medida: apilada en una tableta, la
 * fotografía sola ocupaba 353px y empujaba la placa hasta los 500px de altura.
 * Lado a lado baja a 201px y el expediente empieza antes.
 */
export function VehicleIdentityHeader({
  vehiculo,
  conductor,
  acciones,
}: {
  vehiculo: VehicleIdentity;
  /** Conductor VIGENTE según DriverAssignment, no el último que condujo. */
  conductor: { id: string; nombre: string } | null;
  acciones?: ReactNode;
}) {
  const estado = TRUCK_STATUS[vehiculo.status];
  const descripcion = [
    vehiculo.brand,
    vehiculo.model,
    String(vehiculo.year),
    TRUCK_KIND[vehiculo.kind],
  ].join(" · ");

  return (
    <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-[minmax(260px,40%)_1fr] md:items-start md:gap-6">
      {/* ---------- VENTANA ---------- */}
      <div className="window overflow-hidden rounded-[var(--r-surface)] border border-[var(--border)]">
        {vehiculo.photoUrl ? (
          // La sube el cliente y puede ser SVG o rasterizada; <img> evita
          // depender del optimizador de next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vehiculo.photoUrl} alt={`Vehículo ${vehiculo.plate}`} />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 px-4 text-center">
            <span className="font-medium text-[var(--text-muted)]">
              Sin fotografía
            </span>
            <span className="text-sm text-[var(--icon-muted)]">
              {TRUCK_KIND[vehiculo.kind]} · se agrega al editar el vehículo
            </span>
          </div>
        )}
      </div>

      {/* ---------- LECTURA ---------- */}
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Plate value={vehiculo.plate} size="lg" />
          <Badge
            tone={vehiculo.archived ? "neutral" : estado.tone}
            variant="quiet"
            size="lg"
          >
            {vehiculo.archived ? "Archivado" : estado.label}
          </Badge>
        </div>

        <p className="text-lg text-[var(--text-muted)]">
          {vehiculo.nickname && (
            <span className="font-medium text-[var(--text)]">
              {vehiculo.nickname}
              {" · "}
            </span>
          )}
          {descripcion}
        </p>

        {/*
          Pares etiqueta/valor separados por reglas, no cuatro tarjetas. El dato
          no gana nada por vivir dentro de un rectángulo redondeado, y cuatro
          rectángulos convierten la cabecera en un tablero de indicadores.

          Dos columnas también en el teléfono. Apilados ocupaban 240px y
          empujaban el expediente fuera del primer viewport; en dos columnas de
          179px los cuatro valores siguen entrando en una línea cada uno
          —medido— y el bloque baja a 120px.
        */}
        <dl className="grid grid-cols-2 gap-x-6 border-t border-[var(--border)] sm:gap-x-8">
          <Dato etiqueta="Conductor asignado">
            {conductor ? (
              <Link
                href={`/conductores/${conductor.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-control)] underline decoration-[var(--border-control)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--accent)] focus-ring"
              >
                <User className="size-4 shrink-0" aria-hidden />
                {conductor.nombre}
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center text-[var(--text-muted)]">
                Sin conductor asignado
              </span>
            )}
          </Dato>
          <Dato etiqueta="Kilometraje">
            <span className="inline-flex min-h-11 items-center font-mono tabular-nums">
              {km(vehiculo.odometerKm)}
            </span>
          </Dato>
          <Dato etiqueta="Capacidad">
            <span className="inline-flex min-h-11 items-center font-mono tabular-nums">
              {vehiculo.capacityKg ? `${number(vehiculo.capacityKg)} kg` : "—"}
            </span>
          </Dato>
          <Dato etiqueta="Ejes y combustible">
            <span className="inline-flex min-h-11 items-center">
              {[
                vehiculo.axles ? `${vehiculo.axles} ejes` : null,
                vehiculo.fuelType,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </span>
          </Dato>
        </dl>

        {acciones && (
          <div className="flex items-center gap-3 no-print">
            {acciones}
          </div>
        )}
      </div>
    </section>
  );
}

function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)] py-1">
      <dt className="text-sm text-[var(--text-muted)]">{etiqueta}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
