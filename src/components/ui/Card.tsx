import type { ReactNode } from "react";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 text-[var(--icon-muted)]" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
          {description && (
            <p className="mt-1 max-w-prose text-[var(--text-muted)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0 no-print">{action}</div>}
    </div>
  );
}

export function CardBody({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`px-5 py-5 ${className}`}>{children}</div>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      {icon && (
        <div
          className="flex size-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--icon-muted)]"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div>
        <p className="text-lg font-semibold text-[var(--text)]">{title}</p>
        {description && (
          <p className="mx-auto mt-1.5 max-w-md text-[var(--text-muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Par etiqueta/valor para las fichas de detalle. */
export function DataItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-medium text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-[var(--text)]">
        {children}
      </dd>
    </div>
  );
}
