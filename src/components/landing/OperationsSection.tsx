import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, FileStack, Wrench } from "lucide-react";
import { CAPACIDADES } from "@/lib/landing-demo";

/*
  ICONOS LINEALES, NO LOS TRES PNG VOLUMÉTRICOS DEL KIT.

  Los descarté después de mirarlos juntos a tamaño grande, y por dos razones
  medidas, no por gusto:

  1. SON CAJAS POR DIBUJO. Cada uno es un marco cuadrado de esquinas redondeadas
     con el glifo dentro. Tres marcos idénticos en fila es exactamente la
     retícula de insignias repetidas que esta portada evita en todas partes.
     Recortar el marco tampoco servía: el glifo de «expediente» está dibujado
     SOBRE blanco, así que al quitar el marco queda un cuadrado blanco.
  2. NO COMPARTEN PESO ÓPTICO. Medidos: expediente 61% transparente y de puro
     contorno, mantenimiento 48,8% y de relleno denso, alertas 38,7% y con un
     gris (#dee1e7) que no existe en el sistema de color. Un contorno, un
     relleno y un tercero con otra paleta no son una serie.

  Estos tres son de `lucide-react`, que ya es dependencia del proyecto y ya
  dibuja las flechas y los visados de esta misma página: una sola familia en
  toda la portada. Mismo grosor de trazo, misma caja, mismo color.

  Los tres .webp siguen en `public/landing/` sin referenciar: no los borro
  porque son entrega del cliente, pero ya no viajan al navegador.
*/
const ICONO = {
  expediente: FileStack,
  mantenimiento: Wrench,
  alertas: BellRing,
} as const;

/**
 * OPERACIÓN. V4.
 *
 * Misma estructura que la referencia —vehículo a la izquierda, lectura a la
 * derecha— pero el vehículo ROMPE LA RETÍCULA: sale por el borde izquierdo de
 * la ventana en vez de quedarse educadamente dentro de la columna. En V3 se
 * quedaba dentro, ordenado, y la sección se leía como una diapositiva.
 *
 * Es la MISMA fotografía del hero, no un segundo camión. Y NO se espeja: lo
 * intenté para que mirara hacia el texto y el logotipo del semirremolque quedó
 * al revés, «OBMUЯ», que es exactamente el tipo de detalle que delata una
 * portada hecha deprisa.
 *
 * Las tres capacidades van con icono de trazo y filete, no encerradas en
 * tarjetas. Fuera de la interfaz del producto esta portada no usa tarjetas.
 */
export function OperationsSection() {
  return (
    <section
      id="vehiculos"
      className="lp-op lp-claro scroll-mt-4"
      aria-labelledby="lp-operaciones"
    >
      <div className="lp-ancho">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ------------------------------ vehículo ------------------- */}
          <div
            className="lp-op-escenario order-2 lg:order-1 lg:col-span-5"
            data-anima="subir"
          >
            <Image
              src="/landing/halo.webp"
              alt=""
              aria-hidden
              width={900}
              height={473}
              sizes="(max-width: 1023px) 78vw, 40vw"
              className="lp-op-halo"
            />
            <Image
              src="/landing/sombra.webp"
              alt=""
              aria-hidden
              width={1000}
              height={253}
              sizes="(max-width: 1023px) 96vw, 50vw"
              className="lp-op-sombra"
            />
            <Image
              src="/landing/camion.webp"
              alt=""
              aria-hidden
              width={1400}
              height={872}
              sizes="(max-width: 1023px) 100vw, 46vw"
              className="lp-op-camion"
            />
          </div>

          {/* ------------------------------- lectura ------------------- */}
          <div className="order-1 lg:order-2 lg:col-span-7 lg:pl-6">
            <p className="lp-eyebrow" data-anima="subir">
              Más control, menos cosas por perder de vista
            </p>
            <h2
              id="lp-operaciones"
              className="lp-h2 mt-4 max-w-[16ch] text-[var(--navy)]"
              data-anima="subir"
              style={{ "--retardo": "60ms" } as React.CSSProperties}
            >
              Operaciones más claras. Decisiones mejor informadas.
            </h2>

            <ul className="mt-10 flex flex-col">
              {CAPACIDADES.map((c, i) => {
                const Icono = ICONO[c.id as keyof typeof ICONO];
                return (
                <li
                  key={c.id}
                  data-anima="subir"
                  style={{ "--retardo": `${140 + i * 60}ms` } as React.CSSProperties}
                  className="flex gap-5 border-t border-[var(--linea)] py-6 first:border-t-0 first:pt-0"
                >
                  {/*
                    Trazo de 1,25 y no 1,5: a 44px un grosor de interfaz se ve
                    alambre. Y el naranja accesible, no el de marca, porque acá
                    el icono va sobre blanco.
                  */}
                  <Icono
                    className="lp-icono shrink-0 text-[var(--naranja-texto)]"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h3 className="lp-h3 text-[var(--navy)]">{c.titulo}</h3>
                    <p className="mt-1.5 max-w-[52ch] leading-relaxed text-[var(--gris)]">
                      {c.texto}
                    </p>
                  </div>
                </li>
                );
              })}
            </ul>

            <Link
              href="/login"
              className="lp-enlace mt-8"
              data-anima="subir"
              style={{ "--retardo": "320ms" } as React.CSSProperties}
            >
              Entrar a Rumbo
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
