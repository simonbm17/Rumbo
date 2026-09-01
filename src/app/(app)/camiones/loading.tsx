/**
 * Esqueleto con la forma real del contenido: franja de estado, filtros y una
 * grilla de fichas. Un indicador girando en el centro no dice nada; esto
 * anticipa la estructura y evita el salto al llegar los datos.
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-9 w-56 rounded bg-[var(--surface-2)]" />
      <div className="mb-3 h-1.5 rounded-full bg-[var(--surface-2)]" />
      <div className="mb-6 flex gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-28 rounded bg-[var(--surface-2)]" />
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="h-11 w-72 rounded bg-[var(--surface-2)]" />
        <div className="h-11 w-44 rounded bg-[var(--surface-2)]" />
        <div className="h-11 w-32 rounded bg-[var(--surface-2)]" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[3/2] bg-[var(--surface-2)]" />
            <div className="flex flex-col gap-3 p-4">
              <div className="h-7 w-32 rounded bg-[var(--surface-2)]" />
              <div className="h-4 w-44 rounded bg-[var(--surface-2)]" />
              <div className="h-4 w-full rounded bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
