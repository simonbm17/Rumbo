import {
  Banknote,
  FileWarning,
  Gauge,
  Settings,
  Truck,
  Users,
  Building2,
  Wrench,
  Route,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Truck;
  /** Solo visible para administradores. */
  adminOnly?: boolean;
  /** Muestra el contador de alertas. */
  badge?: "alerts";
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    title: "Operación",
    items: [
      { href: "/", label: "Panel", icon: Gauge },
      { href: "/camiones", label: "Vehículos", icon: Truck },
      { href: "/viajes", label: "Viajes", icon: Route },
      { href: "/conductores", label: "Conductores", icon: Users },
      { href: "/clientes", label: "Clientes", icon: Building2 },
    ],
  },
  {
    title: "Control",
    items: [
      { href: "/mantenimiento", label: "Mantenimiento", icon: Wrench },
      { href: "/gastos", label: "Gastos", icon: Banknote },
      {
        href: "/documentos",
        label: "Documentos",
        icon: FileWarning,
        badge: "alerts",
      },
      { href: "/reportes", label: "Reportes", icon: BarChart3 },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/usuarios", label: "Usuarios", icon: ShieldCheck, adminOnly: true },
      { href: "/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
    ],
  },
];

/** Marca activo el ítem cuya ruta coincide o es prefijo de la actual. */
export function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
