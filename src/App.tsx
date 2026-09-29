import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";

import { OfflineIndicator } from "@/components/PWAInstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import PublicUserGuide from "./pages/PublicUserGuide";
import Unsubscribe from "./pages/Unsubscribe";
import HrmsApp from "./hrms/HrmsApp";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const initMobile = async () => {
      try {
        const { initializeMobileFeatures, setupDeepLinks } = await import('@/lib/capacitor');
        await initializeMobileFeatures();
        setupDeepLinks();
      } catch (error) {
        console.log('Mobile features not available:', error);
      }
    };
    initMobile();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <BrowserRouter>
              <ErrorBoundary>
                <Routes>
                  {/* WestMed Payroll System — the approved HRMS prototype, live on Supabase */}
                  <Route path="/" element={<HrmsApp />} />
                  <Route path="/dashboard" element={<HrmsApp />} />
                  <Route path="/auth" element={<HrmsApp />} />
                  {/* previous WestMed screens, kept reachable for administrators */}
                  <Route path="/classic" element={<Index />} />
                  <Route path="/classic/login" element={<Auth />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/help-guide" element={<PublicUserGuide />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
