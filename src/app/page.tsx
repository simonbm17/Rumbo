import type { Metadata } from "next";

import "./landing.css";

import { displayCondensada } from "@/components/landing/fuente";
import { Reveal } from "@/components/landing/Reveal";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { PartnersStrip } from "@/components/landing/PartnersStrip";
import { ProductScene } from "@/components/landing/ProductScene";
import { OperationsSection } from "@/components/landing/OperationsSection";
import { BenefitsStrip } from "@/components/landing/BenefitsStrip";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

/*
  Metadatos con afirmaciones comprobables y nada más: sin clientes, sin cifras
  de flota administrada, sin premios, porque no los hay.
*/
export const metadata: Metadata = {
  title: "Rumbo | Gestión y control de flotas",
  description:
    "Centraliza vehículos, conductores, viajes, mantenimientos, gastos, documentos y alertas para gestionar tu flota con mayor claridad.",
  openGraph: {
    type: "website",
    siteName: "Rumbo",
    locale: "es_CO",
    title: "Rumbo | Gestión y control de flotas",
    description:
      "Centraliza vehículos, conductores, viajes, mantenimientos, gastos, documentos y alertas para gestionar tu flota con mayor claridad.",
    images: [{ url: "/landing/camion.webp", width: 1400, height: 872 }],
  },
};

/**
 * PORTADA PÚBLICA.
 *
 * No lee la sesión ni consulta la base: los datos de las escenas son fijos y
 * viven en `lib/landing-demo`. Ver ahí el porqué.
 *
 * Un solo `h1` —el titular del hero—; cada sección abre con su `h2`.
 */
export default function Landing() {
  return (
    <div className={`lp ${displayCondensada.variable}`}>
      <Reveal />
      {/*
        Centinela de la cabecera. 1px en el tope del documento: mientras se ve,
        la página está arriba del todo; en cuanto deja de intersecar, la
        cabecera se materializa. Es lo que evita tener que escuchar `scroll`.
      */}
      <div id="lp-centinela" aria-hidden className="h-px" />
      <LandingHeader />
      <main>
        <Hero />
        <PartnersStrip />
        <ProductScene />
        <OperationsSection />
        <BenefitsStrip />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
