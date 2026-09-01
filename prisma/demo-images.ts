import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Imágenes de marcador de posición para la demo. Son color plano: los
 * degradados de fondo son el adorno típico de plantilla y acá no aportan
 * nada. El cliente reemplaza esto subiendo las fotos reales desde la ficha
 * de cada camión.
 */

const DEMO_DIR = path.join(process.cwd(), "public", "uploads", "demo");

/** Fondos sobrios y bien separados entre sí, con texto blanco legible encima. */
const COLORES = [
  "#1f3a63",
  "#1c4d43",
  "#6b4415",
  "#3d2a63",
  "#7a2a24",
  "#1b4a2c",
  "#31404f",
  "#14405c",
];

function truckSvg(plate: string, index: number) {
  const fondo = COLORES[index % COLORES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400" role="img" aria-label="Foto de ejemplo del camión ${plate}">
  <rect width="640" height="400" fill="${fondo}"/>
  <g transform="translate(96 128)" fill="#ffffff" opacity="0.94">
    <rect x="0" y="18" width="240" height="106" rx="10"/>
    <path d="M250 52h84l58 58v14h-142z"/>
    <circle cx="86" cy="140" r="27" fill="#101725"/>
    <circle cx="86" cy="140" r="12" fill="#ffffff"/>
    <circle cx="304" cy="140" r="27" fill="#101725"/>
    <circle cx="304" cy="140" r="12" fill="#ffffff"/>
    <rect x="262" y="62" width="46" height="32" rx="5" fill="${fondo}"/>
  </g>
  <rect x="96" y="298" width="180" height="46" rx="8" fill="#ffffff"/>
  <text x="186" y="329" font-family="Segoe UI, Arial, sans-serif" font-size="24"
        font-weight="700" fill="${fondo}" text-anchor="middle" letter-spacing="2">${plate}</text>
  <text x="544" y="376" font-family="Segoe UI, Arial, sans-serif" font-size="15"
        fill="#ffffff" opacity="0.8" text-anchor="end">FOTO DE EJEMPLO</text>
</svg>`;
}

function personSvg(initials: string, index: number) {
  const fondo = COLORES[(index + 3) % COLORES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="Foto de ejemplo">
  <rect width="240" height="240" fill="${fondo}"/>
  <text x="120" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="88"
        font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`;
}

export async function writeTruckImage(plate: string, index: number) {
  await mkdir(DEMO_DIR, { recursive: true });
  const file = `camion-${plate.toLowerCase()}.svg`;
  await writeFile(path.join(DEMO_DIR, file), truckSvg(plate, index), "utf8");
  return `/uploads/demo/${file}`;
}

export async function writePersonImage(initials: string, index: number) {
  await mkdir(DEMO_DIR, { recursive: true });
  const file = `persona-${initials.toLowerCase()}-${index}.svg`;
  await writeFile(path.join(DEMO_DIR, file), personSvg(initials, index), "utf8");
  return `/uploads/demo/${file}`;
}
