"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, FormError, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { changeOwnPassword } from "@/actions/users";

export function PasswordForm() {
  const [state, formAction] = useActionState(changeOwnPassword, null);
  const router = useRouter();

  // Al cambiar la contraseña se cierra la sesión: mandamos al login.
  useEffect(() => {
    if (state?.ok) router.push("/login");
  }, [state, router]);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader
          title="Cambiar mi contraseña"
          description="Al guardarla se cierra la sesión y tienes que volver a ingresar."
        />
        <CardBody className="flex flex-col gap-4">
          <FormError message={state?.error} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Contraseña actual" htmlFor="p-current" required>
              <Input
                id="p-current"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Field
              label="Contraseña nueva"
              htmlFor="p-new"
              required
              hint="Mínimo 8 caracteres."
            >
              <Input
                id="p-new"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>

            <Field label="Repetir contraseña" htmlFor="p-confirm" required>
              <Input
                id="p-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <SubmitButton>Actualizar contraseña</SubmitButton>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
