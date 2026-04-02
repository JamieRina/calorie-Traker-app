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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.14),transparent_34%),radial-gradient(circle_at_top_right,hsl(var(--primary)/0.09),transparent_40%)]" />
      <div className="relative flex flex-col gap-4 px-5 pb-6 pt-6 safe-top">{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/55">{eyebrow}</p>
        <h1 className="display-font mt-2 text-[2rem] font-bold leading-none tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-3 max-w-[34ch] text-sm leading-6 text-muted-foreground">{description}</p> : null}
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
        "rounded-[28px] border p-4 shadow-[0_24px_44px_-36px_rgba(28,38,33,0.18)]",
        variant === "default" && "border-white/80 bg-white/90 backdrop-blur-sm",
        variant === "soft" && "border-primary/10 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.8),white)]",
        variant === "hero" &&
          "border-transparent bg-[linear-gradient(160deg,hsl(var(--foreground))_0%,hsl(var(--primary))_58%,hsl(var(--accent))_100%)] text-white shadow-[0_30px_60px_-34px_hsl(var(--foreground)/0.45)]",
        className,
      )}
    >
      {eyebrow || title || action ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className={cn("text-[11px] font-semibold uppercase tracking-[0.24em]", variant === "hero" ? "text-white/68" : "text-primary/55")}>
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className={cn("display-font mt-1 text-xl font-bold tracking-tight", variant === "hero" ? "text-white" : "text-foreground")}>
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className={cn("mt-2 max-w-[38ch] text-sm leading-6", variant === "hero" ? "text-white/78" : "text-muted-foreground")}>
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn((eyebrow || title || action) && "mt-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function MetricCard({ icon: Icon, label, value, detail, tone = "default", className }: MetricCardProps) {
  return (
    <article
      className={cn(
        "rounded-[24px] border p-4 shadow-[0_16px_32px_-28px_rgba(0,0,0,0.18)]",
        tone === "default" && "border-white/80 bg-white/90",
        tone === "accent" && "border-primary/10 bg-primary/[0.06]",
        className,
      )}
    >
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", tone === "accent" ? "bg-primary text-primary-foreground" : "bg-secondary text-primary")}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/55">{label}</p>
      <p className="display-font mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}
