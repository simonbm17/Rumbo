import { Plus } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { FilterBar } from "@/components/ui/FilterBar";
import { DriverList, type DriverRowData } from "@/components/DriverList";
import { DRIVER_STATUS, toOptions } from "@/lib/labels";
import { DriverStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Conductores" };

export default async function DriversPage({
  searchParams,
}: PageProps<"/conductores">) {
  const user = await requireUser();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const vehiculo = typeof params.vehiculo === "string" ? params.vehiculo : "";
  const showArchived = params.archivados === "1";

  const where: Prisma.DriverWhereInput = {
    archived: showArchived,
    ...(status in DriverStatus ? { status: status as DriverStatus } : {}),
    /*
      «Con vehículo» y «sin vehículo» se preguntan a DriverAssignment, que es la
      fuente de verdad, no a `Truck.currentDriverId`. Una asignación vigente es
      exactamente `endedAt IS NULL`.
    */
    ...(vehiculo === "con"
      ? { assignments: { some: { endedAt: null } } }
      : vehiculo === "sin"
        ? { assignments: { none: { endedAt: null } } }
        : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { documentId: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { licenseNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [drivers, archivedCount] = await Promise.all([
    prisma.driver.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentId: true,
        photoUrl: true,
        status: true,
        archived: true,
        licenseClass: true,
        _count: { select: { trips: true } },
        /*
          La asignación vigente viene con el conductor en una sola consulta.
          `take: 1` es seguro porque el índice único parcial de PostgreSQL
          garantiza como máximo una fila con `endedAt IS NULL` por conductor.
        */
        assignments: {
          where: { endedAt: null },
          take: 1,
          select: {
            truck: {
              select: {
                id: true,
                plate: true,
                brand: true,
                model: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.driver.count({ where: { archived: true } }),
  ]);

  const lista: DriverRowData[] = drivers.map((d) => ({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    documentId: d.documentId,
    photoUrl: d.photoUrl,
    status: d.status,
    archived: d.archived,
    licenseClass: d.licenseClass,
    viajes: d._count.trips,
    vehiculo: d.assignments[0]?.truck ?? null,
  }));

  const filtrando = Boolean(q || status || vehiculo);

  return (
    <>
      <PageHeader
        mobileCompact
        title={showArchived ? "Conductores archivados" : "Conductores"}
        description={
          showArchived
            ? "Fuera de la operación. Su historial se conserva completo."
            : "Quién conduce qué, y quién está libre."
        }
        actions={
          canWrite(user) && (
            <LinkButton href="/conductores/nuevo">
              <Plus className="size-5" aria-hidden />
              Agregar conductor
            </LinkButton>
          )
        }
      />

      <FilterBar
        placeholder="Buscar por nombre, documento o licencia…"
        /*
          Tres filtros, no diez. Estado responde «¿en qué situación está esta
          persona?»; vehículo responde «¿a quién puedo asignar?». Son dos
          preguntas distintas: un conductor activo puede estar sin vehículo, y
          eso no es una anomalía.
        */
        chips={{
          name: "vehiculo",
          label: "Asignación de vehículo",
          options: [
            { value: "con", label: "Con vehículo" },
            { value: "sin", label: "Sin vehículo" },
          ],
        }}
        filters={[
          { name: "status", label: "Estado", options: toOptions(DRIVER_STATUS) },
        ]}
      >
        {(archivedCount > 0 || showArchived) && (
          <LinkButton
            href={showArchived ? "/conductores" : "/conductores?archivados=1"}
            variant="secondary"
            size="sm"
          >
            {showArchived ? "Ver activos" : `Archivados (${archivedCount})`}
          </LinkButton>
        )}
      </FilterBar>

      {lista.length === 0 ? (
        <div className="card">
          <EmptyState
            title={
              filtrando
                ? "Ningún conductor coincide con la búsqueda"
                : showArchived
                  ? "No hay conductores archivados"
                  : "Todavía no cargaste conductores"
            }
            description={
              filtrando
                ? "Probá con otro nombre o documento, o quitá los filtros."
                : showArchived
                  ? "Cuando saques a alguien de la operación, lo vas a encontrar acá con todo su historial."
                  : "Agregá a quienes conducen para poder asignarlos a un vehículo."
            }
            action={
              !filtrando &&
              !showArchived &&
              canWrite(user) && (
                <LinkButton href="/conductores/nuevo">
                  <Plus className="size-5" aria-hidden />
                  Agregar conductor
                </LinkButton>
              )
            }
          />
        </div>
      ) : (
        <Section
          title={showArchived ? "Archivados" : "Equipo"}
          count={lista.length}
        >
          <DriverList conductores={lista} />
        </Section>
      )}
    </>
  );
}
