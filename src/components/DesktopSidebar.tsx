import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { House, Calendar1, Plus, UsersRound, Search, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import CreateActionModal from "./CreateActionModal";

const NAV_ITEMS = [
  { id: "home",      label: "Home",      icon: House,      path: "/wards" },
  { id: "calendar",  label: "Calendar",  icon: Calendar1,  path: "/events" },
  { id: "plus",      label: "Create",    icon: Plus,       path: null },
  { id: "community", label: "Community", icon: UsersRound, path: "/community" },
  { id: "search",    label: "Search",    icon: Search,     path: "/search" },
  { id: "profile",   label: "Profile",   icon: User,       path: "/profile" },
];

const DesktopSidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { session } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [session?.user?.id]);

  return (
    <>
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full flex-col z-30 bg-background"
        style={{
          width: 80,
          overflow: "visible",
        }}
      >
        {/* Gather logo → home */}
        <div
          className="cursor-pointer flex items-center"
          style={{ paddingLeft: 20, paddingTop: 44, paddingBottom: 40 }}
          onClick={() => navigate("/wards")}
        >
          <img src="/GatherLOGO.png" alt="Gather" style={{ height: 28, width: "auto", objectFit: "contain" }} />
        </div>

        {/* Nav items */}
        <div className="flex flex-col" style={{ gap: 8, overflow: "visible" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = !!item.path && pathname === item.path;
            const isHovered = hoveredItem === item.id;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  if (item.id === "plus") setCreateModalOpen(true);
                  else if (item.path) navigate(item.path);
                }}
                style={{
                  position: "relative",
                  height: 44,
                  // Explicit width = just the icon zone so click/hover area never bleeds into content
                  width: 56,
                  cursor: "pointer",
                  overflow: "visible",
                  marginLeft: 12,
                }}
              >
                {/* Expanding pill background — absolute, visual only, no click capture */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: 44,
                    width: isHovered ? 200 : 56,
                    background: isHovered ? "hsl(var(--accent) / 0.5)" : "transparent",
                    borderRadius: 10,
                    transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), background 0.15s ease",
                    zIndex: 0,
                    pointerEvents: "none",
                  }}
                />

                {/* Row: icon + label — absolute so it doesn't expand the parent's hit area */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    height: 44,
                    width: 200,
                    pointerEvents: "none",
                  }}
                >
                  {/* Icon — re-enable pointer events so cursor:pointer works */}
                  <div
                    style={{
                      width: 56,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "auto",
                    }}
                  >
                    {item.id === "profile" && avatarUrl ? (
                      <img
                        src={avatarUrl}
                        referrerPolicy="no-referrer"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          objectFit: "cover",
                          outline: isActive ? "2px solid hsl(var(--primary))" : "none",
                        }}
                      />
                    ) : (
                      <item.icon
                        style={{ width: 24, height: 24 }}
                        color={isActive ? "hsl(var(--primary))" : "hsl(var(--foreground))"}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    )}
                  </div>

                  {/* Label — slides in, pointer-events none so clicks pass through to content */}
                  <div
                    style={{
                      overflow: "hidden",
                      maxWidth: isHovered ? 160 : 0,
                      opacity: isHovered ? 1 : 0,
                      transition: "max-width 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: "hsl(var(--foreground))",
                        paddingRight: 16,
                        fontFamily: "'Hanken Grotesk', sans-serif",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <CreateActionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        isDesktop
      />
    </>
  );
};

export default DesktopSidebar;
