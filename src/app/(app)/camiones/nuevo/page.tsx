import { redirect } from "next/navigation";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { TruckForm } from "../TruckForm";
import { createTruck } from "@/actions/trucks";

export const metadata = { title: "Agregar camión" };

export default async function NewTruckPage() {
  const user = await requireUser();
  if (!canWrite(user)) redirect("/camiones");

  const drivers = await prisma.driver.findMany({
    where: { archived: false },
    orderBy: [{ firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Agregar camión"
        description="Cargá la foto, la placa y los datos del vehículo."
        breadcrumbs={[
          { label: "Camiones", href: "/camiones" },
          { label: "Agregar" },
        ]}
      />
      <TruckForm
        action={createTruck}
        drivers={drivers}
        submitLabel="Guardar camión"
        cancelHref="/camiones"
      />
    </div>
  );
}
