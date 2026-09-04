import Link from "next/link";
import { Logo } from "./Logo";

/**
 * Cabecera pública: blanca, sin caja, una sola regla abajo.
 *
 * La navegación apunta a anclas de esta misma página. No hay «Precios»,
 * «Clientes», «Blog» ni «Recursos»: esas páginas no existen, y un menú que
 * lleva a ninguna parte es la primera promesa que se rompe.
 *
 * Los dos accesos van a `/login`, que es el único destino real. Ahí es donde
 * se decide si alguien entra al Panel.
 */
const SECCIONES = [
  { href: "#producto", label: "Centro de situación" },
  { href: "#vehiculos", label: "Operación" },
  { href: "#resultados", label: "Resultados" },
];

export function LandingHeader() {
  return (
    <header className="lp-header">
      <div className="lp-ancho">
        <div className="lp-header-fila">
          <Link
            href="/"
            aria-label="Rumbo, inicio"
            className="flex min-h-11 items-center rounded focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--naranja)]"
          >
            <Logo alto={28} prioridad />
          </Link>

          <nav className="lp-nav" aria-label="Secciones">
            {SECCIONES.map((s) => (
              <a key={s.href} href={s.href}>
                {s.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="lp-enlace lp-desde-sm">
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="lp-btn lp-btn-naranja !min-h-11 !px-5 text-[0.9375rem]"
            >
              Entrar a Rumbo
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
