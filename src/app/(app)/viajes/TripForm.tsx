"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton, buttonClass } from "@/components/ui/Button";
import { TRIP_STATUS, toOptions } from "@/lib/labels";
import { toDateTimeInput } from "@/lib/format";
import type { ActionState } from "@/lib/form";
import type { TripStatus } from "@/generated/prisma/enums";

export type TripFormValues = {
  truckId: string;
  driverId: string | null;
  origin: string;
  destination: string;
  departureAt: Date;
  plannedArrivalAt: Date | null;
  arrivalAt: Date | null;
  startOdometerKm: number | null;
  endOdometerKm: number | null;
  distanceKm: number | null;
  status: TripStatus;
  revenue: number;
  notes: string | null;
};

export function TripForm({
  action,
  values,
  trucks,
  drivers,
  submitLabel,
  cancelHref,
  defaultTruckId,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values?: TripFormValues;
  trucks: { id: string; plate: string; nickname: string | null }[];
  drivers: { id: string; firstName: string; lastName: string }[];
  submitLabel: string;
  cancelHref: string;
  defaultTruckId?: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormError message={state?.error} />

      <Card>
        <CardHeader
          title="Ruta y asignación"
          description="Quién hace el viaje, con qué camión y hacia dónde."
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Camión" htmlFor="t-truck" required>
              <Select
                id="t-truck"
                name="truckId"
                required
                defaultValue={values?.truckId ?? defaultTruckId ?? ""}
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
            </Field>

            <Field label="Conductor" htmlFor="t-driver">
              <Select
                id="t-driver"
                name="driverId"
                defaultValue={values?.driverId ?? ""}
              >
                <option value="">Sin asignar</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Origen" htmlFor="t-origin" required>
              <Input
                id="t-origin"
                name="origin"
                required
                defaultValue={values?.origin}
                placeholder="Bogotá"
              />
            </Field>

            <Field label="Destino" htmlFor="t-destination" required>
              <Input
                id="t-destination"
                name="destination"
                required
                defaultValue={values?.destination}
                placeholder="Cali"
              />
            </Field>

            <Field label="Estado del viaje" htmlFor="t-status">
              <Select
                id="t-status"
                name="status"
                defaultValue={values?.status ?? "PLANNED"}
              >
                {toOptions(TRIP_STATUS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Valor del flete"
              htmlFor="t-revenue"
              hint="Lo que se cobra por el viaje completo."
            >
              <Input
                id="t-revenue"
                name="revenue"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={values?.revenue ?? ""}
                placeholder="0"
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Tiempos y recorrido"
          description="La distancia se calcula sola si cargas los dos odómetros."
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Salida" htmlFor="t-departure" required>
              <Input
                id="t-departure"
                name="departureAt"
                type="datetime-local"
                required
                defaultValue={toDateTimeInput(values?.departureAt ?? new Date())}
              />
            </Field>

            <Field label="Llegada estimada" htmlFor="t-planned">
              <Input
                id="t-planned"
                name="plannedArrivalAt"
                type="datetime-local"
                defaultValue={toDateTimeInput(values?.plannedArrivalAt)}
              />
            </Field>

            <Field label="Llegada real" htmlFor="t-arrival">
              <Input
                id="t-arrival"
                name="arrivalAt"
                type="datetime-local"
                defaultValue={toDateTimeInput(values?.arrivalAt)}
              />
            </Field>

            <Field label="Odómetro al salir" htmlFor="t-start-odo">
              <Input
                id="t-start-odo"
                name="startOdometerKm"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={values?.startOdometerKm ?? ""}
              />
            </Field>

            <Field label="Odómetro al llegar" htmlFor="t-end-odo">
              <Input
                id="t-end-odo"
                name="endOdometerKm"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={values?.endOdometerKm ?? ""}
              />
            </Field>

            <Field
              label="Distancia recorrida"
              htmlFor="t-distance"
              hint="En kilómetros. Opcional si cargas los odómetros."
            >
              <Input
                id="t-distance"
                name="distanceKm"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={values?.distanceKm ?? ""}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Observaciones" htmlFor="t-notes">
              <Textarea
                id="t-notes"
                name="notes"
                defaultValue={values?.notes ?? ""}
                placeholder="Instrucciones para el conductor, citas de descargue, novedades…"
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
