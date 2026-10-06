import { auth } from "@clerk/nextjs/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminForbidden } from "@/components/admin/admin-forbidden";

export const metadata = {
  title: "Yönetici Konsolu | TaskFlow",
  description: "TaskFlow sistem yönetimi, kullanıcı yönetimi ve platform istatistikleri",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();
  const user = await ensureCurrentUser();

  if (user.role !== "ADMIN") {
    return <AdminForbidden email={user.email} />;
  }

  return <AdminShell userEmail={user.email}>{children}</AdminShell>;
}
