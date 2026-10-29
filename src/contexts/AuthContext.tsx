import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import posthog from "posthog-js";

// ── Internal user IDs — edit this list to add/remove team members ──────────
// These users are opted out of PostHog analytics on login.
const INTERNAL_USER_IDS = new Set([
  "57ff4ff5-bbeb-40f4-a518-4688ba45552c", // hsinpeiwang1001@gmail.com
  "4359038f-435a-455e-b56a-c93d4c93fdc1", // ivoryivy333@gmail.com
]);

// Only opts out if PostHog has been initialised (i.e. VITE_POSTHOG_KEY was set).
const applyPosthogOptOut = (userId: string | undefined) => {
  if (!userId || !posthog.__loaded) return;
  if (INTERNAL_USER_IDS.has(userId)) {
    posthog.opt_out_capturing();
  }
};

const AuthContext = createContext<{ session: Session | null; loading: boolean }>({
  session: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      applyPosthogOptOut(session?.user?.id);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "TOKEN_REFRESHED" || _event === "SIGNED_IN" || _event === "SIGNED_OUT" || _event === "INITIAL_SESSION") {
        setSession(session);
        setLoading(false);
        applyPosthogOptOut(session?.user?.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);