import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * La fila del expediente.
 *
 * Las tablas generales del producto (`components/lists/*`) sirven a las
 * pantallas índice y llevan `min-w-[820px]`: se arrastran de lado en cualquier
 * pantalla menor a un portátil. Eso está bien allí, donde la tarea es comparar
 * cien registros, y está mal acá, donde la tarea es leer el expediente de UN
 * vehículo. Por eso el detalle usa su propia fila y no las reutiliza.
 *
 * Una sola forma para las cinco secciones —viajes, mantenimiento, gastos,
 * documentos, asignaciones— porque el expediente se lee como un solo documento.
 * Si cada sección inventara su tabla, la página volvería a ser una colección de
 * módulos pegados.
 *
 * La estructura es siempre la misma y todo lo secundario es opcional:
 *
 *   [ título              ] [ estado ] [ cifra ]
 *   [ meta                ]
 *   [ pie, solo si existe ]
 */
export function RecordRow({
  href,
  titulo,
  meta,
  estado,
  cifra,
  cifraRotulo,
  pie,
}: {
  href?: string;
  titulo: ReactNode;
  meta?: ReactNode;
  estado?: ReactNode;
  /** Alineada a la derecha y en tabular: se compara bajando la vista. */
  cifra?: ReactNode;
  cifraRotulo?: string;
  pie?: ReactNode;
}) {
  const cuerpo = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="min-w-0 font-medium">{titulo}</span>
          {estado}
        </span>
        {meta && (
          <span className="text-sm text-[var(--text-muted)]">{meta}</span>
        )}
        {pie && <span className="text-sm">{pie}</span>}
      </span>

      {cifra && (
        <span className="shrink-0 text-right">
          <span className="block font-mono tabular-nums">{cifra}</span>
          {cifraRotulo && (
            <span className="block text-sm text-[var(--text-muted)]">
              {cifraRotulo}
            </span>
          )}
        </span>
      )}

      {href && (
        <ChevronRight
          className="size-5 shrink-0 text-[var(--icon-muted)]"
          aria-hidden
        />
      )}
    </>
  );

  const clases =
    "flex min-h-11 items-start gap-4 px-4 py-3 sm:items-center";

  return (
    <li className="border-b border-[var(--border)] last:border-b-0">
      {href ? (
        <Link
          href={href}
          className={`${clases} transition-colors hover:bg-[var(--surface-hover)] focus-ring`}
        >
          {cuerpo}
        </Link>
      ) : (
        <div className={clases}>{cuerpo}</div>
      )}
    </li>
  );
}

/**
 * El contenedor de filas. Si no hay registros dice qué falta y no dibuja una
 * caja vacía con una ilustración adentro: en un expediente, la ausencia de un
 * mantenimiento es un dato, no un hueco que decorar.
 */
export function RecordList({
  children,
  vacio,
  accion,
}: {
  children?: ReactNode;
  /** Texto para cuando no hay registros. */
  vacio: string;
  /** Acción opcional junto al texto de vacío. */
  accion?: ReactNode;
}) {
  const hayFilas = Array.isArray(children) ? children.length > 0 : Boolean(children);

  if (!hayFilas) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-[var(--r-surface)] border border-dashed border-[var(--border)] px-4 py-5">
        <p className="text-[var(--text-muted)]">{vacio}</p>
        {accion}
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-[var(--r-surface)] border border-[var(--border)] bg-[var(--surface)]">
      {children}
    </ul>
  );
}
