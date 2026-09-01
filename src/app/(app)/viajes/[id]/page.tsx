import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Banknote,
  Gauge,
  MapPin,
  Package,
  Pencil,
  Trash2,
  TrendingUp,
  Truck as TruckIcon,
  User,
} from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, DataItem, EmptyState } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { ExpenseTable } from "@/components/lists/ExpenseTable";
import { CargoModal } from "@/components/forms/CargoModal";
import { ExpenseModal } from "@/components/forms/ExpenseModal";
import { TripStatusSwitcher } from "./TripStatusSwitcher";
import { deleteTrip } from "@/actions/trips";
import { deleteCargo } from "@/actions/cargos";
import { CARGO_STATUS, CARGO_UNIT, TRIP_STATUS } from "@/lib/labels";
import {
  dateTime,
  fullName,
  km,
  money,
  number,
  percent,
  round2,
} from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/viajes/[id]">) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { code: true },
  });
  return { title: trip ? `Viaje ${trip.code}` : "Viaje" };
}

export default async function TripDetailPage({
  params,
}: PageProps<"/viajes/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const editable = canWrite(user);

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      truck: {
        select: {
          id: true,
          plate: true,
          nickname: true,
          brand: true,
          model: true,
          photoUrl: true,
        },
      },
      driver: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
      cargos: {
        orderBy: { createdAt: "asc" },
        include: { customer: { select: { id: true, name: true } } },
      },
      expenses: {
        orderBy: { date: "desc" },
        include: {
          truck: { select: { id: true, plate: true } },
          trip: { select: { id: true, code: true } },
        },
      },
    },
  });

  if (!trip) notFound();

  const [customers, trucks, drivers] = await Promise.all([
    prisma.customer.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.truck.findMany({
      where: { archived: false },
      orderBy: { plate: "asc" },
      select: { id: true, plate: true },
    }),
    prisma.driver.findMany({
      where: { archived: false },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const gastos = round2(trip.expenses.reduce((acc, e) => acc + e.amount, 0));
  const utilidad = round2(trip.revenue - gastos);
  const margen = trip.revenue ? round2((utilidad / trip.revenue) * 100) : null;

  const truckOptions = trucks.map((t) => ({ id: t.id, label: t.plate }));
  const driverOptions = drivers.map((d) => ({ id: d.id, label: fullName(d) }));
  const tripOptions = [
    { id: trip.id, label: `${trip.code} — ${trip.origin} → ${trip.destination}` },
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{trip.code}</span>
            <Badge tone={TRIP_STATUS[trip.status].tone} dot>
              {TRIP_STATUS[trip.status].label}
            </Badge>
          </span>
        }
        description={`${trip.origin} → ${trip.destination}`}
        breadcrumbs={[
          { label: "Viajes", href: "/viajes" },
          { label: trip.code },
        ]}
        actions={
          editable && (
            <>
              <TripStatusSwitcher tripId={trip.id} status={trip.status} />
              <LinkButton href={`/viajes/${trip.id}/editar`} variant="secondary">
                <Pencil className="size-4" />
                Editar
              </LinkButton>
              <form action={deleteTrip}>
                <input type="hidden" name="tripId" value={trip.id} />
                <ConfirmButton
                  size="md"
                  message={`¿Eliminar el viaje ${trip.code}? Se borrarán también sus ${trip.cargos.length} cargas. Esta acción no se puede deshacer.`}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </ConfirmButton>
              </form>
            </>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Flete"
          value={money(trip.revenue, true)}
          hint={`${trip.cargos.length} carga${trip.cargos.length === 1 ? "" : "s"}`}
          icon={<Banknote className="size-5" />}
          tone="success"
        />
        <StatCard
          label="Gastos del viaje"
          value={money(gastos, true)}
          hint={`${trip.expenses.length} movimientos`}
          icon={<Package className="size-5" />}
          tone="warning"
        />
        <StatCard
          label="Ganancia"
          value={money(utilidad, true)}
          hint={margen !== null ? `Margen ${percent(margen)}` : "Sin flete cargado"}
          icon={<TrendingUp className="size-5" />}
          tone={utilidad >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Distancia"
          value={trip.distanceKm ? km(trip.distanceKm) : "—"}
          hint={
            trip.distanceKm && gastos
              ? `${money(round2(gastos / trip.distanceKm))} por km`
              : "Sin recorrido registrado"
          }
          icon={<Gauge className="size-5" />}
          tone="info"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Datos del viaje" icon={<MapPin className="size-4" />} />
          <div className="px-5 py-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataItem label="Origen">{trip.origin}</DataItem>
              <DataItem label="Destino">{trip.destination}</DataItem>
              <DataItem label="Salida">{dateTime(trip.departureAt)}</DataItem>
              <DataItem label="Llegada estimada">
                {dateTime(trip.plannedArrivalAt)}
              </DataItem>
              <DataItem label="Llegada real">{dateTime(trip.arrivalAt)}</DataItem>
              <DataItem label="Distancia">
                {trip.distanceKm ? km(trip.distanceKm) : "—"}
              </DataItem>
              <DataItem label="Odómetro salida">
                {trip.startOdometerKm ? km(trip.startOdometerKm) : "—"}
              </DataItem>
              <DataItem label="Odómetro llegada">
                {trip.endOdometerKm ? km(trip.endOdometerKm) : "—"}
              </DataItem>
              <DataItem label="Creado">{dateTime(trip.createdAt)}</DataItem>
            </dl>
            {trip.notes && (
              <div className="mt-4 rounded-lg bg-[var(--surface-2)] p-3">
                <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Observaciones
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">
                  {trip.notes}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Asignación" icon={<TruckIcon className="size-4" />} />
          <div className="flex flex-col gap-3 px-5 py-4">
            <Link
              href={`/camiones/${trip.truck.id}`}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--surface-hover)] focus-ring"
            >
              <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-2)]">
                {trip.truck.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trip.truck.photoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-[var(--text-muted)]">
                    <TruckIcon className="size-5" />
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold">
                  {trip.truck.plate}
                </p>
                <p className="truncate text-sm text-[var(--text-muted)]">
                  {trip.truck.nickname ??
                    `${trip.truck.brand} ${trip.truck.model}`}
                </p>
              </div>
            </Link>

            {trip.driver ? (
              <Link
                href={`/conductores/${trip.driver.id}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--surface-hover)] focus-ring"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                  <User className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {fullName(trip.driver)}
                  </p>
                  <p className="truncate text-sm text-[var(--text-muted)]">
                    {trip.driver.phone ?? "Sin teléfono"}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="px-2 text-sm text-[var(--text-muted)]">
                Sin conductor asignado.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader
          title="Cargas del viaje"
          description="Qué se transporta y para qué cliente."
          icon={<Package className="size-4" />}
          action={
            editable && <CargoModal tripId={trip.id} customers={customers} />
          }
        />
        {trip.cargos.length === 0 ? (
          <EmptyState
            icon={<Package className="size-5" />}
            title="Sin cargas registradas"
            description="Agregá la mercancía que transporta este viaje."
            action={
              editable && <CargoModal tripId={trip.id} customers={customers} />
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Carga</TH>
                <TH>Cliente</TH>
                <TH align="right">Peso</TH>
                <TH align="right">Valor declarado</TH>
                <TH align="right">Flete</TH>
                <TH>Estado</TH>
                {editable && <TH align="right">Acciones</TH>}
              </TR>
            </THead>
            <TBody>
              {trip.cargos.map((cargo) => (
                <TR key={cargo.id}>
                  <TD>
                    <p className="font-medium">{cargo.description}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {cargo.cargoType ?? "Sin clasificar"}
                      {cargo.pickupLocation
                        ? ` · ${cargo.pickupLocation}`
                        : ""}
                    </p>
                  </TD>
                  <TD>
                    {cargo.customer ? (
                      <Link
                        href={`/clientes/${cargo.customer.id}`}
                        className="rounded text-sm underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                      >
                        {cargo.customer.name}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </TD>
                  <TD align="right" className="whitespace-nowrap">
                    {number(cargo.weight, cargo.unit === "TON" ? 1 : 0)}{" "}
                    <span className="text-[var(--text-muted)]">
                      {CARGO_UNIT[cargo.unit]}
                    </span>
                  </TD>
                  <TD align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                    {cargo.declaredValue ? money(cargo.declaredValue) : "—"}
                  </TD>
                  <TD align="right" className="whitespace-nowrap font-medium">
                    {cargo.freightCharge ? money(cargo.freightCharge) : "—"}
                  </TD>
                  <TD>
                    <Badge tone={CARGO_STATUS[cargo.status].tone}>
                      {CARGO_STATUS[cargo.status].label}
                    </Badge>
                  </TD>
                  {editable && (
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        <CargoModal
                          tripId={trip.id}
                          customers={customers}
                          values={cargo}
                        />
                        <form action={deleteCargo}>
                          <input type="hidden" name="id" value={cargo.id} />
                          <ConfirmButton
                            message={`¿Eliminar la carga «${cargo.description}»?`}
                            variant="ghost"
                            title="Eliminar"
                          >
                            <Trash2 className="size-3.5" />
                          </ConfirmButton>
                        </form>
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Gastos del viaje"
          description={`${money(gastos)} en ${trip.expenses.length} movimientos`}
          icon={<Banknote className="size-4" />}
          action={
            editable && (
              <ExpenseModal
                trucks={truckOptions}
                trips={tripOptions}
                drivers={driverOptions}
                defaultTruckId={trip.truckId}
                defaultTripId={trip.id}
              />
            )
          }
        />
        <ExpenseTable
          rows={trip.expenses}
          showTruck={false}
          canEdit={editable}
          trucks={truckOptions}
          trips={tripOptions}
          drivers={driverOptions}
          defaultTruckId={trip.truckId}
          defaultTripId={trip.id}
          action={
            editable && (
              <ExpenseModal
                trucks={truckOptions}
                trips={tripOptions}
                drivers={driverOptions}
                defaultTruckId={trip.truckId}
                defaultTripId={trip.id}
              />
            )
          }
        />
      </Card>
    </>
  );
}
