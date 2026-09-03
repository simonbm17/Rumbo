import Link from "next/link";

/**
 * Raíz pública.
 *
 * Marcador de posición: esta migración solo cambia DÓNDE vive el Panel, y una
 * raíz que devuelve 404 dejaría el sitio roto entre un commit y el siguiente.
 * La landing se construye aparte y reemplaza este archivo entero.
 *
 * No lee la sesión ni consulta la base: es pública y estática a propósito.
 */
export const metadata = { title: "Rumbo" };

export default function PublicHome() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">Rumbo</h1>
      <p className="text-lg text-[var(--text-muted)]">
        Gestión de flota: vehículos, conductores, viajes, mantenimiento,
        documentos y gastos.
      </p>
      <p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-[var(--r-control)] bg-[var(--brand)] px-5 font-medium text-[var(--brand-text)] transition-colors hover:bg-[var(--brand-hover)] focus-ring"
        >
          Entrar a Rumbo
        </Link>
      </p>
    </main>
  );
}
