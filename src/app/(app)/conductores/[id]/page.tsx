import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  FileText,
  Mail,
  Pencil,
  Phone,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { historialDeConductor } from "@/lib/assignments";
import { ALERT_LABEL, ALERT_TONE, getAlerts } from "@/lib/alerts";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { Section } from "@/components/ui/Section";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { RecordList, RecordRow } from "@/components/RecordList";
import { CurrentAssignment } from "@/components/CurrentAssignment";
import { DocumentModal } from "@/components/forms/DocumentModal";
import { archiveDriver, deleteDriver } from "@/actions/drivers";
import {
  ASSIGNMENT_END_REASON,
  ASSIGNMENT_SOURCE,
  DOCUMENT_TYPE,
  DRIVER_STATUS,
  TRIP_STATUS,
} from "@/lib/labels";
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

/** Cuántos registros recientes muestra cada sección del expediente. */
const RECIENTES = 5;

export default async function DriverDetailPage({
  params,
}: PageProps<"/conductores/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const editable = canWrite(user);

  const driver = await prisma.driver.findUnique({
    where: { id },
    include: { _count: { select: { trips: true, documents: true } } },
  });

  if (!driver) notFound();

  const [historial, viajes, documentos, alertas, totales, distancia, gastos] =
    await Promise.all([
      /*
        La fuente de verdad de qué vehículos ha tenido. La vigente viene
        primero por el `orderBy` de la propia función.
      */
      historialDeConductor(driver.id),
      prisma.trip.findMany({
        where: { driverId: driver.id },
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
          // El vehículo de ESE viaje, que puede no ser el asignado hoy.
          truck: { select: { id: true, plate: true } },
        },
      }),
      prisma.document.findMany({
        where: { driverId: driver.id },
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
      prisma.trip.aggregate({
        _sum: { revenue: true },
        where: {
          driverId: driver.id,
          status: { in: ["IN_PROGRESS", "COMPLETED"] },
        },
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

  const vigente = historial.find((a) => a.endedAt === null) ?? null;

  // La identidad completa del vehículo vigente; el historial solo trae placa y alias.
  const vehiculoActual = vigente
    ? await prisma.truck.findUnique({
        where: { id: vigente.truckId },
        select: {
          id: true,
          plate: true,
          nickname: true,
          brand: true,
          model: true,
          year: true,
          status: true,
          photoUrl: true,
        },
      })
    : null;

  const misAlertas = alertas.filter((a) =>
    a.href.startsWith(`/conductores/${driver.id}`)
  );
  const estado = DRIVER_STATUS[driver.status];
  const licenciaDias = driver.licenseExpiry
    ? daysUntil(driver.licenseExpiry)
    : null;

  return (
    <>
      <Link
        href="/conductores"
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--r-control)] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-ring"
      >
        <ArrowLeft className="size-5" aria-hidden />
        Conductores
      </Link>

      {/* ---------------------- IDENTIDAD OPERACIONAL ---------------------- */}
      {/*
        Sin ventana grande. La composición VENTANA + LECTURA es del activo
        vehículo y aquí sería una caja de 3:2 con un retrato dentro, que no
        aporta reconocimiento operacional. La persona se identifica por su
        nombre y su documento; la foto queda como avatar y nada más.
      */}
      <section className="mb-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span
            className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-2)] text-lg font-semibold text-[var(--text-muted)]"
            aria-hidden
          >
            {driver.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={driver.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              initials(driver.firstName, driver.lastName)
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {fullName(driver)}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Badge
                tone={driver.archived ? "neutral" : estado.tone}
                variant="quiet"
                size="lg"
              >
                {driver.archived ? "Archivado" : estado.label}
              </Badge>
              <span className="font-mono text-[var(--text-muted)]">
                {driver.documentId}
              </span>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 border-t border-[var(--border)] sm:gap-x-8 lg:grid-cols-4">
          <Dato etiqueta="Teléfono">
            {driver.phone ? (
              <a
                href={`tel:${driver.phone.replace(/\s/g, "")}`}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-[var(--r-control)] underline decoration-[var(--border-control)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--accent)] focus-ring"
              >
                <Phone className="size-4 shrink-0" aria-hidden />
                {driver.phone}
              </a>
            ) : (
              <Vacio />
            )}
          </Dato>
          <Dato etiqueta="Correo">
            {driver.email ? (
              <a
                href={`mailto:${driver.email}`}
                /*
                  `max-w-full`: siendo `inline-flex`, el ancho del ancla lo
                  fijaba su contenido, así que el `truncate` del hijo no tenía
                  contra qué recortar y un correo largo se salía de su columna
                  —medido: 269px de texto en una celda de 167px—.
                */
                className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-[var(--r-control)] underline decoration-[var(--border-control)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--accent)] focus-ring"
              >
                <Mail className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{driver.email}</span>
              </a>
            ) : (
              <Vacio />
            )}
          </Dato>
          <Dato etiqueta={`Licencia${driver.licenseClass ? ` ${driver.licenseClass}` : ""}`}>
            {licenciaDias === null ? (
              <Vacio texto="Sin registrar" />
            ) : (
              <span className="inline-flex min-h-11 items-center gap-2">
                <Badge
                  tone={
                    licenciaDias < 0
                      ? "danger"
                      : licenciaDias <= 30
                        ? "warning"
                        : "success"
                  }
                  variant="quiet"
                >
                  {relativeDays(licenciaDias)}
                </Badge>
              </span>
            )}
          </Dato>
          <Dato etiqueta="En la empresa desde">
            <span className="inline-flex min-h-11 items-center">
              {driver.hireDate ? date(driver.hireDate) : "—"}
            </span>
          </Dato>
        </dl>

        {editable && (
          <div className="flex flex-wrap items-center gap-3 no-print">
            <LinkButton href={`/conductores/${driver.id}/editar`}>
              <Pencil className="size-5" aria-hidden />
              Editar conductor
            </LinkButton>
          </div>
        )}
      </section>

      {/* -------------------------- VEHÍCULO ACTUAL ------------------------ */}
      <CurrentAssignment
        vehiculo={vehiculoActual}
        desde={vigente?.startedAt ?? null}
      />

      {/* ----------------------- ALERTA OPERACIONAL ------------------------ */}
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
            <span className="font-mono text-sm font-medium tabular-nums text-[var(--text-muted)]">
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

      {/* ------------------------------ RESUMEN ---------------------------- */}
      <Section title="Resumen operacional" className="mb-8">
        <dl className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          <Cifra rotulo="Viajes" valor={String(driver._count.trips)} />
          <Cifra
            rotulo="Recorrido"
            valor={km(round2(distancia._sum.distanceKm ?? 0))}
          />
          <Cifra
            rotulo="Facturación generada"
            valor={money(round2(totales._sum.revenue ?? 0), true)}
          />
          <Cifra
            rotulo="Gastos a su nombre"
            valor={money(round2(gastos._sum.amount ?? 0), true)}
          />
        </dl>

        {(driver.address || driver.emergencyContact || driver.notes) && (
          <dl className="mt-6 grid grid-cols-1 gap-x-8 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
            {driver.address && (
              <Ficha rotulo="Dirección" valor={driver.address} />
            )}
            {driver.emergencyContact && (
              <Ficha
                rotulo="Contacto de emergencia"
                valor={`${driver.emergencyContact}${
                  driver.emergencyPhone ? ` · ${driver.emergencyPhone}` : ""
                }`}
              />
            )}
            {driver.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-[var(--text-muted)]">
                  Observaciones
                </dt>
                <dd className="mt-1 whitespace-pre-line">{driver.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </Section>

      {/* --------------------------- VIAJES RECIENTES ---------------------- */}
      <Section
        title="Viajes recientes"
        count={driver._count.trips}
        description="El vehículo de cada viaje es el que condujo ese día, y puede no ser el que tiene asignado hoy."
        className="mb-8"
      >
        <RecordList vacio="Este conductor todavía no tiene viajes registrados.">
          {viajes.map((v) => {
            const est = TRIP_STATUS[v.status];
            return (
              <RecordRow
                key={v.id}
                href={`/viajes/${v.id}`}
                titulo={`${v.origin} → ${v.destination}`}
                estado={
                  <Badge tone={est.tone} variant="quiet">
                    {est.label}
                  </Badge>
                }
                meta={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {/*
                      La placa del viaje va como Plate, no como texto suelto:
                      acá el sujeto es la persona y el vehículo es el dato que
                      hay que reconocer de un vistazo.
                    */}
                    <Plate value={v.truck.plate} size="sm" framed={false} />
                    <span>
                      · <span className="font-mono">{v.code}</span> ·{" "}
                      {date(v.departureAt)}
                    </span>
                  </span>
                }
                cifra={money(v.revenue, true)}
                cifraRotulo={v.distanceKm ? km(v.distanceKm) : undefined}
              />
            );
          })}
        </RecordList>
      </Section>

      {/* ---------------------- HISTORIAL DE ASIGNACIÓN -------------------- */}
      <Section
        title="Historial de vehículos"
        count={historial.length}
        description="Qué vehículos ha tenido esta persona y por qué terminó cada asignación. No se deduce de los viajes."
        className="mb-8"
      >
        <RecordList vacio="Este conductor no tiene asignaciones registradas.">
          {historial.map((a) => {
            const activa = a.endedAt === null;
            return (
              <RecordRow
                key={a.id}
                href={`/camiones/${a.truckId}`}
                titulo={
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Plate value={a.truck.plate} size="sm" />
                    {a.truck.nickname && (
                      <span className="text-[var(--text-muted)]">
                        {a.truck.nickname}
                      </span>
                    )}
                  </span>
                }
                estado={
                  activa ? (
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

      {/* ----------------------------- DOCUMENTOS -------------------------- */}
      <Section
        title="Documentos"
        count={driver._count.documents}
        className="mb-8"
        action={
          editable && (
            <DocumentModal owner={{ kind: "driver", id: driver.id }} />
          )
        }
      >
        <RecordList vacio="Sin documentos asociados a este conductor.">
          {documentos.map((d) => {
            const dias = daysUntil(d.expiresAt);
            const nivel =
              dias < 0
                ? "expired"
                : dias <= 7
                  ? "critical"
                  : dias <= 30
                    ? "warning"
                    : null;
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

      {/* -------------------------- SALIDA DE LA OPERACIÓN ------------------ */}
      {editable && (
        <Section title="Salida de la operación" className="mb-8">
          <div className="flex flex-col gap-4 rounded-[var(--r-surface)] border border-[var(--border)] px-4 py-4">
            <p className="max-w-prose text-[var(--text-muted)]">
              Archivar saca a la persona de la operación activa y conserva su
              expediente completo. Eliminar borra su ficha y sus{" "}
              {driver._count.documents} documentos; sus {driver._count.trips}{" "}
              viajes se conservan pero quedan sin conductor, y no se puede
              deshacer.
            </p>
            <div className="flex flex-wrap items-center gap-3">
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
                      : `¿Archivar a ${fullName(driver)}? Sale de la operación activa pero se conserva todo su historial.`
                  }
                >
                  {driver.archived ? (
                    <>
                      <ArchiveRestore className="size-5" aria-hidden />
                      Reactivar
                    </>
                  ) : (
                    <>
                      <Archive className="size-5" aria-hidden />
                      Archivar conductor
                    </>
                  )}
                </ConfirmButton>
              </form>
              <form action={deleteDriver}>
                <input type="hidden" name="driverId" value={driver.id} />
                <ConfirmButton
                  size="md"
                  message={`¿Eliminar definitivamente a ${fullName(driver)}? Esta acción NO se puede deshacer.`}
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

function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-b border-[var(--border)] py-1">
      <dt className="text-sm text-[var(--text-muted)]">{etiqueta}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Vacio({ texto = "Sin registrar" }: { texto?: string }) {
  return (
    <span className="inline-flex min-h-11 items-center text-[var(--text-muted)]">
      {texto}
    </span>
  );
}

function Cifra({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="border-b border-[var(--border)] py-3">
      <dt className="text-sm text-[var(--text-muted)]">{rotulo}</dt>
      <dd className="font-mono text-xl font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}

function Ficha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="py-1">
      <dt className="text-sm text-[var(--text-muted)]">{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
