import Link from "next/link";
import { Check } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="group inline-flex items-center gap-2.5 font-bold tracking-tight text-foreground transition"
    >
      <span className="relative grid size-8.5 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-primary via-indigo-600 to-sky-500 text-white shadow-md shadow-primary/25 transition group-hover:scale-105 group-hover:shadow-primary/40">
        <Check className="size-4.5 stroke-[2.8]" />
      </span>

      {!compact && (
        <span className="text-[16px] font-bold tracking-[-0.03em] flex items-center gap-1.5">
          TaskFlow
          <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
            PRO
          </span>
        </span>
      )}
    </Link>
  );
}
