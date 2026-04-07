import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import Activity from "@/pages/Activity";
import AddMeal from "@/pages/AddMeal";
import Dashboard from "@/pages/Dashboard";
import Progress from "@/pages/Progress";
import Settings from "@/pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <div className="flex h-full items-center justify-center bg-transparent px-3 py-3 sm:px-6 sm:py-6">
            <div className="relative h-full w-full max-w-[430px] overflow-hidden rounded-[34px] border border-white/75 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(188_55%_98%))] shadow-[0_42px_80px_-48px_rgba(21,46,54,0.24)] sm:h-[min(920px,100%)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_26%),radial-gradient(circle_at_top_right,hsl(var(--accent)/0.11),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.12),transparent_24%,rgba(255,255,255,0.1))]" />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/add" element={<AddMeal />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomNav />
            </div>
          </div>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
