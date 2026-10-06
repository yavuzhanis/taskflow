"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Archive,
  CheckCircle2,
  CheckSquare,
  Database,
  FolderKanban,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchJson, formatDate, formatRelativeTime } from "@/lib/utils";

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
  createdAt: string;
  _count: {
    tasks: number;
    projects: number;
  };
};

type AdminOverviewResponse = {
  metrics: {
    totalUsers: number;
    totalTasks: number;
    completedTasks: number;
    totalProjects: number;
    totalComments: number;
    totalActivities: number;
    dbLatencyMs: number;
  };
  settings: {
    announcement: string;
    announcementType: string;
    maintenanceMode: boolean;
  };
  users: AdminUser[];
  recentActivities: {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    user: { id: string; name: string | null; email: string };
    task: { id: string; title: string } | null;
  }[];
};

export function AdminDashboardClient({ currentAdminId }: { currentAdminId: string }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"users" | "settings" | "activities">("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");

  const [announcementText, setAnnouncementText] = useState("");
  const [announcementType, setAnnouncementType] = useState("info");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const data = await fetchJson<AdminOverviewResponse>("/api/admin/overview");
      if (!settingsLoaded) {
        setAnnouncementText(data.settings.announcement || "");
        setAnnouncementType(data.settings.announcementType || "info");
        setSettingsLoaded(true);
      }
      return data;
    },
    refetchInterval: 30_000,
  });

  const saveSettings = useMutation({
    mutationFn: (body: { announcement?: string; announcementType?: string; maintenanceMode?: boolean }) =>
      fetchJson("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      qc.invalidateQueries({ queryKey: ["system", "announcement"] });
      toast.success("Sistem ayarları güncellendi!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "ADMIN" | "USER" }) =>
      fetchJson(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success("Kullanıcı rolü güncellendi!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) =>
      fetchJson(`/api/admin/users/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success("Kullanıcı sistemden silindi!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const triggerGlobalArchive = useMutation({
    mutationFn: () =>
      fetchJson<{ message: string; count: number }>("/api/admin/maintenance/archive", {
        method: "POST",
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success(data.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const metrics = query.data?.metrics;
  const users = query.data?.users ?? [];
  const activities = query.data?.recentActivities ?? [];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === "ALL" ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const completionRate =
    metrics && metrics.totalTasks > 0
      ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
      : 0;

  return (
    <div className="mx-auto w-full max-w-[1550px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <ShieldAlert className="size-3.5" />
            TaskFlow Yönetim Konsolu (SuperAdmin)
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Yönetici Paneli
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform kullanıcıları, genel sistem büyümesi, canlı veritabanı sağlığı ve küresel duyurular
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="border-border/80 shadow-xs"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${query.isFetching ? "animate-spin" : ""}`} />
            Yenile
          </Button>

          <Button
            size="sm"
            onClick={() => triggerGlobalArchive.mutate()}
            disabled={triggerGlobalArchive.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
          >
            <Archive className="size-3.5 mr-1.5" />
            Küresel Arşivlemeyi Çalıştır
          </Button>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <article className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Toplam Kullanıcı</span>
            <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {metrics?.totalUsers ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Kayıtlı aktif hesap</p>
        </article>

        <article className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Toplam Görev</span>
            <div className="grid size-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <CheckSquare className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {metrics?.totalTasks ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Platform genelinde</p>
        </article>

        <article className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Tamamlanan</span>
            <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {metrics?.completedTasks ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            %{completionRate} başarı oranı
          </p>
        </article>

        <article className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Projeler</span>
            <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
              <FolderKanban className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {metrics?.totalProjects ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Aktif çalışma panosu</p>
        </article>

        <article className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Yorum & Hareket</span>
            <div className="grid size-8 place-items-center rounded-lg bg-sky-500/10 text-sky-500">
              <MessageSquare className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {metrics?.totalComments ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Toplam görev yorumu</p>
        </article>

        <article className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">DB Gecikmesi</span>
            <div className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-500">
              <Database className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {metrics?.dbLatencyMs !== undefined ? `${metrics.dbLatencyMs}ms` : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Canlı Supabase havuzu</p>
        </article>
      </section>

      {/* Main Tabs Navigation */}
      <section className="mt-8">
        <div className="flex items-center gap-2 border-b border-border/70 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "users"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Users className="size-4" />
            Kullanıcı Yönetimi ({users.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "settings"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Megaphone className="size-4" />
            Sistem & Duyuru Panosu
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activities")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "activities"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Activity className="size-4" />
            Genel Aktivite Logları
          </button>
        </div>

        {/* Tab 1: Kullanıcı Yönetimi */}
        {activeTab === "users" && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="İsim veya e-posta ile ara..."
                  className="h-10 w-full rounded-xl border border-border/70 bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Rol:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as "ALL" | "ADMIN" | "USER")}
                  className="h-10 rounded-xl border border-border/70 bg-background px-3 text-xs outline-none transition focus:border-primary"
                >
                  <option value="ALL">Tümü ({users.length})</option>
                  <option value="ADMIN">Yöneticiler ({users.filter((u) => u.role === "ADMIN").length})</option>
                  <option value="USER">Standart Kullanıcılar ({users.filter((u) => u.role === "USER").length})</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-border/70 bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Kullanıcı</th>
                      <th className="px-5 py-3.5">Rol</th>
                      <th className="px-5 py-3.5">Görevler</th>
                      <th className="px-5 py-3.5">Projeler</th>
                      <th className="px-5 py-3.5">Kayıt Tarihi</th>
                      <th className="px-5 py-3.5 text-right">İşlemler</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border/60">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => {
                        const isSelf = u.id === currentAdminId;

                        return (
                          <tr key={u.id} className="transition hover:bg-muted/30">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {u.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={u.avatarUrl}
                                    alt={u.name || u.email}
                                    className="size-9 rounded-full object-cover border border-border/60"
                                  />
                                ) : (
                                  <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    {(u.name || u.email)[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {u.name || "İsimsiz Kullanıcı"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {u.role === "ADMIN" ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                                  <ShieldCheck className="size-3" />
                                  Yönetici
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                  Kullanıcı
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs font-semibold text-foreground">
                              {u._count.tasks} görev
                            </td>

                            <td className="px-5 py-4 text-xs font-semibold text-foreground">
                              {u._count.projects} proje
                            </td>

                            <td className="px-5 py-4 text-xs text-muted-foreground">
                              {formatDate(u.createdAt)}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                {u.role === "ADMIN" ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={isSelf || toggleRole.isPending}
                                    onClick={() => toggleRole.mutate({ userId: u.id, role: "USER" })}
                                    className="h-8 text-xs text-muted-foreground hover:text-amber-600"
                                    title={isSelf ? "Kendi yetkinizi kaldıramazsınız" : "Standart kullanıcı yap"}
                                  >
                                    <UserX className="size-3.5 mr-1" />
                                    Yöneticiyi Kaldır
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={toggleRole.isPending}
                                    onClick={() => toggleRole.mutate({ userId: u.id, role: "ADMIN" })}
                                    className="h-8 text-xs border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                                  >
                                    <UserCheck className="size-3.5 mr-1" />
                                    Yönetici Yap
                                  </Button>
                                )}

                                {!isSelf && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={deleteUser.isPending}
                                    onClick={() => {
                                      if (confirm(`"${u.name || u.email}" kullanıcısını kalıcı olarak silmek istediğinizden emin misiniz?`)) {
                                        deleteUser.mutate(u.id);
                                      }
                                    }}
                                    className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                    title="Kullanıcıyı Sil"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <EmptyState
                            title="Kullanıcı bulunamadı"
                            description="Arama kriterlerinize uyan kullanıcı bulunamadı."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Sistem & Duyuru Panosu */}
        {activeTab === "settings" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {/* Global Announcement Editor */}
            <article className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-4 border-b border-border/60">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Megaphone className="size-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Küresel Sistem Duyurusu</h2>
                  <p className="text-xs text-muted-foreground">
                    Sitede tüm kullanıcıların üst çubuğunda görünecek duyuru metni
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Duyuru Metni</label>
                <textarea
                  rows={3}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Örn: Hafta sonu planlı bakım çalışması yapılacaktır. Lütfen görevlerinizi kaydediniz."
                  className="mt-1.5 w-full rounded-xl border border-border/70 bg-background p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Duyuru Tipi & Rengi</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnouncementType("info")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                      announcementType === "info"
                        ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "border-border/70 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    Bilgi (Mavi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnouncementType("warning")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                      announcementType === "warning"
                        ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-border/70 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    Uyarı (Sarı)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnouncementType("success")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                      announcementType === "success"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border/70 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    Kutlama (Yeşil)
                  </button>
                </div>
              </div>

              {/* Preview */}
              {announcementText.trim() && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Canlı Önizleme:</span>
                  <div
                    className={`mt-1.5 flex items-center justify-between rounded-xl border p-3 text-xs font-medium shadow-xs ${
                      announcementType === "warning"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : announcementType === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Megaphone className="size-3.5 shrink-0" />
                      <span>{announcementText}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                {announcementText.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAnnouncementText("");
                      saveSettings.mutate({ announcement: "" });
                    }}
                    disabled={saveSettings.isPending}
                    className="border-border/80 text-xs"
                  >
                    Duyuruyu Kaldır
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={() => saveSettings.mutate({ announcement: announcementText, announcementType })}
                  disabled={saveSettings.isPending}
                  className="text-xs"
                >
                  Duyuruyu Yayınla
                </Button>
              </div>
            </article>

            {/* System Health & Operations */}
            <article className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-border/60">
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Activity className="size-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Sistem Bakımı & Sağlık</h2>
                  <p className="text-xs text-muted-foreground">
                    Veritabanı bağlantı havuzu ve otomatik temizlik işlemleri
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">PostgreSQL / Supabase Durumu</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Bağlı & Sağlıklı
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Veritabanı ping süresi: <strong className="text-foreground">{metrics?.dbLatencyMs ?? 0}ms</strong>. Supabase Ireland havuzu üzerinden bağlantı kurulmaktadır.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">Küresel Otomatik Arşivleme</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tüm kullanıcılar için tamamlanma süresi dolmuş eski görevleri arşive kaldırır.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerGlobalArchive.mutate()}
                    disabled={triggerGlobalArchive.isPending}
                    className="text-xs shrink-0"
                  >
                    Tetikle
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  <span>Sistem Yedekleme & Dışa Aktarma</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tüm çalışma alanlarını JSON formatında yedeklemek için Ayarlar sayfasındaki dışa aktarma modülünü kullanabilirsiniz.
                </p>
              </div>
            </article>
          </div>
        )}

        {/* Tab 3: Genel Aktivite Logları */}
        {activeTab === "activities" && (
          <div className="mt-6 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-xs">
            <h2 className="text-base font-semibold">Son Platform Aktiviteleri</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kullanıcılar tarafından gerçekleştirilen en güncel 12 işlem
            </p>

            <div className="mt-5 space-y-3">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/50 p-3.5 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary font-bold">
                        {act.user.name ? act.user.name[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {act.user.name || act.user.email}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                            {act.action}
                          </span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground">
                          {act.details || (act.task ? act.task.title : "İşlem")}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-muted-foreground text-[11px]">
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Aktivite kaydı bulunmuyor"
                  description="Kullanıcılar işlem yaptıkça burada listelenecektir."
                />
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
