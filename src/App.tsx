import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { LocationProvider } from "@/contexts/LocationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Welcome from "./pages/Welcome";
import ResetPassword from "./pages/ResetPassword";
import OnboardingAge from "./pages/OnboardingAge";
import OnboardingWard from "./pages/OnboardingWard";
import Wards from "./pages/Wards";
import CreateEvent from "./pages/CreateEvent";
import Post from "./pages/Post";
import Profile from "./pages/Profile";
import EventDetails from "./pages/EventDetails";
import MyEvents from "./pages/MyEvents";
import Events from "./pages/Events";
import NotFound from "./pages/NotFound";
import OnboardingName from "./pages/OnboardingName";
import WardProfile from "./pages/WardProfile";

const queryClient = new QueryClient();

const AuthListener = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const hasNavigated = useRef(false);

  useEffect(() => {
    console.log("AuthListener fired:", { loading, session: !!session, hasNavigated: hasNavigated.current });
    if (loading) return;
  
    // Don't redirect if we're on reset-password page (with or without hash)
    const isResetPage = window.location.pathname === "/reset-password" ||
      window.location.hash.includes("type=recovery"); // ✅ catches the hash too
  
    if (isResetPage) return;
  
    if (!session) return;
    if (hasNavigated.current) return;

  
    hasNavigated.current = true;
    supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data: profile, error }) => {
        console.log("Profile check:", { profile, error }); // 👈 add this line
        if (profile) {
          const currentPath = window.location.pathname;
          if (currentPath !== "/") return; // already on the right page
          navigate("/wards");
        } else {
          navigate("/onboarding/name");
        }
      });
  }, [session, loading]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LocationProvider>
          <UserProfileProvider>
            <Toaster />
            <Sonner duration={1400} />
            <BrowserRouter>
              <AuthListener />
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/onboarding/name" element={<OnboardingName />} />
                <Route path="/onboarding/age" element={<OnboardingAge />} />
                <Route path="/onboarding/ward" element={<OnboardingWard />} />
                <Route path="/wards" element={<Wards />} />
                <Route path="/post" element={<Post />} />
                <Route path="/create-event" element={<CreateEvent />} />
                <Route path="/create-event/:id" element={<CreateEvent />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/event/:id" element={<EventDetails />} />
                <Route path="/my-events" element={<MyEvents />} />
                <Route path="/events" element={<Events />} />
                <Route path="/ward/:slug" element={<WardProfile />} />
                <Route path="*" element={<NotFound />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                

              </Routes>
            </BrowserRouter>
          </UserProfileProvider>
        </LocationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;