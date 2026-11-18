import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";

import { OfflineIndicator } from "@/components/PWAInstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import NotFound from "./pages/NotFound";
import InstallPage from "./hrms/InstallPage";
import HrmsApp from "./hrms/HrmsApp";
// The previous /classic screens and the public pages load only when opened, so phones opening the HRMS
// download far less before the first screen appears.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const PublicUserGuide = lazy(() => import("./pages/PublicUserGuide"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Loading = () => <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontFamily: "system-ui, sans-serif" }}>Loading…</div>;

const queryClient = new QueryClient();

const App = () => {
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
                <Suspense fallback={<Loading />}>
                <Routes>
                  {/* WestMed Payroll System — the approved HRMS prototype, live on Supabase */}
                  <Route path="/" element={<HrmsApp />} />
                  <Route path="/dashboard" element={<HrmsApp />} />
                  <Route path="/auth" element={<HrmsApp />} />
                  {/* previous WestMed screens, kept reachable for administrators */}
                  <Route path="/classic" element={<Index />} />
                  <Route path="/classic/login" element={<Auth />} />
                  <Route path="/install" element={<InstallPage />} />
                  <Route path="/help-guide" element={<PublicUserGuide />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
