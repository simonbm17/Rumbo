import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCompanySettings } from "@/lib/settings";
import { Logo } from "@/components/landing/Logo";
import { LoginForm } from "./LoginForm";
import { displayAcceso } from "./fuente";

import "./login.css";

export const metadata = { title: "Ingresar" };

/**
 * ACCESO.
 *
 * Comparte el ADN de la portada —blanco, azul marino, naranja, la condensada de
 * marca— pero no la copia. La portada presenta y se mueve; acá la persona viene
 * a entrar, así que la pantalla está más quieta y el formulario manda.
 *
 * ── LO QUE SE MUESTRA Y LO QUE NO ───────────────────────────────────────────
 *
 * Solo hay correo y contraseña porque solo hay correo y contraseña. Rumbo no
 * tiene SSO, ni Google, ni Microsoft, ni enlace mágico, ni segundo factor, ni
 * registro público, ni recuperación de contraseña: buscado en el repositorio,
 * cero implementaciones. Dibujar cualquiera de esos botones sería prometer una
 * puerta que no existe.
 *
 * Tampoco hay sellos de seguridad. «Cifrado de nivel bancario» y compañía son
 * afirmaciones que nadie acreditó.
 *
 * ── LO QUE NO SE TOCA ───────────────────────────────────────────────────────
 *
 * Nada de autenticación. La misma `loginAction`, la misma sesión, la misma
 * limitación de intentos, el mismo redirigido a `/panel`, el mismo guardia que
 * manda acá a quien no tiene sesión. Esta fase es presentación.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getSession();
  if (session) redirect("/panel");

  const params = await searchParams;
  const notice =
    params.error === "inactivo"
      ? "Tu sesión ya no es válida. Ingresa de nuevo."
      : null;

  const company = await getCompanySettings();
  const anio = new Date().getFullYear();

  return (
    <div className={`lg ${displayAcceso.variable}`}>
      <div className="lg-reja">
        {/* ---------------------------- marca ---------------------- */}
        <section className="lg-marca" aria-label="Rumbo">
          <div className="lg-luz" aria-hidden />

          {/*
            El vehículo oficial, recortado por el canto del panel. No se
            reemplaza, no se espeja y no se deforma: solo se encuadra distinto
            que en la portada, donde va entero.
          */}
          <Image
            src="/landing/camion.webp"
            alt=""
            aria-hidden
            width={1400}
            height={872}
            priority
            sizes="(max-width: 1023px) 62vw, 44vw"
            className="lg-camion"
            data-paso="camion"
            style={{ "--paso": "160ms" } as React.CSSProperties}
          />

          <div className="lg-marca-cuerpo">
            {/*
              El logotipo oficial, y enlazado a la portada: quien llega acá por
              error tiene una salida evidente sin buscarla.
            */}
            <Link
              href="/"
              aria-label="Rumbo, ir al inicio"
              className="inline-flex min-h-11 items-center"
              data-paso="logo"
              style={{ "--paso": "40ms" } as React.CSSProperties}
            >
              <Logo variante="blanco" alto={30} prioridad />
            </Link>

            <p
              className="lg-eyebrow mt-8"
              data-paso="rotulo"
              style={{ "--paso": "120ms" } as React.CSSProperties}
            >
              Gestión de flotas
            </p>
            <p
              className="lg-display"
              data-paso="titular"
              style={{ "--paso": "180ms" } as React.CSSProperties}
            >
              Tu operación
              <br />
              empieza aquí.
            </p>
            <p
              className="lg-lead"
              data-paso="lead"
              style={{ "--paso": "260ms" } as React.CSSProperties}
            >
              Accede a Rumbo para gestionar vehículos, conductores, viajes,
              mantenimientos, documentos y alertas.
            </p>
          </div>

          <p className="lg-marca-pie">
            © {anio} {company.name}
          </p>
        </section>

        {/* --------------------------- acceso ---------------------- */}
        <main className="lg-acceso">
          <Link href="/" className="lg-volver">
            <ArrowLeft className="size-4" aria-hidden />
            Volver a Rumbo
          </Link>

          <div className="lg-formulario">
            <h1 className="lg-titulo">Ingresa a tu cuenta</h1>
            <p className="lg-sub">{company.name}</p>

            <div className="mt-8">
              <LoginForm notice={notice} />
            </div>
          </div>

          <p className="lg-legal">
            © {anio} {company.name}
          </p>
        </main>
      </div>
    </div>
  );
}
