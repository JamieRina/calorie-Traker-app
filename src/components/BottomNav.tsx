import { Activity, ChartColumnBig, House, Plus, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: House, label: "Home" },
  { path: "/activity", icon: Activity, label: "Activity" },
  { path: "/add", icon: Plus, label: "Log", isAction: true },
  { path: "/progress", icon: ChartColumnBig, label: "Progress" },
  { path: "/profile", icon: UserRound, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-background/95 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex h-20 max-w-[430px] items-center justify-between px-4">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          if (tab.isAction) {
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="-mt-8 flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-white shadow-[0_26px_40px_-24px_hsl(var(--primary)/0.95)] transition-transform active:scale-95"
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition-all",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
