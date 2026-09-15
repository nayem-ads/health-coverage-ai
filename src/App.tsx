import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CalculatorWizard from "./pages/CalculatorWizard";
import UnlockPage from "./pages/UnlockPage";
import ResultsPage from "./pages/ResultsPage";
import ThankYouPage from "./pages/ThankYouPage";
import TrustCenterPage from "./pages/TrustCenterPage";
import { PrivacyPage, TermsPage, ConsentPage, DisclaimerPage, ContactPage } from "./pages/LegalPages";
import { useCalculatorStore } from "./stores/calculatorStore";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Reset scroll position to top (0%) on every page transition
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Capture UTM parameters from URL and save them in Zustand store
const UTMTracker = () => {
  const { updateInputs } = useCalculatorStore();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const utmContent = params.get('utm_content'); // Ad Name
    const utmTerm = params.get('utm_term'); // Adset Name

    const updates: Record<string, string> = {};
    if (utmSource) updates.utmSource = utmSource;
    if (utmMedium) updates.utmMedium = utmMedium;
    if (utmCampaign) updates.utmCampaign = utmCampaign;
    if (utmContent) updates.utmContent = utmContent;
    if (utmTerm) updates.utmTerm = utmTerm;

    if (Object.keys(updates).length > 0) {
      updateInputs(updates);
    }
  }, [search, updateInputs]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <UTMTracker />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/calculator" element={<CalculatorWizard />} />
          <Route path="/unlock/:runId" element={<UnlockPage />} />
          <Route path="/results/:runId" element={<ResultsPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/trust" element={<TrustCenterPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/consent" element={<ConsentPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
