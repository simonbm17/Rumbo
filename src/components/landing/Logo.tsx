import Image from "next/image";

/**
 * EL LOGOTIPO OFICIAL, TAL CUAL.
 *
 * Es el archivo que entregó el cliente, recortado solo en su margen
 * transparente y reescalado. No se redibuja, no se recompone con texto CSS y no
 * va dentro de un cuadrado.
 *
 * La variante blanca conserva EXACTAMENTE la misma geometría: se generó desde
 * el mismo archivo cambiando únicamente el color de las formas azul marino, que
 * sobre azul marino no se ven. El naranja del símbolo se mantiene.
 */
export function Logo({
  variante = "color",
  alto = 30,
  prioridad = false,
  className = "",
}: {
  variante?: "color" | "blanco";
  /** Alto en píxeles; el ancho se deduce de la proporción del archivo. */
  alto?: number;
  prioridad?: boolean;
  className?: string;
}) {
  // Proporción real del archivo recortado: 640 × 100.
  const ancho = Math.round((alto * 640) / 100);
  const src =
    variante === "blanco"
      ? "/brand/rumbo-logo-blanco.webp"
      : "/brand/rumbo-logo.webp";

  return (
    <Image
      src={src}
      alt="Rumbo"
      width={ancho}
      height={alto}
      priority={prioridad}
      className={className}
      style={{ height: alto, width: "auto" }}
    />
  );
}
