import { AlertTriangle, Bell, FileCheck, FileWarning } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAlerts } from "@/lib/alerts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { FilterBar } from "@/components/ui/FilterBar";
import { AlertList } from "@/components/AlertList";
import { DocumentTable } from "@/components/lists/DocumentTable";
import { DocumentModal } from "@/components/forms/DocumentModal";
import { DOCUMENT_TYPE, toOptions } from "@/lib/labels";
import { DocumentType } from "@/generated/prisma/enums";
import { fullName } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Documentos" };

export default async function DocumentsPage({
  searchParams,
}: PageProps<"/documentos">) {
  const user = await requireUser();
  const params = await searchParams;
  const editable = canWrite(user);

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const type = typeof params.type === "string" ? params.type : "";
  const estado = typeof params.estado === "string" ? params.estado : "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  const expiryFilter: Prisma.DocumentWhereInput =
    estado === "vencidos"
      ? { expiresAt: { lt: today } }
      : estado === "porvencer"
        ? { expiresAt: { gte: today, lte: in30 } }
        : estado === "vigentes"
          ? { expiresAt: { gt: in30 } }
          : {};

  const where: Prisma.DocumentWhereInput = {
    ...(type in DocumentType ? { type: type as DocumentType } : {}),
    ...expiryFilter,
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { issuer: { contains: q, mode: "insensitive" } },
            { truck: { plate: { contains: q, mode: "insensitive" } } },
            {
              driver: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [rows, alerts, expired, soon, valid, trucks, drivers] =
    await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { expiresAt: "asc" },
        include: {
          truck: { select: { id: true, plate: true } },
          driver: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      getAlerts(),
      prisma.document.count({ where: { expiresAt: { lt: today } } }),
      prisma.document.count({
        where: { expiresAt: { gte: today, lte: in30 } },
      }),
      prisma.document.count({ where: { expiresAt: { gt: in30 } } }),
      prisma.truck.findMany({
        where: { archived: false },
        orderBy: { plate: "asc" },
        select: { id: true, plate: true },
      }),
      prisma.driver.findMany({
        where: { archived: false },
        orderBy: { firstName: "asc" },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

  const truckOptions = trucks.map((t) => ({ id: t.id, label: t.plate }));
  const driverOptions = drivers.map((d) => ({ id: d.id, label: fullName(d) }));

  return (
    <>
      <PageHeader
        title="Documentos y vencimientos"
        description="SOAT, tecnomecánica, pólizas, licencias y mantenimientos programados."
        actions={
          editable && (
            <DocumentModal trucks={truckOptions} drivers={driverOptions} />
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Vencidos"
          value={expired}
          hint="Requieren acción inmediata"
          icon={<AlertTriangle className="size-5" />}
          tone="red"
          href="/documentos?estado=vencidos"
        />
        <StatCard
          label="Por vencer"
          value={soon}
          hint="En los próximos 30 días"
          icon={<Bell className="size-5" />}
          tone="amber"
          href="/documentos?estado=porvencer"
        />
        <StatCard
          label="Vigentes"
          value={valid}
          hint="Más de 30 días de vigencia"
          icon={<FileCheck className="size-5" />}
          tone="green"
          href="/documentos?estado=vigentes"
        />
      </div>

      <div className="mb-5">
        <Card>
          <CardHeader
            title="Alertas activas"
            description="Incluye licencias de conducción y mantenimientos programados, además de los documentos."
            icon={<Bell className="size-4" />}
          />
          <AlertList alerts={alerts} limit={8} />
        </Card>
      </div>

      <FilterBar
        placeholder="Buscar por número, entidad, placa o conductor…"
        filters={[
          { name: "type", label: "Tipo", options: toOptions(DOCUMENT_TYPE) },
          {
            name: "estado",
            label: "Vigencia",
            options: [
              { value: "vencidos", label: "Vencidos" },
              { value: "porvencer", label: "Por vencer (30 días)" },
              { value: "vigentes", label: "Vigentes" },
            ],
          },
        ]}
      />

      <Card>
        <CardHeader
          title="Todos los documentos"
          description={`${rows.length} registro${rows.length === 1 ? "" : "s"}`}
          icon={<FileWarning className="size-4" />}
        />
        <DocumentTable
          rows={rows}
          canEdit={editable}
          trucks={truckOptions}
          drivers={driverOptions}
          action={
            editable && (
              <DocumentModal trucks={truckOptions} drivers={driverOptions} />
            )
          }
        />
      </Card>
    </>
  );
}
