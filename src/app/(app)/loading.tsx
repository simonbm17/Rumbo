/**
 * Esqueleto con las tres capas reales del Panel: situación, atención y
 * contexto. Cada bloque ocupa el sitio que va a ocupar el contenido para que
 * al llegar los datos nada se mueva.
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-9 w-40 rounded bg-[var(--surface-2)]" />

      {/* situación: franja de flota + cuatro cifras */}
      <div className="mb-8">
        <div className="mb-4 h-7 w-56 rounded bg-[var(--surface-2)]" />
        <div className="mb-3 h-1.5 rounded-full bg-[var(--surface-2)]" />
        <div className="mb-6 flex flex-wrap gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-32 rounded bg-[var(--surface-2)]" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-b border-[var(--border)] py-3">
              <div className="mb-2 h-4 w-28 rounded bg-[var(--surface-2)]" />
              <div className="h-6 w-12 rounded bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
      </div>

      {/* atención: filas de alerta */}
      <div className="mb-8">
        <div className="mb-4 h-7 w-48 rounded bg-[var(--surface-2)]" />
        <div className="overflow-hidden rounded-[var(--r-surface)] border border-[var(--border)]">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0"
            >
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-5 w-60 max-w-full rounded bg-[var(--surface-2)]" />
                <div className="h-4 w-40 max-w-full rounded bg-[var(--surface-2)]" />
              </div>
              <div className="h-5 w-24 shrink-0 rounded bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
      </div>

      {/* contexto: cifras del mes + gráfica */}
      <div>
        <div className="mb-4 h-7 w-52 rounded bg-[var(--surface-2)]" />
        <div className="mb-6 grid grid-cols-1 gap-x-8 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-b border-[var(--border)] py-3">
              <div className="mb-2 h-4 w-20 rounded bg-[var(--surface-2)]" />
              <div className="h-6 w-28 rounded bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
        <div className="h-56 rounded bg-[var(--surface-2)] sm:h-72" />
      </div>
    </div>
  );
}
