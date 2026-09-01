import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Plus,
  Route,
  Truck,
  TriangleAlert,
} from "lucide-react";
import { requireUser, canWrite } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAlerts } from "@/lib/alerts";
import { getDashboardStats } from "@/lib/stats";
import { getCompanySettings } from "@/lib/settings";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { LinkButton } from "@/components/ui/Button";
import { AlertList } from "@/components/AlertList";
import { TRIP_STATUS, TRUCK_STATUS } from "@/lib/labels";
import { fullName, money, startOfMonthLabel, dateTime } from "@/lib/format";

export const metadata = { title: "Panel" };

export default async function DashboardPage() {
  const user = await requireUser();
  const editable = canWrite(user);

  const [company, stats, alerts, activeTrips, fleet] = await Promise.all([
    getCompanySettings(),
    getDashboardStats(),
    getAlerts(),
    prisma.trip.findMany({
      where: { status: "IN_PROGRESS" },
      orderBy: { departureAt: "asc" },
      include: {
        truck: { select: { id: true, plate: true } },
        driver: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.truck.findMany({
      where: { archived: false },
      orderBy: [{ status: "asc" }, { plate: "asc" }],
      select: {
        id: true,
        plate: true,
        nickname: true,
        photoUrl: true,
        status: true,
      },
    }),
  ]);

  const urgentes = alerts.filter(
    (a) => a.level === "expired" || a.level === "critical"
  ).length;

  return (
    <div className="mx-auto max-w-6xl">
      {/* 1. Quién sos y las dos cosas que más vas a hacer */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Hola, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-lg text-[var(--text-muted)]">
          {company.name}
        </p>

        {editable && (
          <div className="mt-5 flex flex-wrap gap-3 no-print">
            <LinkButton href="/viajes/nuevo" size="lg">
              <Plus className="size-5" aria-hidden />
              Registrar un viaje
            </LinkButton>
            <LinkButton href="/camiones/nuevo" variant="secondary" size="lg">
              <Truck className="size-5" aria-hidden />
              Agregar un camión
            </LinkButton>
          </div>
        )}
      </header>

      {/* 2. Lo que necesita acción hoy: lo primero, siempre */}
      <section className="mb-8">
        {alerts.length === 0 ? (
          <div
            className="flex items-center gap-3 rounded-xl px-5 py-4"
            style={{
              background: "var(--tone-success-bg)",
              color: "var(--tone-success-fg)",
            }}
          >
            <CheckCircle2 className="size-6 shrink-0" aria-hidden />
            <p className="font-semibold">
              Todo al día. No hay documentos ni mantenimientos por vencer.
            </p>
          </div>
        ) : (
          <Card>
            <CardHeader
              title="Necesita tu atención"
              description={
                urgentes > 0
                  ? `${urgentes} sin tiempo que perder, ${alerts.length} en total este mes`
                  : `${alerts.length} por vencer en los próximos 30 días`
              }
              icon={<TriangleAlert className="size-5" />}
              action={
                alerts.length > 4 && (
                  <LinkButton href="/documentos" variant="secondary" size="sm">
                    Ver las {alerts.length}
                  </LinkButton>
                )
              }
            />
            <AlertList alerts={alerts} limit={4} />
          </Card>
        )}
      </section>

      {/* 3. La plata del mes: tres cifras, sin gráfico */}
      <section className="mb-8">
        <Card>
          <CardHeader
            title={`Cómo va ${startOfMonthLabel().toLowerCase()}`}
            description={`${stats.tripsThisMonth} viajes en el mes`}
            action={
              <LinkButton href="/reportes" variant="secondary" size="sm">
                Ver reportes
              </LinkButton>
            }
          />
          <dl className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Figura
              rotulo="Ingresos"
              valor={money(stats.revenue, true)}
              detalle="Fletes cobrados"
            />
            <Figura
              rotulo="Gastos"
              valor={money(stats.expenses, true)}
              detalle="Combustible, peajes y taller"
            />
            <Figura
              rotulo="Ganancia"
              valor={money(stats.profit, true)}
              detalle="Lo que quedó"
              color={
                stats.profit >= 0
                  ? "var(--tone-success-fg)"
                  : "var(--tone-danger-fg)"
              }
            />
          </dl>
        </Card>
      </section>

      {/* 4. Los camiones: lo más tangible y lo más visitado */}
      <section className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Tus camiones</h2>
            <p className="mt-0.5 text-[var(--text-muted)]">
              {stats.trucksActive} disponibles
              {stats.trucksMaintenance > 0
                ? `, ${stats.trucksMaintenance} en el taller`
                : ""}
            </p>
          </div>
          <Link
            href="/camiones"
            className="-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
          >
            Ver todos
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {fleet.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Truck className="size-6" />}
              title="Todavía no cargaste camiones"
              description="Agregá el primero con su foto y su placa para empezar."
              action={
                editable && (
                  <LinkButton href="/camiones/nuevo">
                    <Plus className="size-5" aria-hidden />
                    Agregar camión
                  </LinkButton>
                )
              }
            />
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {fleet.map((truck) => (
              <li key={truck.id}>
                <Link
                  href={`/camiones/${truck.id}`}
                  className="card pressable block overflow-hidden focus-ring"
                >
                  <span className="block aspect-[16/10] bg-[var(--surface-2)]">
                    {truck.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={truck.photoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[var(--icon-muted)]">
                        <Truck className="size-8" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col items-start gap-2 p-4">
                    <Plate value={truck.plate} size="lg" />
                    <Badge tone={TRUCK_STATUS[truck.status].tone} dot>
                      {TRUCK_STATUS[truck.status].label}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. Lo que está pasando ahora mismo en la ruta */}
      <section>
        <Card>
          <CardHeader
            title="Viajes en curso"
            description={
              activeTrips.length > 0
                ? `${activeTrips.length} camiones en la ruta ahora`
                : undefined
            }
            icon={<Route className="size-5" />}
            action={
              <LinkButton href="/viajes" variant="secondary" size="sm">
                Todos los viajes
              </LinkButton>
            }
          />
          {activeTrips.length === 0 ? (
            <EmptyState
              icon={<Route className="size-6" />}
              title="Ningún camión en ruta"
              description="Cuando marques un viaje como «En curso» va a aparecer acá."
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {activeTrips.map((trip) => (
                <li key={trip.id}>
                  <Link
                    href={`/viajes/${trip.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-[var(--surface-hover)] focus-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {trip.origin} → {trip.destination}
                      </span>
                      <span className="block text-[var(--text-muted)]">
                        <Plate value={trip.truck.plate} />
                        {trip.driver ? ` · ${fullName(trip.driver)}` : ""} ·
                        salió {dateTime(trip.departureAt)}
                      </span>
                    </span>
                    <Badge tone={TRIP_STATUS[trip.status].tone} dot>
                      {TRIP_STATUS[trip.status].label}
                    </Badge>
                    <ArrowRight
                      className="size-5 shrink-0 text-[var(--icon-muted)]"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

/** Una de las tres cifras del mes. */
function Figura({
  rotulo,
  valor,
  detalle,
  color,
}: {
  rotulo: string;
  valor: string;
  detalle: string;
  color?: string;
}) {
  return (
    <div className="px-5 py-5">
      <dt className="font-medium text-[var(--text-muted)]">{rotulo}</dt>
      <dd>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl"
          style={color ? { color } : undefined}
        >
          {valor}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{detalle}</p>
      </dd>
    </div>
  );
}
