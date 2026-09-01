import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Fuel,
  Gauge,
  Pencil,
  Route,
  Trash2,
  TrendingUp,
  Truck as TruckIcon,
} from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFuelStats, getMonthlySeries, getTruckFinancials } from "@/lib/stats";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, DataItem } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { TripTable } from "@/components/lists/TripTable";
import { MaintenanceTable } from "@/components/lists/MaintenanceTable";
import { ExpenseTable } from "@/components/lists/ExpenseTable";
import { DocumentTable } from "@/components/lists/DocumentTable";
import { MaintenanceModal } from "@/components/forms/MaintenanceModal";
import { ExpenseModal } from "@/components/forms/ExpenseModal";
import { DocumentModal } from "@/components/forms/DocumentModal";
import { StatusSwitcher } from "./StatusSwitcher";
import { archiveTruck, deleteTruck } from "@/actions/trucks";
import { TRUCK_KIND, TRUCK_STATUS } from "@/lib/labels";
import {
  date,
  fullName,
  km,
  money,
  number,
  percent,
} from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/camiones/[id]">) {
  const { id } = await params;
  const truck = await prisma.truck.findUnique({
    where: { id },
    select: { plate: true },
  });
  return { title: truck ? `Camión ${truck.plate}` : "Camión" };
}

export default async function TruckDetailPage({
  params,
  searchParams,
}: PageProps<"/camiones/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "";
  const editable = canWrite(user);

  const truck = await prisma.truck.findUnique({
    where: { id },
    include: {
      currentDriver: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
      _count: {
        select: {
          trips: true,
          maintenances: true,
          expenses: true,
          documents: true,
        },
      },
    },
  });

  if (!truck) notFound();

  const [finance, fuel, series, trucks] = await Promise.all([
    getTruckFinancials(truck.id),
    getFuelStats(truck.id),
    getMonthlySeries(6, truck.id),
    prisma.truck.findMany({
      where: { archived: false },
      orderBy: { plate: "asc" },
      select: { id: true, plate: true, nickname: true },
    }),
  ]);

  const status = TRUCK_STATUS[truck.status];
  const basePath = `/camiones/${truck.id}`;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Plate value={truck.plate} size="lg" className="!text-2xl" />
            <Badge tone={truck.archived ? "neutral" : status.tone} dot>
              {truck.archived ? "Archivado" : status.label}
            </Badge>
          </span>
        }
        description={
          truck.nickname
            ? `${truck.nickname} · ${truck.brand} ${truck.model} ${truck.year}`
            : `${truck.brand} ${truck.model} ${truck.year} · ${TRUCK_KIND[truck.kind]}`
        }
        breadcrumbs={[
          { label: "Camiones", href: "/camiones" },
          { label: truck.plate },
        ]}
        actions={
          editable && (
            <>
              <StatusSwitcher truckId={truck.id} status={truck.status} />
              <LinkButton href={`${basePath}/editar`} variant="secondary">
                <Pencil className="size-4" />
                Editar
              </LinkButton>
              <form action={archiveTruck}>
                <input type="hidden" name="truckId" value={truck.id} />
                <input
                  type="hidden"
                  name="archived"
                  value={truck.archived ? "false" : "true"}
                />
                <ConfirmButton
                  size="md"
                  variant="secondary"
                  message={
                    truck.archived
                      ? `¿Devolver ${truck.plate} a la flota activa?`
                      : `¿Archivar ${truck.plate}? Sale de la flota activa pero se conserva todo su historial.`
                  }
                >
                  {truck.archived ? (
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

      {/* Ficha principal: foto + datos */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="aspect-[16/10] bg-[var(--surface-2)]">
            {truck.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={truck.photoUrl}
                alt={`Camión ${truck.plate}`}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                <TruckIcon className="size-10" />
                <span className="text-sm">Sin foto cargada</span>
                {editable && (
                  <Link
                    href={`${basePath}/editar`}
                    className="rounded text-sm font-medium text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                  >
                    Subir una foto
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-[var(--border)] px-5 py-4">
            <dl className="grid grid-cols-2 gap-4">
              <DataItem label="Kilometraje">{km(truck.odometerKm)}</DataItem>
              <DataItem label="Tipo">{TRUCK_KIND[truck.kind]}</DataItem>
              <DataItem label="Capacidad">
                {truck.capacityKg ? `${number(truck.capacityKg)} kg` : "—"}
              </DataItem>
              <DataItem label="Ejes">{truck.axles ?? "—"}</DataItem>
              <DataItem label="Conductor">
                {truck.currentDriver ? (
                  <Link
                    href={`/conductores/${truck.currentDriver.id}`}
                    className="rounded text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                  >
                    {fullName(truck.currentDriver)}
                  </Link>
                ) : (
                  "Sin asignar"
                )}
              </DataItem>
              <DataItem label="Combustible">{truck.fuelType ?? "—"}</DataItem>
            </dl>
          </div>
        </Card>

        {/*
          Tres cifras, no seis. Las otras (ingresos, egresos, combustible)
          bajaron a la pestaña Resumen: siguen estando, pero no compiten con
          lo que de verdad se mira primero en un camión.
        */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2 lg:content-start">
          <StatCard
            label="Ganancia"
            value={money(finance.utilidad, true)}
            hint={
              finance.margen !== null
                ? `Margen ${percent(finance.margen)} · ${finance.tripCount} viajes`
                : "Sin ingresos registrados"
            }
            icon={<TrendingUp className="size-5" />}
            tone={finance.utilidad >= 0 ? "success" : "danger"}
          />
          <StatCard
            label="Costo por kilómetro"
            value={
              finance.costoPorKm !== null ? money(finance.costoPorKm) : "—"
            }
            hint={`${km(finance.km)} recorridos`}
            icon={<Gauge className="size-5" />}
            tone="info"
          />
          <StatCard
            label="Rendimiento"
            value={
              fuel.kmPerLiter !== null
                ? `${number(fuel.kmPerLiter, 2)} km/L`
                : "—"
            }
            hint={`${fuel.fillUps} tanqueos`}
            icon={<Fuel className="size-5" />}
            tone="neutral"
          />
        </div>
      </div>

      <Tabs
        active={tab}
        basePath={basePath}
        tabs={[
          { key: "", label: "Resumen" },
          { key: "viajes", label: "Viajes", count: truck._count.trips },
          {
            key: "mantenimiento",
            label: "Mantenimiento",
            count: truck._count.maintenances,
          },
          { key: "gastos", label: "Gastos", count: truck._count.expenses },
          {
            key: "documentos",
            label: "Documentos",
            count: truck._count.documents,
          },
        ]}
      />

      {tab === "" && (
        <ResumenTab
          truck={truck}
          series={series}
          finance={finance}
          fuel={fuel}
        />
      )}
      {tab === "viajes" && <ViajesTab truckId={truck.id} editable={editable} />}
      {tab === "mantenimiento" && (
        <MantenimientoTab
          truckId={truck.id}
          editable={editable}
          trucks={trucks}
        />
      )}
      {tab === "gastos" && (
        <GastosTab truckId={truck.id} editable={editable} trucks={trucks} />
      )}
      {tab === "documentos" && (
        <DocumentosTab truckId={truck.id} editable={editable} />
      )}

      {editable && tab === "" && (
        <Card className="mt-5 border-[var(--tone-danger-bg)]">
          <CardHeader
            title="Zona de riesgo"
            description="Eliminar el camión borra también sus viajes, cargas, gastos, mantenimientos y documentos. Si solo querés sacarlo de circulación, usá «Archivar»."
          />
          <div className="px-5 py-4">
            <form action={deleteTruck}>
              <input type="hidden" name="truckId" value={truck.id} />
              <ConfirmButton
                size="md"
                message={`¿Eliminar definitivamente el camión ${truck.plate}? Se borrarán ${truck._count.trips} viajes, ${truck._count.expenses} gastos, ${truck._count.maintenances} mantenimientos y ${truck._count.documents} documentos. Esta acción NO se puede deshacer.`}
              >
                <Trash2 className="size-4" />
                Eliminar camión
              </ConfirmButton>
            </form>
          </div>
        </Card>
      )}
    </>
  );
}

// --- pestañas ---------------------------------------------------------------

/** Una cifra secundaria dentro del resumen. */
function Cifra({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-sm font-medium text-[var(--text-muted)]">{rotulo}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}

async function ResumenTab({
  truck,
  series,
  finance,
  fuel,
}: {
  truck: {
    id: string;
    vin: string | null;
    engineNumber: string | null;
    color: string | null;
    tankLiters: number | null;
    purchaseDate: Date | null;
    purchasePrice: number | null;
    notes: string | null;
    createdAt: Date;
  };
  series: Awaited<ReturnType<typeof getMonthlySeries>>;
  finance: Awaited<ReturnType<typeof getTruckFinancials>>;
  fuel: Awaited<ReturnType<typeof getFuelStats>>;
}) {
  const recentTrips = await prisma.trip.findMany({
    where: { truckId: truck.id },
    orderBy: { departureAt: "desc" },
    take: 5,
    include: {
      truck: { select: { id: true, plate: true } },
      driver: { select: { firstName: true, lastName: true } },
      _count: { select: { cargos: true } },
    },
  });

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader
          title="Cuánto entró y cuánto salió"
          description="Últimos 6 meses de este camión"
        />
        <div className="px-3 py-4">
          <RevenueChart data={series} />
        </div>
        <dl className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-t border-[var(--border)] sm:grid-cols-4 sm:divide-y-0">
          <Cifra rotulo="Ingresos" valor={money(finance.ingresos, true)} />
          <Cifra rotulo="Gastos" valor={money(finance.gastos, true)} />
          <Cifra rotulo="Taller" valor={money(finance.taller, true)} />
          <Cifra rotulo="Combustible" valor={money(fuel.cost, true)} />
        </dl>
      </Card>

      <Card>
        <CardHeader title="Datos del vehículo" />
        <div className="px-5 py-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <DataItem label="VIN / Chasis">{truck.vin ?? "—"}</DataItem>
            <DataItem label="Número de motor">
              {truck.engineNumber ?? "—"}
            </DataItem>
            <DataItem label="Color">{truck.color ?? "—"}</DataItem>
            <DataItem label="Tanque">
              {truck.tankLiters ? `${number(truck.tankLiters)} L` : "—"}
            </DataItem>
            <DataItem label="Fecha de compra">
              {date(truck.purchaseDate)}
            </DataItem>
            <DataItem label="Precio de compra">
              {truck.purchasePrice ? money(truck.purchasePrice) : "—"}
            </DataItem>
            <DataItem label="Alta en el sistema">
              {date(truck.createdAt)}
            </DataItem>
          </dl>
          {truck.notes && (
            <div className="mt-4 rounded-lg bg-[var(--surface-2)] p-3">
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Observaciones
              </p>
              <p className="mt-1 whitespace-pre-line text-sm">
                {truck.notes}
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader
          title="Últimos viajes"
          icon={<Route className="size-4" />}
          action={
            <Link
              href={`/camiones/${truck.id}?tab=viajes`}
              className="rounded text-sm font-medium text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
            >
              Ver todos
            </Link>
          }
        />
        <TripTable
          trips={recentTrips}
          showTruck={false}
          emptyMessage="Este camión todavía no tiene viajes registrados."
        />
      </Card>
    </div>
  );
}

async function ViajesTab({
  truckId,
  editable,
}: {
  truckId: string;
  editable: boolean;
}) {
  const trips = await prisma.trip.findMany({
    where: { truckId },
    orderBy: { departureAt: "desc" },
    include: {
      truck: { select: { id: true, plate: true } },
      driver: { select: { firstName: true, lastName: true } },
      _count: { select: { cargos: true } },
    },
  });

  return (
    <Card>
      <CardHeader
        title="Historial de viajes"
        description={`${trips.length} viaje${trips.length === 1 ? "" : "s"} registrados`}
        action={
          editable && (
            <LinkButton href={`/viajes/nuevo?truckId=${truckId}`} size="sm">
              Nuevo viaje
            </LinkButton>
          )
        }
      />
      <TripTable
        trips={trips}
        showTruck={false}
        emptyMessage="Este camión todavía no tiene viajes registrados."
        action={
          editable && (
            <LinkButton href={`/viajes/nuevo?truckId=${truckId}`} size="sm">
              Registrar viaje
            </LinkButton>
          )
        }
      />
    </Card>
  );
}

async function MantenimientoTab({
  truckId,
  editable,
  trucks,
}: {
  truckId: string;
  editable: boolean;
  trucks: { id: string; plate: string; nickname: string | null }[];
}) {
  const rows = await prisma.maintenance.findMany({
    where: { truckId },
    orderBy: { date: "desc" },
    include: { truck: { select: { id: true, plate: true } } },
  });

  const total = rows
    .filter((r) => r.status !== "CANCELLED")
    .reduce((acc, r) => acc + r.cost, 0);

  return (
    <Card>
      <CardHeader
        title="Mantenimientos"
        description={`${rows.length} registros · ${money(total)} invertidos`}
        action={
          editable && (
            <MaintenanceModal trucks={trucks} defaultTruckId={truckId} />
          )
        }
      />
      <MaintenanceTable
        rows={rows}
        showTruck={false}
        canEdit={editable}
        trucks={trucks}
        defaultTruckId={truckId}
        action={
          editable && (
            <MaintenanceModal trucks={trucks} defaultTruckId={truckId} />
          )
        }
      />
    </Card>
  );
}

async function GastosTab({
  truckId,
  editable,
  trucks,
}: {
  truckId: string;
  editable: boolean;
  trucks: { id: string; plate: string; nickname: string | null }[];
}) {
  const [rows, trips, drivers] = await Promise.all([
    prisma.expense.findMany({
      where: { truckId },
      orderBy: { date: "desc" },
      take: 200,
      include: {
        truck: { select: { id: true, plate: true } },
        trip: { select: { id: true, code: true } },
      },
    }),
    prisma.trip.findMany({
      where: { truckId },
      orderBy: { departureAt: "desc" },
      take: 60,
      select: { id: true, code: true, origin: true, destination: true },
    }),
    prisma.driver.findMany({
      where: { archived: false },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const total = rows.reduce((acc, r) => acc + r.amount, 0);
  const truckOptions = trucks.map((t) => ({ id: t.id, label: t.plate }));
  const tripOptions = trips.map((t) => ({
    id: t.id,
    label: `${t.code} — ${t.origin} → ${t.destination}`,
  }));
  const driverOptions = drivers.map((d) => ({
    id: d.id,
    label: fullName(d),
  }));

  return (
    <Card>
      <CardHeader
        title="Gastos del camión"
        description={`${rows.length} movimientos · ${money(total)} en total`}
        action={
          editable && (
            <ExpenseModal
              trucks={truckOptions}
              trips={tripOptions}
              drivers={driverOptions}
              defaultTruckId={truckId}
            />
          )
        }
      />
      <ExpenseTable
        rows={rows}
        showTruck={false}
        canEdit={editable}
        trucks={truckOptions}
        trips={tripOptions}
        drivers={driverOptions}
        defaultTruckId={truckId}
        action={
          editable && (
            <ExpenseModal
              trucks={truckOptions}
              trips={tripOptions}
              drivers={driverOptions}
              defaultTruckId={truckId}
            />
          )
        }
      />
    </Card>
  );
}

async function DocumentosTab({
  truckId,
  editable,
}: {
  truckId: string;
  editable: boolean;
}) {
  const rows = await prisma.document.findMany({
    where: { truckId },
    orderBy: { expiresAt: "asc" },
    include: {
      truck: { select: { id: true, plate: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return (
    <Card>
      <CardHeader
        title="Documentos del vehículo"
        description="SOAT, tecnomecánica, pólizas y permisos. Las alertas aparecen 30 días antes del vencimiento."
        action={
          editable && <DocumentModal owner={{ kind: "truck", id: truckId }} />
        }
      />
      <DocumentTable
        rows={rows}
        showOwner={false}
        canEdit={editable}
        owner={{ kind: "truck", id: truckId }}
        action={
          editable && <DocumentModal owner={{ kind: "truck", id: truckId }} />
        }
      />
    </Card>
  );
}
