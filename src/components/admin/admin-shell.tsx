"use client";

import { UserButton, useClerk } from "@clerk/nextjs";
import { ArrowLeft, Database, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/utils";

export function AdminShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark" || theme === "dark";

  const dbHealth = useQuery({
    queryKey: ["health", "database"],
    queryFn: () =>
      fetchJson<{
        status: string;
        database: string;
        latencyMs: number;
      }>("/api/health/database"),
    refetchInterval: 30_000,
  });

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand + Admin Pill + Back to Workspace */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Brand />
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <ShieldCheck className="size-3.5" />
                SuperAdmin
              </span>
            </div>

            <div className="h-4 w-px bg-border/80 hidden sm:block" />

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground transition-all duration-150 hover:bg-muted hover:border-border hover:shadow-xs"
            >
              <ArrowLeft className="size-3.5 text-muted-foreground" />
              <span>Çalışma Alanına Dön</span>
            </Link>
          </div>

          {/* Right: DB Latency + Theme + Profile + Logout */}
          <div className="flex items-center gap-3">
            {/* Live Database Status */}
            <div
              className="hidden md:flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              title="Canlı Supabase Bağlantısı"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <Database className="size-3 text-muted-foreground" />
              <span>
                {dbHealth.data ? `${dbHealth.data.latencyMs}ms` : "Bağlı"}
              </span>
            </div>

            {/* Dark / Light Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
            >
              {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
            </Button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-border/60">
              <UserButton />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold leading-none">{userEmail.split("@")[0]}</p>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Sistem Yöneticisi</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1"
                title="Çıkış Yap"
                aria-label="Çıkış Yap"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Console Area */}
      <main className="flex-1 w-full pb-16">
        {children}
      </main>
    </div>
  );
}
