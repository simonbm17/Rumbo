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

function vehiculoSvg(seed: number) {
  const e = ESCENAS[seed % ESCENAS.length];
  const f = ENCUADRES[seed % ENCUADRES.length];
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

function personSvg(initials: string, index: number) {
  const e = ESCENAS[(index + 3) % ESCENAS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="Foto de ejemplo">
  <rect width="240" height="240" fill="${e.cuerpo}"/>
  <text x="120" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="88"
        font-weight="600" fill="${e.cielo}" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`;
}

export async function writeTruckImage(plate: string, index: number) {
  await mkdir(DEMO_DIR, { recursive: true });
  const file = `camion-${plate.toLowerCase()}.svg`;
  await writeFile(path.join(DEMO_DIR, file), vehiculoSvg(index), "utf8");
  return `/uploads/demo/${file}`;
}

export async function writePersonImage(initials: string, index: number) {
  await mkdir(DEMO_DIR, { recursive: true });
  const file = `persona-${initials.toLowerCase()}-${index}.svg`;
  await writeFile(path.join(DEMO_DIR, file), personSvg(initials, index), "utf8");
  return `/uploads/demo/${file}`;
}
