import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { SessionTimeoutWrapper } from "@/components/SessionTimeoutWrapper";
import { PWAInstallPrompt, OfflineIndicator } from "@/components/PWAInstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import PublicUserGuide from "./pages/PublicUserGuide";

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
            <PWAInstallPrompt />
            <BrowserRouter>
              <SessionTimeoutWrapper>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Auth />} />
                    <Route path="/dashboard" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/help-guide" element={<PublicUserGuide />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </SessionTimeoutWrapper>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
