/**
 * Esqueleto con la arquitectura real del expediente del conductor: identidad,
 * franja del vehículo actual y secciones con sus filas. Cada bloque ocupa el
 * sitio que va a ocupar el contenido, para que al llegar los datos nada salte.
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-11 w-36 rounded bg-[var(--surface-2)]" />

      {/* identidad */}
      <div className="mb-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="size-16 shrink-0 rounded-full bg-[var(--surface-2)]" />
          <div className="flex flex-col gap-2">
            <div className="h-8 w-56 rounded bg-[var(--surface-2)]" />
            <div className="h-6 w-40 rounded bg-[var(--surface-2)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 border-t border-[var(--border)] lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-b border-[var(--border)] py-3">
              <div className="mb-2 h-4 w-24 rounded bg-[var(--surface-2)]" />
              <div className="h-6 w-32 rounded bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
        <div className="h-11 w-44 rounded bg-[var(--surface-2)]" />
      </div>

      {/* vehículo actual */}
      <div className="mb-6">
        <div className="mb-2 h-4 w-28 rounded bg-[var(--surface-2)]" />
        <div className="h-28 rounded-[var(--r-surface)] border border-[var(--border)] bg-[var(--surface-2)]" />
      </div>

      {/* secciones */}
      {[0, 1].map((s) => (
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
