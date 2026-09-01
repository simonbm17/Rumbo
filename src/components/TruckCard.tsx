import Link from "next/link";
import { Gauge, Truck as TruckIcon, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { TRUCK_KIND, TRUCK_STATUS } from "@/lib/labels";
import { km } from "@/lib/format";
import type { TruckKind, TruckStatus } from "@/generated/prisma/enums";

export type TruckCardData = {
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
};

/**
 * Tarjeta con foto: la vista principal de la flota. La placa va grande y en
 * monoespaciada porque es el dato con el que la gente identifica el camión,
 * no la marca ni el modelo.
 */
export function TruckCard({ truck }: { truck: TruckCardData }) {
  const status = TRUCK_STATUS[truck.status];

  return (
    <Link
      href={`/camiones/${truck.id}`}
      className="card pressable flex flex-col overflow-hidden focus-ring"
    >
      <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-2)]">
        {truck.photoUrl ? (
          // Las fotos las sube el cliente; <img> evita depender del
          // optimizador de next/image para archivos locales o SVG.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={truck.photoUrl}
            alt={`Camión ${truck.plate}`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-[var(--icon-muted)]">
            <TruckIcon className="size-10" aria-hidden />
            <span className="text-sm">Sin foto</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Plate value={truck.plate} size="lg" />
          <Badge tone={truck.archived ? "slate" : status.tone} dot>
            {truck.archived ? "Archivado" : status.label}
          </Badge>
        </div>

        <p className="text-[var(--text-muted)]">
          {truck.nickname ? `${truck.nickname} · ` : ""}
          {truck.brand} {truck.model} · {TRUCK_KIND[truck.kind]}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--border)] pt-3 text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-2">
            <Gauge className="size-4 shrink-0" aria-hidden />
            {km(truck.odometerKm)}
          </span>
          <span className="inline-flex min-w-0 items-center gap-2">
            <User className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {truck.currentDriver
                ? `${truck.currentDriver.firstName} ${truck.currentDriver.lastName}`
                : "Sin conductor"}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
