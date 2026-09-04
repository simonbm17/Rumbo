/**
 * DATOS DE LA PORTADA PÚBLICA. FIJOS, NO CONSULTADOS.
 *
 * La portada la abre cualquiera sin sesión. Si sus escenas salieran de la base,
 * un visitante anónimo estaría viendo la operación real de la empresa —placas,
 * conductores, cuánto factura cada camión— y bastaría mirar el código fuente
 * para leerla. Por eso acá no hay una sola consulta.
 *
 * Los valores reproducen la demo sembrada: mismas placas, mismos vehículos. Lo
 * que se enseña es el producto de verdad con datos de ejemplo, no una maqueta.
 *
 * REGLA DE VERACIDAD: acá solo entra lo que Rumbo hace hoy. Nada de ubicación,
 * velocidad, telemetría, predicción ni porcentajes de mejora.
 */

/* ------------------------------------------------------------- empresas -- */

export type Partner = {
  name: string;
  /** Ruta dentro de `public/`. */
  logo: string;
  alt: string;
};

/**
 * Vacío a propósito.
 *
 * La franja de empresas existe en la arquitectura pero NO se dibuja sin logos
 * reales: inventar clientes es la única mentira que una portada no puede
 * permitirse. `PartnersStrip` devuelve `null` con esta lista vacía, así que la
 * página no reserva un hueco ni se descuadra. Basta añadir entradas acá para
 * que la banda aparezca, sin tocar el maquetado.
 */
export const PARTNERS: Partner[] = [];

/* --------------------------------------------------------- flota ahora --- */

export const SITUACION = {
  flota: 6,
  conductores: 5,
  estados: [
    { etiqueta: "Disponibles", total: 3, tono: "ok" as const },
    { etiqueta: "En viaje", total: 1, tono: "info" as const },
    { etiqueta: "En taller", total: 1, tono: "aviso" as const },
    { etiqueta: "Fuera de servicio", total: 1, tono: "neutro" as const },
  ],
};

/* ---------------------------------------------------------- atención ----- */

export type AlertaDemo = {
  id: string;
  /** Los tres niveles reales de `alerts.ts`. */
  nivel: "vencido" | "urgente" | "porVencer";
  titulo: string;
  sujeto: string;
  plazo: string;
};

export const ALERTAS: AlertaDemo[] = [
  {
    id: "a1",
    nivel: "vencido",
    titulo: "SOAT",
    sujeto: "TQM-703",
    plazo: "venció hace 9 días",
  },
  {
    id: "a2",
    nivel: "vencido",
    titulo: "Licencia de conducción",
    sujeto: "Andrés Gutiérrez",
    plazo: "venció hace 7 días",
  },
  {
    id: "a3",
    nivel: "urgente",
    titulo: "Tecnomecánica",
    sujeto: "LMN-587",
    plazo: "vence en 4 días",
  },
  {
    id: "a4",
    nivel: "porVencer",
    titulo: "Revisión de frenos",
    sujeto: "WGR-482",
    plazo: "vence en 16 días",
  },
];

/** Resumen de lo que requiere atención. Suma exactamente lo que enumera. */
export const ATENCION = {
  total: 13,
  desglose: [
    { etiqueta: "documentos por vencer o vencidos", total: 5 },
    { etiqueta: "licencias de conducción", total: 2 },
    { etiqueta: "mantenimientos programados", total: 5 },
    { etiqueta: "vehículo sin conductor asignado", total: 1 },
  ],
};

/* ------------------------------------------------------------- viajes ---- */

export const VIAJES = [
  {
    id: "v1",
    codigo: "V-1042",
    placa: "SKD-119",
    origen: "Bogotá",
    destino: "Barranquilla",
    conductor: "Jorge Peña",
  },
  {
    id: "v2",
    codigo: "V-1039",
    placa: "PFT-940",
    origen: "Cali",
    destino: "Medellín",
    conductor: "Andrés Gutiérrez",
  },
  {
    id: "v3",
    codigo: "V-1036",
    placa: "WGR-482",
    origen: "Bucaramanga",
    destino: "Cúcuta",
    conductor: "Carlos Ramírez",
  },
];

/* ---------------------------------------------------------- finanzas ----- */

export const FINANZAS = {
  entro: 43_200_000,
  salio: 28_650_000,
  resultado: 14_550_000,
  /** Seis meses. Solo la forma de la evolución; las cifras van en el texto. */
  serie: [31.4, 38.9, 29.7, 46.1, 43.2, 0],
  meses: ["Abr", "May", "Jun", "Jul", "Ago", "Sept"],
};

/* ------------------------------------------------------- capacidades ----- */

export const CAPACIDADES = [
  {
    id: "expediente",
    titulo: "Expediente por vehículo",
    texto:
      "Viajes, mantenimientos, gastos, documentos e historial de asignación en un solo lugar.",
  },
  {
    id: "mantenimiento",
    titulo: "Seguimiento de mantenimientos",
    texto:
      "Registra intervenciones y próximas atenciones por fecha o kilometraje cuando existe.",
  },
  {
    id: "alertas",
    titulo: "Alertas operacionales",
    texto:
      "Documentos, licencias, mantenimientos y asignaciones que requieren atención.",
  },
];

export const BENEFICIOS = [
  {
    id: "tiempo",
    titulo: "Menos tiempo buscando información",
    texto: "Todo el historial de un vehículo en una sola página.",
  },
  {
    id: "vencimientos",
    titulo: "Más control sobre vencimientos",
    texto: "Documentos y licencias con su fecha a la vista.",
  },
  {
    id: "costos",
    titulo: "Más claridad sobre costos e ingresos",
    texto: "Qué entró, qué salió y cómo viene el mes.",
  },
  {
    id: "decisiones",
    titulo: "Decisiones operativas con mejor contexto",
    texto: "Quién tiene cada vehículo y qué le falta.",
  },
];
