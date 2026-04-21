import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppPageProps {
  children: ReactNode;
}

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

interface SectionCardProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  variant?: "default" | "soft" | "hero";
  className?: string;
  bodyClassName?: string;
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "accent";
  className?: string;
}

export function AppPage({ children }: AppPageProps) {
  return (
    <div className="relative flex h-full flex-col overflow-y-auto pb-28 no-scrollbar">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%),radial-gradient(circle_at_top_right,hsl(var(--hydration)/0.1),transparent_42%)]" />
      <div className="relative flex flex-col gap-3.5 px-4 pb-6 pt-5 safe-top sm:px-5">{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/60">{eyebrow}</p>
        <h1 className="display-font mt-1.5 text-2xl font-bold leading-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1.5 max-w-[30ch] text-sm leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
  variant = "default",
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-[24px] border p-3.5 shadow-[var(--shadow-card)] sm:p-4",
        variant === "default" && "app-card",
        variant === "soft" && "app-card-soft",
        variant === "hero" &&
          "border-primary/20 bg-[linear-gradient(145deg,hsl(var(--primary)/0.16),hsl(var(--hydration)/0.08),hsl(var(--card)/0.94)_58%,hsl(var(--surface-success)/0.4))] backdrop-blur-xl",
        className,
      )}
    >
      {eyebrow || title || action ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", variant === "hero" ? "text-primary/70" : "text-primary/60")}>
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className={cn("display-font mt-1 text-lg font-bold leading-tight", variant === "hero" ? "text-foreground" : "text-foreground")}>
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className={cn("mt-1.5 max-w-[30ch] text-sm leading-5", variant === "hero" ? "text-muted-foreground" : "text-muted-foreground")}>
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn((eyebrow || title || action) && "mt-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function MetricCard({ icon: Icon, label, value, detail, tone = "default", className }: MetricCardProps) {
  return (
    <article
      className={cn(
        "rounded-[22px] border p-3.5 shadow-[var(--shadow-card)] backdrop-blur-xl",
        tone === "default" && "border-border/80 bg-card/90",
        tone === "accent" && "border-primary/20 bg-primary/[0.08]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl", tone === "accent" ? "bg-primary text-primary-foreground shadow-[var(--shadow-button)]" : "bg-primary/15 text-primary")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/60">{label}</p>
          <p className="display-font mt-1 text-xl font-bold text-foreground">{value}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      </div>
    </article>
  );
}
