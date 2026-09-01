import "server-only";

import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/format";

/** Primer día del mes de `date`, a las 00:00 locales. */
export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

const MONTH_LABEL = new Intl.DateTimeFormat("es-CO", { month: "short" });

export type MonthPoint = {
  key: string;
  label: string;
  ingresos: number;
  gastos: number;
  utilidad: number;
};

/** Variación porcentual entre dos periodos. null si no hay base comparable. */
export function variation(current: number, previous: number): number | null {
  if (!previous) return null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

/**
 * Ingresos (viajes completados o en curso) y gastos de un rango.
 * Un viaje cancelado no factura, por eso se excluye.
 */
async function revenueBetween(from: Date, to: Date, truckId?: string) {
  const result = await prisma.trip.aggregate({
    _sum: { revenue: true },
    where: {
      departureAt: { gte: from, lt: to },
      status: { in: ["IN_PROGRESS", "COMPLETED"] },
      ...(truckId ? { truckId } : {}),
    },
  });
  return round2(result._sum.revenue ?? 0);
}

async function expensesBetween(from: Date, to: Date, truckId?: string) {
  const result = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: {
      date: { gte: from, lt: to },
      ...(truckId ? { truckId } : {}),
    },
  });
  return round2(result._sum.amount ?? 0);
}

async function maintenanceBetween(from: Date, to: Date, truckId?: string) {
  const result = await prisma.maintenance.aggregate({
    _sum: { cost: true },
    where: {
      date: { gte: from, lt: to },
      status: { in: ["IN_PROGRESS", "COMPLETED"] },
      ...(truckId ? { truckId } : {}),
    },
  });
  return round2(result._sum.cost ?? 0);
}

/**
 * Serie mensual de ingresos y egresos. Los egresos suman gastos operativos
 * más el costo de los mantenimientos realizados en el mes.
 */
export async function getMonthlySeries(
  months = 6,
  truckId?: string
): Promise<MonthPoint[]> {
  const current = startOfMonth(new Date());

  const rangos = Array.from({ length: months }, (_, indice) => {
    const from = addMonths(current, -(months - 1 - indice));
    return { from, to: addMonths(from, 1) };
  });

  /*
    Todas las consultas de todos los meses se lanzan juntas.
    Antes el bucle hacía `await` por mes: con 12 meses eran 12 viajes de ida y
    vuelta encadenados a la base, y el gráfico de reportes tardaba lo que
    tardaba el más lento por doce. Ahora es un solo viaje en paralelo.
  */
  const resultados = await Promise.all(
    rangos.flatMap(({ from, to }) => [
      revenueBetween(from, to, truckId),
      expensesBetween(from, to, truckId),
      maintenanceBetween(from, to, truckId),
    ])
  );

  return rangos.map(({ from }, indice) => {
    const [ingresos, gastos, taller] = resultados.slice(
      indice * 3,
      indice * 3 + 3
    );
    const egresos = round2(gastos + taller);
    const label = MONTH_LABEL.format(from).replace(".", "");

    return {
      key: `${from.getFullYear()}-${from.getMonth() + 1}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      ingresos,
      gastos: egresos,
      utilidad: round2(ingresos - egresos),
    };
  });
}

/** Resumen del mes en curso comparado con el mes anterior. */
export async function getDashboardStats() {
  const monthStart = startOfMonth(new Date());
  const nextMonth = addMonths(monthStart, 1);
  const prevMonth = addMonths(monthStart, -1);

  const [
    trucksTotal,
    trucksActive,
    trucksMaintenance,
    tripsInProgress,
    tripsThisMonth,
    tripsPrevMonth,
    driversActive,
    revenue,
    revenuePrev,
    expenses,
    expensesPrev,
    maintenance,
    maintenancePrev,
  ] = await Promise.all([
    prisma.truck.count({ where: { archived: false } }),
    prisma.truck.count({ where: { archived: false, status: "ACTIVE" } }),
    prisma.truck.count({ where: { archived: false, status: "MAINTENANCE" } }),
    prisma.trip.count({ where: { status: "IN_PROGRESS" } }),
    prisma.trip.count({
      where: { departureAt: { gte: monthStart, lt: nextMonth } },
    }),
    prisma.trip.count({
      where: { departureAt: { gte: prevMonth, lt: monthStart } },
    }),
    prisma.driver.count({ where: { archived: false, status: { not: "INACTIVE" } } }),
    revenueBetween(monthStart, nextMonth),
    revenueBetween(prevMonth, monthStart),
    expensesBetween(monthStart, nextMonth),
    expensesBetween(prevMonth, monthStart),
    maintenanceBetween(monthStart, nextMonth),
    maintenanceBetween(prevMonth, monthStart),
  ]);

  const egresos = round2(expenses + maintenance);
  const egresosPrev = round2(expensesPrev + maintenancePrev);

  return {
    trucksTotal,
    trucksActive,
    trucksMaintenance,
    tripsInProgress,
    tripsThisMonth,
    driversActive,
    revenue,
    expenses: egresos,
    profit: round2(revenue - egresos),
    profitPrev: round2(revenuePrev - egresosPrev),
    trend: {
      revenue: variation(revenue, revenuePrev),
      expenses: variation(egresos, egresosPrev),
      trips: variation(tripsThisMonth, tripsPrevMonth),
      profit: variation(round2(revenue - egresos), round2(revenuePrev - egresosPrev)),
    },
  };
}

/** Rentabilidad acumulada de un camión: ingresos, gastos, taller y km. */
export async function getTruckFinancials(truckId: string) {
  const [revenue, expenses, maintenance, distance, tripCount] =
    await Promise.all([
      prisma.trip.aggregate({
        _sum: { revenue: true },
        where: { truckId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
      }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { truckId } }),
      prisma.maintenance.aggregate({
        _sum: { cost: true },
        where: { truckId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
      }),
      prisma.trip.aggregate({
        _sum: { distanceKm: true },
        where: { truckId, status: "COMPLETED" },
      }),
      prisma.trip.count({ where: { truckId } }),
    ]);

  const ingresos = round2(revenue._sum.revenue ?? 0);
  const gastos = round2(expenses._sum.amount ?? 0);
  const taller = round2(maintenance._sum.cost ?? 0);
  const km = round2(distance._sum.distanceKm ?? 0);
  const egresos = round2(gastos + taller);

  return {
    ingresos,
    gastos,
    taller,
    egresos,
    utilidad: round2(ingresos - egresos),
    margen: ingresos ? round2(((ingresos - egresos) / ingresos) * 100) : null,
    km,
    costoPorKm: km ? round2(egresos / km) : null,
    tripCount,
  };
}

/** Consumo de combustible del camión a partir de los gastos cargados. */
export async function getFuelStats(truckId: string) {
  const result = await prisma.expense.aggregate({
    _sum: { liters: true, amount: true },
    _count: { _all: true },
    where: { truckId, category: "COMBUSTIBLE", liters: { not: null } },
  });

  const liters = round2(result._sum.liters ?? 0);
  const cost = round2(result._sum.amount ?? 0);

  const distance = await prisma.trip.aggregate({
    _sum: { distanceKm: true },
    where: { truckId, status: "COMPLETED" },
  });
  const km = round2(distance._sum.distanceKm ?? 0);

  return {
    liters,
    cost,
    fillUps: result._count._all,
    kmPerLiter: liters ? round2(km / liters) : null,
    costPerKm: km ? round2(cost / km) : null,
  };
}
