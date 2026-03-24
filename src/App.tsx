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
import Profile from "@/pages/Profile";
import Progress from "@/pages/Progress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <div className="flex h-full items-center justify-center bg-transparent px-2 py-2 sm:px-6 sm:py-6">
            <div className="relative h-full w-full max-w-[430px] overflow-hidden rounded-[32px] border border-white/60 bg-background shadow-[0_36px_72px_-36px_rgba(7,31,29,0.55)] sm:h-[min(920px,100%)]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/add" element={<AddMeal />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/profile" element={<Profile />} />
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
