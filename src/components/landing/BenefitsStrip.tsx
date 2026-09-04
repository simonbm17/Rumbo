import { BENEFICIOS, FINANZAS } from "@/lib/landing-demo";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * RESULTADOS. V4.
 *
 * ── QUÉ CAMBIA ──────────────────────────────────────────────────────────────
 *
 * En V3 los cuatro beneficios llevaban un icono lineal cada uno, del mismo
 * tamaño, encima del mismo título, dentro del mismo hueco. Cuatro celdas
 * idénticas con icono arriba es la plantilla que se reconoce a un metro. Ahora
 * es una lista editorial: filete, título, una línea. Lo que distingue a cada
 * uno es lo que dice, no un pictograma decorativo.
 *
 * Tampoco lleva numeración 01/02/03/04: estos cuatro no son una secuencia, son
 * cuatro cosas paralelas. Numerar lo que no tiene orden es decoración con
 * aspecto de sistema.
 *
 * La sección deja el azul marino y pasa a gris frío: con el producto ya a
 * sangre en azul, repetir el fondo oscuro aquí desdibujaba cuál de los dos
 * bloques es la pieza principal.
 *
 * ── LA VERDAD DE LAS CIFRAS ─────────────────────────────────────────────────
 *
 * La referencia pone aquí cuatro porcentajes —−32%, +28%…— y no existe una sola
 * medición detrás de ellos. Un número inventado es peor que ninguno: invita a
 * pedir la fuente. Van cuatro beneficios cualitativos, que sí se sostienen.
 *
 * El contexto económico son tres cifras y seis meses. Es lo que Rumbo calcula
 * —Entró, Salió, Resultado—, no rentabilidad, ni ROI, ni ahorro garantizado.
 */
export function BenefitsStrip() {
  const max = Math.max(...FINANZAS.serie);

  return (
    <section
      id="resultados"
      className="lp-frio scroll-mt-4"
      aria-labelledby="lp-resultados"
      style={{ paddingBlock: "var(--seccion)" }}
    >
      <div className="lp-ancho">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2
              id="lp-resultados"
              className="lp-h2 max-w-[12ch] text-[var(--navy)]"
              data-anima="subir"
            >
              Más orden. Mejores decisiones.
            </h2>
            <span
              aria-hidden
              className="mt-6 block h-1 w-16 bg-[var(--naranja)]"
              data-anima="linea"
              style={{ "--retardo": "120ms" } as React.CSSProperties}
            />
          </div>

          <ul className="lp-beneficios lg:col-span-8">
            {BENEFICIOS.map((b, i) => (
              <li
                key={b.id}
                data-anima="subir"
                style={{ "--retardo": `${i * 60}ms` } as React.CSSProperties}
              >
                <h3 className="lp-h3 text-[var(--navy)]">{b.titulo}</h3>
                <p className="mt-1.5 max-w-[42ch] leading-relaxed text-[var(--gris)]">
                  {b.texto}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* ------------------------- contexto económico ---------------- */}
        <div className="mt-14 border-t border-[var(--linea)] pt-12 lg:mt-20 lg:pt-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="lg:col-span-4">
              <p
                className="lp-display max-w-[14ch] text-[var(--navy)]"
                data-anima="subir"
              >
                Lo que produce y lo que cuesta.
              </p>
              <p
                className="lp-lead mt-4 max-w-[38ch]"
                data-anima="subir"
                style={{ "--retardo": "60ms" } as React.CSSProperties}
              >
                Entender qué entró, qué salió y cómo viene evolucionando.
              </p>
            </div>

            <div
              className="lg:col-span-8"
              inert
              aria-hidden
              data-anima="subir"
              style={{ "--retardo": "120ms" } as React.CSSProperties}
            >
              <dl className="grid grid-cols-3 gap-6">
                {[
                  ["Entró", FINANZAS.entro],
                  ["Salió", FINANZAS.salio],
                  ["Resultado", FINANZAS.resultado],
                ].map(([r, v]) => (
                  <div key={r as string}>
                    <dt className="text-[0.875rem] text-[var(--gris)]">{r}</dt>
                    <dd className="lp-cifra mt-1 text-[clamp(0.9rem,2vw,1.375rem)] text-[var(--navy)]">
                      {dinero(v as number)}
                    </dd>
                  </div>
                ))}
              </dl>

              {/*
                SEIS MESES, CON SU UNIDAD DECLARADA.

                Antes eran barras sin eje, sin unidad y sin valores: tenían la
                forma de un gráfico cuantitativo sin serlo, que es la peor de las
                dos opciones. Ahora se dice qué miden y en qué escala, y el mes
                en curso —todavía sin cerrar— se marca como tal en vez de
                parecer una barra rota.

                Las barras cuelgan DIRECTAMENTE del contenedor de alto fijo: con
                una columna intermedia, su `height` en porcentaje no tenía contra
                qué resolver y medían 0px.
              */}
              <div className="mt-10">
                <p className="text-[0.875rem] text-[var(--gris)]">
                  Ingresos por mes, en millones de pesos
                </p>
                <div className="mt-3 flex h-28 items-end gap-2 border-b border-[var(--linea)]">
                  {FINANZAS.serie.map((v, i) => (
                    <span
                      key={FINANZAS.meses[i]}
                      className="lp-barra flex-1"
                      style={{
                        height: `${Math.max((v / max) * 100, 2)}%`,
                        opacity: v === 0 ? 0.25 : 1,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  {FINANZAS.meses.map((m, i) => (
                    <span
                      key={m}
                      className="flex flex-1 flex-col items-center gap-0.5"
                    >
                      <span className="lp-cifra text-[0.875rem] text-[var(--navy)]">
                        {FINANZAS.serie[i] === 0 ? "-" : FINANZAS.serie[i]}
                      </span>
                      <span className="text-[0.875rem] text-[var(--gris)]">
                        {m}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
