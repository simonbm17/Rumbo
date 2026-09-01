"use client";

import { Pencil, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalForm } from "@/components/ui/ModalForm";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { createCustomer, updateCustomer } from "@/actions/customers";

export type CustomerValues = {
  id: string;
  name: string;
  taxId: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
};

export function CustomerModal({ values }: { values?: CustomerValues }) {
  const editing = Boolean(values);
  const action = values ? updateCustomer.bind(null, values.id) : createCustomer;

  return (
    <Modal
      trigger={{
        label: editing ? (
          <Pencil className="size-3.5" />
        ) : (
          <>
            <Plus className="size-4" />
            Agregar cliente
          </>
        ),
        variant: editing ? "ghost" : "primary",
        size: editing ? "sm" : "md",
      }}
      title={editing ? "Editar cliente" : "Agregar cliente"}
      description="Las empresas para las que transportás carga."
    >
      {(close) => (
        <ModalForm action={action} close={close}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Nombre o razón social"
              htmlFor="cu-name"
              required
              className="sm:col-span-2"
            >
              <Input
                id="cu-name"
                name="name"
                required
                defaultValue={values?.name}
                placeholder="Cementos del Valle S.A."
              />
            </Field>

            <Field label="NIT / Identificación" htmlFor="cu-tax">
              <Input
                id="cu-tax"
                name="taxId"
                defaultValue={values?.taxId ?? ""}
                className="font-mono"
                placeholder="890301245-6"
              />
            </Field>

            <Field label="Persona de contacto" htmlFor="cu-contact">
              <Input
                id="cu-contact"
                name="contactName"
                defaultValue={values?.contactName ?? ""}
              />
            </Field>

            <Field label="Teléfono" htmlFor="cu-phone">
              <Input
                id="cu-phone"
                name="phone"
                type="tel"
                defaultValue={values?.phone ?? ""}
              />
            </Field>

            <Field label="Correo electrónico" htmlFor="cu-email">
              <Input
                id="cu-email"
                name="email"
                type="email"
                defaultValue={values?.email ?? ""}
              />
            </Field>

            <Field label="Ciudad" htmlFor="cu-city">
              <Input
                id="cu-city"
                name="city"
                defaultValue={values?.city ?? ""}
              />
            </Field>

            <Field label="Dirección" htmlFor="cu-address">
              <Input
                id="cu-address"
                name="address"
                defaultValue={values?.address ?? ""}
              />
            </Field>

            <Field label="Notas" htmlFor="cu-notes" className="sm:col-span-2">
              <Textarea
                id="cu-notes"
                name="notes"
                defaultValue={values?.notes ?? ""}
                placeholder="Condiciones de pago, contactos alternos, observaciones…"
              />
            </Field>
          </div>
        </ModalForm>
      )}
    </Modal>
  );
}
