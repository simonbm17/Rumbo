import { redirect } from "next/navigation";
import { Database } from "lucide-react";
import { canAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { CompanyForm } from "./CompanyForm";
import { PasswordForm } from "./PasswordForm";
import { number } from "@/lib/format";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const user = await requireUser();
  if (!canAdmin(user)) redirect("/");

  const [company, counts] = await Promise.all([
    getCompanySettings(),
    Promise.all([
      prisma.truck.count(),
      prisma.driver.count(),
      prisma.trip.count(),
      prisma.cargo.count(),
      prisma.expense.count(),
      prisma.maintenance.count(),
      prisma.document.count(),
      prisma.customer.count(),
    ]),
  ]);

  const [
    trucks,
    drivers,
    trips,
    cargos,
    expenses,
    maintenances,
    documents,
    customers,
  ] = counts;

  const stats = [
    { label: "Camiones", value: trucks },
    { label: "Conductores", value: drivers },
    { label: "Clientes", value: customers },
    { label: "Viajes", value: trips },
    { label: "Cargas", value: cargos },
    { label: "Gastos", value: expenses },
    { label: "Mantenimientos", value: maintenances },
    { label: "Documentos", value: documents },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Configuración"
        description="Datos de la empresa y seguridad de tu cuenta."
      />

      <div className="flex flex-col gap-5">
        <CompanyForm values={company} />

        <PasswordForm />

        <Card>
          <CardHeader
            title="Datos cargados"
            description="Resumen de lo que hay hoy en la base de datos."
            icon={<Database className="size-4" />}
          />
          <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-semibold tabular-nums">
                  {number(stat.value)}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
