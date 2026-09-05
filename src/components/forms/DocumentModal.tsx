"use client";

import { Pencil, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalForm } from "@/components/ui/ModalForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { createDocument, updateDocument } from "@/actions/documents";
import {
  DOCUMENT_TYPE,
  DRIVER_DOCUMENT_TYPES,
  TRUCK_DOCUMENT_TYPES,
} from "@/lib/labels";
import { toDateInput } from "@/lib/format";
import type { DocumentType } from "@/generated/prisma/enums";

export type DocumentValues = {
  id: string;
  truckId: string | null;
  driverId: string | null;
  type: DocumentType;
  number: string | null;
  issuer: string | null;
  issuedAt: Date | null;
  expiresAt: Date;
  notes: string | null;
};

type Option = { id: string; label: string };

export function DocumentModal({
  values,
  owner,
  trucks = [],
  drivers = [],
}: {
  values?: DocumentValues;
  /** Si el documento cuelga de una ficha concreta, se fija el propietario. */
  owner?: { kind: "truck" | "driver"; id: string };
  trucks?: Option[];
  drivers?: Option[];
}) {
  const editing = Boolean(values);
  const action = values ? updateDocument.bind(null, values.id) : createDocument;

  const ownerKind =
    owner?.kind ?? (values?.driverId ? "driver" : "truck");
  const types =
    ownerKind === "driver" ? DRIVER_DOCUMENT_TYPES : TRUCK_DOCUMENT_TYPES;

  return (
    <Modal
      trigger={{
        label: editing ? (
          <Pencil className="size-3.5" />
        ) : (
          <>
            <Plus className="size-4" />
            Agregar documento
          </>
        ),
        variant: editing ? "ghost" : "primary",
        size: "sm",
      }}
      title={editing ? "Editar documento" : "Agregar documento"}
      description="El sistema avisa cuando se acerque el vencimiento."
    >
      {(close) => (
        <ModalForm action={action} close={close}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {owner ? (
              <input
                type="hidden"
                name={owner.kind === "truck" ? "truckId" : "driverId"}
                value={owner.id}
              />
            ) : (
              <>
                <Field label="Camión" htmlFor="d-truck">
                  <Select
                    id="d-truck"
                    name="truckId"
                    defaultValue={values?.truckId ?? ""}
                  >
                    <option value="">— Ninguno —</option>
                    {trucks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Conductor"
                  htmlFor="d-driver"
                  hint="Elige un camión o un conductor."
                >
                  <Select
                    id="d-driver"
                    name="driverId"
                    defaultValue={values?.driverId ?? ""}
                  >
                    <option value="">— Ninguno —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}

            <Field label="Tipo de documento" htmlFor="d-type" required>
              <Select id="d-type" name="type" defaultValue={values?.type ?? types[0]}>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {DOCUMENT_TYPE[type]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Número" htmlFor="d-number">
              <Input
                id="d-number"
                name="number"
                defaultValue={values?.number ?? ""}
                placeholder="SOAT-1234567"
              />
            </Field>

            <Field label="Fecha de expedición" htmlFor="d-issued">
              <Input
                id="d-issued"
                name="issuedAt"
                type="date"
                defaultValue={toDateInput(values?.issuedAt)}
              />
            </Field>

            <Field label="Fecha de vencimiento" htmlFor="d-expires" required>
              <Input
                id="d-expires"
                name="expiresAt"
                type="date"
                required
                defaultValue={toDateInput(values?.expiresAt)}
              />
            </Field>

            <Field label="Entidad emisora" htmlFor="d-issuer" className="sm:col-span-2">
              <Input
                id="d-issuer"
                name="issuer"
                defaultValue={values?.issuer ?? ""}
                placeholder="Seguros del Estado"
              />
            </Field>

            <Field
              label="Archivo"
              htmlFor="d-file"
              hint="Opcional: PDF o foto del documento, máximo 10 MB."
              className="sm:col-span-2"
            >
              <input
                id="d-file"
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="input-base file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-2)] file:px-2.5 file:py-1 file:text-sm file:text-[var(--text)]"
              />
            </Field>

            <Field label="Notas" htmlFor="d-notes" className="sm:col-span-2">
              <Textarea
                id="d-notes"
                name="notes"
                defaultValue={values?.notes ?? ""}
              />
            </Field>
          </div>
        </ModalForm>
      )}
    </Modal>
  );
}
