/**
 * La placa del vehículo. Es el nombre propio del activo: nadie dice «el
 * Kenworth», dicen «el WGR-482».
 *
 * SOBRE EL SEPARADOR — corrijo mi propia propuesta.
 * Había propuesto un punto medio (WGR·482). Es peor: nadie escribe así. La
 * placa se guarda, se busca y se teclea con guion, y transformar el dato para
 * que se vea mejor crea una diferencia entre lo que la persona busca y lo que
 * ve. El componente da énfasis tipográfico; no reescribe el dato.
 *
 * SOBRE EL COLOR — no lleva.
 * Las placas colombianas son amarillas para particular y blancas para servicio
 * público. Cualquiera de las dos chocaría con las cuatro señales semánticas.
 * La fuerza de la placa es tipográfica: monoespaciada, versalitas, espaciado
 * amplio y glifos inequívocos —el 0 de Plex Mono lleva barra, así que no se
 * confunde con la O.
 *
 * Una sola representación oficial: la placa NUNCA se superpone a la fotografía.
 */

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  // Tablas y listas densas: sin marco, el recuadro repetido en 300 filas es ruido.
  sm: "text-base tracking-[0.1em]",
  // Ficha de vehículo.
  md: "text-xl tracking-[0.12em]",
  // Encabezado de detalle.
  lg: "text-3xl tracking-[0.1em]",
};

export function Plate({
  value,
  size = "md",
  framed,
  className = "",
}: {
  value: string;
  size?: Size;
  /** El marco se justifica a partir de `md`; por debajo es ruido. */
  framed?: boolean;
  className?: string;
}) {
  const conMarco = framed ?? size !== "sm";

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap font-mono font-semibold uppercase text-[var(--text)] ${
        SIZES[size]
      } ${
        conMarco
          ? "rounded-[var(--r-control)] border-2 border-[var(--text)] px-2.5 py-0.5"
          : ""
      } ${className}`}
    >
      {value}
    </span>
  );
}
