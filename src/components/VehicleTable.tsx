import { Fragment } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Plate } from "@/components/ui/Plate";
import { TRUCK_KIND, TRUCK_STATUS } from "@/lib/labels";
import { number } from "@/lib/format";
import type { VehicleCardData } from "@/components/VehicleCard";

/**
 * Vista tabla. No compite con las fichas: resuelve otra tarea.
 *
 * Las fichas sirven para reconocer; la tabla para comparar, ordenar y recorrer
 * muchos vehículos. Por eso acá la fotografía baja a miniatura de 44px —
 * suficiente para ubicar la fila, no para reconocer a distancia— y las cifras
 * se alinean a la derecha con `tabular-nums`, que es lo que permite comparar
 * kilometrajes de un vistazo.
 *
 * La columna de la placa queda fija al desplazar en horizontal: es el
 * identificador, y perderlo de vista deja la fila sin sentido.
 *
 * Tres comportamientos, no dos:
 *
 *   >= 1400   tabla completa, con miniatura, tipo y alerta en su columna.
 *   768–1399  tabla de tableta: siguen las siete prioridades, pero la
 *             miniatura se retira y la alerta baja a una línea propia bajo su
 *             vehículo. Sin desplazamiento horizontal.
 *   < 768     no se usa: la reemplaza `VehicleList`.
 *
 * El umbral es 1400 y no 1280 porque lo fija la medición, no el número
 * redondo: la tabla completa ocupa 1064px y a 1280 solo quedan 964 libres
 * —1280 menos 240 de menú y 64 de margen—, así que a 1280 se cortaba en
 * «Alertas» y las filas salían de tres alturas distintas. La tabla completa
 * necesita 1368px de ventana; 1400 es el primer escalón por encima, y es el
 * mismo que usa la grilla de fichas para pasar a cuatro columnas.
 *
 * Lo que se retira en tableta es lo secundario, no lo que hace falta para
 * administrar: la fotografía no está entre las prioridades de tableta —para
 * reconocer mirando está la vista de fichas— y el tipo ya se filtra desde la
 * barra. La alerta NO se retira: cambia de sitio, porque es la única celda cuyo
 * contenido es una frase y por sí sola se llevaba 154px de los 708 disponibles.
 */
export function VehicleTable({ vehiculos }: { vehiculos: VehicleCardData[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--r-surface)] border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Vehículos de la flota, con estado, conductor y kilometraje
        </caption>
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
            <Th className="sticky left-0 z-[var(--z-dropdown)] bg-[var(--surface-2)]">
              Placa
            </Th>
            <Th className="col-vehiculo">Vehículo</Th>
            {/*
              Tipo solo aparece a partir de 1280px. Es la columna menos
              decisiva —ya se filtra desde la barra— y retirarla es lo que hace
              que la tabla entre completa en un portátil de 1024 y en una
              tableta en vertical, sin desplazamiento lateral. Medido: con Tipo,
              a 1024px la tabla se corta en «Conductor».
            */}
            <Th className="hidden w-px min-[1400px]:table-cell">Tipo</Th>
            <Th className="w-px">Estado</Th>
            <Th className="col-conductor">Conductor</Th>
            <Th align="right" className="w-px">Kilometraje</Th>
            {/*
              Se queda con el ancho sobrante. Es la única columna cuyo contenido
              es una frase; darle el resto del espacio es lo que evita que se
              parta en dos líneas y descuadre la altura de las filas. Donde no
              sobra ancho no cambia nada: la tabla ya está en su mínimo.
            */}
            <Th className="col-alertas hidden min-[1400px]:table-cell">Alertas</Th>
          </tr>
        </thead>
        {/*
          Las líneas entre filas van explícitas y no con `divide-y`, porque en
          tableta un vehículo puede ocupar DOS filas —la suya y la de su
          alerta— y entre esas dos no debe haber línea: son el mismo vehículo.
        */}
        <tbody className="[&>tr:last-child]:border-b-0">
          {vehiculos.map((v) => {
            const estado = TRUCK_STATUS[v.status];
            const secundaria = `${v.year}${v.nickname ? ` · ${v.nickname}` : ""}`;
            const conductor = v.currentDriver
              ? `${v.currentDriver.firstName} ${v.currentDriver.lastName}`
              : "Sin conductor";
            return (
              <Fragment key={v.id}>
              <tr
                className={`group border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)] ${
                  v.alerta
                    ? "border-b-0 min-[1400px]:border-b"
                    : "border-b"
                }`}
              >
                <td className="sticky left-0 z-[var(--z-dropdown)] w-px whitespace-nowrap bg-[var(--surface)] px-3 py-3 min-[1400px]:px-4 min-[1400px]:py-2.5 transition-colors group-hover:bg-[var(--surface-hover)]">
                  <Link
                    href={`/camiones/${v.id}`}
                    /*
                      `min-h-11` explícito: por encima de 1400 la miniatura de
                      44px daba la altura del objetivo tocable, pero al
                      retirarla en tableta el enlace quedaba en 24,8px. La
                      altura del objetivo no puede depender de que haya foto.
                    */
                    className="flex min-h-11 items-center gap-3 rounded focus-ring"
                  >
                    <span className="hidden size-11 shrink-0 overflow-hidden rounded-[var(--r-control)] bg-[var(--surface-2)] min-[1400px]:block">
                      {v.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.photoUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        /* Sin foto: una raya, no un ícono de camión. La
                           miniatura representa la fotografía de ESTE vehículo;
                           un camión genérico no lo representa, solo rellena. */
                        <span
                          className="flex size-full items-center justify-center text-[var(--icon-muted)]"
                          aria-hidden
                        >
                          —
                        </span>
                      )}
                    </span>
                    <Plate value={v.plate} size="sm" />
                  </Link>
                </td>

                {/*
                  Vehículo y conductor son las dos columnas cuyo contenido no
                  tiene longitud previsible: son las dos elásticas, se reparten
                  el ancho sobrante y recortan con puntos suspensivos. Placa,
                  estado y kilometraje van a `w-px` —exactamente su contenido— y
                  nunca ceden espacio: son los tres datos que la tabla existe
                  para comparar.

                  Ninguno se parte en dos líneas: «Freightliner / Cascadia» se
                  lee como un dato roto y descuadra la altura de las filas. Lo
                  que sí puede envolverse es la alerta, que es una frase.
                */}
                <td className="celda-elastica px-3 py-3 min-[1400px]:px-4 min-[1400px]:py-2.5">
                  <span className="texto-recortado" title={`${v.brand} ${v.model}`}>
                    {v.brand} {v.model}
                  </span>
                  <span
                    className="texto-recortado text-sm text-[var(--text-muted)]"
                    title={secundaria}
                  >
                    {secundaria}
                  </span>
                </td>

                <td className="hidden whitespace-nowrap px-3 py-3 min-[1400px]:px-4 min-[1400px]:py-2.5 text-[var(--text-muted)] min-[1400px]:table-cell">
                  {TRUCK_KIND[v.kind]}
                </td>

                <td className="whitespace-nowrap px-3 py-3 min-[1400px]:px-4 min-[1400px]:py-2.5">
                  <Badge
                    tone={v.archived ? "neutral" : estado.tone}
                    variant="quiet"
                  >
                    {v.archived ? "Archivado" : estado.label}
                  </Badge>
                </td>

                <td className="celda-elastica px-3 py-3 text-[var(--text-muted)] min-[1400px]:px-4 min-[1400px]:py-2.5">
                  <span className="texto-recortado" title={conductor}>
                    {conductor}
                  </span>
                </td>

                <td className="whitespace-nowrap px-3 py-3 min-[1400px]:px-4 min-[1400px]:py-2.5 text-right font-mono tabular-nums">
                  {number(v.odometerKm)}{" "}
                  <span className="text-sm text-[var(--text-muted)]">km</span>
                </td>

                <td className="celda-elastica hidden px-4 py-2.5 min-[1400px]:table-cell">
                  {v.alerta ? (
                    <span
                      className="inline-flex items-start gap-1.5 text-sm font-medium"
                      style={{
                        color: v.alerta.urgente
                          ? "var(--tone-danger-fg)"
                          : "var(--tone-warning-fg)",
                      }}
                    >
                      <TriangleAlert
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      {v.alerta.texto}
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">
                      Sin alertas
                    </span>
                  )}
                </td>
              </tr>

              {/*
                En tableta la alerta baja a su propia línea, bajo el vehículo al
                que pertenece. No se pierde ningún dato: cambia de sitio para
                que las cinco columnas restantes entren sin desplazamiento
                lateral. «Sin alertas» no se imprime acá: en la columna sirve
                para que la celda no quede vacía, pero como línea suelta sería
                una fila entera para decir que no pasa nada.
              */}
              {v.alerta && (
                <tr className="border-b border-[var(--border)] min-[1400px]:hidden">
                  <td colSpan={7} className="px-3 pb-3 pt-0">
                    <span
                      className="inline-flex items-start gap-1.5 text-sm font-medium"
                      style={{
                        color: v.alerta.urgente
                          ? "var(--tone-danger-fg)"
                          : "var(--tone-warning-fg)",
                      }}
                    >
                      <TriangleAlert
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      {v.alerta.texto}
                    </span>
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-3 text-sm font-semibold min-[1400px]:px-4 text-[var(--text-muted)] ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}
