import { CalendarClock, Wrench } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { MaintenanceTable } from "@/components/lists/MaintenanceTable";
import { MaintenanceModal } from "@/components/forms/MaintenanceModal";
import {
  MAINTENANCE_STATUS,
  MAINTENANCE_TYPE,
  toOptions,
} from "@/lib/labels";
import { MaintenanceStatus, MaintenanceType } from "@/generated/prisma/enums";
import { money, round2, startOfMonthLabel } from "@/lib/format";
import { startOfMonth } from "@/lib/stats";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Mantenimiento" };

const PAGE_SIZE = 25;

export default async function MaintenancePage({
  searchParams,
}: PageProps<"/mantenimiento">) {
  const user = await requireUser();
  const params = await searchParams;
  const editable = canWrite(user);

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const type = typeof params.type === "string" ? params.type : "";
  const truckId = typeof params.truck === "string" ? params.truck : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.MaintenanceWhereInput = {
    ...(status in MaintenanceStatus
      ? { status: status as MaintenanceStatus }
      : {}),
    ...(type in MaintenanceType ? { type: type as MaintenanceType } : {}),
    ...(truckId ? { truckId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { workshop: { contains: q, mode: "insensitive" } },
            { invoiceNumber: { contains: q, mode: "insensitive" } },
            { truck: { plate: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const monthStart = startOfMonth(new Date());

  const [rows, total, totals, monthTotal, scheduled, trucks] =
    await Promise.all([
      prisma.maintenance.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { truck: { select: { id: true, plate: true } } },
      }),
      prisma.maintenance.count({ where }),
      prisma.maintenance.aggregate({
        where: { ...where, status: { not: "CANCELLED" } },
        _sum: { cost: true },
      }),
      prisma.maintenance.aggregate({
        where: { date: { gte: monthStart }, status: { not: "CANCELLED" } },
        _sum: { cost: true },
      }),
      prisma.maintenance.count({
        where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
      }),
      prisma.truck.findMany({
        where: { archived: false },
        orderBy: { plate: "asc" },
        select: { id: true, plate: true, nickname: true },
      }),
    ]);

  return (
    <>
      <PageHeader
        title="Mantenimiento"
        description="Servicios, reparaciones y revisiones de toda la flota."
        actions={editable && <MaintenanceModal trucks={trucks} />}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Costo del filtro actual"
          value={money(round2(totals._sum.cost ?? 0), true)}
          hint={`${total} registros`}
          icon={<Wrench className="size-5" />}
          tone="warning"
        />
        <StatCard
          label={`Gastado en ${startOfMonthLabel()}`}
          value={money(round2(monthTotal._sum.cost ?? 0), true)}
          hint="Mes en curso"
          icon={<Wrench className="size-5" />}
          tone="danger"
        />
        <StatCard
          label="Servicios pendientes"
          value={scheduled}
          hint="Programados o en proceso"
          icon={<CalendarClock className="size-5" />}
          tone="neutral"
        />
      </div>

      <FilterBar
        placeholder="Buscar por trabajo, taller, factura o placa…"
        filters={[
          {
            name: "status",
            label: "Estado",
            options: toOptions(MAINTENANCE_STATUS),
          },
          { name: "type", label: "Tipo", options: toOptions(MAINTENANCE_TYPE) },
          {
            name: "truck",
            label: "Camión",
            options: trucks.map((t) => ({ value: t.id, label: t.plate })),
          },
        ]}
      />

      <Card>
        <CardHeader
          title="Historial"
          description={`${total} registro${total === 1 ? "" : "s"}`}
        />
        <MaintenanceTable
          rows={rows}
          canEdit={editable}
          trucks={trucks}
          action={editable && <MaintenanceModal trucks={trucks} />}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
      </Card>
    </>
  );
}
