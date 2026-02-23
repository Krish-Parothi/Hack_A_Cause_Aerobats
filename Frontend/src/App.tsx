import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import InspectPage from "./pages/InspectPage";
import DashboardPage from "./pages/DashboardPage";
import NearbyPage from "./pages/NearbyPage";
import NotFound from "./pages/NotFound";
import PublicDisplay from "./pages/PublicDisplay";
import FacilityDetail from "./pages/FacilityDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/inspect" element={<InspectPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/nearby" element={<NearbyPage />} />
              <Route path="/display/:facilityId" element={<PublicDisplay />} />
              <Route path="/facility/:facilityId" element={<FacilityDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
