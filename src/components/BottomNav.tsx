import { House, Plus, Calendar1, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface BottomNavProps {
  currentPage: "wards" | "post" | "events" | "profile";
}

const BottomNav = ({ currentPage }: BottomNavProps) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [session?.user?.id]);

  const navItems = [
    { id: "wards", icon: House, path: "/wards" },
    { id: "post", icon: Plus, path: "/post" },
    { id: "events", icon: Calendar1, path: "/events" },
    { id: "profile", icon: User, path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around max-w-4xl mx-auto px-4" style={{ height: '64px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          if (item.id === "profile") {
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex items-center justify-center min-w-[4rem] transition-colors"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className={`w-7 h-7 rounded-full object-cover ${
                      isActive ? "ring-2 ring-primary" : "ring-1 ring-border"
                    }`}
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-full bg-secondary flex items-center justify-center ${
                    isActive ? "ring-2 ring-primary" : ""
                  }`}>
                    <User className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                )}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex items-center justify-center min-w-[4rem] transition-colors"
            >
              <Icon
                className={`h-6 w-6 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;