import Link from "next/link";
import {
  Banknote,
  Fuel,
  Printer,
  TrendingUp,
  Truck as TruckIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlySeries, getTruckFinancials } from "@/lib/stats";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { CategoryBreakdown } from "@/components/charts/CategoryBreakdown";
import { PrintButton } from "@/components/ui/PrintButton";
import { EXPENSE_CATEGORY } from "@/lib/labels";
import { km, money, number, percent, round2, sum } from "@/lib/format";

export const metadata = { title: "Reportes" };

const RANGES = [
  { key: "3", label: "3 meses" },
  { key: "6", label: "6 meses" },
  { key: "12", label: "12 meses" },
];

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reportes">) {
  await requireUser();
  const params = await searchParams;
  const months = [3, 6, 12].includes(Number(params.meses))
    ? Number(params.meses)
    : 6;

  const from = new Date();
  from.setMonth(from.getMonth() - months, 1);
  from.setHours(0, 0, 0, 0);

  const [series, trucks, byCategory, fuel, routes] = await Promise.all([
    getMonthlySeries(months),
    prisma.truck.findMany({
      where: { archived: false },
      orderBy: { plate: "asc" },
      select: { id: true, plate: true, nickname: true, odometerKm: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { date: { gte: from } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: from }, category: "COMBUSTIBLE" },
      _sum: { amount: true, liters: true },
    }),
    prisma.trip.groupBy({
      by: ["origin", "destination"],
      where: { departureAt: { gte: from }, status: { not: "CANCELLED" } },
      _sum: { revenue: true, distanceKm: true },
      _count: { _all: true },
      orderBy: { _sum: { revenue: "desc" } },
      take: 10,
    }),
  ]);

  // Rentabilidad por camión (acumulada, no solo del rango).
  const perTruck = await Promise.all(
    trucks.map(async (truck) => ({
      ...truck,
      ...(await getTruckFinancials(truck.id)),
    }))
  );
  perTruck.sort((a, b) => b.utilidad - a.utilidad);

  const ingresos = sum(series.map((s) => s.ingresos));
  const gastos = sum(series.map((s) => s.gastos));
  const utilidad = round2(ingresos - gastos);
  const margen = ingresos ? round2((utilidad / ingresos) * 100) : null;

  const breakdown = byCategory
    .map((row) => ({
      label: EXPENSE_CATEGORY[row.category],
      value: round2(row._sum.amount ?? 0),
    }))
    .sort((a, b) => b.value - a.value);

  const liters = round2(fuel._sum.liters ?? 0);
  const fuelCost = round2(fuel._sum.amount ?? 0);

  return (
    <>
      <PageHeader
        title="Reportes"
        description={`Resultados de los últimos ${months} meses.`}
        actions={
          <>
            <div className="flex overflow-hidden rounded-lg border border-[var(--border-control)]">
              {RANGES.map((range) => {
                const active = String(months) === range.key;
                return (
                  <Link
                    key={range.key}
                    href={`/reportes?meses=${range.key}`}
                    className="px-3 py-2 text-sm font-medium transition-colors focus-ring"
                    style={{
                      background: active ? "var(--brand)" : "var(--surface)",
                      color: active ? "var(--brand-text)" : "var(--text-muted)",
                    }}
                  >
                    {range.label}
                  </Link>
                );
              })}
            </div>
            <PrintButton />
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Ingresos"
          value={money(ingresos, true)}
          icon={<Banknote className="size-5" />}
          tone="success"
        />
        <StatCard
          label="Gastos"
          value={money(gastos, true)}
          hint="Operación más taller"
          icon={<TruckIcon className="size-5" />}
          tone="warning"
        />
        <StatCard
          label="Ganancia"
          value={money(utilidad, true)}
          hint={margen !== null ? `Margen ${percent(margen)}` : undefined}
          icon={<TrendingUp className="size-5" />}
          tone={utilidad >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Combustible"
          value={money(fuelCost, true)}
          hint={`${number(liters)} litros`}
          icon={<Fuel className="size-5" />}
          tone="info"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Cuánto entró y cuánto salió"
            description="Mes a mes"
          />
          <div className="px-3 py-4">
            <RevenueChart data={series} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Distribución de gastos"
            description={`Últimos ${months} meses`}
          />
          <div className="px-5 py-4">
            <CategoryBreakdown items={breakdown} />
          </div>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader
          title="Rentabilidad por camión"
          description="Acumulado histórico de cada vehículo de la flota activa."
        />
        <Table>
          <THead>
            <TR>
              <TH>Camión</TH>
              <TH align="right">Viajes</TH>
              <TH align="right">Kilómetros</TH>
              <TH align="right">Ingresos</TH>
              <TH align="right">Gastos</TH>
              <TH align="right">Ganancia</TH>
              <TH align="right">Margen</TH>
              <TH align="right">Costo/km</TH>
            </TR>
          </THead>
          <TBody>
            {perTruck.map((truck) => (
              <TR key={truck.id}>
                <TD>
                  <Link
                    href={`/camiones/${truck.id}`}
                    className="rounded font-mono text-sm font-semibold text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                  >
                    {truck.plate}
                  </Link>
                  {truck.nickname && (
                    <p className="text-sm text-[var(--text-muted)]">
                      {truck.nickname}
                    </p>
                  )}
                </TD>
                <TD align="right">{truck.tripCount}</TD>
                <TD align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                  {km(truck.km)}
                </TD>
                <TD align="right" className="whitespace-nowrap">
                  {money(truck.ingresos, true)}
                </TD>
                <TD align="right" className="whitespace-nowrap">
                  {money(truck.egresos, true)}
                </TD>
                <TD
                  align="right"
                  className="whitespace-nowrap font-semibold"
                  style={{
                    color:
                      truck.utilidad >= 0
                        ? "var(--tone-success-fg)"
                        : "var(--tone-danger-fg)",
                  }}
                >
                  {money(truck.utilidad, true)}
                </TD>
                <TD align="right" className="whitespace-nowrap">
                  {percent(truck.margen)}
                </TD>
                <TD align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                  {truck.costoPorKm !== null ? money(truck.costoPorKm) : "—"}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader
          title="Rutas más rentables"
          description={`Top 10 por facturación en los últimos ${months} meses.`}
        />
        <Table>
          <THead>
            <TR>
              <TH>Ruta</TH>
              <TH align="right">Viajes</TH>
              <TH align="right">Kilómetros</TH>
              <TH align="right">Facturación</TH>
              <TH align="right">Promedio por viaje</TH>
            </TR>
          </THead>
          <TBody>
            {routes.length === 0 ? (
              <TR>
                <TD colSpan={5} align="center" className="py-8 text-[var(--text-muted)]">
                  No hay viajes en el periodo seleccionado.
                </TD>
              </TR>
            ) : (
              routes.map((route) => {
                const revenue = round2(route._sum.revenue ?? 0);
                return (
                  <TR key={`${route.origin}-${route.destination}`}>
                    <TD className="font-medium">
                      {route.origin} → {route.destination}
                    </TD>
                    <TD align="right">{route._count._all}</TD>
                    <TD align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                      {km(round2(route._sum.distanceKm ?? 0))}
                    </TD>
                    <TD align="right" className="whitespace-nowrap font-medium">
                      {money(revenue)}
                    </TD>
                    <TD align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                      {money(round2(revenue / route._count._all))}
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>

      <p className="mt-4 flex items-center gap-1.5 text-sm text-[var(--text-muted)] no-print">
        <Printer className="size-3.5" />
        Usá «Imprimir» para generar un PDF del reporte con el diálogo del
        navegador.
      </p>
    </>
  );
}
