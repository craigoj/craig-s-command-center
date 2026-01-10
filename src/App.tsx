import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Morning from "./pages/Morning";
import WeeklyReset from "./pages/WeeklyReset";
import MidweekCheckin from "./pages/MidweekCheckin";
import ReviewCaptures from "./pages/ReviewCaptures";
import YearlyPlanningDashboard from "./pages/yearly-planning/Dashboard";
import YearlyPlanningOnboarding from "./pages/yearly-planning/Onboarding";
import People from "./pages/brain/People";
import Learning from "./pages/brain/Learning";
import Log from "./pages/brain/Log";
import { AuthGuard } from "./components/AuthGuard";
import { AppLayout } from "./components/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<AuthGuard><AppLayout><Index /></AppLayout></AuthGuard>} />
          <Route path="/morning" element={<AuthGuard><AppLayout><Morning /></AppLayout></AuthGuard>} />
          <Route path="/review-captures" element={<AuthGuard><AppLayout><ReviewCaptures /></AppLayout></AuthGuard>} />
          <Route path="/weekly-reset" element={<AuthGuard><AppLayout><WeeklyReset /></AppLayout></AuthGuard>} />
          <Route path="/midweek-checkin" element={<AuthGuard><AppLayout><MidweekCheckin /></AppLayout></AuthGuard>} />
          {/* Brain Routes */}
          <Route path="/brain/people" element={<AuthGuard><AppLayout><People /></AppLayout></AuthGuard>} />
          <Route path="/brain/learning" element={<AuthGuard><AppLayout><Learning /></AppLayout></AuthGuard>} />
          <Route path="/brain/log" element={<AuthGuard><AppLayout><Log /></AppLayout></AuthGuard>} />
          {/* Yearly Planning Routes */}
          <Route path="/yearly-planning" element={<AuthGuard><AppLayout><YearlyPlanningDashboard /></AppLayout></AuthGuard>} />
          <Route path="/yearly-planning/onboarding" element={<AuthGuard><YearlyPlanningOnboarding /></AuthGuard>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
