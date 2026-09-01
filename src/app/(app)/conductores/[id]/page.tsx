import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Banknote,
  IdCard,
  Pencil,
  Phone,
  Route,
  Trash2,
  Truck as TruckIcon,
} from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, DataItem } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { TripTable } from "@/components/lists/TripTable";
import { DocumentTable } from "@/components/lists/DocumentTable";
import { DocumentModal } from "@/components/forms/DocumentModal";
import { archiveDriver, deleteDriver } from "@/actions/drivers";
import { DRIVER_STATUS } from "@/lib/labels";
import {
  date,
  daysUntil,
  fullName,
  initials,
  km,
  money,
  relativeDays,
  round2,
} from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/conductores/[id]">) {
  const { id } = await params;
  const driver = await prisma.driver.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });
  return { title: driver ? fullName(driver) : "Conductor" };
}

export default async function DriverDetailPage({
  params,
  searchParams,
}: PageProps<"/conductores/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "";
  const editable = canWrite(user);

  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      assignedTrucks: {
        select: { id: true, plate: true, nickname: true, photoUrl: true },
      },
      _count: { select: { trips: true, documents: true } },
    },
  });

  if (!driver) notFound();

  const [totals, distance, expenses] = await Promise.all([
    prisma.trip.aggregate({
      _sum: { revenue: true },
      where: { driverId: driver.id, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
    }),
    prisma.trip.aggregate({
      _sum: { distanceKm: true },
      where: { driverId: driver.id, status: "COMPLETED" },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { driverId: driver.id },
    }),
  ]);

  const licenseDays = driver.licenseExpiry
    ? daysUntil(driver.licenseExpiry)
    : null;
  const basePath = `/conductores/${driver.id}`;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {fullName(driver)}
            <Badge
              tone={driver.archived ? "neutral" : DRIVER_STATUS[driver.status].tone}
              dot
            >
              {driver.archived
                ? "Archivado"
                : DRIVER_STATUS[driver.status].label}
            </Badge>
          </span>
        }
        description={`Documento ${driver.documentId}`}
        breadcrumbs={[
          { label: "Conductores", href: "/conductores" },
          { label: fullName(driver) },
        ]}
        actions={
          editable && (
            <>
              <LinkButton href={`${basePath}/editar`} variant="secondary">
                <Pencil className="size-4" />
                Editar
              </LinkButton>
              <form action={archiveDriver}>
                <input type="hidden" name="driverId" value={driver.id} />
                <input
                  type="hidden"
                  name="archived"
                  value={driver.archived ? "false" : "true"}
                />
                <ConfirmButton
                  size="md"
                  variant="secondary"
                  message={
                    driver.archived
                      ? `¿Reactivar a ${fullName(driver)}?`
                      : `¿Archivar a ${fullName(driver)}? Se desasignará de sus camiones, pero su historial de viajes se conserva.`
                  }
                >
                  {driver.archived ? (
                    <>
                      <ArchiveRestore className="size-4" />
                      Restaurar
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" />
                      Archivar
                    </>
                  )}
                </ConfirmButton>
              </form>
            </>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4 px-5 py-5">
            <span className="size-20 shrink-0 overflow-hidden rounded-full bg-[var(--brand-soft)]">
              {driver.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={driver.photoUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-xl font-semibold text-[var(--brand)]">
                  {initials(driver.firstName, driver.lastName)}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">
                {fullName(driver)}
              </p>
              {driver.phone && (
                <a
                  href={`tel:${driver.phone.replace(/\s/g, "")}`}
                  className="mt-0.5 inline-flex items-center gap-1.5 rounded text-sm text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                >
                  <Phone className="size-3.5" />
                  {driver.phone}
                </a>
              )}
              {driver.email && (
                <p className="truncate text-sm text-[var(--text-muted)]">
                  {driver.email}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--border)] px-5 py-4">
            <dl className="grid grid-cols-2 gap-4">
              <DataItem label="Licencia">
                {driver.licenseNumber ?? "—"}
              </DataItem>
              <DataItem label="Categoría">
                {driver.licenseClass ?? "—"}
              </DataItem>
              <DataItem label="Vence">
                {licenseDays === null ? (
                  "—"
                ) : (
                  <Badge
                    tone={
                      licenseDays < 0
                        ? "danger"
                        : licenseDays <= 30
                          ? "warning"
                          : "success"
                    }
                  >
                    {relativeDays(licenseDays)}
                  </Badge>
                )}
              </DataItem>
              <DataItem label="Ingreso">{date(driver.hireDate)}</DataItem>
              <DataItem label="Dirección">{driver.address ?? "—"}</DataItem>
              <DataItem label="Emergencia">
                {driver.emergencyContact
                  ? `${driver.emergencyContact}${
                      driver.emergencyPhone ? ` · ${driver.emergencyPhone}` : ""
                    }`
                  : "—"}
              </DataItem>
            </dl>
            {driver.notes && (
              <div className="mt-4 rounded-lg bg-[var(--surface-2)] p-3">
                <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Notas
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">
                  {driver.notes}
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2 lg:content-start">
          <StatCard
            label="Viajes realizados"
            value={driver._count.trips}
            icon={<Route className="size-5" />}
            tone="neutral"
          />
          <StatCard
            label="Kilómetros recorridos"
            value={km(round2(distance._sum.distanceKm ?? 0))}
            icon={<TruckIcon className="size-5" />}
            tone="info"
          />
          <StatCard
            label="Facturación generada"
            value={money(round2(totals._sum.revenue ?? 0), true)}
            icon={<Banknote className="size-5" />}
            tone="success"
          />
          <StatCard
            label="Gastos a su nombre"
            value={money(round2(expenses._sum.amount ?? 0), true)}
            icon={<IdCard className="size-5" />}
            tone="warning"
          />

          {driver.assignedTrucks.length > 0 && (
            <Card className="sm:col-span-2">
              <CardHeader title="Camiones asignados" />
              <ul className="divide-y divide-[var(--border)]">
                {driver.assignedTrucks.map((truck) => (
                  <li key={truck.id}>
                    <Link
                      href={`/camiones/${truck.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--surface-hover)] focus-ring"
                    >
                      <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-2)]">
                        {truck.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={truck.photoUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-[var(--text-muted)]">
                            <TruckIcon className="size-4" />
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">
                          {truck.plate}
                        </p>
                        <p className="truncate text-sm text-[var(--text-muted)]">
                          {truck.nickname ?? "Sin alias"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Tabs
        active={tab}
        basePath={basePath}
        tabs={[
          { key: "", label: "Viajes", count: driver._count.trips },
          {
            key: "documentos",
            label: "Documentos",
            count: driver._count.documents,
          },
        ]}
      />

      {tab === "documentos" ? (
        <DocumentosTab driverId={driver.id} editable={editable} />
      ) : (
        <ViajesTab driverId={driver.id} />
      )}

      {editable && tab === "" && (
        <Card className="mt-5">
          <CardHeader
            title="Zona de riesgo"
            description="Eliminar al conductor borra su ficha y sus documentos. Los viajes se conservan, pero quedan sin conductor asignado."
          />
          <div className="px-5 py-4">
            <form action={deleteDriver}>
              <input type="hidden" name="driverId" value={driver.id} />
              <ConfirmButton
                size="md"
                message={`¿Eliminar definitivamente a ${fullName(driver)}? Esta acción no se puede deshacer.`}
              >
                <Trash2 className="size-4" />
                Eliminar conductor
              </ConfirmButton>
            </form>
          </div>
        </Card>
      )}
    </>
  );
}

async function ViajesTab({ driverId }: { driverId: string }) {
  const trips = await prisma.trip.findMany({
    where: { driverId },
    orderBy: { departureAt: "desc" },
    take: 100,
    include: {
      truck: { select: { id: true, plate: true } },
      driver: { select: { firstName: true, lastName: true } },
      _count: { select: { cargos: true } },
    },
  });

  return (
    <Card>
      <CardHeader
        title="Viajes del conductor"
        description={`${trips.length} registros`}
      />
      <TripTable
        trips={trips}
        emptyMessage="Este conductor todavía no tiene viajes asignados."
      />
    </Card>
  );
}

async function DocumentosTab({
  driverId,
  editable,
}: {
  driverId: string;
  editable: boolean;
}) {
  const rows = await prisma.document.findMany({
    where: { driverId },
    orderBy: { expiresAt: "asc" },
    include: {
      truck: { select: { id: true, plate: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return (
    <Card>
      <CardHeader
        title="Documentos del conductor"
        description="Licencia, exámenes médicos y demás papeles con vencimiento."
        action={
          editable && <DocumentModal owner={{ kind: "driver", id: driverId }} />
        }
      />
      <DocumentTable
        rows={rows}
        showOwner={false}
        canEdit={editable}
        owner={{ kind: "driver", id: driverId }}
        action={
          editable && <DocumentModal owner={{ kind: "driver", id: driverId }} />
        }
      />
    </Card>
  );
}
