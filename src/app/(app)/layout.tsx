import { requireUser } from "@/lib/auth";
import { getAlertCount } from "@/lib/alerts";
import { getCompanySettings } from "@/lib/settings";
import { logoutAction } from "@/actions/auth";
import { Shell } from "@/components/layout/Shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [company, alertCount] = await Promise.all([
    getCompanySettings(),
    getAlertCount(),
  ]);

  return (
    <Shell
      user={user}
      companyName={company.name}
      alertCount={alertCount}
      logoutAction={logoutAction}
    >
      {children}
    </Shell>
  );
}
