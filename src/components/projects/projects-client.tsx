"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowRight, FolderKanban, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchJson } from "@/lib/utils";
import type { ProjectDTO } from "@/types/task";

const COLOR_PRESETS = [
  "#6366f1", // Indigo
  "#0ea5e9", // Sky
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#64748b", // Slate
];

export function ProjectsClient() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");

  const query = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchJson<{ projects: ProjectDTO[] }>("/api/projects"),
  });

  const create = useMutation({
    mutationFn: () =>
      fetchJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color }),
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Proje başarıyla oluşturuldu");
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = (id: string) => {
    if (!confirm("Projeyi silmek istiyor musunuz? İlgili görevler silinmez, projesiz kalır.")) return;
    fetchJson(`/api/projects/${id}`, { method: "DELETE" })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
        toast.success("Proje silindi");
      })
      .catch((e) => toast.error(e.message));
  };

  const archive = (id: string) =>
    fetchJson(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["projects"] });
        toast.success("Proje arşivlendi");
      })
      .catch((e) => toast.error(e.message));

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="size-3.5" />
            Çalışma Alanları
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Projeler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Görevlerinizi projeler bazında gruplandırın ve çalışma alanınızı düzenli tutun.
          </p>
        </div>
      </div>

      <section className="mt-8 grid gap-8 xl:grid-cols-[380px_1fr]">
        {/* Create Project Form Card */}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
          className="h-fit rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 pb-4 border-b border-border/60">
            <div
              className="grid size-9 place-items-center rounded-xl"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <FolderKanban className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Yeni Proje Oluştur</h2>
              <p className="text-xs text-muted-foreground">İşlerinizi organize edin</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Proje Başlığı *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Mobil Uygulama V2"
                required
                className="mt-1.5 h-10 w-full rounded-xl border border-border/70 bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Açıklama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bu projenin kapsamı ve hedefleri..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-border/70 bg-background p-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Renk Teması</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className={`size-7 rounded-full transition-transform hover:scale-110 ${
                      color === preset ? "ring-2 ring-foreground ring-offset-2 scale-110" : ""
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-7 cursor-pointer rounded-full border-0 bg-transparent"
                  title="Özel renk seç"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 shadow-md shadow-primary/20"
              disabled={create.isPending || !name.trim()}
            >
              <Plus className="size-4 mr-1.5" />
              {create.isPending ? "Oluşturuluyor..." : "Projeyi Kaydet"}
            </Button>
          </div>
        </form>

        {/* Projects List Grid */}
        <div>
          {query.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted/60" />
              ))}
            </div>
          ) : query.data?.projects.length ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {query.data.projects.map((p) => (
                <article
                  key={p.id}
                  className="group rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div
                        className="grid size-11 place-items-center rounded-xl shadow-xs"
                        style={{ backgroundColor: `${p.color}25`, color: p.color }}
                      >
                        <FolderKanban className="size-5.5" />
                      </div>
                      <Link
                        href={`/tasks?projectId=${p.id}`}
                        className="rounded-full bg-muted/80 hover:bg-primary/10 hover:text-primary px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors"
                      >
                        {p._count?.tasks ?? 0} görev
                      </Link>
                    </div>

                    <Link href={`/tasks?projectId=${p.id}`} className="group/title block">
                      <h2 className="mt-4 text-base font-semibold tracking-tight group-hover/title:text-primary transition-colors flex items-center justify-between">
                        {p.name}
                        <ArrowRight className="size-4 opacity-0 -translate-x-1 transition-all group-hover/title:opacity-100 group-hover/title:translate-x-0 text-primary" />
                      </h2>
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {p.description || "Açıklama belirtilmemiş."}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-3 border-t border-border/50">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-medium border-border/70 shadow-2xs"
                    >
                      <Link href={`/tasks?projectId=${p.id}`}>
                        Görevleri Gör
                      </Link>
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => archive(p.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
                      >
                        <Archive className="size-3.5 mr-1" />
                        Arşivle
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(p.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive px-2"
                      >
                        <Trash2 className="size-3.5 mr-1" />
                        Sil
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz proje oluşturulmamış"
              description="Görevlerinizi gruplandırmak için sol taraftaki panelden ilk projenizi ekleyin."
            />
          )}
        </div>
      </section>
    </div>
  );
}
