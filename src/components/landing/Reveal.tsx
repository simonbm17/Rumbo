"use client";

import { useEffect } from "react";

/** Cuánto tiene que haber entrado un bloque para considerarlo «en pantalla». */
const MARGEN = 0.12;

/** Red de seguridad: cada cuánto se comprueba, además del observador. */
const LATIDO_MS = 250;

/** Tope absoluto. Pase lo que pase, a los 6s no queda nada escondido. */
const RENDICION_MS = 6000;

/**
 * EL ÚNICO COMPONENTE CLIENTE DE LA PORTADA.
 *
 * Hace dos cosas y ninguna añade marcado: marca el estado desplazado de la
 * cabecera y anima la entrada de los `[data-anima]`.
 *
 * ── NADA DE OYENTES DE SCROLL ───────────────────────────────────────────────
 *
 * V3 escuchaba `scroll`. Un oyente de scroll corre en cada fotograma de
 * desplazamiento y, si mide, fuerza una relectura de maquetado por evento: es
 * exactamente el trabajo por fotograma que hay que evitar. Acá no hay ninguno.
 *
 * La cabecera usa un centinela de 1px en el tope del documento: cuando deja de
 * intersecar, la página está desplazada. Es el patrón canónico y cuesta cero
 * mientras no pasa nada.
 *
 * ── QUIÉN ESCONDE ───────────────────────────────────────────────────────────
 *
 * La versión evidente pone `opacity: 0` en la hoja de estilos y espera a que
 * algo lo quite. Tiene un modo de fallo inaceptable: si ese algo no llega a
 * ejecutarse, la portada se queda invisible. El texto de una página pública no
 * puede depender de eso.
 *
 * Acá esconde el JavaScript, y solo lo que ya está fuera de la pantalla. Sin
 * JavaScript no se esconde nada. Lo que está a la vista al cargar NUNCA se
 * esconde, así que tampoco hay parpadeo en el primer pintado.
 *
 * Y hay tres redes por debajo, en orden de coste:
 *
 *   1. el observador, que es lo que normalmente revela;
 *   2. un latido, porque el observador solo dispara si el navegador está
 *      componiendo, y con un golpe de rueda fuerte o un salto por ancla un
 *      bloque puede pasar de estar debajo de la pantalla a estar encima entre
 *      dos fotogramas sin intersecar nunca;
 *   3. una rendición a los 6 segundos que lo destapa todo sin preguntar.
 *
 * El peor caso posible es una portada sin animación. Nunca una portada vacía.
 */
export function Reveal() {
  useEffect(() => {
    const raiz = document.documentElement;
    const limpiezas: Array<() => void> = [];

    /* ---------------------------------------------- cabecera ---------- */
    const centinela = document.getElementById("lp-centinela");
    if (centinela && typeof IntersectionObserver !== "undefined") {
      const obs = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting) raiz.removeAttribute("data-desplazado");
          else raiz.setAttribute("data-desplazado", "");
        },
        { threshold: 0 }
      );
      obs.observe(centinela);
      limpiezas.push(() => obs.disconnect());
    }

    /* ---------------------------------------------- revelados --------- */
    const revelados = () => {
      const elementos = Array.from(
        document.querySelectorAll<HTMLElement>("[data-anima]")
      );
      if (elementos.length === 0) return;

      /*
        Si la pestaña arranca oculta no se esconde NADA.

        Un render sin pintar —pestaña en segundo plano, captura headless, un
        previsualizador— no dispara transiciones ni observadores, así que lo que
        se escondiera se quedaría escondido. Renunciar a la animación en ese
        caso cuesta nada; publicar una sección en blanco cuesta la página.
      */
      if (document.visibilityState === "hidden") return;

      const alto = window.innerHeight;
      const pendientes = new Set(
        elementos.filter((el) => el.getBoundingClientRect().top >= alto)
      );
      if (pendientes.size === 0) return;
      pendientes.forEach((el) => {
        el.dataset.entra = "";
      });

      const mostrar = (el: HTMLElement) => {
        delete el.dataset.entra;
        pendientes.delete(el);
        if (pendientes.size === 0) fin();
      };

      const barrer = () => {
        const limite = window.innerHeight * (1 - MARGEN);
        // Copia: `mostrar` muta el conjunto mientras se recorre.
        for (const el of Array.from(pendientes)) {
          // Ha entrado por abajo, o ya se pasó de largo por arriba.
          if (el.getBoundingClientRect().top < limite) mostrar(el);
        }
      };

      let obs: IntersectionObserver | undefined;
      if (typeof IntersectionObserver !== "undefined") {
        obs = new IntersectionObserver(
          (entradas) => {
            for (const e of entradas) {
              if (e.isIntersecting) mostrar(e.target as HTMLElement);
            }
          },
          { rootMargin: `0px 0px -${Math.round(MARGEN * 100)}% 0px` }
        );
        pendientes.forEach((el) => obs!.observe(el));
      }

      const latido = setInterval(barrer, LATIDO_MS);
      const rendicion = setTimeout(() => {
        Array.from(pendientes).forEach(mostrar);
      }, RENDICION_MS);

      function fin() {
        clearInterval(latido);
        clearTimeout(rendicion);
        obs?.disconnect();
      }
      limpiezas.push(fin);
    };

    revelados();

    return () => limpiezas.forEach((f) => f());
  }, []);

  return null;
}
