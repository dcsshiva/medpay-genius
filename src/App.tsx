import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { SessionTimeoutWrapper } from "@/components/SessionTimeoutWrapper";
import { PWAInstallPrompt, OfflineIndicator } from "@/components/PWAInstallPrompt";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import PublicUserGuide from "./pages/PublicUserGuide";

const queryClient = new QueryClient();

// Simple fallback component to test
const SimpleApp = () => (
  <div className="min-h-screen bg-blue-50 flex items-center justify-center">
    <div className="text-center p-8 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">WestMed Hospital</h1>
      <p className="text-gray-600 mb-4">Payment Management System</p>
      <p className="text-sm text-gray-500">App is loading successfully!</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    // Initialize mobile features with dynamic import to avoid React conflicts
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

  try {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <PWAInstallPrompt />
            <BrowserRouter>
              <SessionTimeoutWrapper>
                <Routes>
                  <Route path="/" element={<Auth />} />
                  <Route path="/dashboard" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/help-guide" element={<PublicUserGuide />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SessionTimeoutWrapper>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('App error:', error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="text-gray-600 mb-4">Something went wrong. Please refresh the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

export default App;
