/**
 * La placa del vehículo.
 *
 * Es el dato con el que la gente del transporte identifica un camión: no dicen
 * "el Kenworth", dicen "el WGR-482". Merece un tratamiento propio y no ser una
 * línea de texto más.
 *
 * En tamaño `lg` se dibuja como una chapa: monoespaciada, versalitas
 * espaciadas y un marco de 2px. Es una convención del dominio, no un adorno
 * inventado, y hace que el ojo la encuentre sin leer.
 *
 * En tamaño `sm` (tablas) se cae el marco a propósito: repetido en 300 filas
 * el recuadro sería ruido. Ahí alcanza con la monoespaciada y el espaciado.
 */
export function Plate({
  value,
  size = "sm",
  className = "",
}: {
  value: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  if (size === "lg") {
    return (
      <span
        className={`inline-flex items-center rounded-md border-2 border-[var(--text)] bg-[var(--surface)] px-2.5 py-1 font-mono text-lg font-semibold uppercase tracking-[0.12em] text-[var(--text)] ${className}`}
      >
        {value}
      </span>
    );
  }

  return (
    <span
      className={`font-mono font-medium uppercase tracking-[0.08em] ${className}`}
    >
      {value}
    </span>
  );
}
