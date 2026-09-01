"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { FormError } from "./Field";
import { Button, SubmitButton } from "./Button";
import type { ActionState } from "@/lib/form";

/**
 * Formulario dentro de un Modal: se cierra solo cuando la server action
 * devuelve `ok`. Los errores se muestran arriba sin perder lo escrito.
 */
export function ModalForm({
  action,
  close,
  submitLabel = "Guardar",
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  close: () => void;
  submitLabel?: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state?.error} />
      {children}
      <div className="mt-1 flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={close}>
          Cancelar
        </Button>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
