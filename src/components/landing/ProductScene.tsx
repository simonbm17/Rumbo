import Image from "next/image";
import { Logo } from "@/components/brand/Logo";
import { ALERTAS, ATENCION, SITUACION, VIAJES } from "@/lib/landing-demo";

/**
 * EL ESCENARIO AZUL: la pieza de producto. V4.
 *
 * ── QUÉ CAMBIA ──────────────────────────────────────────────────────────────
 *
 * En V3 esto era una tarjeta azul con esquinas redondeadas flotando en una
 * página blanca, y dentro de ella otras tres tarjetas. Rectángulo dentro de
 * rectángulo dentro de rectángulo: el producto se leía como una captura pegada.
 *
 * Ahora el azul ocupa el ancho entero de la ventana y hay TRES PLANOS:
 *
 *   FONDO     el azul a sangre y su textura
 *   MEDIO     la luz (azul arriba-izquierda, naranja abajo-derecha) y el neón
 *   FRENTE    una sola superficie, la consola, con filas y filetes dentro
 *
 * Debajo, el suelo: sombra proyectada más un reflejo muy corto. La profundidad
 * sale de ahí, no de inclinar un panel.
 *
 * ── LO QUE SE MUESTRA ───────────────────────────────────────────────────────
 *
 * El contenido es el de Rumbo, no el tablero inventado de la referencia: el
 * reparto de estados de la flota, lo que requiere atención con su vocabulario
 * real (vencido, urgente, por vencer) y los viajes en curso con su código, su
 * placa, su ruta y quién los conduce.
 *
 * Lo que NO aparece, porque Rumbo no lo tiene: mapa, posición, velocidad,
 * kilómetros por hora, señal, seguimiento. Ni una etiqueta.
 *
 * Es una ilustración, no una aplicación: va `inert` y `aria-hidden` para que
 * nadie tabule dentro de algo que no lleva a ningún sitio. El significado lo
 * carga el texto de arriba, que sí se lee.
 */

const TONO: Record<string, string> = {
  ok: "#34d399",
  info: "#60a5fa",
  aviso: "#fbbf24",
  neutro: "#94a3b8",
};

const NIVEL: Record<string, { etiqueta: string; color: string }> = {
  vencido: { etiqueta: "Vencido", color: "#ffa08f" },
  urgente: { etiqueta: "Urgente", color: "#ffa08f" },
  porVencer: { etiqueta: "Por vencer", color: "#ffcf5c" },
};

const MENU = [
  "Panel",
  "Vehículos",
  "Viajes",
  "Conductores",
  "Mantenimiento",
  "Gastos",
  "Documentos",
  "Reportes",
];

export function ProductScene() {
  return (
    <section
      id="producto"
      className="lp-estadio lp-sobre-color scroll-mt-4"
      aria-labelledby="lp-producto"
    >
      {/* ------------------------------- fondo ----------------------- */}
      <Image
        src="/landing/fondo-navy.webp"
        alt=""
        aria-hidden
        width={1600}
        height={900}
        sizes="100vw"
        className="lp-estadio-textura"
      />
      <div className="lp-estadio-luz" aria-hidden />
      <Image
        src="/landing/neon.webp"
        alt=""
        aria-hidden
        width={1100}
        height={619}
        sizes="(max-width: 1023px) 90vw, 72vw"
        className="lp-estadio-neon"
      />

      {/* ------------------------------ frente ----------------------- */}
      <div className="lp-estadio-cuerpo lp-ancho">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2
              id="lp-producto"
              className="lp-h2 text-white"
              data-anima="subir"
            >
              Visibilidad operacional,
              <br />
              decisiones con contexto.
            </h2>
          </div>
          <p
            className="max-w-[46ch] text-[1.0625rem] leading-relaxed text-[var(--sobre-navy-2)] lg:col-span-5"
            data-anima="subir"
            style={{ "--retardo": "70ms" } as React.CSSProperties}
          >
            Lo importante de tu operación reunido en un solo lugar, para entender
            qué requiere atención hoy.
          </p>
        </div>

        <div className="mt-8 md:mt-12">
          <div className="lp-consola" data-anima="escala" inert aria-hidden>
            {/* --------------------------- barra lateral ------------- */}
            <div className="lp-sidebar">
              <Logo variante="blanco" alto={22} className="mb-6 ml-2" />
              {/*
                Sin punto delante de cada entrada. No decía nada: los puntos de
                esta portada significan estado —el verde de «Disponibles», el
                ámbar de «En taller»— y ponerlos también donde no hay estado los
                vacía de sentido. El ítem activo ya se distingue por su fondo.
              */}
              {MENU.map((m, i) => (
                <span key={m} data-activo={i === 0 ? "true" : undefined}>
                  {m}
                </span>
              ))}
            </div>

            {/* ------------------------------- lectura --------------- */}
            <div>
              {/* La marca dentro de la consola en teléfono y tableta, donde la
                  barra lateral no existe: sin ella la pieza no se identifica. */}
              <Logo variante="blanco" alto={20} className="mb-5 lg:hidden" />

              {/* SITUACIÓN AHORA. Fila, no caja. */}
              <div className="lp-fila">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="lp-rotulo">Situación ahora</p>
                  <p className="text-[0.875rem] text-[var(--sobre-navy-3)]">
                    <span className="lp-cifra">{SITUACION.flota}</span> vehículos
                    · <span className="lp-cifra">{SITUACION.conductores}</span>{" "}
                    conductores
                  </p>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  {SITUACION.estados.map((e) => (
                    <div key={e.etiqueta}>
                      {/*
                        Dos líneas reservadas mientras la columna sea angosta.
                        Medido a 390: «Fuera de servicio» ocupa dos renglones y
                        las otras tres uno, así que su cifra caía 21px por debajo
                        de la de «En taller», en la MISMA fila. 3em es el alto
                        real de dos renglones a 14px con esta interlínea.
                      */}
                      <dt className="flex min-h-[3em] items-center gap-2 text-[0.875rem] text-[var(--sobre-navy-3)] sm:min-h-0">
                        <span
                          className="lp-punto"
                          style={{ background: TONO[e.tono] }}
                        />
                        {e.etiqueta}
                      </dt>
                      <dd className="lp-cifra mt-1 text-[1.75rem] leading-none">
                        {e.total}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* NECESITA ATENCIÓN y VIAJES: dos columnas separadas por un
                  filete vertical, no dos tarjetas. */}
              <div className="lp-fila grid gap-6 lg:grid-cols-2 lg:gap-0">
                <div className="lg:pr-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="lp-rotulo">Necesita atención</p>
                    <span className="lp-cifra text-lg text-[#ffa08f]">
                      {ATENCION.total}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-col divide-y divide-white/10">
                    {ALERTAS.map((a, i) => (
                      <li
                        key={a.id}
                        // A partir del segundo, en teléfono se cae la mitad de
                        // la lista: lo que importa ahí es que se entienda qué
                        // hace la pieza, no leerla entera.
                        className={
                          i > 1
                            ? "hidden flex-col gap-1 py-2.5 sm:flex"
                            : "flex flex-col gap-1 py-2.5"
                        }
                      >
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[0.9375rem] font-medium">
                            {a.titulo}
                          </span>
                          <span
                            className="text-[0.875rem] font-semibold uppercase tracking-wide"
                            style={{ color: NIVEL[a.nivel].color }}
                          >
                            {NIVEL[a.nivel].etiqueta}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 text-[0.875rem] text-[var(--sobre-navy-3)]">
                          <span className="lp-placa">{a.sujeto}</span>
                          <span>{a.plazo}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-white/12 pt-4 lg:border-t-0 lg:border-l lg:border-white/12 lg:pt-0 lg:pl-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="lp-rotulo">Viajes en curso</p>
                    <span className="lp-cifra text-lg text-[var(--sobre-navy-1)]">
                      {VIAJES.length}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-col divide-y divide-white/10">
                    {VIAJES.map((v, i) => (
                      <li
                        key={v.id}
                        className={
                          i > 0
                            ? "hidden flex-col gap-1 py-2.5 sm:flex"
                            : "flex flex-col gap-1 py-2.5"
                        }
                      >
                        <span className="flex flex-wrap items-center gap-x-2">
                          <span className="lp-placa">{v.placa}</span>
                          <span className="text-[0.9375rem] font-medium">
                            {v.origen} → {v.destino}
                          </span>
                        </span>
                        <span className="text-[0.875rem] text-[var(--sobre-navy-3)]">
                          <span className="lp-cifra">{v.codigo}</span> ·{" "}
                          {v.conductor}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* El suelo. Sombra y reflejo cortos: no es un espejo. */}
          <div className="lp-suelo" aria-hidden />
        </div>

        {/* El desglose va FUERA de la consola: es texto, y tiene que leerse. */}
        <p
          className="mt-2 max-w-[62ch] text-[1.0625rem] leading-relaxed text-[var(--sobre-navy-2)]"
          data-anima="subir"
        >
          <span className="font-semibold text-white">
            {ATENCION.total} situaciones por atender:
          </span>{" "}
          {ATENCION.desglose.map((d) => `${d.total} ${d.etiqueta}`).join(", ")}.
        </p>
      </div>
    </section>
  );
}
