"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { Field, FormError, Input } from "@/components/ui/Field";

/**
 * FORMULARIO DE ACCESO.
 *
 * El cableado con la server action es EL MISMO que antes: `useActionState` sobre
 * `loginAction`, los campos siguen llamándose `email` y `password` —que es como
 * los lee la acción— y `autoComplete` conserva `email` y `current-password`
 * para que los gestores de contraseñas sigan funcionando. Lo que cambia es cómo
 * se ve y cómo se anuncia.
 *
 * ── EL ERROR VA ARRIBA, Y ES UNO SOLO ───────────────────────────────────────
 *
 * `loginAction` devuelve un único mensaje de formulario, no errores por campo, y
 * a propósito: responde lo mismo si el correo no existe que si la contraseña
 * está mal, para no revelar qué correos están registrados. Marcar en rojo el
 * campo de la contraseña sería inventar una precisión que el servidor no tiene.
 *
 * Lo que sí se puede hacer sin mentir es atarlo: los dos campos apuntan al
 * mensaje con `aria-describedby`, así quien navega con lector de pantalla lo
 * escucha al llegar a cualquiera de los dos, no solo al enviarse.
 */
export function LoginForm({ notice }: { notice?: string | null }) {
  const [state, formAction] = useActionState(loginAction, null);
  const [visible, setVisible] = useState(false);
  const [correo, setCorreo] = useState("");
  const refCorreo = useRef<HTMLInputElement>(null);
  const idAviso = useId();

  const mensaje = state?.error ?? notice ?? null;
  const describe = mensaje ? idAviso : undefined;

  /*
    TRAS UN ERROR, EL FOCO VUELVE AL CORREO.

    React vacía el formulario cuando la acción termina, y con él se va el foco:
    quedaba en el `body`, así que quien navega con teclado tenía que tabular
    desde el principio de la página para reintentar. El mensaje ya se anuncia
    solo por su `role="alert"`; esto resuelve dónde queda el cursor después.
  */
  useEffect(() => {
    if (state?.error) refCorreo.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div id={idAviso}>
        <FormError message={mensaje} />
      </div>

      <Field label="Correo electrónico" htmlFor="email" required>
        {/*
          El correo es un campo CONTROLADO y la contraseña no, a propósito.

          React 19 resetea el formulario cuando una acción de servidor termina.
          Con los dos sin controlar, equivocarse de contraseña obligaba a
          reescribir también el correo, que es el error de formulario más
          irritante que existe. Guardado en estado, sobrevive al reintento.

          La contraseña sí se borra, y eso está bien: no tiene por qué quedarse
          escrita en una pantalla que alguien puede dejar abierta.
        */}
        <Input
          ref={refCorreo}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@empresa.com"
          aria-describedby={describe}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          autoFocus
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" required>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            aria-describedby={describe}
            required
            className="pr-14"
          />
          {/*
            `aria-pressed` además de la etiqueta: la etiqueta dice qué hará el
            botón, el estado dice en cuál está. Con solo la etiqueta hay que
            deducir el estado actual de lo que promete la acción.
          */}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="lg-ojo"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            aria-controls="password"
          >
            {visible ? (
              <EyeOff className="size-5" aria-hidden />
            ) : (
              <Eye className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </Field>

      <BotonEntrar />
    </form>
  );
}

/**
 * El botón vive acá y no en `components/ui/Button` porque necesita el lenguaje
 * de interacción de las superficies públicas —flecha que se adelanta, cede al
 * pulsar— y el de la aplicación interna es otro. El primitivo compartido no se
 * toca: cambiarlo movería todos los formularios del producto.
 *
 * `useFormStatus` da los dos estados que faltaban: mientras se envía el botón
 * queda deshabilitado (no hay doble envío posible) y lo dice con texto, no solo
 * con un giro. `aria-busy` lo anuncia.
 */
function BotonEntrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="lg-btn mt-1"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Entrando…
        </>
      ) : (
        <>
          Entrar
          <ArrowRight className="size-5" aria-hidden />
        </>
      )}
    </button>
  );
}
