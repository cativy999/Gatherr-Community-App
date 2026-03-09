import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import OnboardingAge from "./pages/OnboardingAge";
import OnboardingWard from "./pages/OnboardingWard";
import OnboardingPreferences from "./pages/OnboardingPreferences";
import Home from "./pages/Home";
import Wards from "./pages/Wards";
import Post from "./pages/Post";
import Profile from "./pages/Profile";
import EventDetails from "./pages/EventDetails";
import MyEvents from "./pages/MyEvents";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/onboarding/age" element={<OnboardingAge />} />
          <Route path="/onboarding/ward" element={<OnboardingWard />} />
          <Route path="/onboarding/preferences" element={<OnboardingPreferences />} />
          <Route path="/home" element={<Home />} />
          <Route path="/wards" element={<Wards />} />
          <Route path="/post" element={<Post />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/event/:id" element={<EventDetails />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
