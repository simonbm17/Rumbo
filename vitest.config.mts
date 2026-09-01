import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Se carga antes de que Vitest resuelva nada, para que `lib/prisma.ts` vea la
// URL de la base de pruebas en el momento de crear el cliente.
loadEnv({ path: ".env.test", override: true });

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    // Las pruebas de integración comparten una única base: si corrieran en
    // paralelo se borrarían las tablas entre sí a mitad de camino.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL!,
      AUTH_SECRET: process.env.AUTH_SECRET!,
      NODE_ENV: "test",
    },
  },
  resolve: {
    /*
      `server-only` es un paquete centinela: su entrada por defecto lanza un
      error a propósito para que un componente de cliente no pueda importar
      código de servidor. Fuera de Next no hay quien active la condición
      `react-server`, así que las pruebas lo resuelven a la entrada vacía que
      el propio paquete provee para ese caso.
    */
    alias: {
      "server-only": path.resolve(
        import.meta.dirname,
        "node_modules/server-only/empty.js"
      ),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
