import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AdminForbidden({ email }: { email?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-6 sm:p-8 text-center shadow-lg">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="size-7" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Yönetici Yetkisi Gerekli
        </h1>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Bu panel yalnızca sistem yöneticilerine (Admin) açıktır.{" "}
          {email && (
            <span className="block mt-1 font-mono text-xs text-foreground/80">
              Oturum: {email}
            </span>
          )}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              Çalışma Alanına Dön
            </Link>
          </Button>

          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="size-4" />
              Ana Sayfa
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
