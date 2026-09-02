/** Esqueleto con la forma real del listado: cabecera, filtros y filas. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-9 w-52 rounded bg-[var(--surface-2)]" />
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="h-11 w-72 rounded bg-[var(--surface-2)]" />
        <div className="h-11 w-44 rounded bg-[var(--surface-2)]" />
      </div>
      <div className="mb-4 h-7 w-32 rounded bg-[var(--surface-2)]" />
      <div className="overflow-hidden rounded-[var(--r-surface)] border border-[var(--border)]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0"
          >
            <div className="size-11 shrink-0 rounded-full bg-[var(--surface-2)]" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-5 w-48 max-w-full rounded bg-[var(--surface-2)]" />
              <div className="h-4 w-64 max-w-full rounded bg-[var(--surface-2)]" />
            </div>
            <div className="hidden h-8 w-40 shrink-0 rounded bg-[var(--surface-2)] md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
