import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Imágenes de ejemplo para la demo. El cliente las reemplaza subiendo las
 * fotos reales desde la ficha de cada vehículo.
 *
 * Estas imágenes NO llevan la placa dibujada. La placa tiene una sola
 * representación oficial y vive en la lectura de la ficha; repetirla dentro de
 * la foto crea dos versiones del mismo dato, con dos contrastes distintos y dos
 * tipografías distintas.
 *
 * Tampoco son un ícono plano de camión. Una demo tiene que fallar donde falla
 * la realidad: por eso los fondos van de muy claros a muy oscuros y el vehículo
 * no siempre está centrado. Así el velo del pie de la ventana, el texto blanco
 * del estado y el encuadre 3:2 se prueban contra el caso difícil, no contra un
 * fondo cómodo elegido a propósito.
 */

const DEMO_DIR = path.join(process.cwd(), "public", "uploads", "demo");

/**
 * Cada escena es cielo + suelo + silueta. La luminancia del cielo es lo que
 * decide si el estado en blanco se lee: hay tres claras a propósito.
 */
const ESCENAS = [
  { cielo: "#dfe6ec", suelo: "#a9b3bd", cuerpo: "#2c3a4b", claro: true },
  { cielo: "#1d2a3a", suelo: "#131c27", cuerpo: "#c3ccd6", claro: false },
  { cielo: "#eceee9", suelo: "#c2c3b8", cuerpo: "#7d4a2a", claro: true },
  { cielo: "#2a3f3c", suelo: "#1a2a28", cuerpo: "#d7d2c4", claro: false },
  { cielo: "#f0ece3", suelo: "#cdc4b2", cuerpo: "#40506a", claro: true },
  { cielo: "#3b2f2a", suelo: "#241d1a", cuerpo: "#cfa46b", claro: false },
  { cielo: "#c9d6de", suelo: "#8f9aa4", cuerpo: "#1f2b38", claro: true },
  { cielo: "#22303f", suelo: "#161f2a", cuerpo: "#9fb0c0", claro: false },
];

/** Encuadres reales: el vehículo rara vez cae centrado y a la misma distancia. */
const ENCUADRES = [
  { x: 118, escala: 1 },
  { x: 60, escala: 1.12 },
  { x: 196, escala: 0.88 },
  { x: 96, escala: 1.05 },
];

/**
 * QUÉ ASPECTO TIENE CADA VEHÍCULO DE LA DEMO, POR PLACA.
 *
 * Antes esto se decidía con la posición del vehículo dentro del array `TRUCKS`
 * del seed. Esa posición no es una identidad: basta reordenar la lista, o
 * insertar un vehículo en medio, para que a cada uno le toque otra escena y los
 * cinco archivos versionados cambien sin que nadie lo haya pedido. Fue
 * exactamente lo que pasó, y por eso `npm run db:seed` dejaba el árbol sucio.
 *
 * La placa sí es identidad: es única, es estable y es la que da nombre al
 * archivo. Los valores de esta tabla son los de los SVG ya aprobados en
 * Vehículos V1; no se eligieron ahora, se leyeron de ellos.
 *
 * Estar o no estar en la tabla es también lo que decide quién tiene foto:
 * LMN-587 no aparece a propósito. Un cliente real siempre tiene algún vehículo
 * recién comprado que nadie alcanzó a fotografiar, y la demo tiene que
 * enseñarlo. Antes ese caso era «el último del array», que se mueve solo.
 */
const VEHICULOS_DEMO: Record<string, { escena: number; encuadre: number }> = {
  "JHR-256": { escena: 0, encuadre: 0 },
  "PFT-940": { escena: 2, encuadre: 2 },
  "SKD-119": { escena: 3, encuadre: 3 },
  "TQM-703": { escena: 4, encuadre: 0 },
  "WGR-482": { escena: 5, encuadre: 1 },
};

/**
 * LOS AVATARES, POR DOCUMENTO DE IDENTIDAD.
 *
 * Fondo saturado y oscuro con las iniciales en blanco. No sale de `ESCENAS`:
 * aquélla es la paleta de las fotografías de vehículo —cielo, suelo, carrocería
 * — y usarla acá teñía los avatares de otro color cada vez que se tocaba una
 * escena. Son dos cosas distintas y ahora tienen dos paletas distintas.
 *
 * `orden` es el sufijo del nombre del archivo (`persona-cr-0.svg`). Está
 * declarado, no contado: así renombrar o reordenar conductores no rebautiza
 * ficheros ya versionados.
 */
const AVATARES_DEMO: Record<string, { orden: number; fondo: string }> = {
  "79452103": { orden: 0, fondo: "#3d2a63" }, // Carlos Ramírez
  "1023456789": { orden: 1, fondo: "#7a2a24" }, // Jorge Peña
  "80345612": { orden: 2, fondo: "#1b4a2c" }, // Miguel Salazar
  "1098765432": { orden: 3, fondo: "#31404f" }, // Andrés Gutiérrez
  "94120356": { orden: 4, fondo: "#14405c" }, // Luis Moreno
};

function vehiculoSvg(escena: number, encuadre: number) {
  const e = ESCENAS[escena];
  const f = ENCUADRES[encuadre];
  const sombra = e.claro ? "#000000" : "#000000";
  const vidrio = e.claro ? "#8ea3b8" : "#4a5a6b";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600" role="img" aria-label="Fotografía de ejemplo de un vehículo">
  <rect width="900" height="600" fill="${e.cielo}"/>
  <rect y="404" width="900" height="196" fill="${e.suelo}"/>
  <rect y="400" width="900" height="4" fill="${e.suelo}" opacity="0.6"/>
  <g transform="translate(${f.x} ${430 - 210 * f.escala}) scale(${f.escala})">
    <ellipse cx="300" cy="214" rx="290" ry="16" fill="${sombra}" opacity="0.18"/>
    <rect x="18" y="46" width="330" height="152" rx="6" fill="${e.cuerpo}"/>
    <path d="M356 96h108l72 68v34H356z" fill="${e.cuerpo}"/>
    <rect x="384" y="106" width="62" height="44" rx="4" fill="${vidrio}"/>
    <rect x="18" y="188" width="518" height="14" fill="${sombra}" opacity="0.28"/>
    <circle cx="118" cy="200" r="34" fill="#12181f"/>
    <circle cx="118" cy="200" r="14" fill="${e.cuerpo}" opacity="0.75"/>
    <circle cx="436" cy="200" r="34" fill="#12181f"/>
    <circle cx="436" cy="200" r="14" fill="${e.cuerpo}" opacity="0.75"/>
  </g>
  <text x="864" y="566" font-family="Segoe UI, Arial, sans-serif" font-size="19"
        fill="${e.claro ? "#2b3542" : "#ffffff"}" opacity="0.62" text-anchor="end">FOTO DE EJEMPLO</text>
</svg>`;
}

function personSvg(initials: string, fondo: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="Foto de ejemplo">
  <rect width="240" height="240" fill="${fondo}"/>
  <text x="120" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="88"
        font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`;
}

/**
 * Escribe la foto de ejemplo del vehículo y devuelve su URL, o `null` si esa
 * placa no tiene foto en la demo. Depende solo de la placa: la misma placa da
 * siempre el mismo archivo con los mismos bytes.
 */
export async function writeTruckImage(plate: string) {
  const demo = VEHICULOS_DEMO[plate];
  if (!demo) return null;

  await mkdir(DEMO_DIR, { recursive: true });
  const file = `camion-${plate.toLowerCase()}.svg`;
  const svg = vehiculoSvg(demo.escena, demo.encuadre);
  await writeFile(path.join(DEMO_DIR, file), svg, "utf8");
  return `/uploads/demo/${file}`;
}

/**
 * Igual para el avatar, atado al documento de identidad del conductor. Sin
 * entrada en el manifiesto no hay avatar: la persona se identifica por sus
 * iniciales, que es lo que ya hace la interfaz cuando no hay foto.
 */
export async function writePersonImage(documentId: string, initials: string) {
  const demo = AVATARES_DEMO[documentId];
  if (!demo) return null;

  await mkdir(DEMO_DIR, { recursive: true });
  const file = `persona-${initials.toLowerCase()}-${demo.orden}.svg`;
  await writeFile(path.join(DEMO_DIR, file), personSvg(initials, demo.fondo), "utf8");
  return `/uploads/demo/${file}`;
}
