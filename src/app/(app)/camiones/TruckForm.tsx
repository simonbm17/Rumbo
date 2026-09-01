"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton, buttonClass } from "@/components/ui/Button";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { TRUCK_KIND, TRUCK_STATUS, toOptions } from "@/lib/labels";
import { toDateInput } from "@/lib/format";
import type { ActionState } from "@/lib/form";
import type { TruckKind, TruckStatus } from "@/generated/prisma/enums";

export type TruckFormValues = {
  plate: string;
  nickname: string | null;
  brand: string;
  model: string;
  year: number;
  kind: TruckKind;
  status: TruckStatus;
  vin: string | null;
  engineNumber: string | null;
  color: string | null;
  odometerKm: number;
  capacityKg: number | null;
  axles: number | null;
  fuelType: string | null;
  tankLiters: number | null;
  purchaseDate: Date | null;
  purchasePrice: number | null;
  currentDriverId: string | null;
  notes: string | null;
  photoUrl: string | null;
};

export function TruckForm({
  action,
  values,
  drivers,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values?: TruckFormValues;
  drivers: { id: string; firstName: string; lastName: string }[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const currentYear = new Date().getFullYear();

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormError message={state?.error} />

      <Card>
        <CardHeader
          title="Identificación"
          description="Cómo vas a reconocer este camión dentro del sistema."
        />
        <CardBody className="flex flex-col gap-5">
          <PhotoPicker
            name="photo"
            currentUrl={values?.photoUrl}
            label="Foto del camión"
            hint="Se muestra en el listado de la flota. JPG, PNG o WebP, máximo 5 MB."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Placa" htmlFor="plate" required>
              <Input
                id="plate"
                name="plate"
                defaultValue={values?.plate}
                placeholder="ABC-123"
                required
                maxLength={10}
                className="font-mono uppercase tracking-wider"
              />
            </Field>

            <Field
              label="Alias"
              htmlFor="nickname"
              hint="Opcional: el nombre con el que lo llaman."
            >
              <Input
                id="nickname"
                name="nickname"
                defaultValue={values?.nickname ?? ""}
                placeholder="La Coloso"
              />
            </Field>

            <Field label="Estado" htmlFor="status">
              <Select
                id="status"
                name="status"
                defaultValue={values?.status ?? "ACTIVE"}
              >
                {toOptions(TRUCK_STATUS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Marca" htmlFor="brand" required>
              <Input
                id="brand"
                name="brand"
                defaultValue={values?.brand}
                placeholder="Kenworth"
                required
              />
            </Field>

            <Field label="Modelo" htmlFor="model" required>
              <Input
                id="model"
                name="model"
                defaultValue={values?.model}
                placeholder="T800"
                required
              />
            </Field>

            <Field label="Año" htmlFor="year" required>
              <Input
                id="year"
                name="year"
                type="number"
                inputMode="numeric"
                min={1950}
                max={currentYear + 1}
                defaultValue={values?.year ?? currentYear}
                required
              />
            </Field>

            <Field label="Tipo de vehículo" htmlFor="kind">
              <Select
                id="kind"
                name="kind"
                defaultValue={values?.kind ?? "SENCILLO"}
              >
                {toOptions(TRUCK_KIND).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Color" htmlFor="color">
              <Input
                id="color"
                name="color"
                defaultValue={values?.color ?? ""}
                placeholder="Blanco"
              />
            </Field>

            <Field label="Conductor asignado" htmlFor="currentDriverId">
              <Select
                id="currentDriverId"
                name="currentDriverId"
                defaultValue={values?.currentDriverId ?? ""}
              >
                <option value="">Sin asignar</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Datos técnicos"
          description="Todo opcional, pero sirve para los reportes de consumo y costo por kilómetro."
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Kilometraje actual" htmlFor="odometerKm" hint="En kilómetros.">
              <Input
                id="odometerKm"
                name="odometerKm"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={values?.odometerKm ?? 0}
              />
            </Field>

            <Field label="Capacidad de carga" htmlFor="capacityKg" hint="En kilogramos.">
              <Input
                id="capacityKg"
                name="capacityKg"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={values?.capacityKg ?? ""}
                placeholder="34000"
              />
            </Field>

            <Field label="Número de ejes" htmlFor="axles">
              <Input
                id="axles"
                name="axles"
                type="number"
                inputMode="numeric"
                min={2}
                max={10}
                defaultValue={values?.axles ?? ""}
                placeholder="6"
              />
            </Field>

            <Field label="Combustible" htmlFor="fuelType">
              <Input
                id="fuelType"
                name="fuelType"
                defaultValue={values?.fuelType ?? ""}
                placeholder="Diésel"
              />
            </Field>

            <Field label="Capacidad del tanque" htmlFor="tankLiters" hint="En litros.">
              <Input
                id="tankLiters"
                name="tankLiters"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={values?.tankLiters ?? ""}
                placeholder="800"
              />
            </Field>

            <Field label="VIN / Chasis" htmlFor="vin">
              <Input
                id="vin"
                name="vin"
                defaultValue={values?.vin ?? ""}
                className="font-mono"
              />
            </Field>

            <Field label="Número de motor" htmlFor="engineNumber">
              <Input
                id="engineNumber"
                name="engineNumber"
                defaultValue={values?.engineNumber ?? ""}
                className="font-mono"
              />
            </Field>

            <Field label="Fecha de compra" htmlFor="purchaseDate">
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                defaultValue={toDateInput(values?.purchaseDate)}
              />
            </Field>

            <Field label="Precio de compra" htmlFor="purchasePrice">
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={values?.purchasePrice ?? ""}
                placeholder="380000000"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Observaciones" htmlFor="notes">
              <Textarea
                id="notes"
                name="notes"
                defaultValue={values?.notes ?? ""}
                placeholder="Detalles del vehículo, novedades, acuerdos con el propietario…"
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancelar
        </Link>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
