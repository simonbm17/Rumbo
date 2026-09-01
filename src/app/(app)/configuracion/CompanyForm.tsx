"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, FormError, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { updateCompanySettings } from "@/actions/settings";

export type CompanyValues = {
  name: string;
  legalName: string | null;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
};

export function CompanyForm({ values }: { values: CompanyValues }) {
  const [state, formAction] = useActionState(updateCompanySettings, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormError message={state?.error} />

      {state?.ok && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
          style={{
            background: "var(--tone-success-bg)",
            color: "var(--tone-success-fg)",
          }}
          role="status"
        >
          <CheckCircle2 className="size-4" />
          Datos de la empresa guardados.
        </div>
      )}

      <Card>
        <CardHeader
          title="Datos de la empresa"
          description="El nombre comercial aparece en el menú lateral y en la pantalla de ingreso."
        />
        <CardBody className="flex flex-col gap-5">
          <PhotoPicker
            name="logo"
            currentUrl={values.logoUrl}
            label="Logo"
            shape="circle"
            hint="Opcional. Se usa en los reportes impresos."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre comercial" htmlFor="c-name" required>
              <Input
                id="c-name"
                name="name"
                required
                defaultValue={values.name}
                placeholder="Transportes Andina"
              />
            </Field>

            <Field label="Razón social" htmlFor="c-legal">
              <Input
                id="c-legal"
                name="legalName"
                defaultValue={values.legalName ?? ""}
                placeholder="Transportes Andina S.A.S."
              />
            </Field>

            <Field label="NIT / Identificación fiscal" htmlFor="c-tax">
              <Input
                id="c-tax"
                name="taxId"
                defaultValue={values.taxId ?? ""}
                className="font-mono"
              />
            </Field>

            <Field label="Teléfono" htmlFor="c-phone">
              <Input
                id="c-phone"
                name="phone"
                type="tel"
                defaultValue={values.phone ?? ""}
              />
            </Field>

            <Field label="Correo electrónico" htmlFor="c-email">
              <Input
                id="c-email"
                name="email"
                type="email"
                defaultValue={values.email ?? ""}
              />
            </Field>

            <Field label="Dirección" htmlFor="c-address">
              <Input
                id="c-address"
                name="address"
                defaultValue={values.address ?? ""}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <SubmitButton>Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}
