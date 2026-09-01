"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Moon, Sun, Truck as TruckIcon, X } from "lucide-react";
import { NAV, isActive } from "./nav";
import type { Role } from "@/generated/prisma/enums";
import { ROLE } from "@/lib/labels";
import { initials } from "@/lib/format";

type Props = {
  user: { name: string; email: string; role: Role };
  companyName: string;
  alertCount: number;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

export function Shell({
  user,
  companyName,
  alertCount,
  logoutAction,
  children,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="flex min-h-dvh">
      {open && (
        <div
          className="fixed inset-0 z-[var(--z-backdrop)] bg-black/55 lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      {/*
        El desplazamiento vive en globals.css (.app-nav) y no en clases
        `translate-x-*`: dos utilidades de la misma familia compiten por el
        orden del CSS generado, no por el orden en el atributo class.
      */}
      <aside
        data-open={open}
        className="app-nav fixed inset-y-0 left-0 z-[var(--z-drawer)] flex w-72 flex-col border-r"
        style={{
          background: "var(--nav-bg)",
          borderColor: "var(--nav-border)",
        }}
      >
        <div
          className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4"
          style={{ borderColor: "var(--nav-border)" }}
        >
          <Link
            href="/"
            onClick={close}
            className="flex min-w-0 items-center gap-3 rounded-lg focus-ring"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--nav-active)" }}
            >
              <TruckIcon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 truncate text-lg font-semibold text-white">
              {companyName}
            </span>
          </Link>
          <button
            onClick={close}
            className="flex size-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white lg:hidden focus-ring"
            aria-label="Cerrar menú"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV.map((group) => {
            const items = group.items.filter(
              (item) => !item.adminOnly || user.role === "ADMIN"
            );
            if (items.length === 0) return null;
            return (
              <div key={group.title}>
                <p
                  className="mb-2 px-3 text-sm font-semibold"
                  style={{ color: "var(--nav-text)" }}
                >
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const active = isActive(item.href, pathname);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={close}
                          aria-current={active ? "page" : undefined}
                          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors focus-ring"
                          style={{
                            background: active
                              ? "var(--nav-active)"
                              : "transparent",
                            color: active
                              ? "var(--nav-text-active)"
                              : "var(--nav-text)",
                          }}
                        >
                          <Icon className="size-5 shrink-0" aria-hidden />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge === "alerts" && alertCount > 0 && (
                            <span
                              className="min-w-6 rounded-full px-2 py-0.5 text-center text-sm font-bold"
                              style={{
                                background: "var(--danger-solid)",
                                color: "var(--danger-solid-text)",
                              }}
                            >
                              {alertCount > 99 ? "99+" : alertCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div
          className="shrink-0 border-t p-3"
          style={{ borderColor: "var(--nav-border)" }}
        >
          <div className="flex items-center gap-3 px-2 py-1.5">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "var(--nav-hover)" }}
              aria-hidden
            >
              {initials(...user.name.split(" "))}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{user.name}</p>
              <p className="truncate text-sm" style={{ color: "var(--nav-text)" }}>
                {ROLE[user.role].label}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="flex size-10 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-ring"
              >
                <LogOut className="size-5" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        {/*
          Barra superior opaca. Antes era translúcida con desenfoque: el texto
          que pasaba por debajo se leía a través y bajaba el contraste.
        */}
        <header className="sticky top-0 z-[var(--z-sticky)] flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 no-print sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="flex size-11 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] lg:hidden focus-ring"
            aria-label="Abrir menú"
          >
            <Menu className="size-6" aria-hidden />
          </button>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * El tema vive en `document.documentElement.dataset.theme`, que el script del
 * layout fija antes del primer pintado. No lo duplicamos en estado de React:
 * qué ícono se ve lo decide el CSS, así no hay parpadeo ni desajuste de
 * hidratación entre el servidor y el navegador.
 */
function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("rumbo-theme", next);
    } catch {
      // Modo privado o almacenamiento bloqueado: el tema dura la sesión.
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border-control)] px-3 font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-ring"
      aria-label="Cambiar entre tema claro y oscuro"
    >
      <Moon className="size-5 theme-when-light" aria-hidden />
      <Sun className="size-5 theme-when-dark" aria-hidden />
      <span className="theme-when-light">Modo oscuro</span>
      <span className="theme-when-dark">Modo claro</span>
    </button>
  );
}
