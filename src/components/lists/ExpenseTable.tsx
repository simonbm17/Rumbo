import Link from "next/link";
import { Banknote, FileText, Trash2 } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { ExpenseModal, type ExpenseValues } from "@/components/forms/ExpenseModal";
import { deleteExpense } from "@/actions/expenses";
import { EXPENSE_CATEGORY } from "@/lib/labels";
import { date, money, number } from "@/lib/format";

export type ExpenseRow = ExpenseValues & {
  truck: { id: string; plate: string } | null;
  trip: { id: string; code: string } | null;
  receiptUrl: string | null;
};

type Option = { id: string; label: string };

export function ExpenseTable({
  rows,
  showTruck = true,
  canEdit,
  trucks,
  trips = [],
  drivers = [],
  defaultTruckId,
  defaultTripId,
  action,
}: {
  rows: ExpenseRow[];
  showTruck?: boolean;
  canEdit: boolean;
  trucks: Option[];
  trips?: Option[];
  drivers?: Option[];
  defaultTruckId?: string;
  defaultTripId?: string;
  action?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Banknote className="size-5" />}
        title="Sin gastos"
        description="Cargá combustible, peajes y viáticos para conocer el costo real de la operación."
        action={action}
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Categoría</TH>
          <TH>Detalle</TH>
          {showTruck && <TH>Camión</TH>}
          <TH>Viaje</TH>
          <TH>Fecha</TH>
          <TH align="right">Monto</TH>
          {canEdit && <TH align="right">Acciones</TH>}
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className="whitespace-nowrap font-medium">
              {EXPENSE_CATEGORY[row.category]}
            </TD>
            <TD>
              <div className="flex items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[var(--text-muted)]">
                    {row.description ?? "—"}
                  </p>
                  {row.liters ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      {number(row.liters, 1)} L
                      {row.pricePerLiter
                        ? ` × ${money(row.pricePerLiter)}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                {row.receiptUrl && (
                  <a
                    href={row.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Ver comprobante"
                    className="shrink-0 rounded p-1 text-[var(--text-muted)] hover:text-[var(--brand)] focus-ring"
                  >
                    <FileText className="size-4" />
                  </a>
                )}
              </div>
            </TD>
            {showTruck && (
              <TD className="whitespace-nowrap">
                {row.truck ? (
                  <Link
                    href={`/camiones/${row.truck.id}`}
                    className="rounded font-mono underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                  >
                    {row.truck.plate}
                  </Link>
                ) : (
                  <span className="text-[var(--text-muted)]">—</span>
                )}
              </TD>
            )}
            <TD>
              {row.trip ? (
                <Link
                  href={`/viajes/${row.trip.id}`}
                  className="rounded font-mono underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                >
                  {row.trip.code}
                </Link>
              ) : (
                <span className="text-[var(--text-muted)]">—</span>
              )}
            </TD>
            <TD className="whitespace-nowrap text-[var(--text-muted)]">
              {date(row.date)}
            </TD>
            <TD align="right" className="whitespace-nowrap font-medium">
              {money(row.amount)}
            </TD>
            {canEdit && (
              <TD align="right">
                <div className="flex items-center justify-end gap-1">
                  <ExpenseModal
                    trucks={trucks}
                    trips={trips}
                    drivers={drivers}
                    values={row}
                    defaultTruckId={defaultTruckId}
                    defaultTripId={defaultTripId}
                  />
                  <form action={deleteExpense}>
                    <input type="hidden" name="id" value={row.id} />
                    <ConfirmButton
                      message="¿Eliminar este gasto? Esta acción no se puede deshacer."
                      variant="ghost"
                      title="Eliminar"
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
  );
}
