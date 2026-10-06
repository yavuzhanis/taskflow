import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-10 place-items-center rounded-xl border border-border/80 bg-background shadow-sm">
          <Inbox className="size-4 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-sm font-semibold tracking-[-0.01em]">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
