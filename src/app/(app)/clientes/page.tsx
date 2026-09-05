import Link from "next/link";
import { Archive, ArchiveRestore, Building2, Trash2 } from "lucide-react";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { FilterBar } from "@/components/ui/FilterBar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { CustomerModal } from "@/components/forms/CustomerModal";
import { archiveCustomer, deleteCustomer } from "@/actions/customers";
import { money, number, round2 } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Clientes" };

export default async function CustomersPage({
  searchParams,
}: PageProps<"/clientes">) {
  const user = await requireUser();
  const params = await searchParams;
  const editable = canWrite(user);

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const showArchived = params.archivados === "1";

  const where: Prisma.CustomerWhereInput = {
    archived: showArchived,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { taxId: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [customers, archivedCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        cargos: { select: { freightCharge: true, weight: true, unit: true } },
      },
    }),
    prisma.customer.count({ where: { archived: true } }),
  ]);

  const rows = customers.map((customer) => ({
    ...customer,
    cargoCount: customer.cargos.length,
    billed: round2(
      customer.cargos.reduce((acc, c) => acc + (c.freightCharge ?? 0), 0)
    ),
  }));

  return (
    <>
      <PageHeader
        title={showArchived ? "Clientes archivados" : "Clientes"}
        description="Las empresas para las que transportas carga."
        actions={editable && <CustomerModal />}
      />

      <FilterBar placeholder="Buscar por nombre, NIT o ciudad…">
        {(archivedCount > 0 || showArchived) && (
          <LinkButton
            href={showArchived ? "/clientes" : "/clientes?archivados=1"}
            variant="secondary"
            size="sm"
          >
            {showArchived ? "Ver activos" : `Archivados (${archivedCount})`}
          </LinkButton>
        )}
      </FilterBar>

      <Card>
        <CardHeader
          title="Listado"
          description={`${rows.length} cliente${rows.length === 1 ? "" : "s"}`}
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={<Building2 className="size-5" />}
            title={q ? "Ningún cliente coincide" : "Todavía no hay clientes"}
            description={
              q
                ? "Prueba con otro nombre o quita el filtro."
                : "Agrega tus clientes para asociarlos a las cargas de cada viaje."
            }
            action={editable && !q && <CustomerModal />}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Contacto</TH>
                <TH>Ciudad</TH>
                <TH align="right">Cargas</TH>
                <TH align="right">Facturado</TH>
                {editable && <TH align="right">Acciones</TH>}
              </TR>
            </THead>
            <TBody>
              {rows.map((customer) => (
                <TR key={customer.id}>
                  <TD>
                    <p className="font-medium">{customer.name}</p>
                    {customer.taxId && (
                      <p className="font-mono text-[var(--text-muted)]">
                        {customer.taxId}
                      </p>
                    )}
                  </TD>
                  <TD className="text-[var(--text-muted)]">
                    <p>{customer.contactName ?? "—"}</p>
                    {customer.phone && (
                      <a
                        href={`tel:${customer.phone.replace(/\s/g, "")}`}
                        className="rounded underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                      >
                        {customer.phone}
                      </a>
                    )}
                  </TD>
                  <TD className="text-[var(--text-muted)]">
                    {customer.city ?? "—"}
                  </TD>
                  <TD align="right">{number(customer.cargoCount)}</TD>
                  <TD align="right" className="whitespace-nowrap font-medium">
                    {money(customer.billed)}
                  </TD>
                  {editable && (
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        <CustomerModal values={customer} />
                        <form action={archiveCustomer}>
                          <input type="hidden" name="id" value={customer.id} />
                          <input
                            type="hidden"
                            name="archived"
                            value={customer.archived ? "false" : "true"}
                          />
                          <ConfirmButton
                            variant="ghost"
                            title={customer.archived ? "Restaurar" : "Archivar"}
                            message={
                              customer.archived
                                ? `¿Restaurar a ${customer.name}?`
                                : `¿Archivar a ${customer.name}? Deja de aparecer al crear cargas, pero su historial se conserva.`
                            }
                          >
                            {customer.archived ? (
                              <ArchiveRestore className="size-3.5" />
                            ) : (
                              <Archive className="size-3.5" />
                            )}
                          </ConfirmButton>
                        </form>
                        <form action={deleteCustomer}>
                          <input type="hidden" name="id" value={customer.id} />
                          <ConfirmButton
                            variant="ghost"
                            title="Eliminar"
                            message={`¿Eliminar definitivamente a ${customer.name}? Sus ${customer.cargoCount} cargas quedarán sin cliente asociado.`}
                          >
                            <Trash2 className="size-3.5" />
                          </ConfirmButton>
                        </form>
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <p className="mt-3 text-sm text-[var(--text-muted)]">
        El monto facturado suma el flete asignado a cada carga del cliente. Si
        cargas el flete solo a nivel de viaje, revisa el detalle en{" "}
        <Link
          href="/viajes"
          className="rounded text-[var(--brand)] underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
        >
          Viajes
        </Link>
        .
      </p>
    </>
  );
}
