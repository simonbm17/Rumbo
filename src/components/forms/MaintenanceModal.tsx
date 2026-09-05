"use client";

import { Pencil, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalForm } from "@/components/ui/ModalForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { createMaintenance, updateMaintenance } from "@/actions/maintenance";
import { MAINTENANCE_STATUS, MAINTENANCE_TYPE, toOptions } from "@/lib/labels";
import { toDateInput } from "@/lib/format";
import type {
  MaintenanceStatus,
  MaintenanceType,
} from "@/generated/prisma/enums";

export type MaintenanceValues = {
  id: string;
  truckId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  title: string;
  description: string | null;
  date: Date;
  odometerKm: number | null;
  cost: number;
  workshop: string | null;
  invoiceNumber: string | null;
  nextServiceKm: number | null;
  nextServiceDate: Date | null;
};

export function MaintenanceModal({
  trucks,
  values,
  defaultTruckId,
}: {
  trucks: { id: string; plate: string; nickname: string | null }[];
  values?: MaintenanceValues;
  defaultTruckId?: string;
}) {
  const editing = Boolean(values);
  const action = values
    ? updateMaintenance.bind(null, values.id)
    : createMaintenance;

  return (
    <Modal
      trigger={{
        label: editing ? (
          <Pencil className="size-3.5" />
        ) : (
          <>
            <Plus className="size-4" />
            Registrar mantenimiento
          </>
        ),
        variant: editing ? "ghost" : "primary",
        size: "sm",
      }}
      title={editing ? "Editar mantenimiento" : "Registrar mantenimiento"}
      description="Servicios, reparaciones y revisiones del vehículo."
      size="lg"
    >
      {(close) => (
        <ModalForm action={action} close={close}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Camión" htmlFor="m-truck" required className="sm:col-span-2">
              <Select
                id="m-truck"
                name="truckId"
                required
                defaultValue={values?.truckId ?? defaultTruckId ?? ""}
                disabled={Boolean(defaultTruckId)}
              >
                <option value="" disabled>
                  Elige un camión
                </option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.plate}
                    {t.nickname ? ` — ${t.nickname}` : ""}
                  </option>
                ))}
              </Select>
              {/* Un <select disabled> no se envía: mandamos el valor aparte. */}
              {defaultTruckId && (
                <input type="hidden" name="truckId" value={defaultTruckId} />
              )}
            </Field>

            <Field
              label="Trabajo realizado"
              htmlFor="m-title"
              required
              className="sm:col-span-2"
            >
              <Input
                id="m-title"
                name="title"
                required
                defaultValue={values?.title}
                placeholder="Cambio de aceite y filtros"
              />
            </Field>

            <Field label="Tipo" htmlFor="m-type">
              <Select
                id="m-type"
                name="type"
                defaultValue={values?.type ?? "PREVENTIVO"}
              >
                {toOptions(MAINTENANCE_TYPE).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Estado" htmlFor="m-status">
              <Select
                id="m-status"
                name="status"
                defaultValue={values?.status ?? "COMPLETED"}
              >
                {toOptions(MAINTENANCE_STATUS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Fecha" htmlFor="m-date" required>
              <Input
                id="m-date"
                name="date"
                type="date"
                required
                defaultValue={toDateInput(values?.date ?? new Date())}
              />
            </Field>

            <Field label="Costo" htmlFor="m-cost">
              <Input
                id="m-cost"
                name="cost"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={values?.cost ?? ""}
                placeholder="0"
              />
            </Field>

            <Field label="Kilometraje" htmlFor="m-odo" hint="Actualiza el odómetro del camión.">
              <Input
                id="m-odo"
                name="odometerKm"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={values?.odometerKm ?? ""}
              />
            </Field>

            <Field label="Taller" htmlFor="m-workshop">
              <Input
                id="m-workshop"
                name="workshop"
                defaultValue={values?.workshop ?? ""}
                placeholder="Tecnimotores S.A.S."
              />
            </Field>

            <Field label="Número de factura" htmlFor="m-invoice">
              <Input
                id="m-invoice"
                name="invoiceNumber"
                defaultValue={values?.invoiceNumber ?? ""}
              />
            </Field>

            <Field
              label="Próximo servicio (km)"
              htmlFor="m-next-km"
              hint="Para saber cuándo toca el siguiente."
            >
              <Input
                id="m-next-km"
                name="nextServiceKm"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={values?.nextServiceKm ?? ""}
              />
            </Field>

            <Field
              label="Próximo servicio (fecha)"
              htmlFor="m-next-date"
              hint="Genera una alerta cuando se acerque."
            >
              <Input
                id="m-next-date"
                name="nextServiceDate"
                type="date"
                defaultValue={toDateInput(values?.nextServiceDate)}
              />
            </Field>

            <Field label="Detalle" htmlFor="m-desc" className="sm:col-span-2">
              <Textarea
                id="m-desc"
                name="description"
                defaultValue={values?.description ?? ""}
                placeholder="Repuestos cambiados, observaciones del mecánico…"
              />
            </Field>
          </div>
        </ModalForm>
      )}
    </Modal>
  );
}
