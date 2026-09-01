"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalForm } from "@/components/ui/ModalForm";
import { Field, Input, Select } from "@/components/ui/Field";
import { createExpense, updateExpense } from "@/actions/expenses";
import { EXPENSE_CATEGORY, toOptions } from "@/lib/labels";
import { toDateInput } from "@/lib/format";
import type { ExpenseCategory } from "@/generated/prisma/enums";

export type ExpenseValues = {
  id: string;
  truckId: string | null;
  tripId: string | null;
  driverId: string | null;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  date: Date;
  liters: number | null;
  pricePerLiter: number | null;
  odometerKm: number | null;
  supplier: string | null;
  invoiceNumber: string | null;
};

type Option = { id: string; label: string };

export function ExpenseModal({
  trucks,
  trips = [],
  drivers = [],
  values,
  defaultTruckId,
  defaultTripId,
}: {
  trucks: Option[];
  trips?: Option[];
  drivers?: Option[];
  values?: ExpenseValues;
  defaultTruckId?: string;
  defaultTripId?: string;
}) {
  const editing = Boolean(values);
  const action = values ? updateExpense.bind(null, values.id) : createExpense;
  const [category, setCategory] = useState<ExpenseCategory>(
    values?.category ?? "COMBUSTIBLE"
  );
  const isFuel = category === "COMBUSTIBLE";

  return (
    <Modal
      trigger={{
        label: editing ? (
          <Pencil className="size-3.5" />
        ) : (
          <>
            <Plus className="size-4" />
            Registrar gasto
          </>
        ),
        variant: editing ? "ghost" : "primary",
        size: "sm",
      }}
      title={editing ? "Editar gasto" : "Registrar gasto"}
      description="Combustible, peajes, viáticos y todo lo que cuesta operar."
      size="lg"
    >
      {(close) => (
        <ModalForm action={action} close={close}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Categoría" htmlFor="e-cat" required>
              <Select
                id="e-cat"
                name="category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ExpenseCategory)
                }
              >
                {toOptions(EXPENSE_CATEGORY).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Fecha" htmlFor="e-date" required>
              <Input
                id="e-date"
                name="date"
                type="date"
                required
                defaultValue={toDateInput(values?.date ?? new Date())}
              />
            </Field>

            <Field label="Camión" htmlFor="e-truck">
              <Select
                id="e-truck"
                name="truckId"
                defaultValue={values?.truckId ?? defaultTruckId ?? ""}
                disabled={Boolean(defaultTruckId)}
              >
                <option value="">Sin camión (gasto general)</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
              {defaultTruckId && (
                <input type="hidden" name="truckId" value={defaultTruckId} />
              )}
            </Field>

            <Field label="Viaje" htmlFor="e-trip" hint="Opcional: asocia el gasto a un viaje.">
              <Select
                id="e-trip"
                name="tripId"
                defaultValue={values?.tripId ?? defaultTripId ?? ""}
                disabled={Boolean(defaultTripId)}
              >
                <option value="">Sin viaje</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
              {defaultTripId && (
                <input type="hidden" name="tripId" value={defaultTripId} />
              )}
            </Field>

            {isFuel ? (
              <>
                <Field label="Litros / galones" htmlFor="e-liters">
                  <Input
                    id="e-liters"
                    name="liters"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    defaultValue={values?.liters ?? ""}
                    placeholder="180"
                  />
                </Field>

                <Field label="Precio unitario" htmlFor="e-ppl">
                  <Input
                    id="e-ppl"
                    name="pricePerLiter"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    defaultValue={values?.pricePerLiter ?? ""}
                    placeholder="9800"
                  />
                </Field>

                <Field
                  label="Monto total"
                  htmlFor="e-amount"
                  hint="Si lo dejás vacío, se calcula con litros × precio."
                >
                  <Input
                    id="e-amount"
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    defaultValue={values?.amount ?? ""}
                  />
                </Field>

                <Field label="Kilometraje del tanqueo" htmlFor="e-odo">
                  <Input
                    id="e-odo"
                    name="odometerKm"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    defaultValue={values?.odometerKm ?? ""}
                  />
                </Field>
              </>
            ) : (
              <Field label="Monto" htmlFor="e-amount" required>
                <Input
                  id="e-amount"
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  required
                  defaultValue={values?.amount ?? ""}
                  placeholder="0"
                />
              </Field>
            )}

            <Field label="Conductor" htmlFor="e-driver">
              <Select
                id="e-driver"
                name="driverId"
                defaultValue={values?.driverId ?? ""}
              >
                <option value="">Sin conductor</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Proveedor" htmlFor="e-supplier">
              <Input
                id="e-supplier"
                name="supplier"
                defaultValue={values?.supplier ?? ""}
                placeholder={isFuel ? "Terpel" : "Nombre del proveedor"}
              />
            </Field>

            <Field label="Número de factura" htmlFor="e-invoice">
              <Input
                id="e-invoice"
                name="invoiceNumber"
                defaultValue={values?.invoiceNumber ?? ""}
              />
            </Field>

            <Field label="Descripción" htmlFor="e-desc" className="sm:col-span-2">
              <Input
                id="e-desc"
                name="description"
                defaultValue={values?.description ?? ""}
                placeholder="Tanqueo en ruta Bogotá — Cali"
              />
            </Field>

            <Field
              label="Comprobante"
              htmlFor="e-receipt"
              hint="Opcional: foto o PDF de la factura, máximo 10 MB."
              className="sm:col-span-2"
            >
              <input
                id="e-receipt"
                name="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="input-base file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-2)] file:px-2.5 file:py-1 file:text-sm file:text-[var(--text)]"
              />
            </Field>
          </div>
        </ModalForm>
      )}
    </Modal>
  );
}
