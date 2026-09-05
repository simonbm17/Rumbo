import { redirect } from "next/navigation";
import { Ban, CheckCircle2, ShieldCheck, Trash2 } from "lucide-react";
import { canAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { UserModal } from "@/components/forms/UserModal";
import { deleteUser, toggleUserActive } from "@/actions/users";
import { ROLE } from "@/lib/labels";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Usuarios" };

export default async function UsersPage() {
  const current = await requireUser();
  if (!canAdmin(current)) redirect("/panel");

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Quién entra al sistema y qué puede hacer."
        actions={<UserModal />}
      />

      <Card>
        <CardHeader
          title="Cuentas"
          description={`${users.length} usuario${users.length === 1 ? "" : "s"}`}
          icon={<ShieldCheck className="size-4" />}
        />
        <Table>
          <THead>
            <TR>
              <TH>Usuario</TH>
              <TH>Rol</TH>
              <TH>Último ingreso</TH>
              <TH>Estado</TH>
              <TH align="right">Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {users.map((user) => {
              const isSelf = user.id === current.id;
              return (
                <TR key={user.id}>
                  <TD>
                    <p className="font-medium">
                      {user.name}
                      {isSelf && (
                        <span className="ml-2 text-sm text-[var(--text-muted)]">
                          (tú)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {user.email}
                    </p>
                  </TD>
                  <TD>
                    <Badge tone={ROLE[user.role].tone}>
                      {ROLE[user.role].label}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-[var(--text-muted)]">
                    {user.lastLoginAt ? dateTime(user.lastLoginAt) : "Nunca"}
                  </TD>
                  <TD>
                    <Badge tone={user.active ? "success" : "neutral"} dot>
                      {user.active ? "Activo" : "Desactivado"}
                    </Badge>
                  </TD>
                  <TD align="right">
                    <div className="flex items-center justify-end gap-1">
                      <UserModal values={user} />
                      {!isSelf && (
                        <>
                          <form action={toggleUserActive}>
                            <input type="hidden" name="id" value={user.id} />
                            <input
                              type="hidden"
                              name="active"
                              value={user.active ? "false" : "true"}
                            />
                            <ConfirmButton
                              variant="ghost"
                              title={user.active ? "Desactivar" : "Activar"}
                              message={
                                user.active
                                  ? `¿Desactivar el acceso de ${user.name}? No va a poder ingresar hasta que lo reactives.`
                                  : `¿Reactivar el acceso de ${user.name}?`
                              }
                            >
                              {user.active ? (
                                <Ban className="size-3.5" />
                              ) : (
                                <CheckCircle2 className="size-3.5" />
                              )}
                            </ConfirmButton>
                          </form>
                          <form action={deleteUser}>
                            <input type="hidden" name="id" value={user.id} />
                            <ConfirmButton
                              variant="ghost"
                              title="Eliminar"
                              message={`¿Eliminar definitivamente la cuenta de ${user.name}?`}
                            >
                              <Trash2 className="size-3.5" />
                            </ConfirmButton>
                          </form>
                        </>
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
