import { Activity, ChartColumnBig, House, Plus, SlidersHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: House, label: "Home" },
  { path: "/activity", icon: Activity, label: "Activity" },
  { path: "/add", icon: Plus, label: "Log", isAction: true },
  { path: "/progress", icon: ChartColumnBig, label: "Progress" },
  { path: "/settings", icon: SlidersHorizontal, label: "Settings" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 px-3 pb-3 safe-bottom">
      <div className="mx-auto flex h-[76px] max-w-[430px] items-center justify-between rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,244,237,0.94))] px-3 shadow-[0_24px_44px_-34px_rgba(18,28,24,0.28)] backdrop-blur-xl">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          if (tab.isAction) {
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="-mt-9 flex h-[60px] w-[60px] flex-col items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-white shadow-[0_24px_36px_-22px_hsl(var(--primary)/0.8)] transition-transform active:scale-95"
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]">Log</span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-2.5 text-[11px] font-semibold transition-all",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
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
