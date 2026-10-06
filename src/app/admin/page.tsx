import { ensureAdminUser } from "@/lib/auth/current-user";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export default async function AdminPage() {
  const admin = await ensureAdminUser();
  return <AdminDashboardClient currentAdminId={admin.id} />;
}
