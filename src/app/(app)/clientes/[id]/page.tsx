import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, Building2, Package, Route } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, DataItem, EmptyState } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { CustomerModal } from "@/components/forms/CustomerModal";
import { CARGO_STATUS, CARGO_UNIT } from "@/lib/labels";
import { date, money, number, round2 } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: customer?.name ?? "Cliente" };
}

export default async function CustomerDetailPage({
  params,
}: PageProps<"/clientes/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const editable = canWrite(user);

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      cargos: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          trip: {
            select: {
              id: true,
              code: true,
              origin: true,
              destination: true,
              departureAt: true,
              truck: { select: { plate: true } },
            },
          },
        },
      },
    },
  });

  if (!customer) notFound();

  const billed = round2(
    customer.cargos.reduce((acc, c) => acc + (c.freightCharge ?? 0), 0)
  );
  const declared = round2(
    customer.cargos.reduce((acc, c) => acc + (c.declaredValue ?? 0), 0)
  );
  const trips = new Set(customer.cargos.map((c) => c.trip.id)).size;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {customer.name}
            {customer.archived && <Badge tone="slate">Archivado</Badge>}
          </span>
        }
        description={customer.taxId ? `NIT ${customer.taxId}` : undefined}
        breadcrumbs={[
          { label: "Clientes", href: "/clientes" },
          { label: customer.name },
        ]}
        actions={editable && <CustomerModal values={customer} />}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cargas transportadas"
          value={customer.cargos.length}
          icon={<Package className="size-5" />}
          tone="violet"
        />
        <StatCard
          label="Viajes"
          value={trips}
          icon={<Route className="size-5" />}
          tone="blue"
        />
        <StatCard
          label="Facturado"
          value={money(billed, true)}
          hint="Suma de fletes por carga"
          icon={<Banknote className="size-5" />}
          tone="green"
        />
        <StatCard
          label="Valor declarado"
          value={money(declared, true)}
          hint="Mercancía transportada"
          icon={<Building2 className="size-5" />}
          tone="teal"
        />
      </div>

      <Card className="mb-5">
        <CardHeader title="Datos de contacto" />
        <div className="px-5 py-4">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <DataItem label="Contacto">{customer.contactName ?? "—"}</DataItem>
            <DataItem label="Teléfono">
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone.replace(/\s/g, "")}`}
                  className="rounded text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                >
                  {customer.phone}
                </a>
              ) : (
                "—"
              )}
            </DataItem>
            <DataItem label="Correo">{customer.email ?? "—"}</DataItem>
            <DataItem label="Ciudad">{customer.city ?? "—"}</DataItem>
            <DataItem label="Dirección">{customer.address ?? "—"}</DataItem>
            <DataItem label="Alta">{date(customer.createdAt)}</DataItem>
          </dl>
          {customer.notes && (
            <div className="mt-4 rounded-lg bg-[var(--surface-2)] p-3">
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Notas
              </p>
              <p className="mt-1 whitespace-pre-line text-sm">
                {customer.notes}
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Cargas transportadas"
          description="Historial de mercancía movida para este cliente."
        />
        {customer.cargos.length === 0 ? (
          <EmptyState
            icon={<Package className="size-5" />}
            title="Sin cargas registradas"
            description="Cuando agregues cargas a un viaje y las asocies a este cliente, aparecerán acá."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Carga</TH>
                <TH>Viaje</TH>
                <TH>Ruta</TH>
                <TH>Fecha</TH>
                <TH align="right">Peso</TH>
                <TH align="right">Flete</TH>
                <TH>Estado</TH>
              </TR>
            </THead>
            <TBody>
              {customer.cargos.map((cargo) => (
                <TR key={cargo.id}>
                  <TD>
                    <p className="font-medium">{cargo.description}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {cargo.cargoType ?? "Sin clasificar"}
                    </p>
                  </TD>
                  <TD>
                    <Link
                      href={`/viajes/${cargo.trip.id}`}
                      className="rounded font-mono font-semibold text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                    >
                      {cargo.trip.code}
                    </Link>
                    <p className="font-mono text-[var(--text-muted)]">
                      {cargo.trip.truck.plate}
                    </p>
                  </TD>
                  <TD>
                    {cargo.trip.origin} → {cargo.trip.destination}
                  </TD>
                  <TD className="whitespace-nowrap text-[var(--text-muted)]">
                    {date(cargo.trip.departureAt)}
                  </TD>
                  <TD align="right" className="whitespace-nowrap">
                    {number(cargo.weight, cargo.unit === "TON" ? 1 : 0)}{" "}
                    <span className="text-[var(--text-muted)]">
                      {CARGO_UNIT[cargo.unit]}
                    </span>
                  </TD>
                  <TD align="right" className="whitespace-nowrap font-medium">
                    {cargo.freightCharge ? money(cargo.freightCharge) : "—"}
                  </TD>
                  <TD>
                    <Badge tone={CARGO_STATUS[cargo.status].tone}>
                      {CARGO_STATUS[cargo.status].label}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
