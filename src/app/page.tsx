import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Command,
  FolderKanban,
  KanbanSquare,
  LockKeyhole,
  Sparkles,
  Zap,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Background ambient glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/20 via-purple-500/10 to-blue-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-[600px] right-0 -z-10 h-[450px] w-[500px] rounded-full bg-primary/10 blur-[130px]" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand />
          
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/login">Giriş Yap</Link>
            </Button>
            <Button asChild size="sm" className="shadow-lg shadow-primary/25">
              <Link href="/signup">
                Ücretsiz Başla
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-20 sm:px-8 lg:pt-24 lg:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur transition hover:border-primary/40">
            <Sparkles className="size-3.5 animate-pulse" />
            <span>TaskFlow 2.0 • Akıllı Bildirim & Kanban Deneyimi</span>
          </div>

          {/* Headline */}
          <h1 className="mt-7 text-4xl font-extrabold tracking-tight sm:text-6xl sm:leading-[1.12]">
            İşlerinizi kaostan kurtarın,{" "}
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-sky-500 bg-clip-text text-transparent">
              akışa odaklanın.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Sürükle-bırak Kanban, akıllı teslim tarihi bildirimleri, alt görevler, 
            etiketler ve çok kullanıcılı izole mimari ile profesyonel görev yönetimi.
          </p>

          {/* CTA Buttons */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-7 text-base shadow-xl shadow-primary/25 transition-all hover:scale-[1.02]">
              <Link href="/signup">
                Hemen Başla — Tamamen Ücretsiz
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base border-border/80 hover:bg-muted/50">
              <Link href="/login">
                Giriş Yap
              </Link>
            </Button>
          </div>

          {/* Feature shortcuts pill */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">⌘K</kbd>
              Hızlı Görev Ekleme
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Bell className="size-3.5 text-primary" />
              Canlı Teslim Tarihi Uyarısı
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="size-3.5 text-emerald-500" />
              %100 Tenant İzolasyonu
            </span>
          </div>
        </div>

        {/* Interactive-looking Product Showcase Mockup */}
        <div className="relative mt-16 lg:mt-20">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-2 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:p-4">
            {/* Window frame top bar */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 px-2">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-500/80" />
                <span className="size-3 rounded-full bg-amber-500/80" />
                <span className="size-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-medium text-muted-foreground">TaskFlow Workspace — Aktif Pano</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]">
                  <Command className="size-3" /> + K Arama
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium">
                  ● Canlı Senkronize
                </span>
              </div>
            </div>

            {/* Kanban Columns Preview */}
            <div className="grid gap-4 pt-4 md:grid-cols-3">
              {/* Kolon 1: Yapılacak */}
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Yapılacak</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold">2</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 text-[10px] font-semibold">Web Projesi</span>
                      <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium">Yüksek</span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-foreground">Next.js 16 Vercel dağıtım hazırlıkları</p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="size-3 text-amber-500" /> Bugün 18:00</span>
                      <span>2/3 alt görev</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
                    <span className="rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 text-[10px] font-semibold">Tasarım</span>
                    <p className="mt-2 text-xs font-medium text-foreground">Yeni karanlık mod paletlerinin belirlenmesi</p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="size-3" /> Yarın</span>
                      <span>1 alt görev</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kolon 2: Devam Eden */}
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Devam Ediyor</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold">1</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-primary/30 bg-card p-3 shadow-md shadow-primary/5 ring-1 ring-primary/20">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 text-[10px] font-semibold">Altyapı</span>
                      <span className="rounded bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 text-[10px] font-medium">Kritik</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-foreground">Bildirim servisi & deadline tetikleyicisi</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Kullanıcı teslim tarihlerine göre otomatik bildirim gönderir.</p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-4/5 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Kolon 3: Tamamlandı */}
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tamamlandı</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold">2</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-border/70 bg-card/60 p-3 opacity-80">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      <span className="line-through text-muted-foreground">Clerk Kimlik Doğrulama Entegrasyonu</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card/60 p-3 opacity-80">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      <span className="line-through text-muted-foreground">Prisma 7 & Supabase PostgreSQL Yapılandırması</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="border-t border-border/60 bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Üretkenliğinizi zirveye taşıyacak her detay hazır.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Yalnızca bir yapılacaklar listesi değil; hedeflerinizi organize eden bütünsel bir çalışma motoru.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article className="group rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-110">
                <KanbanSquare className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Liste & Kanban Hibrit</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Tek tıkla tablo görünümünden sürükle-bırak panoya geçin. Görevlerinizi aşamalar arasında zahmetsizce kaydırın.
              </p>
            </article>

            <article className="group rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 transition group-hover:scale-110">
                <Bell className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Akıllı Bildirim Sistemi</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Yaklaşan veya geciken teslim tarihlerini sistem otomatik tespit eder, bildirim panelinde anında uyarır.
              </p>
            </article>

            <article className="group rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition group-hover:scale-110">
                <Zap className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Hızlı Görev Ekleme (⌘K)</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Arayüzde nereden olursanız olun kısayol tuşuyla bir saniye içinde yeni görev yaratın, öncelik ve proje atayın.
              </p>
            </article>

            <article className="group rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition group-hover:scale-110">
                <FolderKanban className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Projeler & Renkli Etiketler</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Görevlerinizi projelere ayırın, etiketlerle sınıflandırın ve zengin Markdown ile detaylandırın.
              </p>
            </article>

            <article className="group rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 transition group-hover:scale-110">
                <LockKeyhole className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Güvenli Çok Kullanıcı Mimarisi</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Clerk kimlik doğrulama ve veritabanı düzeyinde her kullanıcıya özel izole edilmiş tenant koruması.
              </p>
            </article>

            <article className="group rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <div className="grid size-10 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 transition group-hover:scale-110">
                <CheckCircle2 className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Günlük Ritim & Dışa Aktarma</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Günlük tamamlanma oranınızı canlı izleyin. İhtiyaç duyduğunuzda verilerinizi tek tıkla JSON veya CSV olarak indirin.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-indigo-500/10 p-8 sm:p-14 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Görevlerinizi bugün organize etmeye başlayın.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Vercel üzerinde sorunsuz çalışan, Supabase PostgreSQL destekli TaskFlow ile hemen tanışın.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-8 shadow-xl shadow-primary/25">
                <Link href="/signup">
                  Hemen Ücretsiz Katıl
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Brand compact />
          <p>© {new Date().getFullYear()} TaskFlow. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">Giriş</Link>
            <Link href="/signup" className="hover:text-foreground">Kayıt Ol</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
