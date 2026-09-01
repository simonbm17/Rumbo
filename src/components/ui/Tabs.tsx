import Link from "next/link";

export type TabDef = {
  /** Valor del parámetro `tab` en la URL. Vacío = pestaña por defecto. */
  key: string;
  label: string;
  count?: number;
};

/**
 * Pestañas resueltas en el servidor: cada una es un link con `?tab=`, así el
 * contenido se consulta ya filtrado y la URL se puede compartir.
 */
export function Tabs({
  tabs,
  active,
  basePath,
}: {
  tabs: TabDef[];
  active: string;
  basePath: string;
}) {
  return (
    <div className="mb-5 overflow-x-auto border-b border-[var(--border)] no-print">
      <nav className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          const href = tab.key ? `${basePath}?tab=${tab.key}` : basePath;
          return (
            <Link
              key={tab.key || "default"}
              href={href}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className="relative flex items-center gap-2 whitespace-nowrap rounded-t-lg px-3.5 py-2.5 text-sm font-medium transition-colors focus-ring"
              style={{
                color: isActive ? "var(--brand)" : "var(--text-muted)",
                boxShadow: isActive ? "inset 0 -2px 0 var(--brand)" : "none",
              }}
            >
              {tab.label}
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-sm font-semibold"
                  style={{
                    background: isActive
                      ? "var(--brand-soft)"
                      : "var(--surface-2)",
                    color: isActive ? "var(--brand)" : "var(--text-muted)",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
