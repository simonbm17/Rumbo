const LOCALE = "es-CO";
const CURRENCY = "COP";

/** Redondea a 2 decimales para evitar el arrastre de coma flotante al sumar. */
export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sum(values: number[]) {
  return round2(values.reduce((acc, v) => acc + (v || 0), 0));
}

export function money(value: number | null | undefined, compact = false) {
  const n = value ?? 0;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
    notation: compact && Math.abs(n) >= 1_000_000 ? "compact" : "standard",
  }).format(n);
}

export function number(value: number | null | undefined, decimals = 0) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0);
}

export function km(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${number(value)} km`;
}

export function percent(value: number | null | undefined, decimals = 1) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "—";
  return `${number(value, decimals)}%`;
}

const DATE_FMT = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DATETIME_FMT = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function date(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FMT.format(d);
}

export function dateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_FMT.format(d);
}

/** Días entre hoy y una fecha. Negativo = ya venció. */
export function daysUntil(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  const today = new Date();
  const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const b = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  return Math.round((a - b) / 86_400_000);
}

export function relativeDays(days: number) {
  if (days === 0) return "vence hoy";
  if (days === 1) return "vence mañana";
  if (days > 1) return `en ${days} días`;
  if (days === -1) return "venció ayer";
  return `venció hace ${Math.abs(days)} días`;
}

/** Valor de un <input type="date"> a partir de una fecha. */
export function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Valor de un <input type="datetime-local"> en horario local. */
export function toDateTimeInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

/** Nombre del mes en curso, para los rótulos de las tarjetas. */
export function startOfMonthLabel(value: Date = new Date()) {
  const label = new Intl.DateTimeFormat(LOCALE, { month: "long" }).format(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function initials(...parts: (string | null | undefined)[]) {
  return parts
    .filter(Boolean)
    .map((p) => p!.trim()[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`.trim();
}
