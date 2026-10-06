import { auth } from "@clerk/nextjs/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { AppShell } from "@/components/app-shell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  await ensureCurrentUser();
  return <AppShell>{children}</AppShell>;
}
