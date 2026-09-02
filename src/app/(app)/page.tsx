import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser, canWrite } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALERT_LABEL, ALERT_TONE, getAlerts } from "@/lib/alerts";
import { getDashboardStats, getMonthlySeries } from "@/lib/stats";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { Section } from "@/components/ui/Section";
import { LinkButton } from "@/components/ui/Button";
import { RecordList, RecordRow } from "@/components/RecordList";
import { FleetStatusBar } from "@/components/FleetStatusBar";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { TRIP_STATUS, TRUCK_STATUS } from "@/lib/labels";
import { TruckStatus } from "@/generated/prisma/enums";
import {
  date,
  fullName,
  money,
  relativeDays,
  startOfMonthLabel,
} from "@/lib/format";

export const metadata = { title: "Panel" };

export default async function DashboardPage() {
  const user = await requireUser();
  const editable = canWrite(user);

  const [
    porEstado,
    sinConductor,
    sinVehiculo,
    conductoresTotal,
    enCurso,
    programados,
    alertas,
    stats,
    serie,
    vehiculos,
    conductores,
  ] = await Promise.all([
    prisma.truck.groupBy({
      by: ["status"],
      where: { archived: false },
      _count: { _all: true },
    }),
    /*
      Sin conductor y sin vehículo se preguntan a DriverAssignment, que es la
      fuente de verdad. `Truck.currentDriverId` es una proyección y no puede
      decidir esto: justo el desacuerdo entre ambos fue el defecto que se
      corrigió en el archivado.
    */
    prisma.truck.findMany({
      where: {
        archived: false,
        assignments: { none: { endedAt: null } },
      },
      orderBy: { plate: "asc" },
      select: { id: true, plate: true, brand: true, model: true, status: true },
    }),
    prisma.driver.findMany({
      where: {
        archived: false,
        assignments: { none: { endedAt: null } },
      },
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, status: true },
    }),
    prisma.driver.count({ where: { archived: false } }),
    prisma.trip.findMany({
      where: { status: "IN_PROGRESS" },
      orderBy: { departureAt: "asc" },
      select: {
        id: true,
        code: true,
        origin: true,
        destination: true,
        departureAt: true,
        status: true,
        truck: { select: { plate: true } },
        // Quien conduce ESE viaje. No se sustituye por la asignación vigente.
        driver: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.trip.count({ where: { status: "PLANNED" } }),
    getAlerts(),
    getDashboardStats(),
    getMonthlySeries(6),
    // Para poner cara —placa y nombre— a cada alerta sin tocar `alerts.ts`.
    prisma.truck.findMany({ select: { id: true, plate: true } }),
    prisma.driver.findMany({
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const placaDe = new Map(vehiculos.map((v) => [v.id, v.plate]));
  const nombreDe = new Map(conductores.map((c) => [c.id, fullName(c)]));

  /*
    `getAlerts` devuelve el destino ya resuelto. De ahí se saca a qué objeto
    pertenece cada alerta, para dibujar su placa como placa en vez de dejarla
    dentro de una cadena de texto. No se reimplementa ninguna regla de alerta.
  */
  function sujetoDe(href: string) {
    const v = href.match(/^\/camiones\/([^/?#]+)/);
    if (v) return { tipo: "vehiculo" as const, placa: placaDe.get(v[1]) };
    const c = href.match(/^\/conductores\/([^/?#]+)/);
    if (c) return { tipo: "conductor" as const, nombre: nombreDe.get(c[1]) };
    return null;
  }

  const conteos = (Object.keys(TRUCK_STATUS) as TruckStatus[]).map((s) => ({
    status: s,
    total: porEstado.find((g) => g.status === s)?._count._all ?? 0,
  }));
  const flotaTotal = conteos.reduce((acc, c) => acc + c.total, 0);

  const vehiculosConAlerta = new Set(
    alertas
      .map((a) => a.href.match(/^\/camiones\/([^/?#]+)/)?.[1])
      .filter(Boolean)
  ).size;

  /*
    Severidad. `expired` y `critical` son los dos niveles de `alerts.ts` que no
    admiten espera; se cuentan por separado porque no son lo mismo: uno ya se
    venció y el otro todavía no. No se suman a la composición de abajo, que es
    por tipo: contar la misma alerta dos veces rompería el conteo del título.
  */
  const vencidas = alertas.filter((a) => a.level === "expired").length;
  const urgentes = alertas.filter((a) => a.level === "critical").length;
  const severidad = [
    vencidas > 0 && `${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`,
    urgentes > 0 && `${urgentes} ${urgentes === 1 ? "urgente" : "urgentes"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const excepciones = sinConductor.length + sinVehiculo.length;

  /*
    De qué está hecho el total. Las categorías salen de `alert.kind`, que ya
    define `alerts.ts`: no se inventa ninguna. Sin esto, un «13» junto a un «6»
    a diez centímetros se lee como una contradicción, cuando lo que pasa es que
    cuentan unidades distintas: aquí situaciones, allá vehículos.
  */
  const porClase = [
    ["documentos", alertas.filter((a) => a.kind === "document").length],
    ["licencias", alertas.filter((a) => a.kind === "license").length],
    ["mantenimientos", alertas.filter((a) => a.kind === "maintenance").length],
    ["sin asignación", excepciones],
  ] as const;
  const composicion = porClase
    .filter(([, n]) => n > 0)
    .map(([etiqueta, n]) => `${n} ${etiqueta}`)
    .join(" · ");
  const mes = startOfMonthLabel();
  /*
    La condición mira DINERO, no viajes.

    Primero la escribí exigiendo también cero viajes, y en la demo el mes en
    curso tiene tres viajes programados y ningún peso movido: la condición daba
    falso y el Panel mostraba «$ 0 · $ 0 · $ 0», que es exactamente lo que se
    lee como aplicación rota. Un viaje programado todavía no factura, así que no
    es señal de movimiento.
  */
  const sinMovimientos = stats.revenue === 0 && stats.expenses === 0;

  return (
    <>
      <PageHeader
        mobileCompact
        title="Panel"
        description="Cómo está tu flota ahora y dónde hay que actuar."
        actions={
          editable && (
            <LinkButton href="/viajes/nuevo">
              <Plus className="size-5" aria-hidden />
              Registrar viaje
            </LinkButton>
          )
        }
      />

      {/* ======================= CAPA 1 · SITUACIÓN AHORA ==================== */}
      {/*
        Estado presente, no actividad acumulada. Todo lo de esta capa se
        responde con una consulta sobre cómo están las cosas en este momento;
        nada de aquí depende de un periodo.
      */}
      <Section
        title="Situación ahora"
        description={`${flotaTotal} ${flotaTotal === 1 ? "vehículo" : "vehículos"} en la flota · ${conductoresTotal} ${conductoresTotal === 1 ? "conductor" : "conductores"}`}
        className="mb-8"
      >
        {flotaTotal > 0 && (
          <FleetStatusBar
            conteos={conteos}
            conAlertas={vehiculosConAlerta}
            estadoActivo=""
            basePath="/camiones"
            queryString=""
            etiquetaAlertas={(n) =>
              n === 1 ? "vehículo con alertas" : "vehículos con alertas"
            }
          />
        )}

        <dl className="grid grid-cols-2 gap-x-8 border-t border-[var(--border)] sm:grid-cols-4">
          <Cifra
            rotulo="Viajes en curso"
            valor={String(enCurso.length)}
            nota="Marcados «En curso»"
          />
          <Cifra
            rotulo="Viajes programados"
            valor={String(programados)}
            nota="Todavía sin salir"
          />
          <Cifra
            rotulo="Vehículos sin conductor"
            valor={String(sinConductor.length)}
            nota="Sin asignación vigente"
            alerta={sinConductor.length > 0}
          />
          <Cifra
            rotulo="Conductores sin vehículo"
            valor={String(sinVehiculo.length)}
            nota="Sin asignación vigente"
            alerta={sinVehiculo.length > 0}
          />
        </dl>
      </Section>

      {/* ===================== CAPA 2 · NECESITA ATENCIÓN ==================== */}
      <Section
        title="Necesita atención"
        count={alertas.length + excepciones}
        description={alertas.length + excepciones > 0 ? composicion : undefined}
        className="mb-8"
      >
        {alertas.length === 0 && excepciones === 0 ? (
          /*
            Sin alertas no se celebra: se informa. La operación normal es que no
            haya nada vencido, así que esto es la línea de base, no un logro.
          */
          <div className="rounded-[var(--r-surface)] border border-dashed border-[var(--border)] px-4 py-5">
            <p className="max-w-prose text-[var(--text-muted)]">
              Sin documentos, licencias ni mantenimientos por vencer en los
              próximos 30 días, y sin vehículos ni conductores sin asignación
              vigente.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {alertas.length > 0 && (
              /*
                Se listan TODAS, no las primeras seis.

                Antes había un «Ver las 12» que llevaba a /documentos, y la
                composición real desmiente ese destino: de las doce alertas,
                cinco son documentos, dos son licencias de conducción —que son
                un campo de Driver, no un Document— y cinco son mantenimientos
                programados. Mandarlas todas a Documentos habría sido decir que
                el conjunto es algo que no es.

                No existe una pantalla que represente el conjunto y esta fase no
                crea rutas nuevas, así que la salida correcta no es un enlace
                equivocado ni esconder seis alertas detrás de un número: es
                mostrarlas. Vienen ordenadas por severidad y cada fila navega a
                su objeto real.
              */
              <div className="flex flex-col gap-3">
                {severidad && (
                  /*
                    La severidad va aparte, y dice de dónde sale.

                    Es un subconjunto de las MISMAS alertas, miradas por plazo
                    en vez de por tipo. Por eso no puede ir en la línea de
                    composición: allí se leería como una quinta categoría y la
                    suma dejaría de cuadrar con el conteo del encabezado. Las
                    palabras son las que ya lleva la insignia de cada fila:
                    «Vencido» y «Urgente».
                  */
                  <p className="text-sm font-medium text-[var(--tone-danger-fg)]">
                    <span className="block font-normal text-[var(--text-muted)]">
                      De las {alertas.length} alertas:
                    </span>
                    {severidad}
                  </p>
                )}
                <RecordList vacio="">
                  {alertas.map((a) => {
                    const sujeto = sujetoDe(a.href);
                    return (
                      <RecordRow
                        key={a.id}
                        href={a.href}
                        /*
                          El tipo de alerta va solo en el título y el sujeto baja
                          a la línea de metadatos. Al principio los puse juntos y
                          a 390px la fila se rompía en cuatro renglones: el tipo,
                          la placa, la insignia y el plazo peleando por el mismo
                          ancho. El sujeto en la segunda línea deja el título
                          corto, la insignia a su lado y el plazo alineado a la
                          derecha, que es lo que permite comparar urgencias
                          bajando la vista.
                        */
                        titulo={a.title.split(" — ")[0]}
                        estado={
                          <Badge tone={ALERT_TONE[a.level]} variant="quiet">
                            {ALERT_LABEL[a.level]}
                          </Badge>
                        }
                        meta={
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {sujeto?.tipo === "vehiculo" && sujeto.placa && (
                              <Plate value={sujeto.placa} size="sm" framed={false} />
                            )}
                            {sujeto?.tipo === "conductor" && sujeto.nombre && (
                              <span className="font-medium text-[var(--text)]">
                                {sujeto.nombre}
                              </span>
                            )}
                            <span>· {a.detail}</span>
                            {/*
                              En un teléfono el plazo viaja en esta línea. Como
                              columna a la derecha —`shrink-0`— dejaba al
                              contenido sin ancho y la fila se rompía en cuatro
                              renglones: medido, 147px de alto a 390px. Desde
                              640px vuelve a la derecha, que es donde permite
                              comparar urgencias bajando la vista.
                            */}
                            <span className="sm:hidden">
                              · {relativeDays(a.days)}
                            </span>
                          </span>
                        }
                        cifra={
                          <span className="hidden sm:inline">
                            {relativeDays(a.days)}
                          </span>
                        }
                      />
                    );
                  })}
                </RecordList>
              </div>
            )}

            {/*
              Las asignaciones que faltan no son alertas de vencimiento: no
              tienen fecha ni caducan, así que no se mezclan con la lista
              anterior ni pasan por `alerts.ts`. Van en su propio bloque, con su
              propio encabezado, para que se entienda que son otra cosa.
            */}
            {excepciones > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Sin asignación</h3>
                <RecordList vacio="">
                  {sinConductor.map((v) => (
                    <RecordRow
                      key={`v-${v.id}`}
                      href={`/camiones/${v.id}`}
                      titulo="Vehículo sin conductor"
                      estado={
                        <Badge tone={TRUCK_STATUS[v.status].tone} variant="quiet">
                          {TRUCK_STATUS[v.status].label}
                        </Badge>
                      }
                      meta={
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Plate value={v.plate} size="sm" framed={false} />
                          <span>
                            · {v.brand} {v.model}
                          </span>
                        </span>
                      }
                    />
                  ))}
                  {sinVehiculo.map((c) => (
                    <RecordRow
                      key={`c-${c.id}`}
                      href={`/conductores/${c.id}`}
                      titulo="Conductor sin vehículo"
                      meta={
                        <span className="font-medium text-[var(--text)]">
                          {fullName(c)}
                        </span>
                      }
                    />
                  ))}
                </RecordList>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ====================== CAPA 2b · OPERACIÓN ACTUAL =================== */}
      <Section
        title="En ruta ahora"
        count={enCurso.length}
        className="mb-8"
        action={<Enlace href="/viajes">Todos los viajes</Enlace>}
      >
        <RecordList vacio="Ningún vehículo marcado en ruta en este momento.">
          {enCurso.map((v) => (
            <RecordRow
              key={v.id}
              href={`/viajes/${v.id}`}
              titulo={`${v.origin} → ${v.destination}`}
              estado={
                <Badge tone={TRIP_STATUS[v.status].tone} variant="quiet">
                  {TRIP_STATUS[v.status].label}
                </Badge>
              }
              meta={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Plate value={v.truck.plate} size="sm" framed={false} />
                  <span>
                    · <span className="font-mono">{v.code}</span> · salió el{" "}
                    {date(v.departureAt)}
                    {v.driver ? ` · ${fullName(v.driver)}` : " · sin conductor"}
                  </span>
                </span>
              }
            />
          ))}
        </RecordList>
      </Section>

      {/* ==================== CAPA 3 · CONTEXTO FINANCIERO =================== */}
      <Section
        title="Contexto financiero"
        description={`${mes} · lo que entró y lo que salió`}
        className="mb-8"
        action={<Enlace href="/reportes">Ver reportes</Enlace>}
      >
        {sinMovimientos ? (
          /*
            El mes puede no tener actividad todavía, y tres ceros gigantes se
            leen como una aplicación rota. Se dice con palabras y se deja la
            serie de seis meses debajo, que sí tiene contenido: el contexto no
            desaparece porque el mes recién empiece.
          */
          <div className="rounded-[var(--r-surface)] border border-dashed border-[var(--border)] px-4 py-5">
            <p className="max-w-prose text-[var(--text-muted)]">
              Sin movimientos registrados en {mes.toLowerCase()}
              {stats.tripsThisMonth > 0
                ? `: hay ${stats.tripsThisMonth} ${stats.tripsThisMonth === 1 ? "viaje con salida" : "viajes con salida"} en el mes, pero todavía ninguno facturado ni con gastos cargados`
                : ""}
              . Abajo está la evolución de los seis meses anteriores.
            </p>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-3">
            <Cifra
              rotulo="Entró"
              valor={money(stats.revenue, true)}
              nota={`${stats.tripsThisMonth} ${stats.tripsThisMonth === 1 ? "viaje" : "viajes"} con salida en el mes`}
            />
            <Cifra
              rotulo="Salió"
              valor={money(stats.expenses, true)}
              nota="Gastos y taller"
            />
            <Cifra
              rotulo="Resultado"
              valor={money(stats.profit, true)}
              nota="Lo que quedó"
              tono={stats.profit >= 0 ? "success" : "danger"}
            />
          </dl>
        )}

        {/*
          La única gráfica del Panel, y responde una pregunta concreta: si la
          flota entera está cubriendo lo que cuesta y hacia dónde va. Es la
          misma serie y el mismo cálculo que usa Reportes.
        */}
        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <h3 className="mb-1 font-semibold">Últimos 6 meses</h3>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Lo facturado en viajes contra lo gastado en gastos y taller, mes a
            mes, en toda la flota.
          </p>
          <RevenueChart data={serie} alto="h-56 sm:h-72" />
        </div>
      </Section>
    </>
  );
}

/** Una cifra de situación: rótulo, número y una nota que dice qué mide. */
function Cifra({
  rotulo,
  valor,
  nota,
  tono,
  alerta = false,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tono?: "success" | "danger";
  /** Resalta el número cuando no ser cero es una excepción operacional. */
  alerta?: boolean;
}) {
  const color = tono
    ? `var(--tone-${tono}-fg)`
    : alerta
      ? "var(--tone-warning-fg)"
      : undefined;
  return (
    <div className="border-b border-[var(--border)] py-3">
      <dt className="text-sm text-[var(--text-muted)]">{rotulo}</dt>
      <dd
        className="font-mono text-xl font-semibold tabular-nums"
        style={color ? { color } : undefined}
      >
        {valor}
      </dd>
      {nota && <dd className="text-sm text-[var(--text-muted)]">{nota}</dd>}
    </div>
  );
}

function Enlace({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-[var(--r-control)] font-medium underline decoration-[var(--border-control)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--accent)] focus-ring"
    >
      {children}
    </Link>
  );
}
