import { Activity, ChartColumnBig, House, Plus, SlidersHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: House, label: "Home" },
  { path: "/activity", icon: Activity, label: "Activity" },
  { path: "/add", icon: Plus, label: "Log", isAction: true },
  { path: "/progress", icon: ChartColumnBig, label: "Progress" },
  { path: "/settings", icon: SlidersHorizontal, label: "More" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 px-3 pb-3 safe-bottom">
      <div className="mx-auto flex h-[68px] max-w-[430px] items-center justify-between rounded-[22px] border border-border/80 bg-card/92 px-2.5 shadow-[0_22px_42px_-34px_rgb(0_0_0/0.72)] backdrop-blur-xl">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          if (tab.isAction) {
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="-mt-7 flex h-14 w-14 flex-col items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary-soft)))] text-primary-foreground shadow-[var(--shadow-button)] transition-transform active:scale-95"
              >
                <Icon className="h-5 w-5" />
                <span className="mt-0.5 text-[10px] font-semibold">Log</span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex min-w-[56px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-all",
                isActive ? "bg-primary/15 text-primary shadow-[inset_0_1px_0_hsl(var(--primary)/0.2)]" : "text-muted-foreground hover:bg-surface-elevated/75 hover:text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
