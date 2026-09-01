import { Plus } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { TripTable } from "@/components/lists/TripTable";
import { Pagination } from "@/components/ui/Pagination";
import { TRIP_STATUS, toOptions } from "@/lib/labels";
import { TripStatus } from "@/generated/prisma/enums";
import { money, round2 } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Viajes" };

const PAGE_SIZE = 25;

export default async function TripsPage({
  searchParams,
}: PageProps<"/viajes">) {
  const user = await requireUser();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const truckId = typeof params.truck === "string" ? params.truck : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.TripWhereInput = {
    ...(status in TripStatus ? { status: status as TripStatus } : {}),
    ...(truckId ? { truckId } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { origin: { contains: q, mode: "insensitive" } },
            { destination: { contains: q, mode: "insensitive" } },
            { truck: { plate: { contains: q, mode: "insensitive" } } },
            {
              driver: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [trips, total, totals, trucks] = await Promise.all([
    prisma.trip.findMany({
      where,
      orderBy: { departureAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        truck: { select: { id: true, plate: true } },
        driver: { select: { firstName: true, lastName: true } },
        _count: { select: { cargos: true } },
      },
    }),
    prisma.trip.count({ where }),
    prisma.trip.aggregate({
      where,
      _sum: { revenue: true, distanceKm: true },
    }),
    prisma.truck.findMany({
      where: { archived: false },
      orderBy: { plate: "asc" },
      select: { id: true, plate: true },
    }),
  ]);

  const revenue = round2(totals._sum.revenue ?? 0);
  const distance = round2(totals._sum.distanceKm ?? 0);

  return (
    <>
      <PageHeader
        title="Viajes"
        description="Todos los recorridos de la flota, con sus cargas y su facturación."
        actions={
          canWrite(user) && (
            <LinkButton href="/viajes/nuevo">
              <Plus className="size-4" />
              Nuevo viaje
            </LinkButton>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Viajes encontrados" value={total} tone="violet" />
        <StatCard
          label="Facturación"
          value={money(revenue, true)}
          hint="Suma de los fletes filtrados"
          tone="green"
        />
        <StatCard
          label="Kilómetros"
          value={new Intl.NumberFormat("es-CO").format(distance)}
          hint="Distancia registrada"
          tone="blue"
        />
      </div>

      <FilterBar
        placeholder="Buscar por código, ruta, placa o conductor…"
        filters={[
          { name: "status", label: "Estado", options: toOptions(TRIP_STATUS) },
          {
            name: "truck",
            label: "Camión",
            options: trucks.map((t) => ({ value: t.id, label: t.plate })),
          },
        ]}
      />

      <Card>
        <CardHeader
          title="Listado"
          description={`${total} viaje${total === 1 ? "" : "s"}`}
        />
        <TripTable
          trips={trips}
          emptyMessage="No hay viajes que coincidan con la búsqueda."
          action={
            canWrite(user) && (
              <LinkButton href="/viajes/nuevo" size="sm">
                Registrar viaje
              </LinkButton>
            )
          }
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
      </Card>
    </>
  );
}
