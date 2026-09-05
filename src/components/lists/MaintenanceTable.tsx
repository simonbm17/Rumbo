import Link from "next/link";
import { Trash2, Wrench } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import {
  MaintenanceModal,
  type MaintenanceValues,
} from "@/components/forms/MaintenanceModal";
import { deleteMaintenance } from "@/actions/maintenance";
import { MAINTENANCE_STATUS, MAINTENANCE_TYPE } from "@/lib/labels";
import { date, km, money } from "@/lib/format";

export type MaintenanceRow = MaintenanceValues & {
  truck: { id: string; plate: string };
};

export function MaintenanceTable({
  rows,
  showTruck = true,
  canEdit,
  trucks,
  defaultTruckId,
  action,
}: {
  rows: MaintenanceRow[];
  showTruck?: boolean;
  canEdit: boolean;
  trucks: { id: string; plate: string; nickname: string | null }[];
  defaultTruckId?: string;
  action?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Wrench className="size-5" />}
        title="Sin mantenimientos"
        description="Registra los servicios para llevar el historial y el costo del vehículo."
        action={action}
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Trabajo</TH>
          {showTruck && <TH>Camión</TH>}
          <TH>Tipo</TH>
          <TH>Fecha</TH>
          <TH align="right">Kilometraje</TH>
          <TH align="right">Costo</TH>
          <TH>Estado</TH>
          {canEdit && <TH align="right">Acciones</TH>}
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD>
              <p className="font-medium">{row.title}</p>
              {row.workshop && (
                <p className="text-sm text-[var(--text-muted)]">{row.workshop}</p>
              )}
            </TD>
            {showTruck && (
              <TD className="whitespace-nowrap">
                <Link
                  href={`/camiones/${row.truck.id}`}
                  className="rounded font-mono underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                >
                  {row.truck.plate}
                </Link>
              </TD>
            )}
            <TD className="text-[var(--text-muted)]">
              {MAINTENANCE_TYPE[row.type]}
            </TD>
            <TD className="whitespace-nowrap text-[var(--text-muted)]">
              {date(row.date)}
            </TD>
            <TD align="right" className="whitespace-nowrap text-[var(--text-muted)]">
              {row.odometerKm ? km(row.odometerKm) : "—"}
            </TD>
            <TD align="right" className="whitespace-nowrap font-medium">
              {money(row.cost)}
            </TD>
            <TD>
              <Badge tone={MAINTENANCE_STATUS[row.status].tone}>
                {MAINTENANCE_STATUS[row.status].label}
              </Badge>
            </TD>
            {canEdit && (
              <TD align="right">
                <div className="flex items-center justify-end gap-1">
                  <MaintenanceModal
                    trucks={trucks}
                    values={row}
                    defaultTruckId={defaultTruckId}
                  />
                  <form action={deleteMaintenance}>
                    <input type="hidden" name="id" value={row.id} />
                    <ConfirmButton
                      message={`¿Eliminar el mantenimiento «${row.title}»? Esta acción no se puede deshacer.`}
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
