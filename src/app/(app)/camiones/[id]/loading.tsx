/**
 * Esqueleto con la arquitectura real del expediente: ventana y lectura arriba,
 * y debajo las secciones con sus filas. No son rectángulos genéricos —cada
 * bloque ocupa el sitio y la proporción que va a ocupar el contenido— para que
 * al llegar los datos nada se mueva.
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-11 w-32 rounded bg-[var(--surface-2)]" />

      {/* cabecera: ventana + lectura */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,42%)_1fr]">
        <div className="aspect-[3/2] rounded-[var(--r-surface)] bg-[var(--surface-2)]" />
        <div className="flex flex-col gap-5">
          <div className="h-10 w-48 rounded bg-[var(--surface-2)]" />
          <div className="h-6 w-72 rounded bg-[var(--surface-2)]" />
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-b border-[var(--border)] py-3">
                <div className="mb-2 h-4 w-24 rounded bg-[var(--surface-2)]" />
                <div className="h-6 w-36 rounded bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
          <div className="h-11 w-44 rounded bg-[var(--surface-2)]" />
        </div>
      </div>

      {/* secciones del expediente */}
      {[0, 1, 2].map((s) => (
        <div key={s} className="mb-8">
          <div className="mb-4 h-7 w-52 rounded bg-[var(--surface-2)]" />
          <div className="overflow-hidden rounded-[var(--r-surface)] border border-[var(--border)]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-5 w-64 max-w-full rounded bg-[var(--surface-2)]" />
                  <div className="h-4 w-48 max-w-full rounded bg-[var(--surface-2)]" />
                </div>
                <div className="h-5 w-20 shrink-0 rounded bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
