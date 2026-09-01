import { redirect } from "next/navigation";
import { canWrite, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { DriverForm } from "../DriverForm";
import { createDriver } from "@/actions/drivers";

export const metadata = { title: "Agregar conductor" };

export default async function NewDriverPage() {
  const user = await requireUser();
  if (!canWrite(user)) redirect("/conductores");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Agregar conductor"
        description="Datos personales, licencia y contacto de emergencia."
        breadcrumbs={[
          { label: "Conductores", href: "/conductores" },
          { label: "Agregar" },
        ]}
      />
      <DriverForm
        action={createDriver}
        submitLabel="Guardar conductor"
        cancelHref="/conductores"
      />
    </div>
  );
}
