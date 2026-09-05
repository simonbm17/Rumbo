import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

/**
 * El 404 interno: lo que ve alguien que abre un registro que ya no existe.
 *
 * Esta pantalla es un componente de SERVIDOR, y eso condiciona cómo se le pone
 * estilo al botón. `buttonClass()` es una función normal, pero vive en un
 * módulo marcado `"use client"`: cruzando esa frontera lo que queda del otro
 * lado no es la función sino una referencia, y llamarla desde el servidor
 * revienta la petición entera. El resultado era que cualquier `notFound()` de
 * la aplicación terminaba mostrando «Algo salió mal» en vez de esta pantalla.
 *
 * `LinkButton` es la forma correcta de cruzar: un componente cliente se
 * RENDERIZA desde el servidor sin problema, y es lo que ya hacen el resto de
 * las pantallas de la aplicación. Las clases que produce son exactamente las
 * mismas, así que el diseño no cambia.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
        <SearchX className="size-7" />
      </span>
      <div>
        <h1 className="text-xl font-semibold">No encontramos esa página</h1>
        <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
          El registro que buscas pudo haberse eliminado o el enlace no es
          correcto.
        </p>
      </div>
      <LinkButton href="/panel">Volver al panel</LinkButton>
    </div>
  );
}
