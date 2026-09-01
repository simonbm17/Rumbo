import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El proyecto vive dentro de la carpeta del usuario, donde hay otros
  // package-lock.json. Fijamos la raíz para que Turbopack no los tome.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
