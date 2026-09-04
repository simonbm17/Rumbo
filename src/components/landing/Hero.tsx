import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/**
 * HERO. V4.
 *
 * La composición ya no es «texto a la izquierda, foto a la derecha» dentro de
 * dos cajas que se ignoran. Sobre retícula de 12, la lectura ocupa 1-6 y el
 * escenario 6-13: media columna de solape, así que el vehículo pasa POR DETRÁS
 * del texto y las dos mitades se traban.
 *
 * Y el escenario DESBORDA hacia abajo. El camión cae por debajo del borde del
 * hero y aterriza sobre la franja azul del producto. Hero y producto dejan de
 * ser dos secciones apiladas: son una sola escena en la que el vehículo llega
 * a la consola. Eso es lo que hace que la página no se pueda replicar cambiando
 * el logotipo.
 *
 * EL ORDEN DE CAPAS IMPORTA, y es el de la referencia:
 *
 *   estelas (z 0)  →  halo (z 1)  →  sombra (z 2)  →  vehículo (z 3)
 *
 * El halo va SIEMPRE detrás del camión, nunca delante; la sombra lo apoya en
 * una superficie en vez de dejarlo flotando; las estelas pasan por detrás y por
 * debajo, jamás sobre el texto.
 *
 * SOBRE LAS ESTELAS Y EL HALO: son grafismo de marca, dirección y movimiento.
 * No hay un punto de posición, ni un mapa, ni una ruta, porque Rumbo no
 * localiza vehículos y la portada no puede insinuar que sí.
 *
 * ── LA SECUENCIA DE ENTRADA ─────────────────────────────────────────────────
 *
 * Ocho pasos solapados con retardos crecientes. Los retardos van en el marcado
 * y las curvas en la hoja de estilos, porque lo que cambia por pieza es CUÁNDO,
 * no CÓMO. El vehículo entra a la vez que el cuerpo de texto, no al final: si
 * espera su turno la escena se lee como una lista de elementos apareciendo.
 */
const MICROBENEFICIOS = [
  { texto: "Información centralizada", movil: true },
  { texto: "Control de vencimientos", movil: true },
  { texto: "Seguimiento administrativo", movil: false },
];

export function Hero() {
  return (
    <section className="lp-hero" aria-labelledby="lp-titular">
      <div className="lp-ancho">
        <div className="lp-hero-grid">
          {/* ------------------------------- lectura ------------------- */}
          <div className="lp-hero-lectura">
            <p
              className="lp-eyebrow"
              data-paso="rotulo"
              style={{ "--paso": "60ms" } as React.CSSProperties}
            >
              Plataforma de gestión de flotas
            </p>

            <h1
              id="lp-titular"
              className="lp-h1 mt-4"
              data-paso="titular"
              style={{ "--paso": "140ms" } as React.CSSProperties}
            >
              <span>Control total</span>
              <span>de tu flota</span>
            </h1>

            <p
              className="lp-lead lp-lectura mt-5 sm:mt-6"
              data-paso="cuerpo"
              style={{ "--paso": "300ms" } as React.CSSProperties}
            >
              Centraliza vehículos, conductores, viajes, mantenimientos, gastos,
              documentos y alertas en una sola operación.
            </p>
            <p
              className="lp-acento mt-3"
              data-paso="acento"
              style={{ "--paso": "360ms" } as React.CSSProperties}
            >
              Más claridad. Más control. Mejores decisiones.
            </p>

            <div
              className="mt-6 flex flex-wrap items-center gap-2 sm:mt-8 sm:gap-3"
              data-paso="acciones"
              style={{ "--paso": "430ms" } as React.CSSProperties}
            >
              <Link href="/login" className="lp-btn lp-btn-naranja">
                Entrar a Rumbo
                <ArrowRight className="size-5" aria-hidden />
              </Link>
              <a href="#producto" className="lp-btn lp-btn-linea">
                Ver cómo funciona
              </a>
            </div>

            <ul
              className="lp-microbeneficios lp-lectura mt-5 sm:mt-8"
              data-paso="bondades"
              style={{ "--paso": "500ms" } as React.CSSProperties}
            >
              {MICROBENEFICIOS.map((m) => (
                <li key={m.texto} data-movil={m.movil ? "si" : "no"}>
                  <Check
                    className="size-4 shrink-0 text-[var(--naranja)]"
                    aria-hidden
                  />
                  {m.texto}
                </li>
              ))}
            </ul>
          </div>

          {/* ------------------------------ escenario ------------------ */}
          <div className="lp-escenario">
            <Image
              src="/landing/estelas.webp"
              alt=""
              aria-hidden
              width={1200}
              height={675}
              sizes="(max-width: 1023px) 124vw, 88vw"
              className="lp-estelas"
              data-paso="estelas"
              style={{ "--paso": "180ms" } as React.CSSProperties}
            />
            <Image
              src="/landing/halo.webp"
              alt=""
              aria-hidden
              width={900}
              height={473}
              priority
              /*
                El MISMO `sizes` que el halo de Operación, y no es casualidad:
                los dos se pintan a un tamaño parecido, así que compartir medida
                hace que compartan la variante servida y viajen una sola vez.
                Sin `sizes` se servía la de 1080 para pintar 495.
              */
              sizes="(max-width: 1023px) 78vw, 40vw"
              className="lp-halo"
              data-paso="halo"
              style={{ "--paso": "360ms" } as React.CSSProperties}
            />
            <Image
              src="/landing/sombra.webp"
              alt=""
              aria-hidden
              width={1000}
              height={253}
              sizes="(max-width: 1023px) 96vw, 50vw"
              className="lp-sombra"
              data-paso="sombra"
              style={{ "--paso": "300ms" } as React.CSSProperties}
            />
            <Image
              src="/landing/camion.webp"
              alt="Camión de carga con la marca Rumbo en el semirremolque"
              width={1400}
              height={872}
              priority
              /*
                58vw y no 52: desde 1440 el escenario sangra hasta el canto de
                la ventana, así que el vehículo se pinta a ~57% del ancho.
                Declarar menos de lo que se pinta hace que el navegador elija
                una variante más pequeña y la carrocería sale blanda.
              */
              sizes="(max-width: 1023px) 100vw, 58vw"
              className="lp-camion"
              data-paso="camion"
              style={{ "--paso": "260ms" } as React.CSSProperties}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
