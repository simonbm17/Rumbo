"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

export type FilterDef = {
  /** Nombre del parámetro en la URL. */
  name: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * Buscador + filtros que escriben en la query string; el server component
 * vuelve a consultar la base ya filtrada.
 *
 * `chips` recibe el filtro principal y lo dibuja como botones siempre
 * visibles en vez de un desplegable: se ve de un vistazo qué opciones hay y
 * cuál está activa, y se cambia con un solo toque. Los desplegables esconden
 * las opciones detrás de un clic y de una lista que hay que leer.
 */
export function FilterBar({
  placeholder = "Buscar…",
  chips,
  filters = [],
  children,
}: {
  placeholder?: string;
  chips?: FilterDef;
  filters?: FilterDef[];
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const firstRender = useRef(true);

  function apply(next: URLSearchParams) {
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  // Búsqueda con retardo para no consultar en cada tecla.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (query) next.set("q", query);
      else next.delete("q");
      apply(next);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function setParam(name: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    apply(next);
  }

  const activeChip = chips ? (searchParams.get(chips.name) ?? "") : "";
  const hasFilters =
    query !== "" ||
    Boolean(activeChip) ||
    filters.some((f) => searchParams.get(f.name));

  function clearAll() {
    setQuery("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <div className="mb-5 flex flex-col gap-3 no-print">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[var(--icon-muted)]"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="input-base pl-11"
          />
          {pending && (
            <Loader2
              className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-[var(--text-muted)]"
              aria-hidden
            />
          )}
        </div>

        {filters.map((filter) => (
          <select
            key={filter.name}
            aria-label={filter.label}
            value={searchParams.get(filter.name) ?? ""}
            onChange={(e) => setParam(filter.name, e.target.value)}
            className="input-base w-auto min-w-[170px]"
          >
            <option value="">{filter.label}: todos</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {hasFilters && (
          <button
            onClick={clearAll}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-ring"
          >
            <X className="size-4" aria-hidden />
            Limpiar
          </button>
        )}

        {children && (
          <div className="ml-auto flex items-center gap-2">{children}</div>
        )}
      </div>

      {chips && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={chips.label}
        >
          <Chip
            active={activeChip === ""}
            onClick={() => setParam(chips.name, "")}
          >
            Todos
          </Chip>
          {chips.options.map((option) => (
            <Chip
              key={option.value}
              active={activeChip === option.value}
              onClick={() => setParam(chips.name, option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex h-11 items-center rounded-lg border px-4 font-medium transition-colors focus-ring"
      style={
        active
          ? {
              background: "var(--brand)",
              borderColor: "var(--brand)",
              color: "var(--brand-text)",
            }
          : {
              background: "var(--surface)",
              borderColor: "var(--border-control)",
              color: "var(--text)",
            }
      }
    >
      {children}
    </button>
  );
}
