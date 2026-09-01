import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { ALERT_LABEL, ALERT_TONE, type Alert } from "@/lib/alerts";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { relativeDays } from "@/lib/format";

export function AlertList({
  alerts,
  limit,
}: {
  alerts: Alert[];
  limit?: number;
}) {
  const items = limit ? alerts.slice(0, limit) : alerts;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-6" />}
        title="Todo al día"
        description="No hay documentos ni mantenimientos por vencer en los próximos 30 días."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {items.map((alert) => (
        <li key={alert.id}>
          <Link
            href={alert.href}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-[var(--surface-hover)] focus-ring"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[var(--text)]">
                {alert.title}
              </span>
              {/*
                El plazo va en el texto además del color de la etiqueta: quien
                no distingue rojo de ámbar tiene que poder entender la urgencia
                igual, y "venció hace 9 días" es más claro que un tono.
              */}
              <span className="block text-[var(--text-muted)]">
                {relativeDays(alert.days)} · {alert.detail}
              </span>
            </span>
            <Badge tone={ALERT_TONE[alert.level]} dot>
              {ALERT_LABEL[alert.level]}
            </Badge>
            <ChevronRight
              className="size-5 shrink-0 text-[var(--icon-muted)]"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
