import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { LocationProvider } from "@/contexts/LocationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Welcome from "./pages/Welcome";
import OnboardingAge from "./pages/OnboardingAge";
import OnboardingPreferences from "./pages/OnboardingPreferences";
import OnboardingWard from "./pages/OnboardingWard";
import Home from "./pages/Home";
import Wards from "./pages/Wards";
import CreateEvent from "./pages/CreateEvent";
import Post from "./pages/Post";
import Profile from "./pages/Profile";
import EventDetails from "./pages/EventDetails";
import MyEvents from "./pages/MyEvents";
import Events from "./pages/Events";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", session.user.id)
          .single();

        if (profile) {
          navigate("/home");
        } else {
          navigate("/onboarding/age");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LocationProvider>
          <UserProfileProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthListener />
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/onboarding/age" element={<OnboardingAge />} />
                <Route path="/onboarding/preferences" element={<OnboardingPreferences />} />
                <Route path="/onboarding/ward" element={<OnboardingWard />} />
                <Route path="/home" element={<Home />} />
                <Route path="/wards" element={<Wards />} />
                <Route path="/post" element={<Post />} />
                <Route path="/create-event" element={<CreateEvent />} />
                <Route path="/create-event/:id" element={<CreateEvent />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/event/:id" element={<EventDetails />} />
                <Route path="/my-events" element={<MyEvents />} />
                <Route path="/events" element={<Events />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </UserProfileProvider>
        </LocationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;