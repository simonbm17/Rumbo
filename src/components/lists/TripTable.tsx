import Link from "next/link";
import { Route } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { TRIP_STATUS } from "@/lib/labels";
import { date, fullName, km, money } from "@/lib/format";
import type { TripStatus } from "@/generated/prisma/enums";

export type TripRow = {
  id: string;
  code: string;
  origin: string;
  destination: string;
  departureAt: Date;
  arrivalAt: Date | null;
  distanceKm: number | null;
  status: TripStatus;
  revenue: number;
  truck: { id: string; plate: string };
  driver: { firstName: string; lastName: string } | null;
  _count: { cargos: number };
};

export function TripTable({
  trips,
  showTruck = true,
  emptyMessage = "Todavía no hay viajes registrados.",
  action,
}: {
  trips: TripRow[];
  showTruck?: boolean;
  emptyMessage?: string;
  action?: React.ReactNode;
}) {
  if (trips.length === 0) {
    return (
      <EmptyState
        icon={<Route className="size-5" />}
        title="Sin viajes"
        description={emptyMessage}
        action={action}
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Viaje</TH>
          <TH>Ruta</TH>
          {showTruck && <TH>Camión</TH>}
          <TH>Conductor</TH>
          <TH>Salida</TH>
          <TH align="right">Distancia</TH>
          <TH align="right">Flete</TH>
          <TH>Estado</TH>
        </TR>
      </THead>
      <TBody>
        {trips.map((trip) => (
          <TR key={trip.id}>
            <TD className="whitespace-nowrap">
              <Link
                href={`/viajes/${trip.id}`}
                className="rounded font-mono font-semibold text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
              >
                {trip.code}
              </Link>
              <p className="text-sm text-[var(--text-muted)]">
                {trip._count.cargos} carga{trip._count.cargos === 1 ? "" : "s"}
              </p>
            </TD>
            <TD>
              <span className="font-medium">{trip.origin}</span>
              <span className="text-[var(--text-muted)]"> → </span>
              <span className="font-medium">{trip.destination}</span>
            </TD>
            {showTruck && (
              <TD className="whitespace-nowrap">
                <Link
                  href={`/camiones/${trip.truck.id}`}
                  className="rounded font-mono underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                >
                  {trip.truck.plate}
                </Link>
              </TD>
            )}
            <TD className="text-[var(--text-muted)]">
              {trip.driver ? fullName(trip.driver) : "—"}
            </TD>
            <TD className="whitespace-nowrap text-[var(--text-muted)]">
              {date(trip.departureAt)}
            </TD>
            <TD align="right" className="whitespace-nowrap text-[var(--text-muted)]">
              {trip.distanceKm ? km(trip.distanceKm) : "—"}
            </TD>
            <TD align="right" className="whitespace-nowrap font-medium">
              {money(trip.revenue)}
            </TD>
            <TD>
              <Badge tone={TRIP_STATUS[trip.status].tone}>
                {TRIP_STATUS[trip.status].label}
              </Badge>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
