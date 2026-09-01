import { notFound, redirect } from "next/navigation";
import { canWrite, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { DriverForm } from "../../DriverForm";
import { updateDriver } from "@/actions/drivers";
import { fullName } from "@/lib/format";

export const metadata = { title: "Editar conductor" };

export default async function EditDriverPage({
  params,
}: PageProps<"/conductores/[id]/editar">) {
  const user = await requireUser();
  const { id } = await params;
  if (!canWrite(user)) redirect(`/conductores/${id}`);

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Editar a ${fullName(driver)}`}
        breadcrumbs={[
          { label: "Conductores", href: "/conductores" },
          { label: fullName(driver), href: `/conductores/${driver.id}` },
          { label: "Editar" },
        ]}
      />
      <DriverForm
        action={updateDriver.bind(null, driver.id)}
        values={driver}
        submitLabel="Guardar cambios"
        cancelHref={`/conductores/${driver.id}`}
      />
    </div>
  );
}
