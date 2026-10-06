import { auth } from "@clerk/nextjs/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { ensureCurrentUser } from "@/lib/auth/current-user";
export default async function DashboardPage(){await auth.protect();const user=await ensureCurrentUser();return <DashboardClient name={user.name}/>;}
