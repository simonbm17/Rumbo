import { redirect } from "next/navigation";
import { Bell, Truck, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCompanySettings } from "@/lib/settings";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Ingresar" };

const PUNTOS = [
  { icon: Truck, texto: "Todos tus camiones con su foto y su placa" },
  { icon: Bell, texto: "Aviso antes de que se venza un documento" },
  { icon: Wallet, texto: "Cuánto deja cada camión y cada viaje" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getSession();
  if (session) redirect("/");

  const params = await searchParams;
  const notice =
    params.error === "inactivo"
      ? "Tu sesión ya no es válida. Ingresá de nuevo."
      : null;

  const company = await getCompanySettings();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      {/*
        Panel de marca en color plano. Antes tenía una mancha difuminada de
        degradado que no aportaba nada y es el adorno típico de plantilla.
      */}
      <div
        className="hidden flex-col justify-between p-12 lg:flex"
        style={{ background: "var(--nav-bg)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--nav-active)" }}
          >
            <Truck className="size-6" aria-hidden />
          </span>
          <span className="text-xl font-semibold text-white">Rumbo</span>
        </div>

        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight text-white text-balance">
            Toda tu flota, en una sola pantalla.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {PUNTOS.map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-start gap-3">
                <Icon
                  className="mt-0.5 size-5 shrink-0"
                  style={{ color: "var(--nav-text)" }}
                  aria-hidden
                />
                <span
                  className="text-lg"
                  style={{ color: "var(--nav-text)" }}
                >
                  {texto}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm" style={{ color: "var(--nav-text)" }}>
          © {new Date().getFullYear()} {company.name}
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span
              className="flex size-11 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--brand)" }}
            >
              <Truck className="size-6" aria-hidden />
            </span>
            <span className="text-xl font-semibold">Rumbo</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Ingresá a tu cuenta
          </h1>
          <p className="mt-2 text-lg text-[var(--text-muted)]">
            {company.name}
          </p>

          <div className="mt-8">
            <LoginForm notice={notice} />
          </div>
        </div>
      </div>
    </div>
  );
}
