import type { CSSProperties, ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      {/*
        Sin `text-sm` acá: el contenido de la tabla hereda los 16px del cuerpo.
        Un dato en una tabla se lee igual de seguido que un párrafo, y bajarlo
        a 14px "porque es una tabla" es justo lo que vuelve ilegible este tipo
        de pantalla. El ancho mínimo empuja el scroll horizontal en celulares,
        que es el precio correcto a pagar.
      */}
      <table className="w-full min-w-[820px] border-collapse">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
      {children}
    </thead>
  );
}

export function TH({
  children,
  align = "left",
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-[var(--border)]">{children}</tbody>
  );
}

export function TR({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={`transition-colors hover:bg-[var(--surface-hover)] ${className}`}>
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = "left",
  className = "",
  colSpan,
  style,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  colSpan?: number;
  style?: CSSProperties;
}) {
  return (
    <td
      colSpan={colSpan}
      style={style}
      className={`px-4 py-3 align-middle ${
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
