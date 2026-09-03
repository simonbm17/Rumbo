import { Plus } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAlerts } from "@/lib/alerts";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { FilterBar } from "@/components/ui/FilterBar";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FleetStatusBar } from "@/components/FleetStatusBar";
import { VehicleCard, type VehicleCardData } from "@/components/VehicleCard";
import { VehicleTable } from "@/components/VehicleTable";
import { VehicleList } from "@/components/VehicleList";
import { TRUCK_KIND, TRUCK_STATUS, toOptions } from "@/lib/labels";
import { TruckKind, TruckStatus } from "@/generated/prisma/enums";
import { relativeDays } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Vehículos" };

export default async function VehiclesPage({
  searchParams,
}: PageProps<"/camiones">) {
  const user = await requireUser();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const kind = typeof params.kind === "string" ? params.kind : "";
  const showArchived = params.archivados === "1";
  const vista = params.vista === "tabla" ? "tabla" : "fichas";

  const where: Prisma.TruckWhereInput = {
    archived: showArchived,
    ...(status in TruckStatus ? { status: status as TruckStatus } : {}),
    ...(kind in TruckKind ? { kind: kind as TruckKind } : {}),
    ...(q
      ? {
          OR: [
            { plate: { contains: q, mode: "insensitive" } },
            { nickname: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { vin: { contains: q, mode: "insensitive" } },
            {
              currentDriver: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const seleccion = {
    id: true,
    plate: true,
    nickname: true,
    brand: true,
    model: true,
    year: true,
    kind: true,
    status: true,
    odometerKm: true,
    photoUrl: true,
    archived: true,
    currentDriver: { select: { firstName: true, lastName: true } },
  } as const;

  const [vehiculos, archivados, porEstado, alertas] = await Promise.all([
    prisma.truck.findMany({
      where,
      orderBy: [{ status: "asc" }, { plate: "asc" }],
      select: seleccion,
    }),
    prisma.truck.count({ where: { archived: true } }),
    prisma.truck.groupBy({
      by: ["status"],
      where: { archived: false },
      _count: { _all: true },
    }),
    // Ya está en caché por petición: el layout la usa para el contador del menú.
    getAlerts(),
  ]);

  /*
    Una alerta por vehículo: la más urgente. La tarjeta muestra como máximo una
    porque su trabajo es avisar, no listar; el detalle completo vive en la ficha.
  */
  const alertaPorVehiculo = new Map<string, { texto: string; urgente: boolean }>();
  for (const a of alertas) {
    /*
      `#` va en la clase negada. Los destinos de alerta pasaron de
      `?tab=documentos` a `#documentos`, y sin excluir la almohadilla el id
      capturado salía como «cmt…#documentos»: no coincidía con ningún vehículo
      y las tarjetas se quedaban sin su aviso, en silencio.
    */
    const m = a.href.match(/^\/camiones\/([^/?#]+)/);
    if (!m) continue;
    const id = m[1];
    if (alertaPorVehiculo.has(id)) continue; // getAlerts ya viene por urgencia
    alertaPorVehiculo.set(id, {
      texto: `${a.title.split(" — ")[0]} ${relativeDays(a.days)}`,
      /*
        Los dos niveles que no admiten espera, nombrados. Antes era
        `level !== "warning"`, que no dice qué es urgente sino qué no lo es: si
        `alerts.ts` añadiera mañana un nivel informativo, entraría acá solo por
        no llamarse «warning».
      */
      urgente: a.level === "expired" || a.level === "critical",
    });
  }

  const lista: VehicleCardData[] = vehiculos.map((v) => ({
    ...v,
    alerta: alertaPorVehiculo.get(v.id) ?? null,
  }));

  const conteos = (Object.keys(TRUCK_STATUS) as TruckStatus[]).map((s) => ({
    status: s,
    total: porEstado.find((g) => g.status === s)?._count._all ?? 0,
  }));
  /*
    De toda la flota, no de la lista filtrada. Los otros tres números de la
    franja son de la flota entera y el enlace lleva a Documentos, que también lo
    es; si este se moviera con la búsqueda, cuatro cifras en la misma línea
    estarían contando cosas distintas.
  */
  const conAlertas = alertaPorVehiculo.size;

  const filtrando = Boolean(q || status || kind);

  /*
    Reconstruyo la query desde `params` porque este es un server component y no
    tiene acceso al `location` del navegador. Los arreglos no se dan en esta
    pantalla —ningún filtro es múltiple— pero si algún día se dieran, quedarse
    con el primer valor es lo mismo que hace la consulta de arriba.
  */
  const queryString = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) =>
      v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v] as [string, string]]
    )
  ).toString();

  return (
    <>
      <PageHeader
        mobileCompact
        title={showArchived ? "Vehículos archivados" : "Vehículos"}
        description={
          showArchived
            ? "Fuera de la flota activa. Su historial se conserva completo."
            : "Tu flota. Tocá un vehículo para ver su ficha."
        }
        actions={
          canWrite(user) && (
            <LinkButton href="/camiones/nuevo">
              <Plus className="size-5" aria-hidden />
              Agregar vehículo
            </LinkButton>
          )
        }
      />

      {/*
        El estado se filtra desde la franja, no desde la barra: tener el mismo
        filtro dos veces en una pantalla obliga a mirar cuál manda. La franja
        además dice cuántos hay en cada estado, cosa que un chip no hace.
      */}
      {!showArchived && (
        <FleetStatusBar
          conteos={conteos}
          conAlertas={conAlertas}
          estadoActivo={status}
          basePath="/camiones"
          queryString={queryString}
        />
      )}

      {/*
        El tipo va en desplegable, no en fichas. Son diez categorías: dibujadas
        como botones ocupaban dos filas enteras y convertían la barra en un muro
        de controles antes de llegar a la flota. Las fichas sirven cuando las
        opciones son pocas y se comparan de un vistazo.
      */}
      <FilterBar
        placeholder="Buscar placa, marca o conductor…"
        filters={[
          { name: "kind", label: "Tipo", options: toOptions(TRUCK_KIND) },
        ]}
      >
        <ViewToggle vista={vista} />
        {(archivados > 0 || showArchived) && (
          <LinkButton
            href={showArchived ? "/camiones" : "/camiones?archivados=1"}
            variant="secondary"
            size="sm"
          >
            {showArchived ? "Ver flota activa" : `Archivados (${archivados})`}
          </LinkButton>
        )}
      </FilterBar>

      {lista.length === 0 ? (
        /*
          Sin ícono a propósito. Un camión dentro de un círculo gris no informa
          nada que el texto no diga, y es exactamente el adorno que este producto
          evita. Cada estado vacío dice qué pasó y qué se puede hacer.
        */
        <div className="card">
          <EmptyState
            title={
              filtrando
                ? "Ningún vehículo coincide con la búsqueda"
                : showArchived
                  ? "No hay vehículos archivados"
                  : "Todavía no cargaste vehículos"
            }
            description={
              filtrando
                ? "Probá con otra placa, marca o conductor, o quitá los filtros."
                : showArchived
                  ? "Cuando saques un vehículo de la flota, lo vas a encontrar acá con todo su historial."
                  : "Agregá el primero con su foto, su placa y sus datos técnicos."
            }
            action={
              !filtrando &&
              !showArchived &&
              canWrite(user) && (
                <LinkButton href="/camiones/nuevo">
                  <Plus className="size-5" aria-hidden />
                  Agregar vehículo
                </LinkButton>
              )
            }
          />
        </div>
      ) : (
        <Section
          title={showArchived ? "Archivados" : "Flota"}
          count={lista.length}
        >
          {vista === "tabla" ? (
            /*
              La misma vista, dos formas. Se decide en CSS y no en JavaScript:
              así el servidor entrega la correcta de una vez, no hay salto al
              hidratar y no hace falta medir la ventana antes de dibujar. Lo que
              queda oculto con `display:none` tampoco lo lee el lector de
              pantalla, así que no se anuncia dos veces.
            */
            <>
              <div className="md:hidden">
                <VehicleList vehiculos={lista} />
              </div>
              <div className="hidden md:block">
                <VehicleTable vehiculos={lista} />
              </div>
            </>
          ) : (
            /*
              Cuatro columnas desde 1400px. A 1440 con tres, la ficha medía
              360px de ancho y la ventana 360x240: se veían tres vehículos y
              media fila, y a ese tamaño la fotografía empieza a ocupar más de
              lo que aporta —se lee como catálogo, no como flota—. Con cuatro,
              la ficha baja a 269px, se ven ocho vehículos de una vez y la foto
              sigue siendo lo primero que se mira. 1400 y 1750 son medidas de
              ESTA grilla, no del sistema: no se convierten en breakpoints
              nuevos para que nadie los reutilice sin pensarlo.

              Los cinco escalones van con medidas arbitrarias y NO mezclados con
              `sm:` y `xl:`. Mezclarlos no funciona: Tailwind emite las
              variantes arbitrarias antes que las nombradas, así que
              `xl:grid-cols-3` le ganaba a `min-[1400px]:grid-cols-4` y la clase
              de cuatro columnas quedaba en el DOM sin efecto alguno —medido en
              el navegador: tres columnas de 362px a 1440—. Entre sí, las
              arbitrarias sí se ordenan por valor.
            */
            <ul className="grid grid-cols-1 gap-5 min-[640px]:grid-cols-2 min-[1280px]:grid-cols-3 min-[1400px]:grid-cols-4 min-[1750px]:grid-cols-5">
              {lista.map((v) => (
                <li key={v.id} className="flex">
                  <VehicleCard vehiculo={v} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </>
  );
}
