"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Rows3 } from "lucide-react";

/**
 * Fichas ⇄ tabla.
 *
 * Escribe la vista en la URL, así búsqueda, filtros y contexto sobreviven al
 * cambio y el enlace se puede compartir tal como está. No hay estado local: la
 * URL es la única fuente de verdad, igual que en el resto de los filtros.
 */
export function ViewToggle({ vista }: { vista: "fichas" | "tabla" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function cambiar(siguiente: "fichas" | "tabla") {
    const params = new URLSearchParams(searchParams.toString());
    if (siguiente === "fichas") params.delete("vista");
    else params.set("vista", siguiente);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div
      className="inline-flex overflow-hidden rounded-[var(--r-control)] border border-[var(--border-control)]"
      role="group"
      aria-label="Forma de ver la lista"
    >
      <Opcion
        activa={vista === "fichas"}
        onClick={() => cambiar("fichas")}
        icono={<LayoutGrid className="size-4" aria-hidden />}
        etiqueta="Fichas"
      />
      <span className="w-px bg-[var(--border-control)]" aria-hidden />
      <Opcion
        activa={vista === "tabla"}
        onClick={() => cambiar("tabla")}
        icono={<Rows3 className="size-4" aria-hidden />}
        etiqueta="Tabla"
      />
    </div>
  );
}

function Opcion({
  activa,
  onClick,
  icono,
  etiqueta,
}: {
  activa: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className="view-toggle-option inline-flex h-11 items-center gap-2 px-3.5 font-medium transition-colors focus-ring"
      data-activa={activa}
    >
      {icono}
      {/* La etiqueta se oculta en pantallas muy angostas, pero el nombre
          accesible del botón lo conserva. */}
      <span className="hidden sm:inline">{etiqueta}</span>
      <span className="sr-only sm:hidden">{etiqueta}</span>
    </button>
  );
}
