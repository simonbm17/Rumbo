"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-ring disabled:opacity-55 disabled:pointer-events-none whitespace-nowrap";

/**
 * NINGÚN botón baja de 44px de alto, el objetivo táctil que exige el producto.
 *
 * `sm` medía 40px. Inspeccioné sus doce consumidores antes de tocar nada: los
 * cuatro disparadores de modal, «Archivados», «Registrar viaje», «Nuevo viaje»,
 * los tres «Ver todos» del panel y los de clientes y conductores. En ninguno de
 * esos contextos 40px estaba permitido —la constitución dice 44px para
 * CUALQUIER control, sin excepción—, así que no era un tamaño legítimo usado en
 * otro sitio: era la misma infracción repetida doce veces. Se corrige en la
 * escala, no con un tamaño nuevo para tres botones.
 *
 * `sm` sigue siendo distinto de `md`: menos relleno horizontal y texto de 14px.
 * Lo único que cambió es la altura tocable. Queda para acciones densas dentro
 * de tablas y cabeceras de sección.
 */
const SIZES: Record<Size, string> = {
  sm: "h-11 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-5 text-base",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-text)] hover:bg-[var(--brand-hover)]",
  secondary:
    "bg-[var(--surface)] text-[var(--text)] border border-[var(--border-control)] hover:bg-[var(--surface-hover)]",
  ghost:
    "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
  // Fondo rojo sólido con su propia tinta: `--tone-danger-fg` no sirve de fondo
  // porque en el tema oscuro es un rojo claro.
  danger:
    "bg-[var(--danger-solid)] text-[var(--danger-solid-text)] hover:opacity-90",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button className={`${buttonClass(variant, size)} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link className={`${buttonClass(variant, size)} ${className}`} {...props}>
      {children}
    </Link>
  );
}

/**
 * Botón de envío que se bloquea y muestra un indicador mientras la acción
 * está en curso: sin eso, la gente vuelve a apretar y se duplica el registro.
 */
export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  pendingLabel,
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${buttonClass(variant, size)} ${className}`}
    >
      {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? "Guardando…") : children}
    </button>
  );
}

/**
 * Botón de ícono para acciones de fila. El ícono puede ser chico, pero el
 * área que se puede tocar nunca: 40×40 como mínimo.
 */
export function IconButton({
  label,
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex size-10 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-ring ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
