"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton, buttonClass } from "@/components/ui/Button";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { DRIVER_STATUS, toOptions } from "@/lib/labels";
import { toDateInput } from "@/lib/format";
import type { ActionState } from "@/lib/form";
import type { DriverStatus } from "@/generated/prisma/enums";

export type DriverFormValues = {
  firstName: string;
  lastName: string;
  documentId: string;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  licenseNumber: string | null;
  licenseClass: string | null;
  licenseExpiry: Date | null;
  hireDate: Date | null;
  status: DriverStatus;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
};

export function DriverForm({
  action,
  values,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values?: DriverFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormError message={state?.error} />

      <Card>
        <CardHeader title="Datos personales" />
        <CardBody className="flex flex-col gap-5">
          <PhotoPicker
            name="photo"
            currentUrl={values?.photoUrl}
            label="Foto del conductor"
            shape="circle"
            hint="Opcional. JPG, PNG o WebP, máximo 5 MB."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nombres" htmlFor="d-first" required>
              <Input
                id="d-first"
                name="firstName"
                required
                defaultValue={values?.firstName}
                placeholder="Carlos"
              />
            </Field>

            <Field label="Apellidos" htmlFor="d-last" required>
              <Input
                id="d-last"
                name="lastName"
                required
                defaultValue={values?.lastName}
                placeholder="Ramírez"
              />
            </Field>

            <Field label="Documento de identidad" htmlFor="d-doc" required>
              <Input
                id="d-doc"
                name="documentId"
                required
                defaultValue={values?.documentId}
                placeholder="79452103"
                className="font-mono"
              />
            </Field>

            <Field label="Teléfono" htmlFor="d-phone">
              <Input
                id="d-phone"
                name="phone"
                type="tel"
                defaultValue={values?.phone ?? ""}
                placeholder="300 412 8890"
              />
            </Field>

            <Field label="Correo electrónico" htmlFor="d-email">
              <Input
                id="d-email"
                name="email"
                type="email"
                defaultValue={values?.email ?? ""}
              />
            </Field>

            <Field label="Estado" htmlFor="d-status">
              <Select
                id="d-status"
                name="status"
                defaultValue={values?.status ?? "ACTIVE"}
              >
                {toOptions(DRIVER_STATUS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Dirección" htmlFor="d-address" className="sm:col-span-2">
              <Input
                id="d-address"
                name="address"
                defaultValue={values?.address ?? ""}
              />
            </Field>

            <Field label="Fecha de ingreso" htmlFor="d-hire">
              <Input
                id="d-hire"
                name="hireDate"
                type="date"
                defaultValue={toDateInput(values?.hireDate)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Licencia de conducción"
          description="El sistema avisa 30 días antes del vencimiento."
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Número de licencia" htmlFor="d-lic-num">
              <Input
                id="d-lic-num"
                name="licenseNumber"
                defaultValue={values?.licenseNumber ?? ""}
                className="font-mono"
              />
            </Field>

            <Field label="Categoría" htmlFor="d-lic-class" hint="C1, C2, C3…">
              <Input
                id="d-lic-class"
                name="licenseClass"
                defaultValue={values?.licenseClass ?? ""}
                placeholder="C3"
              />
            </Field>

            <Field label="Vence el" htmlFor="d-lic-exp">
              <Input
                id="d-lic-exp"
                name="licenseExpiry"
                type="date"
                defaultValue={toDateInput(values?.licenseExpiry)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Contacto de emergencia y notas" />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre del contacto" htmlFor="d-emg">
              <Input
                id="d-emg"
                name="emergencyContact"
                defaultValue={values?.emergencyContact ?? ""}
              />
            </Field>

            <Field label="Teléfono de emergencia" htmlFor="d-emg-phone">
              <Input
                id="d-emg-phone"
                name="emergencyPhone"
                type="tel"
                defaultValue={values?.emergencyPhone ?? ""}
              />
            </Field>

            <Field label="Notas" htmlFor="d-notes" className="sm:col-span-2">
              <Textarea
                id="d-notes"
                name="notes"
                defaultValue={values?.notes ?? ""}
                placeholder="Experiencia, restricciones médicas, observaciones…"
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
