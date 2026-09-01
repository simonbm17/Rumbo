"use client";

import { Pencil, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalForm } from "@/components/ui/ModalForm";
import { Field, Input, Select } from "@/components/ui/Field";
import { createUser, updateUser } from "@/actions/users";
import { ROLE, ROLE_HELP, toOptions } from "@/lib/labels";
import type { Role } from "@/generated/prisma/enums";

export type UserValues = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export function UserModal({ values }: { values?: UserValues }) {
  const editing = Boolean(values);
  const action = values ? updateUser.bind(null, values.id) : createUser;

  return (
    <Modal
      trigger={{
        label: editing ? (
          <Pencil className="size-3.5" />
        ) : (
          <>
            <UserPlus className="size-4" />
            Invitar usuario
          </>
        ),
        variant: editing ? "ghost" : "primary",
        size: editing ? "sm" : "md",
      }}
      title={editing ? "Editar usuario" : "Nuevo usuario"}
      description="Definí qué puede hacer cada persona dentro del sistema."
    >
      {(close) => (
        <ModalForm action={action} close={close}>
          <div className="flex flex-col gap-4">
            <Field label="Nombre completo" htmlFor="u-name" required>
              <Input
                id="u-name"
                name="name"
                required
                defaultValue={values?.name}
                placeholder="Sandra Molina"
              />
            </Field>

            <Field label="Correo electrónico" htmlFor="u-email" required>
              <Input
                id="u-email"
                name="email"
                type="email"
                required
                defaultValue={values?.email}
                placeholder="nombre@empresa.com"
              />
            </Field>

            <Field
              label={editing ? "Contraseña nueva" : "Contraseña"}
              htmlFor="u-password"
              required={!editing}
              hint={
                editing
                  ? "Dejala vacía para conservar la contraseña actual. Mínimo 8 caracteres."
                  : "Mínimo 8 caracteres. Compartila con la persona por un medio seguro."
              }
            >
              <Input
                id="u-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required={!editing}
                minLength={8}
              />
            </Field>

            <Field label="Rol" htmlFor="u-role" required>
              <Select
                id="u-role"
                name="role"
                defaultValue={values?.role ?? "VIEWER"}
              >
                {toOptions(ROLE).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <ul className="flex flex-col gap-1.5 rounded-lg bg-[var(--surface-2)] p-3 text-sm text-[var(--text-muted)]">
              {(Object.keys(ROLE_HELP) as Role[]).map((role) => (
                <li key={role}>
                  <span className="font-medium text-[var(--text)]">
                    {ROLE[role].label}:
                  </span>{" "}
                  {ROLE_HELP[role]}
                </li>
              ))}
            </ul>
          </div>
        </ModalForm>
      )}
    </Modal>
  );
}
