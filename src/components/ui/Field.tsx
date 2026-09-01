import type { ComponentProps, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="font-semibold text-[var(--text)]">
        {label}
        {required && (
          <>
            {" "}
            <span className="font-normal text-[var(--text-muted)]">
              (obligatorio)
            </span>
          </>
        )}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--tone-danger-fg)]">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`input-base ${className}`} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea rows={3} className={`input-base resize-y ${className}`} {...props} />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select className={`input-base ${className}`} {...props}>
      {children}
    </select>
  );
}

/**
 * Error devuelto por una server action. Lleva ícono además de color porque el
 * color solo no alcanza para quien no distingue rojo y verde.
 */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg px-4 py-3 font-medium"
      style={{ background: "var(--tone-danger-bg)", color: "var(--tone-danger-fg)" }}
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
