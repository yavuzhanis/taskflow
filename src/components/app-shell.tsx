"use client";

import { UserButton, useClerk } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Brand } from "@/components/brand";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { QuickAddModal } from "@/components/tasks/quick-add-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { Button } from "@/components/ui/button";
import { cn, fetchJson } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

const nav = [
  ["Genel Bakış", "/dashboard", LayoutDashboard],
  ["Görevler", "/tasks", ListTodo],
  ["Projeler", "/projects", FolderKanban],
  ["Ayarlar", "/settings", Settings2],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { signOut } = useClerk();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const themeInitialized = useRef(false);

  const { setQuickAddOpen, mobileNavOpen, setMobileNavOpen } = useUIStore();

  const isDark = resolvedTheme === "dark" || theme === "dark";

  const prefs = useQuery({
    queryKey: ["preferences"],
    queryFn: () =>
      fetchJson<{
        preferences: {
          theme: "SYSTEM" | "LIGHT" | "DARK";
          role?: "ADMIN" | "USER";
        };
      }>("/api/preferences"),
  });

  const isAdmin = prefs.data?.preferences.role === "ADMIN";

  const announcementQ = useQuery({
    queryKey: ["system", "announcement"],
    queryFn: () =>
      fetchJson<{
        announcement: string;
        announcementType: string;
        maintenanceMode: boolean;
      }>("/api/system/announcement"),
    staleTime: 60_000,
  });

  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  // Initialize theme from user preference once
  useEffect(() => {
    if (!themeInitialized.current && prefs.data?.preferences.theme) {
      const stored = prefs.data.preferences.theme;
      if (stored === "DARK") setTheme("dark");
      else if (stored === "LIGHT") setTheme("light");
      else if (stored === "SYSTEM") setTheme("system");
      themeInitialized.current = true;
    }
  }, [prefs.data, setTheme]);

  // Global keyboard shortcuts: Cmd+K focuses search, 'c' or 'n' opens quick add
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive =
        activeTag === "input" ||
        activeTag === "textarea" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
        return;
      }

      if (!isInputActive && (event.key.toLowerCase() === "n" || event.key.toLowerCase() === "c")) {
        event.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setQuickAddOpen]);

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);

    // Save preference to database
    fetchJson("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: nextTheme.toUpperCase() }),
    })
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["preferences"] });
      })
      .catch(() => {});
  };

  const handleSignOut = async () => {
    try {
      toast.info("Oturum kapatılıyor...");
      await signOut({ redirectUrl: "/login" });
    } catch {
      router.push("/login");
    }
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/tasks?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border/70 bg-card/60 backdrop-blur-xl transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[72px]" : "w-[236px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border/60 px-4",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <Brand compact={collapsed} />

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed(true)}
              aria-label="Kenar çubuğunu daralt"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {!collapsed && (
            <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Workspace
            </p>
          )}

          <nav className="space-y-1">
            {nav.map(([label, href, Icon]) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "group flex h-9.5 items-center rounded-xl text-sm font-medium transition-all duration-150",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    active
                      ? "bg-foreground text-background shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-[17px] shrink-0" />
                  {!collapsed && label}
                </Link>
              );
            })}

            {isAdmin && (
              <div className="pt-2 mt-2 border-t border-border/50">
                <Link
                  href="/admin"
                  title={collapsed ? "Yönetici Konsolu" : undefined}
                  className={cn(
                    "group flex h-9.5 items-center rounded-xl text-sm font-semibold transition-all duration-150 border border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400",
                    collapsed ? "justify-center px-0" : "justify-between px-3",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldAlert className="size-[17px] shrink-0 text-purple-600 dark:text-purple-400" />
                    {!collapsed && <span className="truncate">Yönetici Konsolu</span>}
                  </div>
                  {!collapsed && (
                    <span className="shrink-0 rounded-md bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-2xs">
                      Admin
                    </span>
                  )}
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Footer with User Profile and Logout */}
        <div className="border-t border-border/60 p-3 space-y-2">
          {collapsed ? (
            <div className="grid justify-items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => setCollapsed(false)}
                aria-label="Kenar çubuğunu genişlet"
              >
                <PanelLeftOpen className="size-4" />
              </Button>

              <UserButton />

              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={handleSignOut}
                title="Çıkış Yap"
                aria-label="Çıkış Yap"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-2.5">
                <UserButton />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">Çalışma Alanı</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Aktif Oturum</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="mr-2 size-4" />
                Çıkış Yap
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        >
          <aside
            className="flex h-full w-[286px] flex-col border-r border-border/60 bg-background p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-10 items-center justify-between">
              <Brand />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <nav className="mt-6 flex-1 space-y-1">
              {nav.map(([label, href, Icon]) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
                      active
                        ? "bg-foreground text-background font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                );
              })}

              {isAdmin && (
                <div className="pt-2 mt-2 border-t border-border/50">
                  <Link
                    href="/admin"
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex h-10 items-center justify-between rounded-xl px-3 text-sm font-semibold transition border border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="size-4 text-purple-600 dark:text-purple-400" />
                      Yönetici Konsolu
                    </div>
                    <span className="rounded-md bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      Admin
                    </span>
                  </Link>
                </div>
              )}
            </nav>

            <div className="pt-4 border-t border-border/60 space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-2.5">
                <UserButton />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">Çalışma Alanı</p>
                  <p className="text-[11px] text-muted-foreground">Aktif Oturum</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="mr-2 size-4" />
                Çıkış Yap
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[236px]",
        )}
      >
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="size-4" />
          </Button>

          {/* Search Input */}
          <form
            onSubmit={search}
            className="relative min-w-0 max-w-md flex-1"
          >
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />

            <input
              ref={searchInputRef}
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Görev, proje veya etiket ara..."
              className="h-9.5 w-full rounded-xl border border-border/70 bg-muted/30 pl-9 pr-16 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
            />

            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Aramayı temizle"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline">
                ⌘K
              </span>
            )}
          </form>

          {/* Right Actions */}
          <div className="ml-auto flex items-center gap-1.5">
            {/* Live Notifications Bell */}
            <NotificationBell />

            {/* Dark / Light Mode Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Tema değiştir"
              title="Tema değiştir"
              className="hover:bg-muted/70 transition-colors"
            >
              <Sun className="hidden dark:block size-[18px] text-amber-500 transition-transform hover:rotate-45" />
              <Moon className="block dark:hidden size-[18px] text-foreground transition-transform hover:-rotate-12" />
            </Button>

            {/* Explicit Logout Button in Header */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Çıkış Yap"
              title="Çıkış Yap"
            >
              <LogOut className="size-[17px]" />
            </Button>

            <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

            {/* Quick Add Task Button */}
            <Button
              onClick={() => setQuickAddOpen(true)}
              className="hidden sm:inline-flex shadow-sm shadow-primary/20"
            >
              <Plus className="mr-1.5 size-3.5" />
              Yeni görev
            </Button>

            <Button
              onClick={() => setQuickAddOpen(true)}
              size="icon"
              className="sm:hidden"
              aria-label="Yeni görev"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </header>

        {/* Global Announcement Banner */}
        {announcementQ.data?.announcement && !announcementDismissed && (
          <div
            className={cn(
              "relative z-30 flex items-center justify-between px-4 py-2 text-xs font-medium shadow-xs transition-all",
              announcementQ.data.announcementType === "warning"
                ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-b border-amber-500/30"
                : announcementQ.data.announcementType === "success"
                ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-b border-emerald-500/30"
                : "bg-primary/10 text-primary border-b border-primary/20",
            )}
          >
            <div className="mx-auto flex items-center gap-2">
              <Megaphone className="size-3.5 shrink-0" />
              <span>{announcementQ.data.announcement}</span>
            </div>
            <button
              type="button"
              onClick={() => setAnnouncementDismissed(true)}
              className="rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Duyuruyu kapat"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      <QuickAddModal />
      <TaskDetailModal />
    </div>
  );
}
