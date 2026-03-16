import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfileContextType {
  preferredAgeMin: number;
  preferredAgeMax: number;
  setPreferredAge: (min: number, max: number) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [preferredAgeMin, setPreferredAgeMin] = useState(18);
  const [preferredAgeMax, setPreferredAgeMax] = useState(80);

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("preferred_age_min, preferred_age_max")
        .eq("user_id", userId)
        .single();
      if (data) {
        setPreferredAgeMin(data.preferred_age_min ?? 18);
        setPreferredAgeMax(data.preferred_age_max ?? 80);
      }
    };
    fetchProfile();
  }, [userId]);

  const setPreferredAge = (min: number, max: number) => {
    setPreferredAgeMin(min);
    setPreferredAgeMax(max);
  };

  return (
    <UserProfileContext.Provider value={{ preferredAgeMin, preferredAgeMax, setPreferredAge }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) throw new Error("useUserProfile must be used within UserProfileProvider");
  return context;
};