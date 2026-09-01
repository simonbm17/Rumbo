import { notFound, redirect } from "next/navigation";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { TruckForm } from "../../TruckForm";
import { updateTruck } from "@/actions/trucks";

export const metadata = { title: "Editar camión" };

export default async function EditTruckPage({
  params,
}: PageProps<"/camiones/[id]/editar">) {
  const user = await requireUser();
  const { id } = await params;
  if (!canWrite(user)) redirect(`/camiones/${id}`);

  const [truck, drivers] = await Promise.all([
    prisma.truck.findUnique({ where: { id } }),
    prisma.driver.findMany({
      where: { archived: false },
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  if (!truck) notFound();

  const action = updateTruck.bind(null, truck.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Editar ${truck.plate}`}
        description="Actualizá los datos del vehículo."
        breadcrumbs={[
          { label: "Camiones", href: "/camiones" },
          { label: truck.plate, href: `/camiones/${truck.id}` },
          { label: "Editar" },
        ]}
      />
      <TruckForm
        action={action}
        values={truck}
        drivers={drivers}
        submitLabel="Guardar cambios"
        cancelHref={`/camiones/${truck.id}`}
      />
    </div>
  );
}
