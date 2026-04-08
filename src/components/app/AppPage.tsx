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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_34%),radial-gradient(circle_at_top_right,hsl(var(--accent)/0.1),transparent_40%)]" />
      
      {/* ✅ FIXED TOP SPACING */}
      <div
        className="relative flex flex-col gap-4 px-5 pb-10 pt-12 safe-top"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    // ✅ BONUS IMPROVEMENT: added margin-bottom
    <header className="flex items-start justify-between gap-4 mb-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">
          {eyebrow}
        </p>
        <h1 className="display-font mt-2 text-[1.9rem] font-bold leading-none tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[34ch] text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
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
        "rounded-[28px] border p-4 shadow-[0_22px_40px_-34px_rgba(22,40,46,0.16)]",
        variant === "default" && "border-white/75 bg-white/88 backdrop-blur-sm",
        variant === "soft" &&
          "border-primary/10 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.8),hsl(var(--background)))]",
        variant === "hero" &&
          "border-primary/10 bg-[linear-gradient(145deg,hsl(var(--primary)/0.16),hsl(var(--accent)/0.12),rgba(255,255,255,0.94))] shadow-[0_26px_52px_-36px_hsl(var(--accent)/0.22)]",
        className
      )}
    >
      {eyebrow || title || action ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.22em]",
                  variant === "hero" ? "text-primary/65" : "text-primary/60"
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2
                className={cn(
                  "display-font mt-1 text-xl font-bold tracking-tight",
                  "text-foreground"
                )}
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p
                className={cn(
                  "mt-2 max-w-[38ch] text-sm leading-6 text-muted-foreground"
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn((eyebrow || title || action) && "mt-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
  className,
}: MetricCardProps) {
  return (
    <article
      className={cn(
        "rounded-[24px] border p-4 shadow-[0_16px_32px_-30px_rgba(21,39,48,0.16)]",
        tone === "default" && "border-white/75 bg-white/88",
        tone === "accent" && "border-accent/10 bg-accent/[0.06]",
        className
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl",
          tone === "accent"
            ? "bg-accent text-accent-foreground"
            : "bg-secondary text-primary"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/60">
        {label}
      </p>
      <p className="display-font mt-2 text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}