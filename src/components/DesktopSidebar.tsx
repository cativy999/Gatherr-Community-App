import { CE_ERROR } from '../tokens';
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { House, Calendar1, Plus, UsersRound, Search, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import CreateActionModal from "./CreateActionModal";

const NAV_ITEMS = [
  { id: "home",      label: "Home",      icon: House,      path: "/wards" },
  { id: "calendar",  label: "My Events", icon: Calendar1,  path: "/events" },
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [session?.user?.id]);

  // Unread notifications (tags/mentions, replies, likes on events you posted)
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchUnread = () => {
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("read", false)
        .then(({ count }) => setUnreadCount(count ?? 0));
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  const ICON_COLOR        = "#5E5F60";  // inactive gray
  const ICON_COLOR_ACTIVE = "#2C2523";  // active dark

  return (
    <>
      <style>{`
        @keyframes draw-icon {
          from { stroke-dashoffset: 1; }
          to   { stroke-dashoffset: 0; }
        }
        .home-path-1,.home-path-2,
        .cal-rect,.cal-p1,.cal-p2,.cal-p3,.cal-p4,
        .plus-p1,.plus-p2,
        .users-c,.users-p1,.users-p2,
        .search-c,.search-p,
        .profile-c {
          stroke-dasharray: 1; stroke-dashoffset: 0;
        }
        .home-drawing .home-path-1 { animation: draw-icon 0.5s cubic-bezier(0.4,0,0.2,1) forwards; }
        .home-drawing .home-path-2 { animation: draw-icon 0.3s cubic-bezier(0.4,0,0.2,1) 0.4s both; }
        .cal-drawing .cal-rect { animation: draw-icon 0.45s cubic-bezier(0.4,0,0.2,1) both; }
        .cal-drawing .cal-p1   { animation: draw-icon 0.15s cubic-bezier(0.4,0,0.2,1) 0.35s both; }
        .cal-drawing .cal-p2   { animation: draw-icon 0.15s cubic-bezier(0.4,0,0.2,1) 0.42s both; }
        .cal-drawing .cal-p3   { animation: draw-icon 0.2s  cubic-bezier(0.4,0,0.2,1) 0.52s both; }
        .cal-drawing .cal-p4   { animation: draw-icon 0.2s  cubic-bezier(0.4,0,0.2,1) 0.65s both; }
        .plus-drawing .plus-p1 { animation: draw-icon 0.25s cubic-bezier(0.4,0,0.2,1) both; }
        .plus-drawing .plus-p2 { animation: draw-icon 0.25s cubic-bezier(0.4,0,0.2,1) 0.18s both; }
        .users-drawing .users-c  { animation: draw-icon 0.3s  cubic-bezier(0.4,0,0.2,1) both; }
        .users-drawing .users-p1 { animation: draw-icon 0.3s  cubic-bezier(0.4,0,0.2,1) 0.25s both; }
        .users-drawing .users-p2 { animation: draw-icon 0.25s cubic-bezier(0.4,0,0.2,1) 0.5s both; }
        .search-drawing .search-c { animation: draw-icon 0.4s  cubic-bezier(0.4,0,0.2,1) both; }
        .search-drawing .search-p { animation: draw-icon 0.15s cubic-bezier(0.4,0,0.2,1) 0.38s both; }
        .profile-drawing .profile-c { animation: draw-icon 0.45s cubic-bezier(0.4,0,0.2,1) both; }
      `}</style>
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full flex-col z-30"
        style={{
          width: 96,
          overflow: "visible",
          background: "#ffffff",
          borderRight: "1px solid #E4DCCF",
        }}
      >
        {/* Logo → home */}
        <div
          className="cursor-pointer flex items-center justify-center"
          style={{ paddingTop: 32, paddingBottom: 32 }}
          onClick={() => navigate("/wards")}
        >
          <img src="/Newbyondsundayicon.png" alt="Beyond Sunday" style={{ height: 44, width: "auto", objectFit: "contain" }} />
        </div>

        {/* Nav items */}
        <div className="flex flex-col items-center" style={{ gap: 20, overflow: "visible" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = !!item.path && pathname === item.path;
            const isHovered = hoveredItem === item.id;
            const iconColor = isActive ? ICON_COLOR_ACTIVE : ICON_COLOR;

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
                  width: 48,
                  cursor: "pointer",
                  overflow: "visible",
                  borderRadius: 100,
                }}
              >
                {/* Pill background on hover/active */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 100,
                    background: isActive ? "#F5F1EC" : "transparent",
                    transition: "background 0.15s ease",
                    pointerEvents: "none",
                  }}
                />

                {/* Icon centered */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.id === "profile" && avatarUrl ? (
                    <div style={{ position: "relative" }}>
                      <img
                        src={avatarUrl}
                        referrerPolicy="no-referrer"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          objectFit: "cover",
                          outline: isActive ? `2px solid ${ICON_COLOR_ACTIVE}` : "none",
                        }}
                      />
                      {unreadCount > 0 && (
                        <span style={{
                          position: "absolute", top: -2, right: -4,
                          minWidth: 14, height: 14,
                          background: CE_ERROR, color: "#fff",
                          fontSize: 9, fontWeight: 700, borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "0 2px", lineHeight: 1,
                        }}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                  ) : item.id === "home" ? (
                    <svg
                      className={isHovered ? "home-drawing" : ""}
                      viewBox="0 0 24 24"
                      style={{ width: 22, height: 22 }}
                      fill="none"
                      stroke={iconColor}
                      strokeWidth={isActive ? 2.5 : 2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path
                        className="home-path-1"
                        pathLength="1"
                        d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                      />
                      <path
                        className="home-path-2"
                        pathLength="1"
                        d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
                      />
                    </svg>
                  ) : item.id === "calendar" ? (
                    <svg className={isHovered ? "cal-drawing" : ""} viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke={iconColor} strokeWidth={isActive ? 2.5 : 2.2} strokeLinecap="round" strokeLinejoin="round">
                      <rect className="cal-rect" pathLength="1" x="3" y="4" width="18" height="18" rx="2" />
                      <path className="cal-p1" pathLength="1" d="M8 2v4" />
                      <path className="cal-p2" pathLength="1" d="M16 2v4" />
                      <path className="cal-p3" pathLength="1" d="M3 10h18" />
                      <path className="cal-p4" pathLength="1" d="M11 14h1v4" />
                    </svg>
                  ) : item.id === "plus" ? (
                    <svg className={isHovered ? "plus-drawing" : ""} viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke={iconColor} strokeWidth={isActive ? 2.5 : 2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path className="plus-p1" pathLength="1" d="M5 12h14" />
                      <path className="plus-p2" pathLength="1" d="M12 5v14" />
                    </svg>
                  ) : item.id === "community" ? (
                    <svg className={isHovered ? "users-drawing" : ""} viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke={iconColor} strokeWidth={isActive ? 2.5 : 2.2} strokeLinecap="round" strokeLinejoin="round">
                      <circle className="users-c" pathLength="1" cx="10" cy="8" r="5" />
                      <path className="users-p1" pathLength="1" d="M18 21a8 8 0 0 0-16 0" />
                      <path className="users-p2" pathLength="1" d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
                    </svg>
                  ) : item.id === "search" ? (
                    <svg className={isHovered ? "search-drawing" : ""} viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke={iconColor} strokeWidth={isActive ? 2.5 : 2.2} strokeLinecap="round" strokeLinejoin="round">
                      <circle className="search-c" pathLength="1" cx="11" cy="11" r="8" />
                      <path className="search-p" pathLength="1" d="m21 21-4.34-4.34" />
                    </svg>
                  ) : (
                    <svg className={isHovered ? "profile-drawing" : ""} viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke={iconColor} strokeWidth={isActive ? 2.5 : 2.2} strokeLinecap="round" strokeLinejoin="round">
                      <circle className="profile-c" pathLength="1" cx="12" cy="7" r="4" />
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    </svg>
                  )}
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
