import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * `mobileCompact` es opcional y NO se activa solo.
 *
 * En el apilado normal, la descripción vive dentro del bloque del título, así
 * que en un teléfono lo ensancha y empuja la acción a una fila propia: título,
 * descripción y botón ocupan tres renglones. Con la variante compacta el título
 * y la acción comparten fila —el título encoge con `min-w-0`— y la descripción
 * baja completa debajo. Medido en Vehículos a 390px: 109px de cabecera contra
 * 68px, y con el margen inferior son 49px menos por encima del primer vehículo.
 *
 * Se pide por pantalla a propósito. Es una decisión de composición que depende
 * de qué tan larga sea la descripción y de si la acción es un botón con texto;
 * activarla por defecto cambiaría pantallas que todavía no se diseñaron.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  mobileCompact = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
  /** Título y acción en la misma fila; la descripción baja. Solo donde se pida. */
  mobileCompact?: boolean;
}) {
  return (
    <header className={mobileCompact ? "mb-4 sm:mb-6" : "mb-6"}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Ruta de navegación"
          className="mb-2 flex items-center gap-1 text-sm text-[var(--text-muted)]"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 text-[var(--text-muted)]" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="rounded transition-colors hover:text-[var(--text)] focus-ring"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--text)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className={mobileCompact ? "min-w-0 flex-1" : "min-w-0"}>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
            {title}
          </h1>
          {description && !mobileCompact && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 no-print">
            {actions}
          </div>
        )}
      </div>
      {description && mobileCompact && (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      )}
    </header>
  );
}
