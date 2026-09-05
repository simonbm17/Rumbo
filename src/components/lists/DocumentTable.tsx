import Link from "next/link";
import { FileText, FileWarning, Trash2 } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import {
  DocumentModal,
  type DocumentValues,
} from "@/components/forms/DocumentModal";
import { deleteDocument } from "@/actions/documents";
import { DOCUMENT_TYPE } from "@/lib/labels";
import { date, daysUntil, fullName, relativeDays } from "@/lib/format";
import type { Tone } from "@/lib/labels";

export type DocumentRow = DocumentValues & {
  fileUrl: string | null;
  truck: { id: string; plate: string } | null;
  driver: { id: string; firstName: string; lastName: string } | null;
};

type Option = { id: string; label: string };

/** Estado visual según cuántos días faltan para el vencimiento. */
function expiryState(days: number): { tone: Tone; label: string } {
  if (days < 0) return { tone: "danger", label: "Vencido" };
  if (days <= 7) return { tone: "danger", label: "Urgente" };
  if (days <= 30) return { tone: "warning", label: "Por vencer" };
  return { tone: "success", label: "Vigente" };
}

export function DocumentTable({
  rows,
  showOwner = true,
  canEdit,
  owner,
  trucks = [],
  drivers = [],
  action,
}: {
  rows: DocumentRow[];
  showOwner?: boolean;
  canEdit: boolean;
  owner?: { kind: "truck" | "driver"; id: string };
  trucks?: Option[];
  drivers?: Option[];
  action?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileWarning className="size-5" />}
        title="Sin documentos"
        description="Carga SOAT, tecnomecánica y pólizas para recibir avisos antes del vencimiento."
        action={action}
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Documento</TH>
          {showOwner && <TH>Pertenece a</TH>}
          <TH>Número</TH>
          <TH>Expedición</TH>
          <TH>Vencimiento</TH>
          <TH>Estado</TH>
          {canEdit && <TH align="right">Acciones</TH>}
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => {
          const days = daysUntil(row.expiresAt);
          const state = expiryState(days);
          return (
            <TR key={row.id}>
              <TD>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{DOCUMENT_TYPE[row.type]}</span>
                  {row.fileUrl && (
                    <a
                      href={row.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir archivo"
                      className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--brand)] focus-ring"
                    >
                      <FileText className="size-4" />
                    </a>
                  )}
                </div>
                {row.issuer && (
                  <p className="text-sm text-[var(--text-muted)]">{row.issuer}</p>
                )}
              </TD>
              {showOwner && (
                <TD className="whitespace-nowrap">
                  {row.truck ? (
                    <Link
                      href={`/camiones/${row.truck.id}`}
                      className="rounded font-mono underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                    >
                      {row.truck.plate}
                    </Link>
                  ) : row.driver ? (
                    <Link
                      href={`/conductores/${row.driver.id}`}
                      className="rounded underline decoration-2 underline-offset-4 decoration-[var(--border-control)] hover:decoration-[var(--brand)] focus-ring"
                    >
                      {fullName(row.driver)}
                    </Link>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </TD>
              )}
              <TD className="font-mono text-[var(--text-muted)]">
                {row.number ?? "—"}
              </TD>
              <TD className="whitespace-nowrap text-[var(--text-muted)]">
                {date(row.issuedAt)}
              </TD>
              <TD className="whitespace-nowrap">
                <p className="font-medium">{date(row.expiresAt)}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {relativeDays(days)}
                </p>
              </TD>
              <TD>
                <Badge tone={state.tone} dot>
                  {state.label}
                </Badge>
              </TD>
              {canEdit && (
                <TD align="right">
                  <div className="flex items-center justify-end gap-1">
                    <DocumentModal
                      values={row}
                      owner={owner}
                      trucks={trucks}
                      drivers={drivers}
                    />
                    <form action={deleteDocument}>
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmButton
                        message={`¿Eliminar el documento ${DOCUMENT_TYPE[row.type]}? Esta acción no se puede deshacer.`}
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
          );
        })}
      </TBody>
    </Table>
  );
}
