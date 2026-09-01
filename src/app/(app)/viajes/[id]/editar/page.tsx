import { notFound, redirect } from "next/navigation";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { TripForm } from "../../TripForm";
import { updateTrip } from "@/actions/trips";

export const metadata = { title: "Editar viaje" };

export default async function EditTripPage({
  params,
}: PageProps<"/viajes/[id]/editar">) {
  const user = await requireUser();
  const { id } = await params;
  if (!canWrite(user)) redirect(`/viajes/${id}`);

  const [trip, trucks, drivers] = await Promise.all([
    prisma.trip.findUnique({ where: { id } }),
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

  if (!trip) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Editar ${trip.code}`}
        description={`${trip.origin} → ${trip.destination}`}
        breadcrumbs={[
          { label: "Viajes", href: "/viajes" },
          { label: trip.code, href: `/viajes/${trip.id}` },
          { label: "Editar" },
        ]}
      />
      <TripForm
        action={updateTrip.bind(null, trip.id)}
        values={trip}
        trucks={trucks}
        drivers={drivers}
        submitLabel="Guardar cambios"
        cancelHref={`/viajes/${trip.id}`}
      />
    </div>
  );
}
