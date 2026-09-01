import type { ReactNode } from "react";

/**
 * El reemplazo por defecto de la tarjeta.
 *
 * `Card` se reserva a objetos que se toman y se abren: un vehículo, una
 * persona. Para agrupar contenido —una tabla, un bloque de texto, un
 * formulario— alcanza con espacio y una regla. Cuando todo vive dentro del
 * mismo rectángulo redondeado, nada destaca; ése era el defecto raíz del
 * diseño anterior.
 */
export function Section({
  title,
  description,
  action,
  count,
  children,
  className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Cantidad de elementos, junto al título. Ahorra una frase. */
  count?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {(title || action) && (
        /*
          En móvil la cabecera pierde la regla y el relleno inferior: la lista
          que viene debajo ya tiene su propio borde, así que la regla dibujaba
          dos líneas separadas por 16px de nada. El título y el conteo se
          quedan; el conteo es lo que dice cuántos quedaron tras filtrar.
        */
        <div className="mb-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:mb-4 sm:border-b sm:border-[var(--border)] sm:pb-3">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-baseline gap-2 text-lg font-semibold text-[var(--text)]">
                {title}
                {typeof count === "number" && (
                  <span className="font-mono text-sm font-medium text-[var(--text-muted)] tabular-nums">
                    {count}
                  </span>
                )}
              </h2>
            )}
            {description && (
              <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 no-print">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
