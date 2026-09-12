import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireCurrentProfile } from "@/lib/auth/dal";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const profile = await requireCurrentProfile();
  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
