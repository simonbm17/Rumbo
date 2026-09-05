import Link from "next/link";
import { TriangleAlert, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { TRUCK_KIND, TRUCK_STATUS, type Tone } from "@/lib/labels";
import { km } from "@/lib/format";
import type { TruckKind, TruckStatus } from "@/generated/prisma/enums";

export type VehicleCardData = {
  id: string;
  plate: string;
  nickname: string | null;
  brand: string;
  model: string;
  year: number;
  kind: TruckKind;
  status: TruckStatus;
  odometerKm: number;
  photoUrl: string | null;
  archived: boolean;
  currentDriver: { firstName: string; lastName: string } | null;
  /** Solo si existe. La tarjeta no reserva espacio vacío para esto. */
  alerta?: { texto: string; urgente: boolean } | null;
};

/**
 * VENTANA + LECTURA — el elemento firma del producto.
 *
 * Arriba, la ventana: la fotografía en 3:2 fijo sobre un mantel neutro. Una
 * foto con cielo blanco y otra tomada en una bodega oscura ocupan el mismo
 * marco y no desalinean la grilla. Nada se superpone salvo el estado, que lleva
 * un degradado corto anclado abajo para tener contraste sobre cualquier foto.
 *
 * Abajo, la lectura, en el orden en que se decide: placa, estado, qué vehículo
 * es, quién lo tiene, cuánto ha rodado, y solo si existe, qué le pasa.
 *
 * La placa NO va sobre la fotografía. Hay una sola representación oficial de la
 * placa y vive en la lectura, donde siempre tiene el mismo contraste.
 */
/** Versiones claras de cada familia, para el recuadro sobre la fotografía. */
const SOBRE_FOTO: Record<Tone, string> = {
  success: "var(--tone-success-bright)",
  warning: "var(--tone-warning-bright)",
  danger: "var(--tone-danger-bright)",
  info: "var(--tone-info-bright)",
  neutral: "var(--tone-neutral-bright)",
};

export function VehicleCard({ vehiculo }: { vehiculo: VehicleCardData }) {
  const estado = TRUCK_STATUS[vehiculo.status];
  const descripcion = [
    vehiculo.brand,
    vehiculo.model,
    String(vehiculo.year),
    TRUCK_KIND[vehiculo.kind],
  ].join(" · ");

  return (
    <Link
      href={`/camiones/${vehiculo.id}`}
      className="card pressable flex w-full flex-col overflow-hidden focus-ring"
    >
      {/* ---------- VENTANA ---------- */}
      <div className={`window ${vehiculo.photoUrl ? "window-scrim" : ""}`}>
        {vehiculo.photoUrl ? (
          // Las fotos las sube el cliente y pueden ser SVG o rasterizadas;
          // <img> evita depender del optimizador de next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vehiculo.photoUrl} alt={`Vehículo ${vehiculo.plate}`} />
        ) : (
          /*
            Sin foto la ventana dice qué falta, y nada más.

            Primero puse acá la placa en grande. Se veía bien suelta, pero en la
            ficha completa quedaba la placa dos veces, una encima de la otra:
            parecía un error de la aplicación y contradecía tener una sola
            representación oficial de la placa. Tampoco va un ícono genérico de
            camión, que no distingue este vehículo de ningún otro. El espacio se
            conserva —si se colapsara, la grilla se desalinearía— y se declara
            vacío a propósito.
          */
          <div className="flex size-full flex-col items-center justify-center gap-1 px-4 text-center">
            <span className="font-medium text-[var(--text-muted)]">
              Sin fotografía
            </span>
            <span className="text-sm text-[var(--icon-muted)]">
              {TRUCK_KIND[vehiculo.kind]} · abre la ficha para agregarla
            </span>
          </div>
        )}

        {/* El estado es lo único que se superpone a la fotografía. */}
        {vehiculo.photoUrl && (
          /*
            Corrijo una decisión anterior. Había quitado el punto de color
            porque, con `currentColor`, salía blanco y no decía nada. Al ver las
            cuatro fichas juntas quedó claro el precio: «Disponible», «En
            viaje», «En taller» y «Fuera de servicio» se veían idénticas —el
            mismo recuadro gris— y el estado solo se entendía leyendo. En la
            pantalla donde se reconoce de un vistazo, eso es un fallo.

            El punto vuelve, con la versión clara de su familia. La palabra
            sigue en blanco y sigue siendo la que informa; el punto adelanta.
          */
          <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-[var(--r-control)] bg-black/55 px-2.5 py-1 text-sm font-semibold text-white">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{
                background:
                  SOBRE_FOTO[vehiculo.archived ? "neutral" : estado.tone],
              }}
              aria-hidden
            />
            {vehiculo.archived ? "Archivado" : estado.label}
          </span>
        )}
      </div>

      {/* ---------- LECTURA ---------- */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Plate value={vehiculo.plate} size="md" />
          {/* Sin foto el estado no pudo ir en la ventana, así que va acá. */}
          {!vehiculo.photoUrl && (
            <Badge
              tone={vehiculo.archived ? "neutral" : estado.tone}
              variant="quiet"
            >
              {vehiculo.archived ? "Archivado" : estado.label}
            </Badge>
          )}
        </div>

        <p className="text-sm text-[var(--text-muted)]">
          {vehiculo.nickname && (
            <span className="font-medium text-[var(--text)]">
              {vehiculo.nickname} ·{" "}
            </span>
          )}
          {descripcion}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[var(--border)] pt-3">
          <span className="inline-flex min-w-0 items-center gap-2 text-sm text-[var(--text-muted)]">
            <User className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {vehiculo.currentDriver
                ? `${vehiculo.currentDriver.firstName} ${vehiculo.currentDriver.lastName}`
                : "Sin conductor"}
            </span>
          </span>
          <span className="font-mono text-sm tabular-nums text-[var(--text-muted)]">
            {km(vehiculo.odometerKm)}
          </span>
        </div>

        {/* Solo si existe. Sin alerta, la tarjeta termina en la línea anterior. */}
        {vehiculo.alerta && (
          <p
            className="flex items-start gap-2 text-sm font-medium"
            style={{
              color: vehiculo.alerta.urgente
                ? "var(--tone-danger-fg)"
                : "var(--tone-warning-fg)",
            }}
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0">{vehiculo.alerta.texto}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
