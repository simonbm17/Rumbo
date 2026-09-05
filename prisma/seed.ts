import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type {
  CargoStatus,
  ExpenseCategory,
  MaintenanceType,
  TripStatus,
  TruckKind,
  TruckStatus,
} from "../src/generated/prisma/enums";
import { writePersonImage, writeTruckImage } from "./demo-images";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// --- utilidades -------------------------------------------------------------

/** Generador pseudoaleatorio con semilla: la demo sale igual en cada corrida. */
let seedState = 20260831;
function rnd() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rnd() * items.length)];
}
function between(min: number, max: number) {
  return Math.round(min + rnd() * (max - min));
}
function daysFromNow(days: number, hour = 8) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, Math.floor(rnd() * 60), 0, 0);
  return d;
}

const CITIES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
  "Ibagué",
  "Santa Marta",
  "Buenaventura",
  "Villavicencio",
];

const CARGO_KINDS = [
  { description: "Cemento gris en sacos", type: "Construcción", unit: "TON" },
  { description: "Bebidas embotelladas", type: "Alimentos", unit: "PALLET" },
  { description: "Maíz amarillo a granel", type: "Agrícola", unit: "TON" },
  { description: "Electrodomésticos", type: "Electrónica", unit: "PALLET" },
  { description: "Carga refrigerada de lácteos", type: "Refrigerado", unit: "KG" },
  { description: "Material de ferretería", type: "Industrial", unit: "KG" },
  { description: "Papel y cartón", type: "Industrial", unit: "TON" },
  { description: "Insumos agrícolas", type: "Agrícola", unit: "PALLET" },
] as const;

// --- datos base -------------------------------------------------------------

const TRUCKS = [
  {
    plate: "WGR-482",
    nickname: "La Coloso",
    brand: "Kenworth",
    model: "T800",
    year: 2019,
    kind: "TRACTOMULA" as TruckKind,
    capacityKg: 34000,
    axles: 6,
    odometerKm: 412_500,
    status: "ACTIVE" as TruckStatus,
    purchasePrice: 380_000_000,
  },
  {
    plate: "SKD-119",
    nickname: "El Rayo",
    brand: "Freightliner",
    model: "Cascadia",
    year: 2021,
    kind: "TRACTOMULA" as TruckKind,
    capacityKg: 35000,
    axles: 6,
    odometerKm: 198_300,
    status: "IN_TRIP" as TruckStatus,
    purchasePrice: 520_000_000,
  },
  {
    plate: "TQM-703",
    nickname: null,
    brand: "Chevrolet",
    model: "NPR",
    year: 2020,
    kind: "TURBO" as TruckKind,
    capacityKg: 5500,
    axles: 2,
    odometerKm: 145_900,
    // Fuera de servicio a propósito: sin esto la demo no muestra
    // nunca el estado inactivo, que es real en cualquier flota.
    status: "INACTIVE" as TruckStatus,
    purchasePrice: 165_000_000,
  },
  {
    plate: "JHR-256",
    nickname: "Doña Rosa",
    brand: "International",
    model: "9200i",
    year: 2016,
    kind: "DOBLETROQUE" as TruckKind,
    capacityKg: 17000,
    axles: 3,
    odometerKm: 588_400,
    status: "MAINTENANCE" as TruckStatus,
    purchasePrice: 210_000_000,
  },
  {
    plate: "PFT-940",
    nickname: null,
    brand: "Hino",
    model: "FC 500",
    year: 2022,
    kind: "FURGON" as TruckKind,
    capacityKg: 8500,
    axles: 2,
    odometerKm: 62_100,
    status: "ACTIVE" as TruckStatus,
    purchasePrice: 240_000_000,
  },
  {
    plate: "LMN-587",
    nickname: "El Cisterna",
    brand: "Mack",
    model: "Granite",
    year: 2018,
    kind: "CISTERNA" as TruckKind,
    capacityKg: 28000,
    axles: 5,
    odometerKm: 331_700,
    status: "ACTIVE" as TruckStatus,
    purchasePrice: 410_000_000,
  },
];

const DRIVERS = [
  {
    firstName: "Carlos",
    lastName: "Ramírez",
    documentId: "79452103",
    phone: "300 412 8890",
    licenseClass: "C3",
    licenseDays: 210,
  },
  {
    firstName: "Jorge",
    lastName: "Peña",
    documentId: "1023456789",
    phone: "311 776 2201",
    licenseClass: "C3",
    licenseDays: 18,
  },
  {
    firstName: "Miguel",
    lastName: "Salazar",
    documentId: "80345612",
    phone: "320 559 1147",
    licenseClass: "C2",
    licenseDays: 405,
  },
  {
    firstName: "Andrés",
    lastName: "Gutiérrez",
    documentId: "1098765432",
    phone: "315 220 6634",
    licenseClass: "C3",
    licenseDays: -6,
  },
  {
    firstName: "Luis",
    lastName: "Moreno",
    documentId: "94120356",
    phone: "301 884 3390",
    licenseClass: "C2",
    licenseDays: 92,
  },
];

const CUSTOMERS = [
  { name: "Cementos del Valle S.A.", taxId: "890301245-6", city: "Cali", contactName: "Diana Restrepo" },
  { name: "Distribuidora La Central", taxId: "901255780-1", city: "Bogotá", contactName: "Hernán Ospina" },
  { name: "Agroinsumos del Tolima", taxId: "800145922-3", city: "Ibagué", contactName: "Marcela Ruiz" },
  { name: "Comercializadora Andes", taxId: "901004551-8", city: "Medellín", contactName: "Julián Vélez" },
  { name: "Lácteos San Rafael", taxId: "890982331-4", city: "Manizales", contactName: "Paula Cárdenas" },
  { name: "Ferretería Industrial JR", taxId: "830112447-9", city: "Barranquilla", contactName: "Ricardo Jiménez" },
];

// --- validación --------------------------------------------------------------

/**
 * Comprueba las tres invariantes del modelo de asignaciones. Lanza si alguna
 * falla: un seed que genera datos inválidos es peor que uno que no corre,
 * porque el error aparece mucho después y lejos de su causa.
 */
/**
 * Deja los estados de camión y conductor coherentes con los viajes en curso.
 *
 * Es EXACTAMENTE la regla que aplica `syncFleetStatus` en `actions/trips.ts`
 * cuando un viaje cambia de estado, no una regla nueva:
 *
 *   viaje en curso            -> camión IN_TRIP, conductor ON_TRIP
 *   sin viaje en curso        -> si estaba IN_TRIP/ON_TRIP, vuelve a ACTIVE
 *
 * Lo que NO hace, igual que en producción: tocar un camión en taller o fuera de
 * servicio, ni un conductor en descanso o inactivo. Esos estados los decide una
 * persona y un viaje no los revoca.
 *
 * El seed escribe directo y no pasa por las acciones de servidor: aquéllas
 * exigen sesión y permisos, que aquí no existen. Lo que sí respeta son las
 * invariantes finales, que es lo que importa.
 */
async function sincronizarEstadosDeFlota() {
  const enCurso = await prisma.trip.findMany({
    where: { status: "IN_PROGRESS" },
    select: { truckId: true, driverId: true },
  });
  const camionesEnRuta = [...new Set(enCurso.map((v) => v.truckId))];
  const conductoresEnRuta = [
    ...new Set(enCurso.map((v) => v.driverId).filter((id): id is string => !!id)),
  ];

  await prisma.truck.updateMany({
    where: { id: { in: camionesEnRuta } },
    data: { status: "IN_TRIP" },
  });
  await prisma.truck.updateMany({
    where: { id: { notIn: camionesEnRuta }, status: "IN_TRIP" },
    data: { status: "ACTIVE" },
  });

  await prisma.driver.updateMany({
    where: { id: { in: conductoresEnRuta } },
    data: { status: "ON_TRIP" },
  });
  await prisma.driver.updateMany({
    where: { id: { notIn: conductoresEnRuta }, status: "ON_TRIP" },
    data: { status: "ACTIVE" },
  });
}

async function validarInvariantes() {
  const problemas: string[] = [];

  const vehiculosConDos = await prisma.$queryRaw<{ plate: string; n: bigint }[]>`
    SELECT t."plate", count(*) AS n
    FROM "DriverAssignment" a
    JOIN "Truck" t ON t."id" = a."truckId"
    WHERE a."endedAt" IS NULL
    GROUP BY t."plate" HAVING count(*) > 1
  `;
  if (vehiculosConDos.length > 0) {
    problemas.push(
      `Vehículos con más de una asignación vigente: ${vehiculosConDos.map((v) => v.plate).join(", ")}`
    );
  }

  const conductoresConDos = await prisma.$queryRaw<{ nombre: string }[]>`
    SELECT d."firstName" || ' ' || d."lastName" AS nombre
    FROM "DriverAssignment" a
    JOIN "Driver" d ON d."id" = a."driverId"
    WHERE a."endedAt" IS NULL
    GROUP BY d."id", d."firstName", d."lastName" HAVING count(*) > 1
  `;
  if (conductoresConDos.length > 0) {
    problemas.push(
      `Conductores con más de una asignación vigente: ${conductoresConDos.map((c) => c.nombre).join(", ")}`
    );
  }

  const desajustes = await prisma.$queryRaw<{ plate: string }[]>`
    SELECT t."plate"
    FROM "Truck" t
    LEFT JOIN "DriverAssignment" a
           ON a."truckId" = t."id" AND a."endedAt" IS NULL
    WHERE t."currentDriverId" IS DISTINCT FROM a."driverId"
  `;
  if (desajustes.length > 0) {
    problemas.push(
      `currentDriverId no coincide con la asignación vigente en: ${desajustes.map((d) => d.plate).join(", ")}`
    );
  }

  const estadosIncoherentes = await prisma.$queryRaw<{ plate: string; detalle: string }[]>`
    SELECT t."plate",
           CASE WHEN t."status" = 'IN_TRIP' THEN 'marcado en viaje sin viaje en curso'
                ELSE 'con viaje en curso pero no marcado en viaje' END AS detalle
    FROM "Truck" t
    WHERE (t."status" = 'IN_TRIP') <> EXISTS (
      SELECT 1 FROM "Trip" v WHERE v."truckId" = t."id" AND v."status" = 'IN_PROGRESS'
    )
  `;
  if (estadosIncoherentes.length > 0) {
    problemas.push(
      `Estado de vehículo incoherente con sus viajes: ${estadosIncoherentes.map((e) => `${e.plate} (${e.detalle})`).join(", ")}`
    );
  }

  const dobleViaje = await prisma.$queryRaw<{ nombre: string }[]>`
    SELECT d."firstName" || ' ' || d."lastName" AS nombre
    FROM "Trip" v
    JOIN "Driver" d ON d."id" = v."driverId"
    WHERE v."status" = 'IN_PROGRESS'
    GROUP BY d."id", d."firstName", d."lastName" HAVING count(*) > 1
  `;
  if (dobleViaje.length > 0) {
    problemas.push(
      `Conductores en más de un viaje en curso: ${dobleViaje.map((d) => d.nombre).join(", ")}`
    );
  }

  if (problemas.length > 0) {
    throw new Error(
      [
        "El seed generó datos que violan las invariantes de asignación:",
        ...problemas.map((p) => `  - ${p}`),
      ].join("\n")
    );
  }
}

// --- carga ------------------------------------------------------------------

/**
 * GUARDIA DEL SEED DE DEMOSTRACIÓN.
 *
 * Lo primero que hace `main()` es `deleteMany()` sobre las once tablas. Contra
 * una base de producción eso no «siembra datos»: borra la operación de una
 * empresa. Antes de esta guardia bastaba un comando equivocado apuntando a la
 * `DATABASE_URL` real.
 *
 * Es FAIL-CLOSED y exige LAS DOS condiciones, no una:
 *
 *   1. `NODE_ENV` distinto de `production`  — rechaza siempre en producción,
 *      incluso con la autorización puesta;
 *   2. `ALLOW_DEMO_SEED=true`               — autorización deliberada, que hay
 *      que escribir a mano cada vez.
 *
 * Solo la condición 1 no bastaría: quien ejecuta el comando sin `NODE_ENV`
 * definido —lo normal en una terminal cualquiera— pasaría la comprobación
 * apuntando a donde sea. Por eso la barrera principal es la autorización
 * explícita y `NODE_ENV` es el cerrojo adicional.
 *
 * El nombre de la base NO se usa como defensa: la convención puede cambiar y
 * no protege nada por sí sola. Solo se muestra, saneado, para que quien lea el
 * error sepa a dónde estaba apuntando.
 */
function describirDestino(url: string | undefined) {
  if (!url) return "(DATABASE_URL no definida)";
  try {
    const u = new URL(url);
    // Ni usuario, ni contraseña, ni parámetros: solo dónde estaba apuntando.
    return `${u.hostname}:${u.port || "5432"}/${u.pathname.slice(1)}`;
  } catch {
    return "(DATABASE_URL no interpretable)";
  }
}

function exigirAutorizacion() {
  const destino = describirDestino(process.env.DATABASE_URL);
  const motivos: string[] = [];

  if (process.env.NODE_ENV === "production") {
    motivos.push("NODE_ENV=production");
  }
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    motivos.push("falta ALLOW_DEMO_SEED=true");
  }

  if (motivos.length === 0) return;

  console.error(
    [
      "",
      "Seed de demostración BLOQUEADO. Este comando ELIMINA los datos existentes.",
      "",
      `  Destino     : ${destino}`,
      `  Motivo      : ${motivos.join(" · ")}`,
      "",
      "Para sembrar la demo en un entorno de desarrollo, autorízalo de forma",
      "explícita:",
      "",
      "  ALLOW_DEMO_SEED=true npm run db:seed",
      "",
      "Nunca contra la base de producción.",
      "",
    ].join("\n")
  );
  process.exit(1);
}

async function main() {
  // ANTES de tocar nada. El primer `deleteMany()` viene justo después.
  exigirAutorizacion();

  console.log("Limpiando datos anteriores…");
  await prisma.activityLog.deleteMany();
  await prisma.cargo.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.document.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.trip.deleteMany();
  // Antes que Truck y Driver: las claves foráneas son RESTRICT, así que un
  // vehículo o conductor con historial no se puede borrar mientras exista.
  await prisma.driverAssignment.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // --- empresa -------------------------------------------------------------
  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {
      name: "Transportes Andina",
      legalName: "Transportes Andina S.A.S.",
      taxId: "901.455.203-7",
      phone: "+57 601 742 5500",
      email: "operaciones@transportesandina.co",
      address: "Calle 13 # 68-45, Bogotá D.C.",
    },
    create: {
      id: 1,
      name: "Transportes Andina",
      legalName: "Transportes Andina S.A.S.",
      taxId: "901.455.203-7",
      phone: "+57 601 742 5500",
      email: "operaciones@transportesandina.co",
      address: "Calle 13 # 68-45, Bogotá D.C.",
    },
  });

  // --- usuarios ------------------------------------------------------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@rumbo.app").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234";

  await prisma.user.createMany({
    data: [
      {
        name: process.env.SEED_ADMIN_NAME ?? "Administrador",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: "ADMIN",
      },
      {
        name: "Sandra Molina",
        email: "operaciones@rumbo.app",
        passwordHash: await bcrypt.hash("Operador1234", 12),
        role: "MANAGER",
      },
      {
        name: "Contabilidad",
        email: "contabilidad@rumbo.app",
        passwordHash: await bcrypt.hash("Consulta1234", 12),
        role: "VIEWER",
      },
    ],
  });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });

  // --- conductores ---------------------------------------------------------
  console.log("Creando conductores…");
  const drivers = [];
  for (const [i, d] of DRIVERS.entries()) {
    const photoUrl = await writePersonImage(
      d.documentId,
      `${d.firstName[0]}${d.lastName[0]}`
    );
    drivers.push(
      await prisma.driver.create({
        data: {
          firstName: d.firstName,
          lastName: d.lastName,
          documentId: d.documentId,
          phone: d.phone,
          email: `${d.firstName.toLowerCase()}.${d.lastName.toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")}@transportesandina.co`,
          photoUrl,
          licenseNumber: `LIC-${between(100000, 999999)}`,
          licenseClass: d.licenseClass,
          licenseExpiry: daysFromNow(d.licenseDays),
          hireDate: daysFromNow(-between(200, 2200)),
          status: i === 1 ? "ON_TRIP" : i === 4 ? "OFF_DUTY" : "ACTIVE",
          address: `${pick(CITIES)}, Colombia`,
          emergencyContact: pick(["Esposa", "Hermano", "Madre", "Hijo"]),
          emergencyPhone: `31${between(0, 9)} ${between(100, 999)} ${between(1000, 9999)}`,
        },
      })
    );
  }

  // --- clientes ------------------------------------------------------------
  console.log("Creando clientes…");
  const customers = [];
  for (const c of CUSTOMERS) {
    customers.push(
      await prisma.customer.create({
        data: {
          ...c,
          phone: `60${between(1, 8)} ${between(200, 899)} ${between(1000, 9999)}`,
          email: `contacto@${c.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z]/g, "")
            .slice(0, 14)}.co`,
        },
      })
    );
  }

  // --- camiones ------------------------------------------------------------
  console.log("Creando camiones…");
  const trucks = [];
  for (const [i, t] of TRUCKS.entries()) {
    /*
      Quién tiene foto y cuál lo decide el manifiesto de `demo-images`, por
      placa. Acá se decidía con la posición en el array —«el último no tiene
      foto»—, y esa posición se mueve sola al reordenar la lista.
    */
    const photoUrl = await writeTruckImage(t.plate);
    trucks.push(
      await prisma.truck.create({
        data: {
          ...t,
          photoUrl,
          vin: `3AKJ${between(100000000, 999999999)}`,
          engineNumber: `ENG${between(1000000, 9999999)}`,
          color: pick(["Blanco", "Rojo", "Azul", "Gris", "Amarillo"]),
          fuelType: "Diésel",
          tankLiters: t.axles >= 5 ? 800 : 200,
          purchaseDate: daysFromNow(-between(400, 2500)),
          // Sin conductor todavía: la asignación se construye en su propia
          // fase, para que el historial y la proyección salgan del mismo sitio.
          notes:
            i === 3
              ? "Ingresó a taller por falla en la caja de velocidades."
              : null,
        },
      })
    );
  }

  // --- roster de asignaciones vigentes --------------------------------------
  //
  // Se construye explícitamente y no con `drivers[i % drivers.length]`, que al
  // crecer el conjunto produce relaciones irreales: con 6 vehículos y 5
  // conductores repetía a una persona en dos vehículos a la vez.
  //
  // Emparejamiento uno a uno. El vehículo en taller (índice 3) queda sin
  // conductor a propósito: es el caso realista y ejercita la ruta de
  // "vehículo sin asignación vigente".
  console.log("Construyendo asignaciones vigentes…");

  const roster = new Map<string, string>(); // truckId → driverId
  let siguienteConductor = 0;
  for (const [i, truck] of trucks.entries()) {
    if (i === 3) continue; // el que está en taller
    const conductor = drivers[siguienteConductor];
    if (!conductor) break; // no hay más conductores disponibles
    roster.set(truck.id, conductor.id);
    siguienteConductor++;
  }

  for (const [truckId, driverId] of roster) {
    await prisma.driverAssignment.create({
      data: {
        truckId,
        driverId,
        // Los datos de demostración son ficticios, así que acá sí hay fecha.
        // Las filas que produce la MIGRACIÓN llevan startedAt = NULL porque
        // ahí la fecha real no se conoce y no se inventa.
        startedAt: daysFromNow(-between(120, 420)),
        source: "MANUAL",
        createdById: admin.id,
      },
    });
    // Proyección: la caché se deriva del historial, nunca al revés.
    await prisma.truck.update({
      where: { id: truckId },
      data: { currentDriverId: driverId },
    });
  }

  /** Conductor asignado a un vehículo, o null si no tiene. */
  const conductorAsignado = (truckId: string) => roster.get(truckId) ?? null;

  // --- documentos ----------------------------------------------------------
  console.log("Creando documentos…");
  // Vencimientos variados a propósito: uno vencido, uno crítico y el resto
  // holgados, para que el panel de alertas muestre los tres estados.
  const docPlan: [number, number, number][] = [
    // [índice de camión, días para el SOAT, días para la tecnomecánica]
    [0, 240, 190],
    [1, 12, 320],
    [2, -9, 145],
    [3, 88, 27],
    [4, 300, 260],
    [5, 55, 4],
  ];

  for (const [truckIndex, soatDays, techDays] of docPlan) {
    const truck = trucks[truckIndex];
    await prisma.document.createMany({
      data: [
        {
          truckId: truck.id,
          type: "SOAT",
          number: `SOAT-${between(1000000, 9999999)}`,
          issuer: "Seguros del Estado",
          issuedAt: daysFromNow(soatDays - 365),
          expiresAt: daysFromNow(soatDays),
        },
        {
          truckId: truck.id,
          type: "TECNOMECANICA",
          number: `RTM-${between(100000, 999999)}`,
          issuer: "CDA Autonorte",
          issuedAt: daysFromNow(techDays - 365),
          expiresAt: daysFromNow(techDays),
        },
        {
          truckId: truck.id,
          type: "TARJETA_OPERACION",
          number: `TO-${between(10000, 99999)}`,
          issuer: "Ministerio de Transporte",
          issuedAt: daysFromNow(-400),
          expiresAt: daysFromNow(between(120, 500)),
        },
      ],
    });
  }

  for (const [i, driver] of drivers.entries()) {
    await prisma.document.create({
      data: {
        driverId: driver.id,
        type: "EXAMEN_MEDICO",
        number: `EM-${between(10000, 99999)}`,
        issuer: "Centro Médico Ocupacional",
        issuedAt: daysFromNow(-330),
        expiresAt: daysFromNow(i === 2 ? 21 : between(60, 400)),
      },
    });
  }

  // --- viajes, cargas y gastos ---------------------------------------------
  console.log("Creando viajes, cargas y gastos…");
  let tripNumber = 1;

  // Nadie puede estar en dos viajes en curso a la vez. Es una comprobación
  // simple a propósito: no hace falta un motor de disponibilidad, solo evitar
  // el absurdo de que una persona conduzca dos vehículos al mismo tiempo.
  const enViajeAhora = new Set<string>();

  // 8 meses hacia atrás y algunos viajes futuros ya programados.
  for (let offset = -240; offset <= 12; offset += 1) {
    // Aproximadamente un viaje cada 2,5 días.
    if (rnd() > 0.4) continue;

    let truck = pick(trucks);

    /*
      El conductor del viaje sale de la asignación del vehículo, no de un
      sorteo sin relación. Eso hace que la demo sea coherente: quien está
      asignado a un vehículo es normalmente quien lo conduce.

      Un 20% de las veces conduce otra persona, a propósito. Es un caso real
      —reemplazo, incapacidad, operación temporal— y sirve para comprobar que
      `Trip.driverId` y `DriverAssignment.driverId` PUEDEN diferir de forma
      legítima: son hechos distintos y el sistema debe soportarlo.
    */
    const asignado = conductorAsignado(truck.id);
    const esReemplazo = !asignado || rnd() < 0.2;

    let driver: (typeof drivers)[number];
    if (!esReemplazo && asignado) {
      driver = drivers.find((d) => d.id === asignado)!;
    } else {
      // Un reemplazo es cualquiera menos el titular del vehículo.
      const suplentes = drivers.filter((d) => d.id !== asignado);
      driver = pick(suplentes.length > 0 ? suplentes : drivers);
    }

    const notaReemplazo = esReemplazo
      ? asignado
        ? "Conductor de reemplazo: el titular del vehículo no estaba disponible."
        : "Vehículo sin conductor asignado: operación temporal."
      : null;

    const origin = pick(CITIES);
    let destination = pick(CITIES);
    while (destination === origin) destination = pick(CITIES);

    const departureAt = daysFromNow(offset, between(4, 20));
    const durationDays = between(1, 3);
    const plannedArrivalAt = daysFromNow(offset + durationDays, between(8, 22));

    let status: TripStatus;
    if (offset > 2) status = "PLANNED";
    else if (offset > -durationDays - 1) status = "IN_PROGRESS";
    else status = rnd() < 0.05 ? "CANCELLED" : "COMPLETED";

    /*
      Un vehículo fuera de servicio o en taller no puede estar en ruta.

      El estado del camión lo fija `TRUCKS` y el del viaje sale del desplazamiento
      en el tiempo: dos decisiones independientes que coincidían por azar. De ahí
      salía la demo contradictoria —un camión «Fuera de servicio» con un viaje en
      curso— que no representa ninguna operación real.

      El viaje se MUEVE a un vehículo operativo en vez de darse por terminado.
      Degradarlo era la salida fácil y dejaba la demo sin ningún viaje en curso,
      que es justo lo que la pantalla principal necesita enseñar. Solo si no
      hubiera ningún vehículo disponible se cierra, que es el mismo recurso que
      ya usa la comprobación del conductor unas líneas más abajo.
    */
    if (status === "IN_PROGRESS" && truck.status !== "ACTIVE" && truck.status !== "IN_TRIP") {
      const operativo = trucks.find(
        (c) => c.status === "ACTIVE" || c.status === "IN_TRIP"
      );
      if (operativo) truck = operativo;
      else status = "COMPLETED";
    }

    if (status === "IN_PROGRESS") {
      if (enViajeAhora.has(driver.id)) {
        // Ya está en ruta: se busca a alguien libre y, si no hay, el viaje se
        // da por terminado en vez de duplicar a la persona.
        const libre = drivers.find((d) => !enViajeAhora.has(d.id));
        if (libre) driver = libre;
        else status = "COMPLETED";
      }
      if (status === "IN_PROGRESS") enViajeAhora.add(driver.id);
    }

    const distanceKm = between(180, 1150);
    const startOdometerKm = Math.max(
      0,
      truck.odometerKm - between(1000, 90_000)
    );
    const revenue =
      status === "CANCELLED" ? 0 : between(2_400_000, 11_500_000);

    const trip = await prisma.trip.create({
      data: {
        code: `V-${String(tripNumber++).padStart(4, "0")}`,
        truckId: truck.id,
        driverId: driver.id,
        origin,
        destination,
        departureAt,
        plannedArrivalAt,
        arrivalAt: status === "COMPLETED" ? plannedArrivalAt : null,
        startOdometerKm: status === "PLANNED" ? null : startOdometerKm,
        endOdometerKm:
          status === "COMPLETED" ? startOdometerKm + distanceKm : null,
        distanceKm: status === "PLANNED" ? null : distanceKm,
        status,
        revenue,
        notes:
          notaReemplazo ??
          (rnd() < 0.15 ? "Entrega con cita programada en planta." : null),
      },
    });

    // Cargas del viaje
    const cargoCount = rnd() < 0.65 ? 1 : 2;
    for (let c = 0; c < cargoCount; c++) {
      const kind = pick(CARGO_KINDS);
      const cargoStatus: CargoStatus =
        status === "COMPLETED"
          ? "DELIVERED"
          : status === "IN_PROGRESS"
            ? "LOADED"
            : status === "CANCELLED"
              ? "INCIDENT"
              : "PENDING";

      await prisma.cargo.create({
        data: {
          tripId: trip.id,
          customerId: pick(customers).id,
          description: kind.description,
          cargoType: kind.type,
          unit: kind.unit,
          weight:
            kind.unit === "TON"
              ? between(8, 32)
              : kind.unit === "PALLET"
                ? between(6, 26)
                : between(1200, 18000),
          quantity: kind.unit === "PALLET" ? between(6, 26) : null,
          declaredValue: between(15_000_000, 180_000_000),
          freightCharge: Math.round(revenue / cargoCount),
          pickupLocation: `Bodega ${between(1, 12)}, ${origin}`,
          deliveryLocation: `Centro de distribución, ${destination}`,
          status: cargoStatus,
        },
      });
    }

    // Gastos del viaje
    if (status !== "PLANNED") {
      const liters = Math.round(distanceKm / between(3, 5));
      const pricePerLiter = between(9200, 10800);

      const expenses: {
        category: ExpenseCategory;
        description: string;
        amount: number;
        liters?: number;
        pricePerLiter?: number;
        odometerKm?: number;
      }[] = [
        {
          category: "COMBUSTIBLE",
          description: "Tanqueo en ruta",
          amount: liters * pricePerLiter,
          liters,
          pricePerLiter,
          odometerKm: startOdometerKm + Math.round(distanceKm / 2),
        },
        {
          category: "PEAJE",
          description: `Peajes ${origin} — ${destination}`,
          amount: between(120_000, 480_000),
        },
        {
          category: "ALIMENTACION",
          description: "Viáticos del conductor",
          amount: between(60_000, 180_000),
        },
      ];

      if (rnd() < 0.3) {
        expenses.push({
          category: "HOSPEDAJE",
          description: "Hotel en ruta",
          amount: between(80_000, 220_000),
        });
      }
      if (rnd() < 0.08) {
        expenses.push({
          category: "MULTA",
          description: "Comparendo por exceso de velocidad",
          amount: between(300_000, 900_000),
        });
      }

      for (const e of expenses) {
        await prisma.expense.create({
          data: {
            truckId: truck.id,
            tripId: trip.id,
            driverId: driver.id,
            category: e.category,
            description: e.description,
            amount: e.amount,
            date: departureAt,
            liters: e.liters ?? null,
            pricePerLiter: e.pricePerLiter ?? null,
            odometerKm: e.odometerKm ?? null,
            supplier:
              e.category === "COMBUSTIBLE"
                ? pick(["Terpel", "Biomax", "Primax", "Texaco"])
                : null,
          },
        });
      }
    }
  }

  // --- mantenimientos ------------------------------------------------------
  console.log("Creando mantenimientos…");
  const MNT: { type: MaintenanceType; title: string; min: number; max: number }[] =
    [
      { type: "CAMBIO_ACEITE", title: "Cambio de aceite y filtros", min: 420_000, max: 900_000 },
      { type: "LLANTAS", title: "Rotación y balanceo de llantas", min: 600_000, max: 2_400_000 },
      { type: "FRENOS", title: "Revisión del sistema de frenos", min: 800_000, max: 3_200_000 },
      { type: "PREVENTIVO", title: "Mantenimiento preventivo 20.000 km", min: 1_200_000, max: 3_800_000 },
      { type: "MOTOR", title: "Reparación de motor", min: 4_500_000, max: 16_000_000 },
      { type: "REVISION", title: "Alistamiento para tecnomecánica", min: 350_000, max: 1_100_000 },
    ];

  for (const truck of trucks) {
    const count = between(3, 6);
    for (let i = 0; i < count; i++) {
      const m = pick(MNT);
      const daysAgo = -between(10, 500);
      await prisma.maintenance.create({
        data: {
          truckId: truck.id,
          type: m.type,
          title: m.title,
          description: rnd() < 0.4 ? "Trabajo realizado en taller autorizado." : null,
          date: daysFromNow(daysAgo),
          odometerKm: Math.max(0, truck.odometerKm + daysAgo * between(200, 420)),
          cost: between(m.min, m.max),
          workshop: pick([
            "Taller Diésel Andino",
            "Servicentro La 68",
            "Tecnimotores S.A.S.",
            "Taller Autorizado Kenworth",
          ]),
          invoiceNumber: `FV-${between(10000, 99999)}`,
          status: "COMPLETED",
          nextServiceKm: truck.odometerKm + between(8000, 22000),
        },
      });
    }

    // Un servicio programado a futuro por camión.
    const upcoming = pick(MNT);
    await prisma.maintenance.create({
      data: {
        truckId: truck.id,
        type: upcoming.type,
        title: upcoming.title,
        date: daysFromNow(between(5, 45)),
        cost: 0,
        status: "SCHEDULED",
        nextServiceDate: daysFromNow(between(5, 45)),
        nextServiceKm: truck.odometerKm + between(5000, 15000),
        workshop: "Taller Diésel Andino",
      },
    });
  }

  // El camión en taller tiene un correctivo abierto.
  await prisma.maintenance.create({
    data: {
      truckId: trucks[3].id,
      type: "CORRECTIVO",
      title: "Reparación de caja de velocidades",
      description: "Cambio de sincronizados y revisión del embrague.",
      date: daysFromNow(-4),
      odometerKm: trucks[3].odometerKm,
      cost: 8_900_000,
      workshop: "Tecnimotores S.A.S.",
      status: "IN_PROGRESS",
      nextServiceDate: daysFromNow(6),
    },
  });

  // --- gastos fijos no ligados a viajes ------------------------------------
  for (const truck of trucks) {
    for (let m = 1; m <= 6; m++) {
      await prisma.expense.create({
        data: {
          truckId: truck.id,
          category: "SEGURO",
          description: "Cuota mensual de póliza todo riesgo",
          amount: between(750_000, 1_600_000),
          date: daysFromNow(-m * 30),
          supplier: "Seguros del Estado",
        },
      });
    }
  }

  // --- actividad -----------------------------------------------------------
  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "creó",
        entity: "Truck",
        summary: `el camión ${trucks[5].plate}`,
        createdAt: daysFromNow(-3),
      },
      {
        userId: admin.id,
        action: "actualizó",
        entity: "Maintenance",
        summary: `un mantenimiento del camión ${trucks[3].plate}`,
        createdAt: daysFromNow(-2),
      },
      {
        userId: admin.id,
        action: "creó",
        entity: "Driver",
        summary: `al conductor ${drivers[4].firstName} ${drivers[4].lastName}`,
        createdAt: daysFromNow(-1),
      },
    ],
  });

  // --- validación de invariantes -------------------------------------------
  //
  // El seed falla si genera datos que la migración rechazaría. Sin esto, un
  // cambio futuro podría volver a producir en silencio el caso que dio origen
  // a todo esto: una persona asignada a dos vehículos a la vez.
  console.log("Sincronizando estados de flota…");
  await sincronizarEstadosDeFlota();

  console.log("Validando invariantes…");
  await validarInvariantes();

  const [truckCount, tripCount, cargoCount, expenseCount, docCount] =
    await Promise.all([
      prisma.truck.count(),
      prisma.trip.count(),
      prisma.cargo.count(),
      prisma.expense.count(),
      prisma.document.count(),
    ]);

  const [asignacionesVigentes, reemplazos] = await Promise.all([
    prisma.driverAssignment.count({ where: { endedAt: null } }),
    prisma.trip.count({ where: { notes: { contains: "reemplazo" } } }),
  ]);

  console.log(`
Datos de demostración cargados:
  ${truckCount} camiones · ${drivers.length} conductores · ${customers.length} clientes
  ${tripCount} viajes · ${cargoCount} cargas · ${expenseCount} gastos · ${docCount} documentos
  ${asignacionesVigentes} asignaciones vigentes · ${reemplazos} viajes con conductor de reemplazo

Ingresá con:
  Administrador  ${adminEmail} / ${adminPassword}
  Operador       operaciones@rumbo.app / Operador1234
  Solo lectura   contabilidad@rumbo.app / Consulta1234
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
