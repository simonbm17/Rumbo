import { money, percent } from "@/lib/format";

/**
 * Desglose en barras horizontales. Se renderiza en el servidor: no necesita
 * una librería de gráficos y no bloquea la hidratación.
 */
export function CategoryBreakdown({
  items,
  emptyLabel = "Sin datos en el periodo seleccionado.",
}: {
  items: { label: string; value: number }[];
  emptyLabel?: string;
}) {
  const total = items.reduce((acc, item) => acc + item.value, 0);

  if (total <= 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--text-muted)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const share = (item.value / total) * 100;
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {item.label}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-[var(--text-muted)]">
                {money(item.value, true)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full"
                style={{ background: "var(--surface-2)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(share, 1.5)}%`,
                    background: "var(--brand)",
                  }}
                />
              </div>
              <span className="w-11 shrink-0 text-right text-sm tabular-nums text-[var(--text-muted)]">
                {percent(share, 0)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
