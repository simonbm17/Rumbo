import type {
  CargoStatus,
  CargoUnit,
  DocumentType,
  DriverStatus,
  ExpenseCategory,
  MaintenanceStatus,
  MaintenanceType,
  Role,
  TripStatus,
  TruckKind,
  TruckStatus,
} from "@/generated/prisma/enums";

/** Paleta semántica de los badges. Definida en globals.css. */
export type Tone =
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "slate"
  | "violet"
  | "teal";

type Meta<T extends string> = Record<T, { label: string; tone: Tone }>;

export const TRUCK_STATUS: Meta<TruckStatus> = {
  ACTIVE: { label: "Disponible", tone: "green" },
  IN_TRIP: { label: "En viaje", tone: "blue" },
  MAINTENANCE: { label: "En taller", tone: "amber" },
  INACTIVE: { label: "Fuera de servicio", tone: "slate" },
};

export const TRUCK_KIND: Record<TruckKind, string> = {
  TRACTOMULA: "Tractomula",
  SENCILLO: "Sencillo",
  DOBLETROQUE: "Doble troque",
  TURBO: "Turbo",
  CISTERNA: "Cisterna",
  REFRIGERADO: "Refrigerado",
  VOLQUETA: "Volqueta",
  PLANCHON: "Planchón",
  FURGON: "Furgón",
  OTRO: "Otro",
};

export const DRIVER_STATUS: Meta<DriverStatus> = {
  ACTIVE: { label: "Disponible", tone: "green" },
  ON_TRIP: { label: "En ruta", tone: "blue" },
  OFF_DUTY: { label: "Descanso", tone: "amber" },
  INACTIVE: { label: "Inactivo", tone: "slate" },
};

export const TRIP_STATUS: Meta<TripStatus> = {
  PLANNED: { label: "Programado", tone: "violet" },
  IN_PROGRESS: { label: "En curso", tone: "blue" },
  COMPLETED: { label: "Completado", tone: "green" },
  CANCELLED: { label: "Cancelado", tone: "red" },
};

export const CARGO_STATUS: Meta<CargoStatus> = {
  PENDING: { label: "Pendiente", tone: "slate" },
  LOADED: { label: "Cargada", tone: "blue" },
  DELIVERED: { label: "Entregada", tone: "green" },
  INCIDENT: { label: "Con novedad", tone: "red" },
};

export const CARGO_UNIT: Record<CargoUnit, string> = {
  KG: "kg",
  TON: "ton",
  M3: "m³",
  PALLET: "pallets",
  UNIDAD: "unidades",
  GALON: "galones",
};

export const MAINTENANCE_TYPE: Record<MaintenanceType, string> = {
  PREVENTIVO: "Preventivo",
  CORRECTIVO: "Correctivo",
  REVISION: "Revisión",
  LLANTAS: "Llantas",
  CAMBIO_ACEITE: "Cambio de aceite",
  FRENOS: "Frenos",
  MOTOR: "Motor",
  OTRO: "Otro",
};

export const MAINTENANCE_STATUS: Meta<MaintenanceStatus> = {
  SCHEDULED: { label: "Programado", tone: "violet" },
  IN_PROGRESS: { label: "En proceso", tone: "blue" },
  COMPLETED: { label: "Realizado", tone: "green" },
  CANCELLED: { label: "Cancelado", tone: "slate" },
};

export const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  COMBUSTIBLE: "Combustible",
  PEAJE: "Peajes",
  ALIMENTACION: "Alimentación",
  HOSPEDAJE: "Hospedaje",
  PARQUEADERO: "Parqueadero",
  MULTA: "Multas",
  REPARACION: "Reparación",
  SEGURO: "Seguros",
  NOMINA: "Nómina",
  OTRO: "Otro",
};

export const DOCUMENT_TYPE: Record<DocumentType, string> = {
  SOAT: "SOAT",
  TECNOMECANICA: "Tecnomecánica",
  SEGURO: "Póliza de seguro",
  TARJETA_OPERACION: "Tarjeta de operación",
  LICENCIA_TRANSITO: "Licencia de tránsito",
  LICENCIA_CONDUCCION: "Licencia de conducción",
  EXAMEN_MEDICO: "Examen médico",
  CEDULA: "Documento de identidad",
  PERMISO: "Permiso especial",
  OTRO: "Otro",
};

/** Tipos de documento que aplican a un vehículo. */
export const TRUCK_DOCUMENT_TYPES: DocumentType[] = [
  "SOAT",
  "TECNOMECANICA",
  "SEGURO",
  "TARJETA_OPERACION",
  "LICENCIA_TRANSITO",
  "PERMISO",
  "OTRO",
];

/** Tipos de documento que aplican a una persona. */
export const DRIVER_DOCUMENT_TYPES: DocumentType[] = [
  "LICENCIA_CONDUCCION",
  "EXAMEN_MEDICO",
  "CEDULA",
  "SEGURO",
  "PERMISO",
  "OTRO",
];

export const ROLE: Meta<Role> = {
  ADMIN: { label: "Administrador", tone: "violet" },
  MANAGER: { label: "Operador", tone: "blue" },
  VIEWER: { label: "Solo lectura", tone: "slate" },
};

export const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Acceso total, incluyendo usuarios y configuración de la empresa.",
  MANAGER: "Puede crear y editar camiones, viajes, cargas, gastos y documentos.",
  VIEWER: "Solo puede consultar información, sin modificar nada.",
};

/** Convierte un Record<enum, string> en opciones para un <select>. */
export function toOptions<T extends string>(
  source: Record<T, string> | Meta<T>
): { value: T; label: string }[] {
  return (Object.entries(source) as [T, string | { label: string }][]).map(
    ([value, meta]) => ({
      value,
      label: typeof meta === "string" ? meta : meta.label,
    })
  );
}
