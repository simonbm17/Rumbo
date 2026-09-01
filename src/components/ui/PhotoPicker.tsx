"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

/**
 * Selector de imagen con vista previa. Envía el archivo en `name` y, si el
 * usuario quitó la foto existente, un campo oculto `<name>__remove` = "1".
 * Esos dos nombres son contrato con la server action: no cambiarlos.
 *
 * La vista previa ancha usa 3:2, el mismo recorte que la ventana de la ficha.
 * Antes era 16:10 y mostraba una foto que después se veía distinta en la lista;
 * si el recorte de la previa no es el recorte real, la previa engaña.
 *
 * La instrucción de encuadre está ahí porque la calidad de esta pantalla
 * depende de fotos que todavía no existen: las toma alguien en un patio, con el
 * teléfono, sin que nadie le haya dicho cómo. Decirlo una vez, en el momento de
 * subir, es más barato que corregir la biblioteca después.
 */
export function PhotoPicker({
  name,
  currentUrl,
  label = "Foto",
  hint = "JPG, PNG o WebP. Máximo 5 MB.",
  guide,
  shape = "wide",
}: {
  name: string;
  currentUrl?: string | null;
  label?: string;
  hint?: string;
  /** Cómo tomar la foto. Solo donde el encuadre importa. */
  guide?: string;
  shape?: "wide" | "circle";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setPreview(url);
    setRemoved(false);
  }

  function onClear() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setPreview(null);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  const esRedonda = shape === "circle";
  const frame = esRedonda
    ? "size-24 rounded-full"
    : "aspect-[3/2] w-full max-w-xs rounded-[var(--r-surface)]";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className={`${frame} relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-[var(--border-control)] bg-[var(--surface-2)]`}
        >
          {preview ? (
            // Vista previa local (blob:) o archivo ya subido; <img> evita que
            // next/image intente optimizar una URL temporal.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Vista previa"
              className="size-full object-cover"
            />
          ) : (
            <ImagePlus className="size-6 text-[var(--icon-muted)]" aria-hidden />
          )}

          {/*
            Guía de encuadre: tercios sobre la previa, solo cuando ya hay foto.
            Es una ayuda para ver si el vehículo quedó centrado y completo, no un
            adorno; por eso desaparece cuando no hay nada que encuadrar.
          */}
          {preview && !esRedonda && (
            <span
              className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3"
              aria-hidden
            >
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="border border-white/25" />
              ))}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--r-control)] border border-[var(--border-control)] bg-[var(--surface)] px-4 font-medium transition-colors hover:bg-[var(--surface-hover)] focus-ring"
          >
            <ImagePlus className="size-5" aria-hidden />
            {preview ? "Cambiar foto" : "Subir foto"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-11 items-center gap-1.5 rounded-[var(--r-control)] px-1 text-[var(--tone-danger-fg)] underline decoration-2 underline-offset-4 focus-ring"
            >
              <Trash2 className="size-4" aria-hidden />
              Quitar foto
            </button>
          )}
          {guide && (
            <p className="max-w-xs text-sm text-[var(--text)]">{guide}</p>
          )}
          <p className="max-w-xs text-sm text-[var(--text-muted)]">{hint}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={onPick}
        className="hidden"
      />
      {removed && <input type="hidden" name={`${name}__remove`} value="1" />}
    </div>
  );
}
