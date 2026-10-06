import { auth } from "@clerk/nextjs/server";
import { SettingsClient } from "@/components/settings/settings-client";
export default async function SettingsPage(){await auth.protect();return <SettingsClient/>;}
