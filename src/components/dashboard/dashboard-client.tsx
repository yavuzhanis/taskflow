"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock,
  Flame,
  FolderPlus,
  KanbanSquare,
  ListTodo,
  Plus,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchJson, formatDate, formatRelativeTime } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { ActivityLogDTO, TaskDTO, WeeklyTrendDay } from "@/types/task";

export function DashboardClient({ name }: { name?: string | null }) {
  const setQuickAddOpen = useUIStore((state) => state.setQuickAddOpen);
  const setTaskDetailId = useUIStore((state) => state.setTaskDetailId);

  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      fetchJson<{
        stats: {
          open: number;
          inProgress: number;
          completedToday: number;
          dueThisWeek: number;
          completionRate: number;
        };
        upcoming: TaskDTO[];
        activities: ActivityLogDTO[];
        weeklyTrend: WeeklyTrendDay[];
      }>("/api/dashboard"),
  });

  const stats = query.data?.stats;

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Günaydın"
      : currentHour < 18
      ? "Tünaydın"
      : "İyi akşamlar";

  const firstName = name?.split(" ")[0];

  const statCards = [
    {
      label: "Açık Görevler",
      value: stats?.open ?? 0,
      icon: ListTodo,
      helper: "Tamamlanmayı bekleyen",
      accent: "from-blue-500/10 via-blue-500/5 to-transparent",
      iconColor: "text-blue-500",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Devam Edenler",
      value: stats?.inProgress ?? 0,
      icon: CircleDashed,
      helper: "Şu an odaklanılan işler",
      accent: "from-amber-500/10 via-amber-500/5 to-transparent",
      iconColor: "text-amber-500",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Bugün Tamamlanan",
      value: stats?.completedToday ?? 0,
      icon: CheckCircle2,
      helper: "Bugünkü başarı skoru",
      accent: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      iconColor: "text-emerald-500",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Bu Hafta Teslim",
      value: stats?.dueThisWeek ?? 0,
      icon: CalendarDays,
      helper: "Yaklaşan son tarihler",
      accent: "from-purple-500/10 via-purple-500/5 to-transparent",
      iconColor: "text-purple-500",
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  ] as const;

  const completionRate = stats?.completionRate ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1550px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-64 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur">
              <Sparkles className="size-3.5 text-primary" />
              <span>Günlük Çalışma Paneli</span>
              <span className="text-border">•</span>
              <span className="text-foreground/80 font-semibold">{new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {greeting}, {firstName ?? "Hoş geldin"}.
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Bugünkü odağınızı, yaklaşan teslim tarihlerini ve haftalık iş akışınızı buradan yönetin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="lg" className="border-border/80 shadow-xs">
              <Link href="/tasks">
                <KanbanSquare className="mr-2 size-4" />
                Panoyu Aç
              </Link>
            </Button>
            <Button
              size="lg"
              onClick={() => setQuickAddOpen(true)}
              className="shadow-lg shadow-primary/20 transition-transform active:scale-95"
            >
              <Plus className="mr-1.5 size-4" />
              Yeni Görev
            </Button>
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="group relative overflow-hidden rounded-2xl border border-border/75 bg-card/70 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${card.accent} opacity-50`} />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${card.badgeColor}`}>
                    {card.label}
                  </span>

                  {query.isLoading ? (
                    <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-muted" />
                  ) : (
                    <p className="mt-3 text-3xl font-bold tracking-tight">
                      {card.value}
                    </p>
                  )}
                </div>

                <div className="grid size-10 place-items-center rounded-xl border border-border/60 bg-background/90 shadow-xs">
                  <Icon className={`size-5 ${card.iconColor}`} />
                </div>
              </div>

              <p className="relative mt-3 text-xs text-muted-foreground">
                {card.helper}
              </p>
            </article>
          );
        })}
      </section>

      {/* Main Content Grid: Left (Upcoming + Activities), Right (Daily Rhythm + Weekly Trend) */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Left Column: Upcoming Tasks & Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming Tasks Card */}
          <article className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold">Yaklaşan Son Tarihler</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Öncelik vermeniz gereken açık görevler
                </p>
              </div>

              <Button asChild variant="ghost" size="sm" className="text-xs text-primary">
                <Link href="/tasks">
                  Tümünü Gör
                  <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>

            <div className="p-3">
              {query.data?.upcoming.length ? (
                <div className="space-y-2">
                  {query.data.upcoming.map((task) => (
                    <button
                      type="button"
                      key={task.id}
                      onClick={() => setTaskDetailId(task.id)}
                      className="group flex w-full items-center gap-3.5 rounded-xl border border-border/50 bg-background/60 p-3.5 text-left transition hover:border-primary/40 hover:bg-muted/40"
                    >
                      <span
                        className="h-10 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: task.project?.color ?? "#6366f1",
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">
                          {task.title}
                        </p>

                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {task.project ? (
                            <span className="font-medium text-foreground/80">
                              {task.project.name}
                            </span>
                          ) : (
                            <span>Genel</span>
                          )}

                          <span>•</span>

                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                              task.priority === "CRITICAL"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : task.priority === "HIGH"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {task.priority === "CRITICAL"
                              ? "Kritik"
                              : task.priority === "HIGH"
                              ? "Yüksek"
                              : task.priority === "LOW"
                              ? "Düşük"
                              : "Normal"}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2 py-1 text-xs text-muted-foreground font-medium">
                          <Clock className="size-3 text-amber-500" />
                          {formatDate(task.dueDate)}
                        </span>

                        <ArrowRight className="size-4 text-muted-foreground/30 transition group-hover:text-primary group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : !query.isLoading ? (
                <div className="py-8">
                  <EmptyState
                    title="Bekleyen kritik son tarih yok"
                    description="Son tarihi yaklaşan yeni bir görev eklediğinizde burada listelenir."
                  />
                </div>
              ) : (
                <div className="space-y-3 p-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-muted/60" />
                  ))}
                </div>
              )}
            </div>
          </article>

          {/* Son Aktiviteler (Recent Activity Feed) Card */}
          <article className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Activity className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Son Aktiviteler</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    En son tamamlanan, oluşturulan ve düzenlenen işlemler
                  </p>
                </div>
              </div>

              {query.data?.activities?.length ? (
                <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {query.data.activities.length} hareket
                </span>
              ) : null}
            </div>

            <div className="p-4">
              {query.data?.activities && query.data.activities.length > 0 ? (
                <div className="relative space-y-3 pl-2 before:absolute before:left-5 before:top-3 before:bottom-3 before:w-px before:bg-border/60">
                  {query.data.activities.map((activity) => {
                    const info = getActivityInfo(activity.action);
                    const Icon = info.icon;
                    const isClickable = Boolean(activity.taskId);

                    return (
                      <div
                        key={activity.id}
                        onClick={() => {
                          if (activity.taskId) setTaskDetailId(activity.taskId);
                        }}
                        className={`group relative flex items-start gap-3.5 rounded-xl p-2.5 transition-all duration-150 ${
                          isClickable
                            ? "cursor-pointer hover:bg-muted/40 hover:border-border/60 border border-transparent"
                            : ""
                        }`}
                      >
                        <div
                          className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-lg border ${info.bg} ${info.color} shadow-2xs`}
                        >
                          <Icon className="size-3.5" />
                        </div>

                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-foreground/80">
                              {info.label}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatRelativeTime(activity.createdAt)}
                            </span>
                          </div>

                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {activity.details || (activity.task ? activity.task.title : "İşlem yapıldı")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !query.isLoading ? (
                <div className="py-8">
                  <EmptyState
                    title="Henüz aktivite kaydı yok"
                    description="Görev oluşturdukça ve tamamladıkça hareketleriniz burada listelenir."
                  />
                </div>
              ) : (
                <div className="space-y-3 p-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-xl bg-muted/60" />
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>

        {/* Right Column: Daily Rhythm & 7-Day Completion Rhythm */}
        <div className="space-y-6">
          {/* Daily Rhythm & Completion Rate Card */}
          <article className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Üretkenlik Analizi
                </span>
                <h2 className="mt-1 text-lg font-bold">Günlük Ritim</h2>
              </div>
              <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="size-4.5" />
              </div>
            </div>

            {/* Circular Progress Indicator */}
            <div className="mt-6 flex justify-center">
              <div
                className="relative grid size-44 place-items-center rounded-full p-3 shadow-inner"
                style={{
                  background: `conic-gradient(var(--primary) ${completionRate * 3.6}deg, color-mix(in srgb, var(--muted) 80%, transparent) 0)`,
                }}
              >
                <div className="grid size-full place-items-center rounded-full bg-card shadow-lg">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold tracking-tight">
                      %{completionRate}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      Bugünkü Tamamlanma
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              {completionRate >= 80 ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Flame className="size-4" /> Harika bir tempo! Günün neredeyse tamamlandı.
                </span>
              ) : completionRate >= 40 ? (
                "İyi bir ilerleme kaydediyorsunuz, odaklanmaya devam!"
              ) : (
                "Günün görevlerine başlayın ve ilerlemenizi kaydedin."
              )}
            </p>

            {/* Quick Stats Breakdown */}
            <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-border/60">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 text-center">
                <p className="text-xs font-medium text-muted-foreground">Tamamlanan</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats?.completedToday ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 text-center">
                <p className="text-xs font-medium text-muted-foreground">Kalan İşler</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stats?.open ?? 0}
                </p>
              </div>
            </div>
          </article>

          {/* 7-Day Completion Rhythm Mini Chart Card */}
          <article className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Haftalık Performans
                </span>
                <h2 className="mt-1 text-lg font-bold">7 Günlük Ritim</h2>
              </div>
              <div className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <BarChart3 className="size-4.5" />
              </div>
            </div>

            {(() => {
              const weeklyTrend = query.data?.weeklyTrend ?? [];
              const maxCompleted = Math.max(...weeklyTrend.map((d) => d.completed), 1);
              const totalCompletedThisWeek = weeklyTrend.reduce((acc, d) => acc + d.completed, 0);

              return (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>Son 7 günün tamamlanan işleri</span>
                    <span className="font-semibold text-foreground">
                      Toplam {totalCompletedThisWeek} görev
                    </span>
                  </div>

                  <div className="flex h-36 items-end justify-between gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 pb-3 pt-6">
                    {weeklyTrend.map((day) => {
                      const heightPercent = Math.max(
                        Math.round((day.completed / maxCompleted) * 100),
                        day.completed > 0 ? 20 : 8
                      );
                      const isToday = day.dayLabel === "Bugün";

                      return (
                        <div
                          key={day.date}
                          className="group relative flex flex-1 flex-col items-center justify-end h-full"
                        >
                          {/* Floating tooltip on hover */}
                          <div className="pointer-events-none absolute -top-8 hidden rounded-md bg-popover px-2 py-0.5 text-[10px] font-semibold text-popover-foreground shadow-md group-hover:block z-20 whitespace-nowrap">
                            {day.completed} tamamlandı ({day.created} yeni)
                          </div>

                          {/* Completed count above bar if > 0 */}
                          {day.completed > 0 ? (
                            <span className="mb-1 text-[10px] font-bold text-foreground">
                              {day.completed}
                            </span>
                          ) : (
                            <span className="mb-1 text-[9px] text-muted-foreground/50">0</span>
                          )}

                          {/* Bar */}
                          <div
                            className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                              day.completed > 0
                                ? isToday
                                  ? "bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-500 dark:to-emerald-300 shadow-xs"
                                  : "bg-gradient-to-t from-primary/80 to-primary shadow-xs"
                                : "bg-muted/70"
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />

                          {/* Day Label */}
                          <span
                            className={`mt-2 text-[10px] font-medium transition-colors ${
                              isToday
                                ? "text-primary font-bold"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            {day.dayLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </article>
        </div>
      </section>
    </div>
  );
}

function getActivityInfo(action: string) {
  switch (action) {
    case "TASK_COMPLETED":
      return {
        icon: CheckCircle2,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        label: "Görev Tamamlandı",
      };
    case "TASK_CREATED":
      return {
        icon: Plus,
        color: "text-blue-500",
        bg: "bg-blue-500/10 border-blue-500/20",
        label: "Yeni Görev",
      };
    case "TASK_REOPENED":
      return {
        icon: RotateCcw,
        color: "text-amber-500",
        bg: "bg-amber-500/10 border-amber-500/20",
        label: "Yeniden Açıldı",
      };
    case "TASK_TRASHED":
      return {
        icon: Trash2,
        color: "text-orange-500",
        bg: "bg-orange-500/10 border-orange-500/20",
        label: "Çöpe Taşındı",
      };
    case "TASK_DELETED":
      return {
        icon: Trash2,
        color: "text-red-500",
        bg: "bg-red-500/10 border-red-500/20",
        label: "Silindi",
      };
    case "TASK_RESTORED":
      return {
        icon: Undo2,
        color: "text-sky-500",
        bg: "bg-sky-500/10 border-sky-500/20",
        label: "Geri Yüklendi",
      };
    case "PROJECT_CREATED":
      return {
        icon: FolderPlus,
        color: "text-purple-500",
        bg: "bg-purple-500/10 border-purple-500/20",
        label: "Yeni Proje",
      };
    default:
      return {
        icon: Activity,
        color: "text-primary",
        bg: "bg-primary/10 border-primary/20",
        label: "Aktivite",
      };
  }
}

