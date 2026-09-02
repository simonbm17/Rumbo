import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  FileText,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFuelStats, getMonthlySeries, getTruckFinancials } from "@/lib/stats";
import { historialDeVehiculo, vigenteDeVehiculo } from "@/lib/assignments";
import { ALERT_LABEL, ALERT_TONE, getAlerts } from "@/lib/alerts";
import { Badge } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { RecordList, RecordRow } from "@/components/RecordList";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { VehicleIdentityHeader } from "@/components/VehicleIdentityHeader";
import { MaintenanceModal } from "@/components/forms/MaintenanceModal";
import { ExpenseModal } from "@/components/forms/ExpenseModal";
import { DocumentModal } from "@/components/forms/DocumentModal";
import { StatusSwitcher } from "./StatusSwitcher";
import { archiveTruck, deleteTruck } from "@/actions/trucks";
import {
  ASSIGNMENT_END_REASON,
  ASSIGNMENT_SOURCE,
  DOCUMENT_TYPE,
  EXPENSE_CATEGORY,
  MAINTENANCE_STATUS,
  MAINTENANCE_TYPE,
  TRIP_STATUS,
} from "@/lib/labels";
import {
  date,
  daysUntil,
  fullName,
  km,
  money,
  number,
  percent,
  relativeDays,
} from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/camiones/[id]">) {
  const { id } = await params;
  const truck = await prisma.truck.findUnique({
    where: { id },
    select: { plate: true },
  });
  return { title: truck ? `Vehículo ${truck.plate}` : "Vehículo" };
}

/** Cuántos registros recientes muestra cada sección del expediente. */
const RECIENTES = 5;

export default async function TruckDetailPage({
  params,
}: PageProps<"/camiones/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const editable = canWrite(user);

  const truck = await prisma.truck.findUnique({
    where: { id },
    include: {
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

  const [
    asignacionVigente,
    historial,
    finance,
    fuel,
    serie,
    viajes,
    mantenimientos,
    gastos,
    documentos,
    alertas,
    trucks,
    tripsParaGasto,
    driversParaGasto,
  ] = await Promise.all([
    /*
      El conductor de la cabecera sale de DriverAssignment, no de
      `Truck.currentDriverId` ni del último viaje. `currentDriverId` es una
      proyección de compatibilidad y el conductor de un viaje es quien condujo
      ESE viaje, que puede no ser el asignado hoy.
    */
    vigenteDeVehiculo(truck.id),
    historialDeVehiculo(truck.id),
    getTruckFinancials(truck.id),
    getFuelStats(truck.id),
    /*
      Seis meses de ESTE vehículo: `getMonthlySeries` filtra por `truckId` las
      tres consultas que la componen. No es una métrica nueva ni un cálculo
      nuevo; es la misma serie que ya existía en la página anterior.
    */
    getMonthlySeries(6, truck.id),
    prisma.trip.findMany({
      where: { truckId: truck.id },
      orderBy: { departureAt: "desc" },
      take: RECIENTES,
      select: {
        id: true,
        code: true,
        origin: true,
        destination: true,
        departureAt: true,
        distanceKm: true,
        status: true,
        revenue: true,
        driver: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.maintenance.findMany({
      where: { truckId: truck.id },
      orderBy: { date: "desc" },
      take: RECIENTES,
      select: {
        id: true,
        title: true,
        type: true,
        date: true,
        odometerKm: true,
        cost: true,
        workshop: true,
        status: true,
        nextServiceDate: true,
        nextServiceKm: true,
      },
    }),
    prisma.expense.findMany({
      where: { truckId: truck.id },
      orderBy: { date: "desc" },
      take: RECIENTES,
      select: {
        id: true,
        category: true,
        description: true,
        amount: true,
        date: true,
        liters: true,
        supplier: true,
        trip: { select: { id: true, code: true } },
      },
    }),
    // Los documentos van completos: son pocos y el vencimiento es lo que se
    // viene a consultar. Ordenados por lo que vence antes.
    prisma.document.findMany({
      where: { truckId: truck.id },
      orderBy: { expiresAt: "asc" },
      select: {
        id: true,
        type: true,
        number: true,
        issuer: true,
        expiresAt: true,
        fileUrl: true,
      },
    }),
    getAlerts(),
    prisma.truck.findMany({
      where: { archived: false },
      orderBy: { plate: "asc" },
      select: { id: true, plate: true, nickname: true },
    }),
    prisma.trip.findMany({
      where: { truckId: truck.id },
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

  const conductor = asignacionVigente
    ? {
        id: asignacionVigente.driver.id,
        nombre: fullName(asignacionVigente.driver),
      }
    : null;

  // Solo las alertas de ESTE vehículo. `getAlerts` está cacheada por petición.
  const misAlertas = alertas.filter((a) => a.href.startsWith(`/camiones/${truck.id}`));

  const truckOptions = trucks.map((t) => ({ id: t.id, label: t.plate }));
  const tripOptions = tripsParaGasto.map((t) => ({
    id: t.id,
    label: `${t.code} — ${t.origin} → ${t.destination}`,
  }));
  const driverOptions = driversParaGasto.map((d) => ({
    id: d.id,
    label: fullName(d),
  }));

  return (
    <>
      {/*
        El regreso es un enlace de verdad, con área tocable y con la palabra
        «Vehículos» completa. La miga de pan de 14px que había antes decía lo
        mismo con la mitad del tamaño y sin destino evidente.
      */}
      <Link
        href="/camiones"
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--r-control)] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-ring"
      >
        <ArrowLeft className="size-5" aria-hidden />
        Vehículos
      </Link>

      <VehicleIdentityHeader
        vehiculo={truck}
        conductor={conductor}
        acciones={
          editable && (
            <>
              <LinkButton href={`/camiones/${truck.id}/editar`}>
                <Pencil className="size-5" aria-hidden />
                Editar vehículo
              </LinkButton>
              <StatusSwitcher truckId={truck.id} status={truck.status} />
            </>
          )
        }
      />

      {/*
        La alerta aparece solo cuando existe. No hay bloque reservado ni caja
        vacía diciendo «todo en orden»: en un expediente operacional el silencio
        ya significa que no hay nada que atender.
      */}
      {misAlertas.length > 0 && (
        <section
          aria-label="Requiere atención"
          className="mb-6 overflow-hidden rounded-[var(--r-surface)] border border-[var(--border)] bg-[var(--surface)]"
        >
          <h2 className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 font-semibold">
            <TriangleAlert
              className="size-5 shrink-0 text-[var(--tone-danger-fg)]"
              aria-hidden
            />
            Requiere atención
            <span className="font-mono text-sm font-medium text-[var(--text-muted)] tabular-nums">
              {misAlertas.length}
            </span>
          </h2>
          <ul>
            {misAlertas.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--border)] px-4 py-3 last:border-b-0"
              >
                <Badge tone={ALERT_TONE[a.level]} variant="quiet">
                  {ALERT_LABEL[a.level]}
                </Badge>
                <span className="min-w-0 flex-1 font-medium">
                  {a.title.split(" — ")[0]}
                </span>
                <span className="text-[var(--text-muted)]">
                  {relativeDays(a.days)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Navegación local. La agrego porque la medí: a 1440 el expediente ocupa
        3269px —tres viewports y medio— y llegar al historial de asignación son
        2800px de rueda. No es una segunda barra lateral ni una fila de íconos:
        son las seis secciones escritas con su nombre. Se queda pegada arriba
        solo desde 1024px, donde sobra alto; en un teléfono ocuparía viewport
        que hace falta para el expediente.
      */}
      <nav
        aria-label="Secciones del expediente"
        className="mb-8 border-y border-[var(--border)] bg-[var(--bg)] lg:sticky lg:top-16 lg:z-[var(--z-sticky)]"
      >
        <ul className="flex flex-wrap items-center gap-x-6">
          {[
            ["resumen", "Resumen"],
            ["viajes", "Viajes"],
            ["mantenimiento", "Mantenimiento"],
            ["gastos", "Gastos"],
            ["documentos", "Documentos"],
            ["historial", "Historial"],
          ].map(([ancla, texto]) => (
            <li key={ancla}>
              <a
                href={`#${ancla}`}
                className="inline-flex min-h-11 items-center rounded-[var(--r-control)] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-ring"
              >
                {texto}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ------------------------------ RESUMEN ------------------------------ */}
      <Section id="resumen"
        title="Resumen operacional" className="mb-8">
        {/*
          Cifras reales derivadas de lo que ya está cargado, en pares
          etiqueta/valor. Sin tarjetas de indicador y sin gráfica: a la pregunta
          «¿cómo está este vehículo hoy?» la responden estos números, no una
          serie de seis meses que hay que interpretar.
        */}
        <dl className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 xl:grid-cols-6">
          <Cifra rotulo="Viajes" valor={String(finance.tripCount)} />
          <Cifra rotulo="Recorrido" valor={km(finance.km)} />
          <Cifra
            rotulo="Costo por km"
            valor={finance.costoPorKm !== null ? money(finance.costoPorKm) : "—"}
          />
          <Cifra
            rotulo="Rendimiento"
            valor={
              fuel.kmPerLiter !== null
                ? `${number(fuel.kmPerLiter, 2)} km/L`
                : "—"
            }
          />
          <Cifra rotulo="Ingresos" valor={money(finance.ingresos, true)} />
          <Cifra
            rotulo="Utilidad"
            valor={money(finance.utilidad, true)}
            nota={
              finance.margen !== null ? `Margen ${percent(finance.margen)}` : undefined
            }
            tono={finance.utilidad >= 0 ? "success" : "danger"}
          />
        </dl>

        {/*
          La gráfica venía de la página anterior y se queda, porque responde una
          pregunta operacional real y propia del vehículo: si lo que produce
          cubre lo que cuesta, y hacia dónde va la tendencia. Es la pregunta con
          la que se decide repararlo, seguir usándolo o sacarlo.

          Va aquí, dentro del Resumen, después de las cifras y bajo su propio
          rótulo: es lectura secundaria del expediente, no la portada. En un
          teléfono baja a 224px para no comerse un tercio de la pantalla.
        */}
        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <h3 className="mb-1 font-semibold">Evolución de los últimos 6 meses</h3>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Lo que este vehículo facturó en viajes contra lo que costó en gastos
            y taller, mes a mes.
          </p>
          <RevenueChart data={serie} alto="h-56 sm:h-72" />
        </div>

        {(truck.vin || truck.engineNumber || truck.color || truck.notes) && (
          <dl className="mt-6 grid grid-cols-1 gap-x-8 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
            {truck.vin && <Ficha rotulo="VIN / Chasis" valor={truck.vin} mono />}
            {truck.engineNumber && (
              <Ficha rotulo="Número de motor" valor={truck.engineNumber} mono />
            )}
            {truck.color && <Ficha rotulo="Color" valor={truck.color} />}
            {truck.notes && (
              <div className="sm:col-span-3">
                <dt className="text-sm text-[var(--text-muted)]">
                  Observaciones
                </dt>
                <dd className="mt-1 whitespace-pre-line">{truck.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </Section>

      {/* ------------------------------- VIAJES ------------------------------ */}
      <Section
        id="viajes"
        title="Viajes recientes"
        count={truck._count.trips}
        className="mb-8"
        action={
          truck._count.trips > viajes.length && (
            <Enlace href={`/viajes?truckId=${truck.id}`}>
              Ver los {truck._count.trips}
            </Enlace>
          )
        }
      >
        <RecordList
          vacio="Este vehículo todavía no tiene viajes registrados."
          accion={
            editable && (
              <LinkButton
                href={`/viajes/nuevo?truckId=${truck.id}`}
                variant="secondary"
                size="sm"
              >
                Registrar viaje
              </LinkButton>
            )
          }
        >
          {viajes.map((v) => {
            const estado = TRIP_STATUS[v.status];
            return (
              <RecordRow
                key={v.id}
                href={`/viajes/${v.id}`}
                titulo={`${v.origin} → ${v.destination}`}
                estado={
                  <Badge tone={estado.tone} variant="quiet">
                    {estado.label}
                  </Badge>
                }
                meta={
                  <>
                    <span className="font-mono">{v.code}</span>
                    {" · "}
                    {date(v.departureAt)}
                    {" · "}
                    {/* Quien condujo ESE viaje, que puede no ser el asignado. */}
                    {v.driver ? fullName(v.driver) : "Sin conductor"}
                  </>
                }
                cifra={money(v.revenue, true)}
                cifraRotulo={v.distanceKm ? km(v.distanceKm) : undefined}
              />
            );
          })}
        </RecordList>
      </Section>

      {/* --------------------------- MANTENIMIENTO --------------------------- */}
      <Section
        id="mantenimiento"
        title="Mantenimiento"
        count={truck._count.maintenances}
        className="mb-8"
        action={
          editable && (
            <MaintenanceModal trucks={trucks} defaultTruckId={truck.id} />
          )
        }
      >
        <RecordList vacio="Sin mantenimientos registrados para este vehículo.">
          {mantenimientos.map((m) => {
            const estado = MAINTENANCE_STATUS[m.status];
            return (
              <RecordRow
                key={m.id}
                titulo={m.title}
                estado={
                  <Badge tone={estado.tone} variant="quiet">
                    {estado.label}
                  </Badge>
                }
                meta={
                  <>
                    {MAINTENANCE_TYPE[m.type]}
                    {" · "}
                    {date(m.date)}
                    {m.odometerKm ? ` · ${km(m.odometerKm)}` : ""}
                    {m.workshop ? ` · ${m.workshop}` : ""}
                  </>
                }
                cifra={money(m.cost, true)}
                pie={
                  /* Solo si el dato existe: no se inventa mantenimiento futuro. */
                  (m.nextServiceDate || m.nextServiceKm) && (
                    <span className="text-[var(--text-muted)]">
                      Próximo:{" "}
                      {[
                        m.nextServiceDate ? date(m.nextServiceDate) : null,
                        m.nextServiceKm ? km(m.nextServiceKm) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )
                }
              />
            );
          })}
        </RecordList>
      </Section>

      {/* ------------------------------- GASTOS ------------------------------ */}
      <Section
        id="gastos"
        title="Gastos recientes"
        count={truck._count.expenses}
        className="mb-8"
        action={
          editable && (
            <ExpenseModal
              trucks={truckOptions}
              trips={tripOptions}
              drivers={driverOptions}
              defaultTruckId={truck.id}
            />
          )
        }
      >
        <RecordList vacio="Sin gastos registrados para este vehículo.">
          {gastos.map((g) => (
            <RecordRow
              key={g.id}
              titulo={EXPENSE_CATEGORY[g.category]}
              meta={
                <>
                  {date(g.date)}
                  {g.description ? ` · ${g.description}` : ""}
                  {g.supplier ? ` · ${g.supplier}` : ""}
                  {g.trip ? ` · viaje ${g.trip.code}` : ""}
                </>
              }
              cifra={money(g.amount)}
              cifraRotulo={g.liters ? `${number(g.liters, 1)} L` : undefined}
            />
          ))}
        </RecordList>
      </Section>

      {/* ----------------------------- DOCUMENTOS ---------------------------- */}
      <Section
        id="documentos"
        title="Documentos"
        count={truck._count.documents}
        description="El vencimiento va completo y siempre visible: es el dato por el que se abre esta sección."
        className="mb-8"
        action={
          editable && <DocumentModal owner={{ kind: "truck", id: truck.id }} />
        }
      >
        <RecordList vacio="Sin documentos asociados a este vehículo.">
          {documentos.map((d) => {
            /*
              Los mismos umbrales que ya usa el resto del producto, sin
              duplicarlos: `alerts.ts` es la única definición de qué está
              vencido, urgente o por vencer.
            */
            const dias = daysUntil(d.expiresAt);
            const nivel =
              dias < 0 ? "expired" : dias <= 7 ? "critical" : dias <= 30 ? "warning" : null;
            return (
              <RecordRow
                key={d.id}
                titulo={DOCUMENT_TYPE[d.type]}
                estado={
                  nivel ? (
                    <Badge tone={ALERT_TONE[nivel]} variant="quiet">
                      {ALERT_LABEL[nivel]}
                    </Badge>
                  ) : (
                    <Badge tone="success" variant="quiet">
                      Vigente
                    </Badge>
                  )
                }
                meta={
                  <>
                    {d.number ? `N.º ${d.number}` : "Sin número"}
                    {d.issuer ? ` · ${d.issuer}` : ""}
                  </>
                }
                cifra={date(d.expiresAt)}
                cifraRotulo={relativeDays(dias)}
                pie={
                  /* La acción real disponible sobre un documento: abrir el
                     archivo, cuando se subió alguno. */
                  d.fileUrl && (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--r-control)] font-medium underline decoration-[var(--border-control)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--accent)] focus-ring"
                    >
                      <FileText className="size-4 shrink-0" aria-hidden />
                      Abrir archivo
                    </a>
                  )
                }
              />
            );
          })}
        </RecordList>
      </Section>

      {/* ------------------------ HISTORIAL DE ASIGNACIÓN -------------------- */}
      <Section
        id="historial"
        title="Historial de asignación"
        count={historial.length}
        description="Quién ha tenido este vehículo y desde cuándo. Es el registro operacional, no se deduce de los viajes."
        className="mb-8"
      >
        <RecordList vacio="Este vehículo no tiene asignaciones registradas.">
          {historial.map((a) => {
            const vigente = a.endedAt === null;
            return (
              <RecordRow
                key={a.id}
                href={`/conductores/${a.driver.id}`}
                titulo={fullName(a.driver)}
                estado={
                  vigente ? (
                    <Badge tone="success" variant="quiet">
                      Asignación vigente
                    </Badge>
                  ) : a.endReason ? (
                    <Badge tone="neutral" variant="quiet">
                      {ASSIGNMENT_END_REASON[a.endReason]}
                    </Badge>
                  ) : undefined
                }
                meta={
                  <>
                    {/*
                      Cuando startedAt es null la fila viene de la migración y
                      la fecha real no se conoce. Se dice; no se inventa, y no
                      se rellena con el primer viaje.
                    */}
                    {a.startedAt ? (
                      <>Desde el {date(a.startedAt)}</>
                    ) : (
                      <span className="italic">
                        Inicio histórico no disponible
                      </span>
                    )}
                    {a.endedAt ? <> · hasta el {date(a.endedAt)}</> : null}
                    {a.source === "MIGRATION" && (
                      <> · {ASSIGNMENT_SOURCE.MIGRATION}</>
                    )}
                  </>
                }
              />
            );
          })}
        </RecordList>
      </Section>

      {/* ---------------------------- ZONA DE RIESGO -------------------------- */}
      {editable && (
        <Section title="Salida de la flota" className="mb-8">
          <div className="flex flex-col gap-4 rounded-[var(--r-surface)] border border-[var(--border)] px-4 py-4">
            <p className="max-w-prose text-[var(--text-muted)]">
              Archivar saca el vehículo de la flota activa y conserva su
              expediente completo. Eliminar borra también sus{" "}
              {truck._count.trips} viajes, {truck._count.expenses} gastos,{" "}
              {truck._count.maintenances} mantenimientos y{" "}
              {truck._count.documents} documentos, y no se puede deshacer.
            </p>
            <div className="flex flex-wrap items-center gap-3">
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
                      <ArchiveRestore className="size-5" aria-hidden />
                      Restaurar a la flota
                    </>
                  ) : (
                    <>
                      <Archive className="size-5" aria-hidden />
                      Archivar vehículo
                    </>
                  )}
                </ConfirmButton>
              </form>
              <form action={deleteTruck}>
                <input type="hidden" name="truckId" value={truck.id} />
                <ConfirmButton
                  size="md"
                  message={`¿Eliminar definitivamente el vehículo ${truck.plate}? Se borrarán ${truck._count.trips} viajes, ${truck._count.expenses} gastos, ${truck._count.maintenances} mantenimientos y ${truck._count.documents} documentos. Esta acción NO se puede deshacer.`}
                >
                  <Trash2 className="size-5" aria-hidden />
                  Eliminar
                </ConfirmButton>
              </form>
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

/** Una cifra del resumen: rótulo arriba, número abajo. Sin caja. */
function Cifra({
  rotulo,
  valor,
  nota,
  tono,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tono?: "success" | "danger";
}) {
  return (
    <div className="border-b border-[var(--border)] py-3">
      <dt className="text-sm text-[var(--text-muted)]">{rotulo}</dt>
      <dd
        className="font-mono text-xl font-semibold tabular-nums"
        style={
          tono ? { color: `var(--tone-${tono}-fg)` } : undefined
        }
      >
        {valor}
      </dd>
      {nota && (
        <dd className="text-sm text-[var(--text-muted)]">{nota}</dd>
      )}
    </div>
  );
}

/** Dato técnico del vehículo. Solo se dibuja si existe. */
function Ficha({
  rotulo,
  valor,
  mono = false,
}: {
  rotulo: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="py-1">
      <dt className="text-sm text-[var(--text-muted)]">{rotulo}</dt>
      <dd className={mono ? "font-mono" : undefined}>{valor}</dd>
    </div>
  );
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-[var(--r-control)] font-medium underline decoration-[var(--border-control)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--accent)] focus-ring"
    >
      {children}
    </Link>
  );
}
