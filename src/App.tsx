import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { LocationProvider } from "@/contexts/LocationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { useEffect, useRef, type ReactNode, memo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Welcome from "./pages/Welcome";
import OnboardingAge from "./pages/OnboardingAge";
import Wards from "./pages/Wards";
import CreateEvent from "./pages/CreateEvent";
import Post from "./pages/Post";
import Profile from "./pages/Profile";
import EventDetails from "./pages/EventDetails";
import Events from "./pages/Events";
import NotFound from "./pages/NotFound";
import OnboardingName from "./pages/OnboardingName";
import WardProfile from "./pages/WardProfile";
import Search from "./pages/Search";
import PublishedEventsPage from "./pages/PublishedEventsPage";
import PublishedGroupsPage from "./pages/PublishedGroupsPage";
import CreateGroup from "./pages/CreateGroup";
import Community from "./pages/Community";
import GroupProfile from "./pages/GroupProfile";
import AccountInfo from "./pages/AccountInfo";
import Admin from "./pages/Admin";
import NotificationsPage from "./pages/NotificationsPage";
import Challenge from "./pages/Challenge";
import LogSteps from "./pages/LogSteps";
import OOTDHome from "./pages/OOTDHome";
import OOTDReview from "./pages/OOTDReview";
import CohostInvite from "./pages/CohostInvite";
import GroupAdminInvite from "./pages/GroupAdminInvite";
import FeedbackButton from "@/components/FeedbackButton";
import DesktopSidebar from "@/components/DesktopSidebar";

// Redirect /e/:id → /event/:id (canonical URL for OG previews)
const ShortEventRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/event/${id}`} replace />;
};

const queryClient = new QueryClient();

const AuthListener = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const hasNavigated = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      navigate(redirect);
    }
  }, []);

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
        const pendingRedirect = localStorage.getItem("postAuthRedirect");
        if (profile) {
          if (pendingRedirect) {
            localStorage.removeItem("postAuthRedirect");
            navigate(pendingRedirect);
            return;
          }
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

const hideNavPaths = ["/", "/onboarding/name", "/onboarding/age", "/challenge", "/log-steps", "/ootd", "/ootd/review"];
const hideNavPatterns = ["/create-event", "/cohost-invite", "/group-admin-invite"];

const AppLayout = () => {
  const { session } = useAuth();
  const { pathname } = useLocation();

  if (!session || hideNavPaths.includes(pathname) || hideNavPatterns.some(p => pathname.startsWith(p))) return null;

  return <BottomNav />;
};

const DesktopSidebarLayout = () => {
  const { session } = useAuth();
  const { pathname } = useLocation();

  if (!session || hideNavPaths.includes(pathname) || hideNavPatterns.some(p => pathname.startsWith(p))) return null;

  return <DesktopSidebar />;
};

const useShowDesktopSidebar = () => {
  const { session } = useAuth();
  const { pathname } = useLocation();
  return !!session && !hideNavPaths.includes(pathname) && !hideNavPatterns.some(p => pathname.startsWith(p));
};

const ContentLayout = ({ children }: { children: ReactNode }) => {
  const showSidebar = useShowDesktopSidebar();
  return <div className={showSidebar ? "md:pl-24" : ""}>{children}</div>;
};

// Wraps routes so every navigation triggers a directional slide.
// Direction is detected synchronously (no useState flash) via history.state.idx —
// React Router increments idx on every push and decrements on pop (back).
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const prevIdxRef = useRef<number>(window.history.state?.idx ?? 0);
  const animClassRef = useRef<string>("page-enter");

  const currentIdx = window.history.state?.idx ?? 0;
  if (currentIdx !== prevIdxRef.current) {
    // Going back → slide in from left; going forward → slide in from right
    animClassRef.current = currentIdx < prevIdxRef.current
      ? "page-slide-from-left"
      : "page-enter";
    prevIdxRef.current = currentIdx;
  }

  return (
    <div key={location.key} className={animClassRef.current}>
      {children}
    </div>
  );
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
              <DesktopSidebarLayout />
              <ContentLayout>
              <PageTransition>
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/onboarding/name" element={<OnboardingName />} />
                <Route path="/onboarding/age" element={<OnboardingAge />} />
                <Route path="/wards" element={<Wards />} />
                <Route path="/post" element={<Post />} />
                <Route path="/create-event" element={<CreateEvent />} />
                <Route path="/create-event/:id" element={<CreateEvent />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/account-info" element={<AccountInfo />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/challenge" element={<Challenge />} />
                <Route path="/log-steps" element={<LogSteps />} />
                <Route path="/ootd" element={<OOTDHome />} />
                <Route path="/ootd/review" element={<OOTDReview />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/event/:id" element={<EventDetails />} />
                <Route path="/e/:id" element={<ShortEventRedirect />} />
                <Route path="/events" element={<Events />} />
                <Route path="/ward/:slug" element={<WardProfile />} />
                <Route path="/search" element={<Search />} />
                <Route path="*" element={<NotFound />} />
                <Route path="/my-published-events" element={<PublishedEventsPage />} />
                <Route path="/create-group" element={<CreateGroup />} />
                <Route path="/create-group/:id" element={<CreateGroup />} />
                <Route path="/my-published-groups" element={<PublishedGroupsPage />} />
                <Route path="/community" element={<Community />} />
                <Route path="/group/:id" element={<GroupProfile />} />
                <Route path="/cohost-invite/:token" element={<CohostInvite />} />
                <Route path="/group-admin-invite/:inviteId" element={<GroupAdminInvite />} />
              </Routes>
              </PageTransition>
              </ContentLayout>
              <AppLayout />
              <FeedbackButton />
            </BrowserRouter>
          </UserProfileProvider>
        </LocationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
