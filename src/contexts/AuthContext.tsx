import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

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
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);

      // Save avatar URL to profiles table whenever user logs in
      if (session?.user) {
        const avatarUrl = session.user.user_metadata?.avatar_url;
        const name = session.user.user_metadata?.full_name;
        if (avatarUrl || name) {
          supabase.from("profiles").upsert({
            user_id: session.user.id,
            ...(avatarUrl && { avatar_url: avatarUrl }),
            ...(name && { name }),
          }, { onConflict: "user_id" });
        }
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