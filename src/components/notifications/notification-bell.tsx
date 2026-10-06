"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { playNotificationPing, setSoundEnabled, useSoundEnabled } from "@/lib/audio";
import {
  requestDesktopNotificationPermission,
  showDesktopNotification,
  useDesktopNotificationPermission,
} from "@/lib/desktop-notifications";
import { fetchJson } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

type NotificationItem = {
  id: string;
  type: "DEADLINE" | "TASK" | "SYSTEM";
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  task: {
    id: string;
    title: string;
    deletedAt: string | null;
  } | null;
};

type NotificationResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Dün";
  if (days < 7) return `${days} gün önce`;
  return new Date(dateString).toLocaleDateString("tr-TR");
}

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const soundOn = useSoundEnabled();
  const desktopPermission = useDesktopNotificationPermission();
  const setTaskDetailId = useUIStore((state) => state.setTaskDetailId);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    if (next) {
      playNotificationPing();
      toast.success("Bildirim sesleri açıldı");
    } else {
      toast.info("Bildirim sesleri kapatıldı");
    }
  };

  const handleRequestPermission = async () => {
    const result = await requestDesktopNotificationPermission();
    if (result === "granted") {
      toast.success("Masaüstü bildirimleri etkinleştirildi!");
      showDesktopNotification({
        title: "TaskFlow Bildirimleri Aktif",
        body: "Artık teslim tarihi ve görev uyarılarını masaüstünüzde görebilirsiniz.",
      });
    } else if (result === "denied") {
      toast.error("Tarayıcı ayarlarından bildirim iznini açmanız gerekebilir.");
    }
  };

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchJson<NotificationResponse>("/api/notifications?limit=25"),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!query.data?.notifications) return;

    const currentNotifications = query.data.notifications;
    const currentIds = new Set(currentNotifications.map((n) => n.id));

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      knownIdsRef.current = currentIds;
      return;
    }

    const newItems = currentNotifications.filter(
      (n) => !knownIdsRef.current.has(n.id) && !n.readAt
    );

    if (newItems.length > 0) {
      playNotificationPing();

      const latest = newItems[0];
      if (typeof document !== "undefined" && (document.hidden || !document.hasFocus())) {
        showDesktopNotification({
          title: latest.title,
          body: latest.body,
          onClick: () => {
            if (latest.task && !latest.task.deletedAt) {
              setTaskDetailId(latest.task.id);
            }
          },
        });
      }
    }

    knownIdsRef.current = currentIds;
  }, [query.data, setTaskDetailId]);

  const markRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      fetchJson("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const markAll = useMutation({
    mutationFn: () =>
      fetchJson("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Tüm bildirimler okundu");
    },
    onError: (error) => toast.error(error.message),
  });

  const clearRead = useMutation({
    mutationFn: () =>
      fetchJson("/api/notifications?clear=read", {
        method: "DELETE",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Okunmuş bildirimler temizlendi");
    },
    onError: (error) => toast.error(error.message),
  });

  const rawNotifications = query.data?.notifications ?? [];
  const unreadCount = query.data?.unreadCount ?? 0;

  const notifications = rawNotifications.filter((n) =>
    filter === "unread" ? !n.readAt : true,
  );

  const openNotification = (notification: NotificationItem) => {
    if (!notification.readAt) {
      markRead.mutate({ id: notification.id, read: true });
    }

    if (notification.task && !notification.task.deletedAt) {
      setTaskDetailId(notification.task.id);
    }

    setOpen(false);
  };

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "DEADLINE":
        return <AlertTriangle className="size-4 text-amber-500" />;
      case "TASK":
        return <CheckCircle2 className="size-4 text-sky-500" />;
      case "SYSTEM":
      default:
        return <Sparkles className="size-4 text-purple-500" />;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Bildirimler"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative hover:bg-muted/60 transition-colors"
      >
        <Bell className="size-[18px]" />

        {unreadCount > 0 && (
          <>
            <span className="absolute top-1 right-1 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
            <span className="absolute -top-1 -right-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        )}
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Bildirimleri kapat"
            className="fixed inset-0 z-40 cursor-default bg-black/10 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-12 z-50 w-[min(420px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-border/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Bildirimler</h2>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {unreadCount} yeni
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleSound}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    title={soundOn ? "Bildirim seslerini kapat" : "Bildirim seslerini aç"}
                  >
                    {soundOn ? (
                      <Volume2 className="size-3.5 text-primary" />
                    ) : (
                      <VolumeX className="size-3.5 text-muted-foreground" />
                    )}
                  </Button>

                  {unreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAll.mutate()}
                      disabled={markAll.isPending}
                      className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                    >
                      <CheckCheck className="size-3.5 mr-1 text-emerald-500" />
                      Tümünü oku
                    </Button>
                  )}
                  {rawNotifications.some((n) => n.readAt) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => clearRead.mutate()}
                      disabled={clearRead.isPending}
                      className="h-8 text-xs px-2 text-muted-foreground hover:text-destructive"
                      title="Okunanları temizle"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {desktopPermission === "default" && (
                <div className="mt-3 flex items-center justify-between gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Bell className="size-3.5 text-primary shrink-0" />
                    <span className="text-foreground/90 text-[11px] font-medium leading-tight">Masaüstü bildirimlerini etkinleştir</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRequestPermission}
                    className="h-6 text-[10px] px-2.5 shrink-0 shadow-xs"
                  >
                    İzin Ver
                  </Button>
                </div>
              )}

              {/* Tabs */}
              <div className="mt-3 flex gap-1 rounded-lg bg-muted/50 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`flex-1 rounded-md py-1 font-medium transition ${
                    filter === "all"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tümü ({rawNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`flex-1 rounded-md py-1 font-medium transition ${
                    filter === "unread"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Okunmamış ({unreadCount})
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[440px] overflow-y-auto divide-y divide-border/50">
              {query.isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-muted/60" />
                  ))}
                </div>
              ) : notifications.length ? (
                notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => openNotification(notification)}
                    className={`group flex w-full items-start gap-3.5 p-4 text-left transition hover:bg-muted/40 ${
                      notification.readAt ? "opacity-75" : "bg-primary/[0.03]"
                    }`}
                  >
                    <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-muted/60">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold leading-snug ${notification.readAt ? "text-foreground/80" : "text-foreground font-bold"}`}>
                          {notification.title}
                        </p>
                        {!notification.readAt && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>

                      {notification.body && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {notification.body}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/80">
                        <Clock className="size-3" />
                        <span>{formatRelativeTime(notification.createdAt)}</span>
                        {notification.task && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium truncate max-w-[150px]">
                              {notification.task.title}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-border/80 bg-muted/30">
                    <Bell className="size-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">Bildiriminiz bulunmuyor</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filter === "unread" ? "Tüm bildirimleri okudunuz." : "Yeni aktiviteler ve teslim tarihleri burada listelenir."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
