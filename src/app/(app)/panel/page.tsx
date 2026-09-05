import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser, canWrite } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALERT_LABEL, ALERT_TONE, getAlerts, type Alert } from "@/lib/alerts";
import { getDashboardStats, getMonthlySeries } from "@/lib/stats";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
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

/**
 * CENTRO DE SITUACIÓN.
 *
 * Es la pantalla que se abre a las siete de la mañana para saber, sin leer
 * nada dos veces, qué pasa con la flota y qué hay que resolver hoy. Tres
 * niveles de peso visual, y el orden es el de las preguntas, no el de las
 * tablas de la base:
 *
 *   1  QUÉ ESTÁ PASANDO      la franja de flota, a todo el ancho
 *   2  QUÉ NECESITA ATENCIÓN la columna ancha, con la criticidad separada
 *      QUÉ ESTÁ OCURRIENDO   el carril: primero la ruta, después el dinero
 *   3  CONTEXTO              la serie de seis meses, al pie del carril

 * El carril va en ese orden —operación antes que economía— porque ésa es la
 * prioridad de las preguntas, y porque al apilarse en un teléfono produce
 * situación → atención → operación → economía, que es como se lee de pie.
 *
 * Lo que cambió respecto de la versión anterior: aquélla apilaba cuatro
 * bloques del mismo peso a todo el ancho, y la lista de alertas —doce filas—
 * empujaba los viajes y el dinero fuera de la primera pantalla. Medido a
 * 1440×900: había que desplazarse para ver si el mes iba bien. Ahora las
 * cuatro respuestas caben arriba y la lista larga vive en su columna.
 *
 * Lo que NO hay, porque no existe en Rumbo: posición, mapa, velocidad,
 * telemetría, hora estimada de llegada, predicción de nada. Un centro de
 * situación que inventa datos es peor que no tenerlo.
 */
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
    CRITICIDAD SEPARADA, que es lo que la versión anterior mezclaba.

    Los tres niveles los define `alerts.ts` y no se reinterpretan acá: vencido
    es lo que ya pasó de fecha, urgente lo que vence dentro de siete días, por
    vencer el resto de la ventana de treinta. La falta de asignación es una
    cuarta cosa y va aparte a propósito: no tiene fecha, no caduca y no puede
    ordenarse junto a las otras sin mentir.
  */
  const vencidas = alertas.filter((a) => a.level === "expired");
  const urgentes = alertas.filter((a) => a.level === "critical");
  const porVencer = alertas.filter((a) => a.level === "warning");
  const excepciones = sinConductor.length + sinVehiculo.length;
  const totalAtencion = alertas.length + excepciones;

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

  const hoy = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <>
      {/* =========================== CABECERA ============================= */}
      {/*
        Compacta a propósito: 48px, no 150. No saluda por su nombre a quien ya
        sabe quién es y acaba de escribir su contraseña. La fecha sí va, porque
        todo lo de abajo —lo que vence, lo que va del mes— se lee contra ella.
      */}
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
            Centro de situación
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)] first-letter:uppercase">
            {hoy}
          </p>
        </div>
        {editable && (
          <div className="shrink-0 no-print">
            <LinkButton href="/viajes/nuevo">
              <Plus className="size-5" aria-hidden />
              Registrar viaje
            </LinkButton>
          </div>
        )}
      </header>

      {/* ================== NIVEL 1 · SITUACIÓN DE LA FLOTA ================ */}
      {/*
        A todo el ancho y arriba de todo porque es la pregunta uno. El total va
        en grande a la izquierda y el reparto a la derecha: el número dice el
        tamaño de la operación, la franja dice en qué está metida. Cada estado
        filtra la lista de vehículos, así que la franja no solo informa: es la
        entrada a la pantalla donde se resuelve.
      */}
      {flotaTotal > 0 && (
        <section
          aria-label="Situación de la flota"
          className="mb-6 border-y border-[var(--border)] py-4 sm:mb-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <p className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:gap-0">
              <span className="font-mono text-3xl font-semibold tabular-nums text-[var(--text)] sm:text-4xl">
                {flotaTotal}
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                {flotaTotal === 1 ? "vehículo" : "vehículos"} ·{" "}
                {conductoresTotal}{" "}
                {conductoresTotal === 1 ? "conductor" : "conductores"}
              </span>
            </p>
            <div className="min-w-0 flex-1">
              <FleetStatusBar
                conteos={conteos}
                conAlertas={vehiculosConAlerta}
                estadoActivo=""
                basePath="/camiones"
                queryString=""
                className=""
                etiquetaAlertas={(n) =>
                  n === 1 ? "vehículo con alertas" : "vehículos con alertas"
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* ============ NIVEL 2 · LO QUE HAY QUE RESOLVER Y LO QUE PASA ====== */}
      {/*
        Dos columnas desde 1024, 7/5. La ancha es para lo que se lee fila por
        fila; la angosta para lo que se lee de un vistazo. En un portátil de
        1024 las dos siguen siendo utilizables porque ninguna lleva tabla: son
        listas que se apilan solas.
      */}
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-10">
        {/* ------------------------ necesita atención -------------------- */}
        <section aria-labelledby="h-atencion" className="lg:col-span-7">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2
              id="h-atencion"
              className="flex items-baseline gap-2 text-lg font-semibold text-[var(--text)]"
            >
              Necesita atención
              <span className="font-mono text-sm font-medium tabular-nums text-[var(--text-muted)]">
                {totalAtencion}
              </span>
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Ventana de 30 días
            </p>
          </div>

          {totalAtencion === 0 ? (
            /*
              Sin alertas no se celebra: se informa. Que no haya nada vencido es
              la operación normal, no un logro.
            */
            <p className="rounded-[var(--r-surface)] border border-dashed border-[var(--border)] px-4 py-5 text-[var(--text-muted)]">
              Sin documentos, licencias ni mantenimientos por vencer en los
              próximos 30 días, y sin vehículos ni conductores sin asignación
              vigente.
            </p>
          ) : (
            <>
              {/*
                EL TRIAJE. Cuatro números que dicen cuánto de cada gravedad hay,
                antes de que nadie lea una sola fila. Es lo que permite decidir
                en tres segundos si esta mañana hay que correr o no.

                No son tarjetas: es una fila con divisores. Cuatro rectángulos
                clonados con sombra dirían lo mismo ocupando el triple.
              */}
              <dl className="mb-4 grid grid-cols-2 border-y border-[var(--border)] sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                <Triaje
                  valor={vencidas.length}
                  rotulo="Vencido"
                  nota="Ya pasó la fecha"
                  tono="danger"
                />
                <Triaje
                  valor={urgentes.length}
                  rotulo="Urgente"
                  nota="Vence en 7 días o menos"
                  tono="danger"
                />
                <Triaje
                  valor={porVencer.length}
                  rotulo="Por vencer"
                  nota="Dentro de 30 días"
                  tono="warning"
                />
                <Triaje
                  valor={excepciones}
                  rotulo="Sin asignación"
                  nota="Vehículo o conductor libre"
                  tono="warning"
                />
              </dl>

              {/*
                Una sola lista, con encabezados de grupo dentro. Cuatro listas
                en cuatro cajas serían cuatro bordes y cuatro sombras para decir
                lo mismo; acá la caja es una y los grupos se separan con una
                línea y una palabra.

                Se muestran TODAS. Hubo un «Ver las 12» que llevaba a
                /documentos, y la composición real desmiente ese destino: de las
                doce, unas son documentos, otras licencias —que son un campo del
                conductor, no un Document— y otras mantenimientos. No existe una
                pantalla que represente el conjunto, así que la salida honesta
                no es un enlace equivocado ni esconder ocho filas detrás de un
                número: es mostrarlas, agrupadas por lo que urge.
              */}
              <RecordList vacio="">
                <Grupo titulo="Vencido" n={vencidas.length} tono="danger" />
                {vencidas.map((a) => (
                  <FilaAlerta key={a.id} alerta={a} sujeto={sujetoDe(a.href)} />
                ))}

                <Grupo titulo="Urgente" n={urgentes.length} tono="danger" />
                {urgentes.map((a) => (
                  <FilaAlerta key={a.id} alerta={a} sujeto={sujetoDe(a.href)} />
                ))}

                <Grupo titulo="Por vencer" n={porVencer.length} tono="warning" />
                {porVencer.map((a) => (
                  <FilaAlerta key={a.id} alerta={a} sujeto={sujetoDe(a.href)} />
                ))}

                {/*
                  La falta de asignación cierra la lista y lleva su propio
                  encabezado: no viene de `alerts.ts`, no tiene fecha y no se
                  ordena por plazo. Es una excepción operacional, no un
                  vencimiento.
                */}
                <Grupo titulo="Sin asignación" n={excepciones} tono="warning" />
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
            </>
          )}
        </section>

        {/* --------------------- columna de la operación ------------------ */}
        <div className="flex flex-col gap-8 lg:col-span-5">
          {/* ......................... en ruta ahora ....................... */}
          <section aria-labelledby="h-ruta">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2
                id="h-ruta"
                className="flex items-baseline gap-2 text-lg font-semibold text-[var(--text)]"
              >
                En ruta ahora
                <span className="font-mono text-sm font-medium tabular-nums text-[var(--text-muted)]">
                  {enCurso.length}
                </span>
              </h2>
              <Enlace href="/viajes">
                {programados > 0
                  ? `${programados} ${programados === 1 ? "programado" : "programados"}`
                  : "Todos los viajes"}
              </Enlace>
            </div>

            <RecordList vacio="No hay viajes en curso.">
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
                      </span>
                      <span className="basis-full text-[var(--text-muted)]">
                        {v.driver ? fullName(v.driver) : "Sin conductor"}
                      </span>
                    </span>
                  }
                />
              ))}
            </RecordList>
          </section>
          {/* ........................ dinero del mes ....................... */}
          <section aria-labelledby="h-mes">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2
                id="h-mes"
                className="text-lg font-semibold text-[var(--text)]"
              >
                {mes}
              </h2>
              <Enlace href="/reportes">Reportes</Enlace>
            </div>

            {sinMovimientos ? (
              /*
                El mes puede no tener actividad todavía, y tres ceros grandes se
                leen como una aplicación rota. Se dice con palabras.
              */
              /*
                Compacto a propósito. La versión anterior era una caja de tres
                renglones ocupando exactamente el sitio donde van las tres
                cifras, así que la ausencia de movimiento pesaba más que el
                movimiento. Dos líneas dicen lo mismo: qué falta y por qué.
              */
              <p className="border-y border-[var(--border)] py-3 text-sm text-[var(--text-muted)]">
                Sin movimientos registrados todavía.
                {stats.tripsThisMonth > 0 && (
                  <span className="mt-0.5 block">
                    Hay {stats.tripsThisMonth}{" "}
                    {stats.tripsThisMonth === 1
                      ? "viaje con salida"
                      : "viajes con salida"}{" "}
                    en el mes, ninguno facturado ni con gastos cargados.
                  </span>
                )}
              </p>
            ) : (
              /*
                Reglas, no caja. En esta pantalla el rectángulo con borde
                significa «lista de registros que se abren»: las alertas y los
                viajes lo son. Tres cifras no lo son, y encajonarlas las hacía
                parecer una cuarta lista.
              */
              <dl className="border-y border-[var(--border)]">
                <Dinero
                  rotulo="Entró"
                  valor={money(stats.revenue)}
                  nota={`${stats.tripsThisMonth} ${stats.tripsThisMonth === 1 ? "viaje" : "viajes"} con salida`}
                />
                <Dinero
                  rotulo="Salió"
                  valor={money(stats.expenses)}
                  nota="Gastos y taller"
                />
                {/*
                  El signo no depende del color: la palabra lo dice. Alguien que
                  no distingue rojo de verde tiene que poder leer si el mes va
                  bien, y en una hoja impresa en blanco y negro también.
                */}
                <Dinero
                  rotulo="Resultado"
                  valor={money(stats.profit)}
                  nota={
                    stats.profit > 0
                      ? "Positivo"
                      : stats.profit < 0
                        ? "Negativo"
                        : "En cero"
                  }
                  tono={
                    stats.profit > 0
                      ? "success"
                      : stats.profit < 0
                        ? "danger"
                        : undefined
                  }
                  fuerte
                />
              </dl>
            )}
          </section>

          {/* ===================== NIVEL 3 · CONTEXTO ========================== */}
          {/*
            Debajo del pliegue y con menos peso, que es donde corresponde: no se
            decide nada con esto a primera hora, se entiende hacia dónde va la
            operación. Misma serie y mismo cálculo que Reportes.
          */}
          <section aria-labelledby="h-serie">
            <h2 id="h-serie" className="text-lg font-semibold text-[var(--text)]">
              Últimos 6 meses
            </h2>
            <p className="mb-4 mt-1 max-w-prose text-sm text-[var(--text-muted)]">
              Lo facturado en viajes contra lo gastado en gastos y taller, mes a
              mes, en toda la flota.
            </p>
            <RevenueChart data={serie} alto="h-56 sm:h-72" />
          </section>
        </div>
      </div>

    </>
  );
}

/* ------------------------------------------------------------------ piezas */

/** Un número del triaje: cuántos hay de esta gravedad y qué significa. */
function Triaje({
  valor,
  rotulo,
  nota,
  tono,
}: {
  valor: number;
  rotulo: string;
  nota: string;
  tono: "danger" | "warning";
}) {
  /*
    El cero se apaga. Un «0 Vencido» con el mismo rojo que un «3 Vencido»
    obliga a leer el número para saber si hay problema; apagado, la vista salta
    directo a lo que sí tiene cuenta.
  */
  const activo = valor > 0;
  return (
    /*
      Cuatro columnas separadas por una línea, no cuatro tarjetas. Con borde,
      fondo y sombra cada una, esto se convertía en la grilla de tarjetas
      clonadas que el resto del producto evita; con un divisor vertical dice lo
      mismo ocupando la mitad y sin competir con la lista que viene debajo.
    */
    <div className="border-l border-[var(--border)] py-3 pl-4 pr-3 odd:border-l-0 odd:pl-0 sm:odd:border-l sm:odd:pl-5 sm:first:border-l-0 sm:first:pl-0 lg:odd:border-l-0 lg:odd:pl-0 xl:odd:border-l xl:odd:pl-5 xl:first:border-l-0 xl:first:pl-0">
      <dd
        className="font-mono text-2xl font-semibold tabular-nums"
        style={{
          color: activo ? `var(--tone-${tono}-fg)` : "var(--text-muted)",
        }}
      >
        {valor}
      </dd>
      <dt className="mt-0.5 text-sm font-medium text-[var(--text)]">
        {rotulo}
      </dt>
      <dd className="text-sm text-[var(--text-muted)]">{nota}</dd>
    </div>
  );
}

/** Encabezado de grupo dentro de la lista de atención. */
function Grupo({
  titulo,
  n,
  tono,
}: {
  titulo: string;
  n: number;
  tono: "danger" | "warning";
}) {
  if (n === 0) return null;
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-1.5">
      <span
        className="text-sm font-semibold"
        style={{ color: `var(--tone-${tono}-fg)` }}
      >
        {titulo}
      </span>
      <span className="font-mono text-sm tabular-nums text-[var(--text-muted)]">
        {n}
      </span>
    </li>
  );
}

/** Una alerta: qué pasó, a qué activo, cuánto falta y a dónde se va a resolver. */
function FilaAlerta({
  alerta,
  sujeto,
}: {
  alerta: Alert;
  sujeto: { tipo: "vehiculo"; placa?: string } | { tipo: "conductor"; nombre?: string } | null;
}) {
  return (
    <RecordRow
      href={alerta.href}
      /*
        El tipo va en el título y el sujeto baja a la línea de metadatos. Con
        los dos juntos, a 390px la fila se rompía en cuatro renglones: tipo,
        placa, insignia y plazo peleando por el mismo ancho.
      */
      titulo={alerta.title.split(" — ")[0]}
      estado={
        <Badge tone={ALERT_TONE[alerta.level]} variant="quiet">
          {ALERT_LABEL[alerta.level]}
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
          <span>· {alerta.detail}</span>
          {/*
            En pantalla angosta el plazo viaja en esta línea. Como columna a la
            derecha dejaba al contenido sin ancho y la fila se partía en cuatro
            renglones. Desde 640px vuelve a la derecha, que es donde permite
            comparar urgencias bajando la vista.
          */}
          <span className="sm:hidden">· {relativeDays(alerta.days)}</span>
        </span>
      }
      cifra={
        <span className="hidden sm:inline">{relativeDays(alerta.days)}</span>
      }
    />
  );
}

/** Una línea de dinero: rótulo a la izquierda, cifra a la derecha. */
function Dinero({
  rotulo,
  valor,
  nota,
  tono,
  fuerte = false,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tono?: "success" | "danger";
  /** El resultado pesa más que sus dos sumandos. */
  fuerte?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] py-3 last:border-b-0">
      <dt className="min-w-0">
        <span
          className={`block ${fuerte ? "font-semibold text-[var(--text)]" : "text-[var(--text)]"}`}
        >
          {rotulo}
        </span>
        <span className="block text-sm text-[var(--text-muted)]">{nota}</span>
      </dt>
      <dd
        className={`shrink-0 font-mono tabular-nums ${fuerte ? "text-xl font-semibold" : "text-lg font-medium"}`}
        style={tono ? { color: `var(--tone-${tono}-fg)` } : undefined}
      >
        {valor}
      </dd>
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
      className="inline-flex min-h-11 items-center rounded-[var(--r-control)] text-sm font-medium underline decoration-[var(--border-control)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--accent)] focus-ring"
    >
      {children}
    </Link>
  );
}
