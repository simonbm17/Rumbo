import { Banknote, Droplet, Receipt } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { ExpenseTable } from "@/components/lists/ExpenseTable";
import { ExpenseModal } from "@/components/forms/ExpenseModal";
import { CategoryBreakdown } from "@/components/charts/CategoryBreakdown";
import { EXPENSE_CATEGORY, toOptions } from "@/lib/labels";
import { ExpenseCategory } from "@/generated/prisma/enums";
import { fullName, money, round2, startOfMonthLabel } from "@/lib/format";
import { startOfMonth } from "@/lib/stats";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Gastos" };

const PAGE_SIZE = 25;

export default async function ExpensesPage({
  searchParams,
}: PageProps<"/gastos">) {
  const user = await requireUser();
  const params = await searchParams;
  const editable = canWrite(user);

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const category = typeof params.category === "string" ? params.category : "";
  const truckId = typeof params.truck === "string" ? params.truck : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.ExpenseWhereInput = {
    ...(category in ExpenseCategory
      ? { category: category as ExpenseCategory }
      : {}),
    ...(truckId ? { truckId } : {}),
    ...(q
      ? {
          OR: [
            { description: { contains: q, mode: "insensitive" } },
            { supplier: { contains: q, mode: "insensitive" } },
            { invoiceNumber: { contains: q, mode: "insensitive" } },
            { truck: { plate: { contains: q, mode: "insensitive" } } },
            { trip: { code: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const monthStart = startOfMonth(new Date());

  const [rows, total, totals, monthTotal, fuel, byCategory, trucks, trips, drivers] =
    await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          truck: { select: { id: true, plate: true } },
          trip: { select: { id: true, code: true } },
        },
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
      prisma.expense.aggregate({
        where: { date: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...where, category: "COMBUSTIBLE" },
        _sum: { amount: true, liters: true },
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where,
        _sum: { amount: true },
      }),
      prisma.truck.findMany({
        where: { archived: false },
        orderBy: { plate: "asc" },
        select: { id: true, plate: true },
      }),
      prisma.trip.findMany({
        orderBy: { departureAt: "desc" },
        take: 80,
        select: { id: true, code: true, origin: true, destination: true },
      }),
      prisma.driver.findMany({
        where: { archived: false },
        orderBy: { firstName: "asc" },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

  const truckOptions = trucks.map((t) => ({ id: t.id, label: t.plate }));
  const tripOptions = trips.map((t) => ({
    id: t.id,
    label: `${t.code} — ${t.origin} → ${t.destination}`,
  }));
  const driverOptions = drivers.map((d) => ({ id: d.id, label: fullName(d) }));

  const breakdown = byCategory
    .map((row) => ({
      label: EXPENSE_CATEGORY[row.category],
      value: round2(row._sum.amount ?? 0),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader
        title="Gastos"
        description="Todo lo que cuesta mover la flota: combustible, peajes, viáticos y más."
        actions={
          editable && (
            <ExpenseModal
              trucks={truckOptions}
              trips={tripOptions}
              drivers={driverOptions}
            />
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total del filtro actual"
          value={money(round2(totals._sum.amount ?? 0), true)}
          hint={`${total} movimientos`}
          icon={<Receipt className="size-5" />}
          tone="warning"
        />
        <StatCard
          label={`Gastado en ${startOfMonthLabel()}`}
          value={money(round2(monthTotal._sum.amount ?? 0), true)}
          hint="Mes en curso, toda la flota"
          icon={<Banknote className="size-5" />}
          tone="danger"
        />
        <StatCard
          label="Combustible"
          value={money(round2(fuel._sum.amount ?? 0), true)}
          hint={`${new Intl.NumberFormat("es-CO").format(round2(fuel._sum.liters ?? 0))} litros`}
          icon={<Droplet className="size-5" />}
          tone="info"
        />
      </div>

      <FilterBar
        placeholder="Buscar por descripción, proveedor, factura o placa…"
        filters={[
          {
            name: "category",
            label: "Categoría",
            options: toOptions(EXPENSE_CATEGORY),
          },
          {
            name: "truck",
            label: "Camión",
            options: trucks.map((t) => ({ value: t.id, label: t.plate })),
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Movimientos"
            description={`${total} gasto${total === 1 ? "" : "s"}`}
          />
          <ExpenseTable
            rows={rows}
            canEdit={editable}
            trucks={truckOptions}
            trips={tripOptions}
            drivers={driverOptions}
            action={
              editable && (
                <ExpenseModal
                  trucks={truckOptions}
                  trips={tripOptions}
                  drivers={driverOptions}
                />
              )
            }
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
        </Card>

        <Card>
          <CardHeader
            title="Por categoría"
            description="Sobre el filtro aplicado"
          />
          <div className="px-5 py-4">
            <CategoryBreakdown items={breakdown} />
          </div>
        </Card>
      </div>
    </>
  );
}
