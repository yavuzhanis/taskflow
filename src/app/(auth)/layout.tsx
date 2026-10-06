import { Brand } from "@/components/brand";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen bg-muted/30 lg:grid-cols-[.85fr_1.15fr]"><section className="hidden border-r bg-card p-10 lg:flex lg:flex-col"><Brand /><div className="my-auto max-w-md"><p className="text-sm font-medium text-primary">TaskFlow</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">İşlerini sadeleştir, odağını koru.</h1><p className="mt-4 leading-7 text-muted-foreground">Kişisel görevlerin, projelerin ve etiketlerin yalnızca sana ait güvenli çalışma alanında tutulur.</p></div></section><section className="grid place-items-center p-5 sm:p-8">{children}</section></main>;
}
