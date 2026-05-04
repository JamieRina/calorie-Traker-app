import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Activity from "@/pages/Activity";
import AddMeal from "@/pages/AddMeal";
import Auth from "@/pages/Auth";
import Community from "@/pages/Community";
import Dashboard from "@/pages/Dashboard";
import Progress from "@/pages/Progress";
import Settings from "@/pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/add" element={<AddMeal />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/community" element={<Community />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="flex h-full items-center justify-center bg-transparent px-3 py-3 sm:px-6 sm:py-6">
              <div className="relative h-full w-full max-w-[430px] overflow-hidden rounded-[30px] border border-border/80 bg-background shadow-[0_42px_90px_-48px_rgb(0_0_0/0.62)] sm:h-[min(920px,100%)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_28%),radial-gradient(circle_at_top_right,hsl(var(--hydration)/0.12),transparent_34%),linear-gradient(180deg,hsl(var(--surface-elevated)/0.18),transparent_28%,hsl(var(--background-secondary)/0.28))]" />
                <AppRoutes />
              </div>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
