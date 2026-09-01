import Link from "next/link";
import { Plus, Truck, Users } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { DRIVER_STATUS, toOptions } from "@/lib/labels";
import { DriverStatus } from "@/generated/prisma/enums";
import { daysUntil, fullName, initials, relativeDays } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Conductores" };

export default async function DriversPage({
  searchParams,
}: PageProps<"/conductores">) {
  const user = await requireUser();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const showArchived = params.archivados === "1";

  const where: Prisma.DriverWhereInput = {
    archived: showArchived,
    ...(status in DriverStatus ? { status: status as DriverStatus } : {}),
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
      orderBy: [{ firstName: "asc" }],
      include: {
        assignedTrucks: { select: { id: true, plate: true } },
        _count: { select: { trips: true } },
      },
    }),
    prisma.driver.count({ where: { archived: true } }),
  ]);

  const filtering = Boolean(q || status);

  return (
    <>
      <PageHeader
        title={showArchived ? "Conductores archivados" : "Conductores"}
        description="Quiénes manejan tus camiones, con sus licencias al día."
        actions={
          canWrite(user) && (
            <LinkButton href="/conductores/nuevo">
              <Plus className="size-4" />
              Agregar conductor
            </LinkButton>
          )
        }
      />

      <FilterBar
        placeholder="Buscar por nombre, documento o licencia…"
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
            {showArchived
              ? "Ver activos"
              : `Archivados (${archivedCount})`}
          </LinkButton>
        )}
      </FilterBar>

      {drivers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="size-5" />}
            title={
              filtering
                ? "Ningún conductor coincide con la búsqueda"
                : "Todavía no cargaste conductores"
            }
            description={
              filtering
                ? "Probá con otro nombre o quitá los filtros."
                : "Agregá a tus choferes para asignarlos a camiones y viajes."
            }
            action={
              !filtering &&
              canWrite(user) && (
                <LinkButton href="/conductores/nuevo" size="sm">
                  <Plus className="size-4" />
                  Agregar conductor
                </LinkButton>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {drivers.map((driver) => {
            const licenseDays = driver.licenseExpiry
              ? daysUntil(driver.licenseExpiry)
              : null;
            const licenseTone =
              licenseDays === null
                ? "neutral"
                : licenseDays < 0
                  ? "danger"
                  : licenseDays <= 30
                    ? "warning"
                    : "success";

            return (
              <Link
                key={driver.id}
                href={`/conductores/${driver.id}`}
                className="card flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] focus-ring"
              >
                <div className="flex items-start gap-3">
                  <span className="size-14 shrink-0 overflow-hidden rounded-full bg-[var(--brand-soft)]">
                    {driver.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={driver.photoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-base font-semibold text-[var(--brand)]">
                        {initials(driver.firstName, driver.lastName)}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {fullName(driver)}
                    </p>
                    <p className="truncate font-mono text-sm text-[var(--text-muted)]">
                      {driver.documentId}
                    </p>
                    <div className="mt-1.5">
                      <Badge
                        tone={
                          driver.archived
                            ? "neutral"
                            : DRIVER_STATUS[driver.status].tone
                        }
                        dot
                      >
                        {driver.archived
                          ? "Archivado"
                          : DRIVER_STATUS[driver.status].label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 text-sm">
                  <div>
                    <dt className="text-sm text-[var(--text-muted)]">Viajes</dt>
                    <dd className="font-medium">{driver._count.trips}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-sm text-[var(--text-muted)]">Camión</dt>
                    <dd className="flex items-center gap-1 truncate font-mono">
                      {driver.assignedTrucks.length > 0 ? (
                        <>
                          <Truck className="size-3.5 shrink-0 text-[var(--text-muted)]" />
                          {driver.assignedTrucks
                            .map((t) => t.plate)
                            .join(", ")}
                        </>
                      ) : (
                        <span className="font-sans text-[var(--text-muted)]">
                          Sin asignar
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm text-[var(--text-muted)]">
                      Licencia {driver.licenseClass ?? ""}
                    </dt>
                    <dd>
                      {licenseDays === null ? (
                        <span className="text-[var(--text-muted)]">
                          Sin registrar
                        </span>
                      ) : (
                        <Badge tone={licenseTone}>
                          {relativeDays(licenseDays)}
                        </Badge>
                      )}
                    </dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
