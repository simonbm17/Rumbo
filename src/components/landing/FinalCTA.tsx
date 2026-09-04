import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * CIERRE NARANJA. V4.
 *
 * La superficie ya no es un rectángulo pegado debajo de la sección anterior:
 * entra en diagonal, con un ángulo muy bajo, así que el color llega en
 * movimiento en vez de aparecer de golpe. Es de lo que va la marca.
 *
 * «Dale rumbo a tu operación» dejó de ser un rótulo diminuto en versalitas y
 * pasó a ser una línea de display. Siempre fue una frase, no una etiqueta de
 * categoría; tratándola como rótulo la portada acumulaba tres etiquetas
 * idénticas y esa repetición es la retícula que delata una plantilla.
 *
 * Es la tercera aparición de la MISMA fotografía: no se inventa un tercer
 * camión, y sale por el borde derecho para que la escena continúe fuera de la
 * página.
 *
 * El texto va en azul marino, no en blanco: medido, blanco sobre este naranja
 * da 3,13:1 y no llega a AA. El azul marino da 5,14:1.
 */
export function FinalCTA() {
  return (
    <section className="lp-cta lp-sobre-color" aria-labelledby="lp-cierre">
      <Image
        src="/landing/estelas.webp"
        alt=""
        aria-hidden
        width={1200}
        height={675}
        sizes="100vw"
        className="lp-cta-estelas"
      />

      <div className="lp-ancho">
        <div className="relative grid items-center gap-8 lg:grid-cols-12 lg:gap-6">
          <div className="relative z-10 lg:col-span-7">
            {/*
              Sin `opacity-80`. Medido en Chrome: el azul marino al 80% sobre
              este naranja compone ~#392B3C y da 4,24:1 en vez de 5,14:1. Es
              opacidad decorativa que solo resta contraste; a color pleno la
              línea se lee mejor y sigue siendo secundaria por tamaño.
            */}
            <p className="lp-display text-[var(--navy)]" data-anima="subir">
              Dale rumbo a tu operación
            </p>
            <h2
              id="lp-cierre"
              className="lp-h2 mt-4 max-w-[15ch] text-[var(--navy)]"
              data-anima="subir"
              style={{ "--retardo": "70ms" } as React.CSSProperties}
            >
              Todo empieza por ver tu flota con claridad.
            </h2>
            <p
              className="mt-5 max-w-[46ch] text-[1.0625rem] leading-relaxed text-[var(--navy)]"
              data-anima="subir"
              style={{ "--retardo": "130ms" } as React.CSSProperties}
            >
              Reúne vehículos, conductores, viajes, mantenimientos, gastos y
              documentos en un solo lugar.
            </p>
            <div
              data-anima="subir"
              style={{ "--retardo": "190ms" } as React.CSSProperties}
            >
              <Link href="/login" className="lp-btn lp-btn-blanco mt-8">
                Entrar a Rumbo
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </div>
          </div>

          {/*
            El vehículo sale por el borde derecho. En pantallas chicas se retira
            del todo: encogido no aporta y le robaría altura a la llamada.
          */}
          <div className="lp-cta-camion lg:col-span-5" aria-hidden>
            <Image
              src="/landing/sombra.webp"
              alt=""
              width={1000}
              height={253}
              sizes="50vw"
              className="lp-cta-sombra"
            />
            <Image
              src="/landing/camion.webp"
              alt=""
              width={1400}
              height={872}
              sizes="(max-width: 1023px) 1px, 46vw"
              className="relative z-10 w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
