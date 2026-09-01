"use client";

import { Package, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalForm } from "@/components/ui/ModalForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { createCargo, updateCargo } from "@/actions/cargos";
import { CARGO_STATUS, CARGO_UNIT, toOptions } from "@/lib/labels";
import type { CargoStatus, CargoUnit } from "@/generated/prisma/enums";

export type CargoValues = {
  id: string;
  tripId: string;
  customerId: string | null;
  description: string;
  cargoType: string | null;
  weight: number;
  unit: CargoUnit;
  quantity: number | null;
  declaredValue: number | null;
  freightCharge: number | null;
  pickupLocation: string | null;
  deliveryLocation: string | null;
  status: CargoStatus;
  notes: string | null;
};

export function CargoModal({
  tripId,
  customers,
  values,
}: {
  tripId: string;
  customers: { id: string; name: string }[];
  values?: CargoValues;
}) {
  const editing = Boolean(values);
  const action = values ? updateCargo.bind(null, values.id) : createCargo;

  return (
    <Modal
      trigger={{
        label: editing ? (
          <Pencil className="size-3.5" />
        ) : (
          <>
            <Package className="size-4" />
            Agregar carga
          </>
        ),
        variant: editing ? "ghost" : "primary",
        size: "sm",
      }}
      title={editing ? "Editar carga" : "Agregar carga al viaje"}
      description="Qué se transporta, para quién y cuánto pesa."
      size="lg"
    >
      {(close) => (
        <ModalForm action={action} close={close}>
          <input type="hidden" name="tripId" value={tripId} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Descripción de la carga"
              htmlFor="c-desc"
              required
              className="sm:col-span-2"
            >
              <Input
                id="c-desc"
                name="description"
                required
                defaultValue={values?.description}
                placeholder="Cemento gris en sacos"
              />
            </Field>

            <Field label="Cliente" htmlFor="c-customer">
              <Select
                id="c-customer"
                name="customerId"
                defaultValue={values?.customerId ?? ""}
              >
                <option value="">Sin cliente asignado</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tipo de mercancía" htmlFor="c-type">
              <Input
                id="c-type"
                name="cargoType"
                defaultValue={values?.cargoType ?? ""}
                placeholder="Construcción, alimentos, refrigerado…"
              />
            </Field>

            <Field label="Peso / volumen" htmlFor="c-weight" required>
              <Input
                id="c-weight"
                name="weight"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                required
                defaultValue={values?.weight ?? ""}
                placeholder="24"
              />
            </Field>

            <Field label="Unidad" htmlFor="c-unit">
              <Select id="c-unit" name="unit" defaultValue={values?.unit ?? "KG"}>
                {toOptions(CARGO_UNIT).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Cantidad de bultos" htmlFor="c-qty">
              <Input
                id="c-qty"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={values?.quantity ?? ""}
              />
            </Field>

            <Field label="Estado" htmlFor="c-status">
              <Select
                id="c-status"
                name="status"
                defaultValue={values?.status ?? "PENDING"}
              >
                {toOptions(CARGO_STATUS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Valor declarado" htmlFor="c-value">
              <Input
                id="c-value"
                name="declaredValue"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={values?.declaredValue ?? ""}
              />
            </Field>

            <Field
              label="Flete de esta carga"
              htmlFor="c-freight"
              hint="Opcional: lo que se cobra por esta carga en particular."
            >
              <Input
                id="c-freight"
                name="freightCharge"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={values?.freightCharge ?? ""}
              />
            </Field>

            <Field label="Lugar de cargue" htmlFor="c-pickup">
              <Input
                id="c-pickup"
                name="pickupLocation"
                defaultValue={values?.pickupLocation ?? ""}
                placeholder="Bodega 3, Bogotá"
              />
            </Field>

            <Field label="Lugar de entrega" htmlFor="c-delivery">
              <Input
                id="c-delivery"
                name="deliveryLocation"
                defaultValue={values?.deliveryLocation ?? ""}
                placeholder="Centro de distribución, Cali"
              />
            </Field>

            <Field label="Observaciones" htmlFor="c-notes" className="sm:col-span-2">
              <Textarea
                id="c-notes"
                name="notes"
                defaultValue={values?.notes ?? ""}
                placeholder="Novedades del cargue o la entrega…"
              />
            </Field>
          </div>
        </ModalForm>
      )}
    </Modal>
  );
}
