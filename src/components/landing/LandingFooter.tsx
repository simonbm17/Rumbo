import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

/**
 * PIE. V4.
 *
 * En V3 era blanco, y después de una franja naranja a sangre volver al blanco
 * es bajar el telón a media función: la página se desvanecía en vez de cerrar.
 * Ahora es azul marino y la marca ocupa el peso.
 *
 * Con cuatro destinos reales, una retícula de cuatro columnas de enlaces se ve
 * incompleta. La salida no es inventar Blog, Webinars ni redes que no existen:
 * es cambiar de forma. Marca grande, una frase, la llamada, y los pocos
 * destinos que existen en una fila bajo regla. Menos enlaces se lee como
 * decisión, no como carencia.
 */
const DESTINOS = [
  { href: "#producto", label: "Centro de situación" },
  { href: "#vehiculos", label: "Operación" },
  { href: "#resultados", label: "Resultados" },
];

export function LandingFooter() {
  return (
    <footer className="lp-footer lp-sobre-color">
      <div className="lp-ancho">
        <div className="lp-footer-cima">
          <div>
            {/*
              El logotipo oficial a tamaño grande, no un texto redibujado. Es la
              única marca que existe y no se recompone con CSS.
            */}
            <Logo variante="blanco" alto={44} className="lp-footer-marca" />
            <p className="lp-footer-frase">
              Gestión de flotas para centralizar información operacional y tomar
              decisiones con mayor claridad.
            </p>
          </div>

          <Link href="/login" className="lp-btn lp-btn-naranja shrink-0">
            Entrar a Rumbo
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>

        <div className="lp-footer-pie">
          <nav aria-label="Secciones" className="lp-footer-nav">
            {DESTINOS.map((d) => (
              <a key={d.href} href={d.href}>
                {d.label}
              </a>
            ))}
            <Link href="/login">Acceso</Link>
          </nav>
          <p className="lp-footer-legal">© {new Date().getFullYear()} Rumbo</p>
        </div>
      </div>
    </footer>
  );
}
