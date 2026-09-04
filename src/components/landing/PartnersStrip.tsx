import Image from "next/image";
import { PARTNERS } from "@/lib/landing-demo";

/**
 * FRANJA DE EMPRESAS.
 *
 * La sección existe en la arquitectura, pero **no se dibuja sin logotipos
 * reales**. La referencia visual trae seis empresas inventadas; copiarlas
 * habría sido la única mentira que una portada no puede permitirse, porque no
 * es una licencia estética sino una afirmación falsa sobre quién usa el
 * producto.
 *
 * Con la lista vacía esto devuelve `null` y la página no reserva hueco ni se
 * descuadra: la sección siguiente sube y el ritmo se sostiene. Basta añadir
 * entradas a `PARTNERS` para que la banda aparezca en su sitio, sin tocar una
 * línea de maquetado.
 */
export function PartnersStrip() {
  if (PARTNERS.length === 0) return null;

  return (
    <section className="lp-partners" aria-labelledby="lp-partners-titulo">
      <div className="lp-ancho py-10">
        <h2
          id="lp-partners-titulo"
          className="text-center text-sm font-semibold uppercase tracking-[0.14em] text-[var(--gris-2)]"
        >
          Empresas que trabajan con Rumbo
        </h2>
        <ul className="lp-partners-lista mt-6">
          {PARTNERS.map((p) => (
            <li key={p.name}>
              <Image
                src={p.logo}
                alt={p.alt}
                width={160}
                height={44}
                className="h-9 w-auto object-contain"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
