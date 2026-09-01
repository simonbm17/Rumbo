import { Plus, Truck } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { TruckCard } from "@/components/TruckCard";
import { TRUCK_KIND, TRUCK_STATUS, toOptions } from "@/lib/labels";
import { TruckKind, TruckStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Camiones" };

export default async function TrucksPage({
  searchParams,
}: PageProps<"/camiones">) {
  const user = await requireUser();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const kind = typeof params.kind === "string" ? params.kind : "";
  const showArchived = params.archivados === "1";

  const where: Prisma.TruckWhereInput = {
    archived: showArchived,
    ...(status in TruckStatus ? { status: status as TruckStatus } : {}),
    ...(kind in TruckKind ? { kind: kind as TruckKind } : {}),
    ...(q
      ? {
          OR: [
            { plate: { contains: q, mode: "insensitive" } },
            { nickname: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { vin: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [trucks, archivedCount] = await Promise.all([
    prisma.truck.findMany({
      where,
      orderBy: [{ status: "asc" }, { plate: "asc" }],
      select: {
        id: true,
        plate: true,
        nickname: true,
        brand: true,
        model: true,
        year: true,
        kind: true,
        status: true,
        odometerKm: true,
        photoUrl: true,
        archived: true,
        currentDriver: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.truck.count({ where: { archived: true } }),
  ]);

  const filtering = Boolean(q || status || kind);

  return (
    <>
      <PageHeader
        title={showArchived ? "Camiones archivados" : "Camiones"}
        description={
          showArchived
            ? "Vehículos fuera de la flota activa. Su historial se conserva."
            : "Toda tu flota. Tocá un camión para ver su ficha completa."
        }
        actions={
          canWrite(user) && (
            <LinkButton href="/camiones/nuevo">
              <Plus className="size-4" />
              Agregar camión
            </LinkButton>
          )
        }
      />

      <FilterBar
        placeholder="Buscar por placa, marca o alias…"
        chips={{
          name: "status",
          label: "Estado del camión",
          options: toOptions(TRUCK_STATUS),
        }}
        filters={[
          { name: "kind", label: "Tipo", options: toOptions(TRUCK_KIND) },
        ]}
      >
        {(archivedCount > 0 || showArchived) && (
          <LinkButton
            href={showArchived ? "/camiones" : "/camiones?archivados=1"}
            variant="secondary"
            size="sm"
          >
            {showArchived
              ? "Ver flota activa"
              : `Archivados (${archivedCount})`}
          </LinkButton>
        )}
      </FilterBar>

      {trucks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Truck className="size-5" />}
            title={
              filtering
                ? "Ningún camión coincide con la búsqueda"
                : showArchived
                  ? "No hay camiones archivados"
                  : "Todavía no cargaste camiones"
            }
            description={
              filtering
                ? "Probá con otra placa o quitá los filtros."
                : "Agregá el primero con su foto, placa y datos técnicos."
            }
            action={
              !filtering &&
              !showArchived &&
              canWrite(user) && (
                <LinkButton href="/camiones/nuevo" size="sm">
                  <Plus className="size-4" />
                  Agregar camión
                </LinkButton>
              )
            }
          />
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            {trucks.length} {trucks.length === 1 ? "camión" : "camiones"}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {trucks.map((truck) => (
              <TruckCard key={truck.id} truck={truck} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
