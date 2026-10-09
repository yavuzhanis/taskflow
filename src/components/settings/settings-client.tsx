"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { UserProfile } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  Play,
  Plus,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  playDeleteSound,
  playNotificationPing,
  playSuccessChime,
  setSoundEnabled,
  useSoundEnabled,
} from "@/lib/audio";
import {
  requestDesktopNotificationPermission,
  showDesktopNotification,
  useDesktopNotificationPermission,
} from "@/lib/desktop-notifications";
import { fetchJson } from "@/lib/utils";
import type {
  TagDTO,
  TaskPriority,
  TaskStatus,
} from "@/types/task";

type Preferences = {
  theme: "SYSTEM" | "LIGHT" | "DARK";
  defaultView: "LIST" | "KANBAN";
  autoArchiveCompleted: boolean;
  autoArchiveDays: number;
};

type ImportResponse = {
  created: number;
  skipped: number;
  errors?: string[];
};

type TaskTemplateDTO = {
  id: string;
  name: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueOffsetDays: number | null;
  createdAt: string;
};

export function SettingsClient() {
  const qc = useQueryClient();
  const { setTheme } = useTheme();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#64748b");
  const [templateName, setTemplateName] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templatePriority, setTemplatePriority] = useState<TaskPriority>("NORMAL");
  const [templateStatus, setTemplateStatus] = useState<TaskStatus>("TODO");
  const [templateDueOffset, setTemplateDueOffset] = useState("");
  const soundOn = useSoundEnabled();
  const desktopPermission = useDesktopNotificationPermission();

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    if (next) {
      playSuccessChime();
      toast.success("Ses efektleri etkinleştirildi");
    } else {
      toast.info("Ses efektleri kapatıldı");
    }
  };

  const handleRequestPermission = async () => {
    const result = await requestDesktopNotificationPermission();
    if (result === "granted") {
      toast.success("Masaüstü bildirimleri etkinleştirildi!");
      showDesktopNotification({
        title: "TaskFlow Bildirimleri Aktif 🔔",
        body: "Artık teslim tarihi ve görev uyarılarını masaüstünüzde görebilirsiniz.",
      });
    } else if (result === "denied") {
      toast.error("Bildirim izni reddedildi. Tarayıcı site ayarlarından izin verebilirsiniz.");
    }
  };

  const handleTestDesktopNotification = () => {
    if (desktopPermission !== "granted") {
      handleRequestPermission();
      return;
    }
    showDesktopNotification({
      title: "TaskFlow Masaüstü Bildirimi 🚀",
      body: "Bu bir test bildirimidir. Sistem kusursuz çalışıyor!",
    });
    toast.success("Test bildirimi gönderildi");
  };

  const prefs = useQuery({
    queryKey: ["preferences"],
    queryFn: () => fetchJson<{ preferences: Preferences }>("/api/preferences"),
  });

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => fetchJson<{ tags: TagDTO[] }>("/api/tags"),
  });

  const templates = useQuery({
    queryKey: ["task-templates"],
    queryFn: () =>
      fetchJson<{
        templates: TaskTemplateDTO[];
      }>("/api/task-templates"),
  });

  const update = useMutation({
    mutationFn: (body: Partial<Preferences>) =>
      fetchJson("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preferences"] });
      toast.success("Tercihler kaydedildi");
    },
    onError: (e) => toast.error(e.message),
  });

  const createTag = useMutation({
    mutationFn: () =>
      fetchJson("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagName, color: tagColor }),
      }),
    onSuccess: () => {
      setTagName("");
      qc.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Etiket oluşturuldu");
    },
    onError: (e) => toast.error(e.message),
  });

  const importTasks = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.set("file", file);

      return fetchJson<ImportResponse>("/api/tasks/import", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
      toast.success(`${result.created} görev içe aktarıldı`, {
        description: result.skipped
          ? `${result.skipped} satır atlandı.`
          : undefined,
      });
      if (result.errors?.length) {
        console.info("Task import warnings", result.errors);
      }
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    },
  });

  const createTemplate = useMutation({
    mutationFn: () =>
      fetchJson<{ template: TaskTemplateDTO }>("/api/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          title: templateTitle,
          description: templateDescription || null,
          priority: templatePriority,
          status: templateStatus,
          dueOffsetDays: templateDueOffset ? Number(templateDueOffset) : null,
        }),
      }),
    onSuccess: () => {
      setTemplateName("");
      setTemplateTitle("");
      setTemplateDescription("");
      setTemplatePriority("NORMAL");
      setTemplateStatus("TODO");
      setTemplateDueOffset("");
      qc.invalidateQueries({ queryKey: ["task-templates"] });
      toast.success("Şablon kaydedildi");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTemplate = (id: string) =>
    fetchJson(`/api/task-templates?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["task-templates"] });
        toast.success("Şablon silindi");
      })
      .catch((e) => toast.error(e.message));

  const deleteTag = (id: string) =>
    fetchJson(`/api/tags/${id}`, { method: "DELETE" })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["tags"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
        toast.success("Etiket silindi");
      })
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    const t = prefs.data?.preferences.theme;
    if (t) setTheme(t.toLowerCase());
  }, [prefs.data, setTheme]);

  const p = prefs.data?.preferences;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3.5" />
          Yapılandırma
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Ayarlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hesabınızı, tema tercihlerini, etiket havuzunu ve veri dışa aktarımını yönetin.
        </p>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_1fr]">
        {/* Application Preferences Card */}
        <section className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-border/60">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sliders className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Uygulama Tercihleri</h2>
              <p className="text-xs text-muted-foreground">Genel görünüm ve davranış</p>
            </div>
          </div>

          {p ? (
            <div className="mt-5 space-y-5">
              <div>
                <label className="text-xs font-medium text-foreground">Tema Seçimi</label>
                <select
                  value={p.theme}
                  onChange={(e) =>
                    update.mutate({ theme: e.target.value as Preferences["theme"] })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="SYSTEM">Sistem Teması</option>
                  <option value="LIGHT">Açık Tema</option>
                  <option value="DARK">Koyu Tema</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Varsayılan Görev Görünümü</label>
                <select
                  value={p.defaultView}
                  onChange={(e) =>
                    update.mutate({ defaultView: e.target.value as Preferences["defaultView"] })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="KANBAN">Kanban Panosu</option>
                  <option value="LIST">Tablo / Liste Görünümü</option>
                </select>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-semibold text-foreground">Otomatik Arşivleme</span>
                    <p className="text-xs text-muted-foreground">
                      Tamamlanan görevleri belirlenen gün sonra otomatik arşive kaldır.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={p.autoArchiveCompleted}
                    onChange={(e) =>
                      update.mutate({ autoArchiveCompleted: e.target.checked })
                    }
                    className="size-4.5 rounded accent-primary cursor-pointer"
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Arşivleme Süresi (Gün)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={p.autoArchiveDays}
                  onChange={(e) =>
                    update.mutate({ autoArchiveDays: Number(e.target.value) })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          ) : (
            <div className="mt-5 h-48 animate-pulse rounded-xl bg-muted/60" />
          )}
        </section>

        {/* Tags Management Card */}
        <section className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-border/60">
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
              <Tag className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Etiket Havuzu</h2>
              <p className="text-xs text-muted-foreground">Görevlerinizi etiketlerle filtreleyin</p>
            </div>
          </div>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (tagName.trim()) createTag.mutate();
            }}
            className="mt-5 flex gap-2"
          >
            <input
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Yeni etiket (örn: Acil, Backend)"
              className="h-10 flex-1 rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="color"
              value={tagColor}
              onChange={(e) => setTagColor(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-xl border border-border/70 bg-background p-1"
              title="Etiket Rengi"
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={createTag.isPending || !tagName.trim()}
            >
              <Plus className="size-4" />
            </Button>
          </form>

          <div className="mt-4 max-h-[260px] overflow-y-auto space-y-2">
            {tags.data?.tags.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 transition hover:bg-muted/40"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-xs font-semibold text-foreground">
                    #{t.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTag(t.id)}
                  className="size-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            {tags.data?.tags.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Kayıtlı etiketiniz bulunmuyor.
              </p>
            )}
          </div>
        </section>

        {/* Notifications & Sound Card */}
        <section className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-border/60">
            <div className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
              <Bell className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Bildirim ve Ses Tercihleri</h2>
              <p className="text-xs text-muted-foreground">Masaüstü uyarıları ve akustik geri bildirimler</p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {/* Desktop Notification Status */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Tarayıcı Masaüstü Bildirimleri</span>
                    {desktopPermission === "granted" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Etkin
                      </span>
                    ) : desktopPermission === "denied" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                        <AlertCircle className="size-3" />
                        Engellendi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        İzin Bekliyor
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sekme arka plandayken veya simge durumundayken teslim tarihi yaklaşan görevler için sistem masaüstü uyarısı gönderir.
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {desktopPermission !== "granted" ? (
                    <Button size="sm" onClick={handleRequestPermission} className="shadow-xs text-xs">
                      <Bell className="size-3.5 mr-1.5" />
                      İzin İste
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleTestDesktopNotification} className="border-border/80 shadow-xs text-xs">
                      <Bell className="size-3.5 mr-1.5 text-primary" />
                      Test Gönder
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* UI Sound Effects Toggle */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Akustik UI Ses Efektleri</span>
                    {soundOn ? (
                      <Volume2 className="size-4 text-primary" />
                    ) : (
                      <VolumeX className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Görev tamamlama, bildirim uyarıları ve silme işlemlerinde hafif Web Audio API sesleri çalar.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundOn}
                    onChange={toggleSound}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Sound Audition Buttons */}
              <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground mr-1">Sesleri Dinle:</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={playSuccessChime}
                  className="h-7 text-[11px] px-2.5 border-border/70 hover:border-emerald-500/50"
                >
                  <Play className="size-2.5 mr-1 text-emerald-500 fill-emerald-500" />
                  Tamamlama Melodisi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={playNotificationPing}
                  className="h-7 text-[11px] px-2.5 border-border/70 hover:border-blue-500/50"
                >
                  <Play className="size-2.5 mr-1 text-blue-500 fill-blue-500" />
                  Bildirim Uyarısı
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={playDeleteSound}
                  className="h-7 text-[11px] px-2.5 border-border/70 hover:border-red-500/50"
                >
                  <Play className="size-2.5 mr-1 text-red-500 fill-red-500" />
                  Silme Sesi
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Data Export Card */}
        <section className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-border/60">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Download className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Veri Yönetimi</h2>
              <p className="text-xs text-muted-foreground">Excel, CSV ve JSON dosyaları</p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Çalışma alanınızdaki görev verilerini cihazınızda saklayın veya dosyadan içe aktarın.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-border/80 shadow-xs">
              <a href="/api/export?format=json&scope=all" download="taskflow-export.json">
                <FileJson className="size-4 mr-1.5 text-primary" />
                JSON Olarak İndir
              </a>
            </Button>
            <Button asChild variant="outline" className="border-border/80 shadow-xs">
              <a href="/api/export?format=csv&scope=all" download="taskflow-export.csv">
                <FileSpreadsheet className="size-4 mr-1.5 text-emerald-500" />
                CSV Olarak İndir
              </a>
            </Button>
            <Button asChild variant="outline" className="border-border/80 shadow-xs">
              <a href="/api/export?format=excel&scope=all" download="taskflow-export.xls">
                <FileSpreadsheet className="size-4 mr-1.5 text-emerald-500" />
                Excel Olarak İndir
              </a>
            </Button>
          </div>

          <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-4">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xls,.xml,text/csv,application/vnd.ms-excel"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  importTasks.mutate(file);
                }
              }}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Excel / CSV içe aktar</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dosyadan görev ekleyin.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-border/80 shadow-xs"
                disabled={importTasks.isPending}
                onClick={() => importInputRef.current?.click()}
              >
                <Upload className="size-4 mr-1.5 text-primary" />
                {importTasks.isPending ? "İçe aktarılıyor..." : "Dosya Seç"}
              </Button>
            </div>
          </div>
        </section>

        {/* Task Templates Card */}
        <section className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-border/60">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
              <FileSpreadsheet className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Görev Şablonları</h2>
              <p className="text-xs text-muted-foreground">Tekrarlı işleri hızlı başlatın</p>
            </div>
          </div>

          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              if (templateName.trim() && templateTitle.trim()) {
                createTemplate.mutate();
              }
            }}
            className="mt-5 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Şablon adı"
                className="h-10 rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <input
                value={templateTitle}
                onChange={(event) => setTemplateTitle(event.target.value)}
                placeholder="Görev başlığı"
                className="h-10 rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <textarea
              value={templateDescription}
              onChange={(event) => setTemplateDescription(event.target.value)}
              placeholder="Açıklama"
              rows={3}
              className="w-full resize-none rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-center">
              <select
                value={templatePriority}
                onChange={(event) => setTemplatePriority(event.target.value as TaskPriority)}
                className="h-10 rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="LOW">Düşük</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Yüksek</option>
                <option value="CRITICAL">Kritik</option>
              </select>

              <select
                value={templateStatus}
                onChange={(event) => setTemplateStatus(event.target.value as TaskStatus)}
                className="h-10 rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="TODO">Yapılacak</option>
                <option value="IN_PROGRESS">Devam ediyor</option>
                <option value="DONE">Tamamlandı</option>
              </select>

              <input
                type="number"
                min={0}
                max={365}
                value={templateDueOffset}
                onChange={(event) => setTemplateDueOffset(event.target.value)}
                placeholder="Gün"
                className="h-10 rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <Button
                type="submit"
                disabled={
                  createTemplate.isPending ||
                  !templateName.trim() ||
                  !templateTitle.trim()
                }
                className="h-10"
              >
                <Plus className="size-4" />
                Kaydet
              </Button>
            </div>
          </form>

          <div className="mt-5 max-h-[260px] space-y-2 overflow-y-auto">
            {templates.data?.templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 transition hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {template.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {template.title}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTemplate(template.id)}
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`${template.name} şablonunu sil`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            {templates.data?.templates.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Kayıtlı şablonunuz bulunmuyor.
              </p>
            )}
          </div>
        </section>

        {/* Clerk UserProfile Card */}
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
          <UserProfile routing="hash" />
        </section>
      </div>
    </div>
  );
}
