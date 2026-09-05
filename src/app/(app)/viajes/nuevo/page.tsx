import { redirect } from "next/navigation";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { TripForm } from "../TripForm";
import { createTrip } from "@/actions/trips";

export const metadata = { title: "Nuevo viaje" };

export default async function NewTripPage({
  searchParams,
}: PageProps<"/viajes/nuevo">) {
  const user = await requireUser();
  if (!canWrite(user)) redirect("/viajes");

  const params = await searchParams;
  const defaultTruckId =
    typeof params.truckId === "string" ? params.truckId : undefined;

  const [trucks, drivers] = await Promise.all([
    prisma.truck.findMany({
      where: { archived: false },
      orderBy: { plate: "asc" },
      select: { id: true, plate: true, nickname: true },
    }),
    prisma.driver.findMany({
      where: { archived: false },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Nuevo viaje"
        description="Registra la ruta y luego agrega las cargas desde la ficha del viaje."
        breadcrumbs={[{ label: "Viajes", href: "/viajes" }, { label: "Nuevo" }]}
      />
      <TripForm
        action={createTrip}
        trucks={trucks}
        drivers={drivers}
        submitLabel="Crear viaje"
        cancelHref="/viajes"
        defaultTruckId={defaultTruckId}
      />
    </div>
  );
}
