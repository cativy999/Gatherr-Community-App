import { House, Calendar1, Plus, UsersRound, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import CreateActionModal from "@/components/CreateActionModal";

interface BottomNavProps {
  currentPage: "wards" | "events" | "community" | "profile";
}

const BottomNav = ({ currentPage }: BottomNavProps) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url ?? session.user.user_metadata?.avatar_url ?? null);
      });
  }, [session?.user?.id]);

  const navItems = [
    { id: "wards", icon: House, path: "/wards" },
    { id: "events", icon: Calendar1, path: "/events" },
    { id: "plus", icon: null, path: null },          // centre action button
    { id: "community", icon: UsersRound, path: "/community" },
    { id: "profile", icon: null, path: "/profile" }, // avatar
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div
          className="flex items-center justify-around max-w-4xl mx-auto px-2"
          style={{ height: "64px" }}
        >
          {navItems.map((item) => {
            const isActive = currentPage === item.id;

            /* ── Centre "+" button ── */
            if (item.id === "plus") {
              return (
                <button
                  key="plus"
                  onClick={() => setCreateModalOpen(true)}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
                  aria-label="Create"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </button>
              );
            }

            /* ── Profile avatar button ── */
            if (item.id === "profile") {
              return (
                <button
                  key="profile"
                  onClick={() => navigate("/profile")}
                  className="flex items-center justify-center w-12 h-12 transition-colors"
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
                    <div
                      className={`w-7 h-7 rounded-full bg-secondary flex items-center justify-center ${
                        isActive ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <User className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                  )}
                </button>
              );
            }

            /* ── Regular icon buttons ── */
            const Icon = item.icon!;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path!)}
                className="flex items-center justify-center w-12 h-12 transition-colors"
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

      <CreateActionModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </>
  );
};

export default BottomNav;
