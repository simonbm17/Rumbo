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
    status: "ACTIVE" as TruckStatus,
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

// --- carga ------------------------------------------------------------------

async function main() {
  console.log("Limpiando datos anteriores…");
  await prisma.activityLog.deleteMany();
  await prisma.cargo.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.document.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.trip.deleteMany();
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
      `${d.firstName[0]}${d.lastName[0]}`,
      i
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
    const photoUrl = await writeTruckImage(t.plate, i);
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
          currentDriverId: drivers[i % drivers.length]?.id ?? null,
          notes:
            i === 3
              ? "Ingresó a taller por falla en la caja de velocidades."
              : null,
        },
      })
    );
  }

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

  // 8 meses hacia atrás y algunos viajes futuros ya programados.
  for (let offset = -240; offset <= 12; offset += 1) {
    // Aproximadamente un viaje cada 2,5 días.
    if (rnd() > 0.4) continue;

    const truck = pick(trucks);
    const driver = pick(drivers);
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
        notes: rnd() < 0.15 ? "Entrega con cita programada en planta." : null,
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

  const [truckCount, tripCount, cargoCount, expenseCount, docCount] =
    await Promise.all([
      prisma.truck.count(),
      prisma.trip.count(),
      prisma.cargo.count(),
      prisma.expense.count(),
      prisma.document.count(),
    ]);

  console.log(`
Datos de demostración cargados:
  ${truckCount} camiones · ${drivers.length} conductores · ${customers.length} clientes
  ${tripCount} viajes · ${cargoCount} cargas · ${expenseCount} gastos · ${docCount} documentos

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
