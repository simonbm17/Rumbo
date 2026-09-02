import type {
  AssignmentEndReason,
  AssignmentSource,
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

/**
 * Tres conceptos distintos, que no se mezclan:
 *
 *   IDENTIDAD   el acento de Rumbo (#0E4F5C). No está en este archivo a
 *               propósito: no es un estado y nunca puede serlo.
 *   SEMÁNTICA   cuatro familias, las de abajo. Cada una dice algo del mundo:
 *               salió bien, hay que mirarlo, está mal, es un dato.
 *   NEUTRO      `neutral`. NO es una quinta familia semántica: es la ausencia
 *               de señal, para lo que existe pero no reclama nada.
 *
 * Violeta y turquesa se eliminaron: no significaban nada que el neutro no
 * dijera, obligaban a aprender más vocabulario del necesario, y ocupaban el
 * espacio cromático que el acento de marca necesita.
 *
 * Antes el neutro se llamaba `slate`, que es un nombre de color. Un nombre de
 * color invita a leerlo como una familia más; `neutral` nombra el rol.
 */
export type SemanticTone = "success" | "warning" | "danger" | "info";

/** Lo que puede llevar un estado en pantalla: una señal, o ninguna. */
export type Tone = SemanticTone | "neutral";

type Meta<T extends string> = Record<T, { label: string; tone: Tone }>;

export const TRUCK_STATUS: Meta<TruckStatus> = {
  ACTIVE: { label: "Disponible", tone: "success" },
  IN_TRIP: { label: "En viaje", tone: "info" },
  MAINTENANCE: { label: "En taller", tone: "warning" },
  INACTIVE: { label: "Fuera de servicio", tone: "neutral" },
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
  ACTIVE: { label: "Disponible", tone: "success" },
  ON_TRIP: { label: "En ruta", tone: "info" },
  OFF_DUTY: { label: "Descanso", tone: "warning" },
  INACTIVE: { label: "Inactivo", tone: "neutral" },
};

export const TRIP_STATUS: Meta<TripStatus> = {
  PLANNED: { label: "Programado", tone: "neutral" },
  IN_PROGRESS: { label: "En curso", tone: "info" },
  COMPLETED: { label: "Completado", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
};

export const CARGO_STATUS: Meta<CargoStatus> = {
  PENDING: { label: "Pendiente", tone: "neutral" },
  LOADED: { label: "Cargada", tone: "info" },
  DELIVERED: { label: "Entregada", tone: "success" },
  INCIDENT: { label: "Con novedad", tone: "danger" },
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
  SCHEDULED: { label: "Programado", tone: "neutral" },
  IN_PROGRESS: { label: "En proceso", tone: "info" },
  COMPLETED: { label: "Realizado", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

/*
  Vocabulario de las asignaciones. Faltaba: `assignments.ts` guarda los enums en
  inglés y hasta ahora ninguna pantalla los mostraba, así que no había
  traducción. El historial del vehículo es la primera que los enseña.
*/
export const ASSIGNMENT_END_REASON: Record<AssignmentEndReason, string> = {
  REASSIGNED: "Reasignado",
  RELEASED: "Liberado",
  ARCHIVED: "Archivado",
  CANCELLED: "Anulado",
};

export const ASSIGNMENT_SOURCE: Record<AssignmentSource, string> = {
  MANUAL: "Registro manual",
  MIGRATION: "Reconstruido de datos anteriores",
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
  ADMIN: { label: "Administrador", tone: "info" },
  MANAGER: { label: "Operador", tone: "neutral" },
  VIEWER: { label: "Solo lectura", tone: "neutral" },
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
