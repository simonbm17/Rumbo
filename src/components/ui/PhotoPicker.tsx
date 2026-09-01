"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

/**
 * Selector de imagen con vista previa. Envía el archivo en `name` y, si el
 * usuario quitó la foto existente, un campo oculto `<name>__remove` = "1".
 */
export function PhotoPicker({
  name,
  currentUrl,
  label = "Foto",
  hint = "JPG, PNG o WebP. Máximo 5 MB.",
  shape = "wide",
}: {
  name: string;
  currentUrl?: string | null;
  label?: string;
  hint?: string;
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

  const frame =
    shape === "circle"
      ? "size-24 rounded-full"
      : "aspect-[16/10] w-full max-w-xs rounded-xl";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>

      <div className="flex items-center gap-4">
        <div
          className={`${frame} flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-[var(--border-control)] bg-[var(--surface-2)]`}
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
            <ImagePlus className="size-6 text-[var(--text-muted)]" />
          )}
        </div>

        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-8 items-center rounded-lg border border-[var(--border-control)] bg-[var(--surface)] px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)] focus-ring"
          >
            {preview ? "Cambiar" : "Subir imagen"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded px-1 text-sm text-[var(--tone-red-fg)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
            >
              <Trash2 className="size-3.5" />
              Quitar
            </button>
          )}
          <p className="text-sm text-[var(--text-muted)]">{hint}</p>
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
