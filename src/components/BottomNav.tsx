import { CE_ERROR } from '../tokens';
import { House, Calendar1, Plus, UsersRound, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import CreateActionModal from "@/components/CreateActionModal";

// ── Design tokens ──────────────────────────────────────────────────────────
const DEFAULT_COLOR  = "#635C59";
const ACTIVE_COLOR   = "#1F4E5B";
const TEAL           = "#1F4E5B";
const INTER          = "'Inter', sans-serif";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tiltingId, setTiltingId] = useState<string | null>(null);

  // ── Scroll-hide nav (mobile, /wards only) ──
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    setNavHidden(false);
    lastScrollY.current = window.scrollY;
    if (location.pathname !== "/wards") return;
    const onScroll = () => {
      if (window.innerWidth >= 768) return;
      const y = window.scrollY;
      if (y > lastScrollY.current + 6) setNavHidden(true);
      else if (y < lastScrollY.current - 6) setNavHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  const triggerTilt = (id: string) => {
    setTiltingId(id);
    setTimeout(() => setTiltingId(null), 500);
  };
  const [goingCount, setGoingCount] = useState(0);
  const [seenCount, setSeenCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchNotifications = () => {
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("read", false)
        .then(({ count }) => setUnreadNotifications(count ?? 0));
    };
    fetchNotifications();
    const notifInterval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(notifInterval);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchGoingCount = () => {
      const today = new Date().toISOString().split("T")[0];
      supabase
        .from("rsvps")
        .select("event_id, events!inner(date)")
        .eq("user_id", session.user.id)
        .eq("status", "going")
        .gte("events.date", today)
        .then(({ data }) => setGoingCount(data?.length ?? 0));
    };
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url ?? session.user.user_metadata?.avatar_url ?? null);
      });
    fetchGoingCount();
    const interval = setInterval(fetchGoingCount, 2000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  const unreadBadge = Math.max(0, goingCount - seenCount);

  const currentPage = (() => {
    const path = window.location.pathname;
    if (path === "/wards")     return "wards";
    if (path === "/events")    return "events";
    if (path === "/community") return "community";
    if (path === "/profile")   return "profile";
    return "";
  })();

  const navItems = [
    { id: "wards",     label: "Home",    Icon: House,      path: "/wards"     },
    { id: "events",    label: "Events",  Icon: Calendar1,  path: "/events"    },
    { id: "plus",      label: null,      Icon: null,       path: null         },
    { id: "community", label: "People",  Icon: UsersRound, path: "/community" },
    { id: "profile",   label: "Profile", Icon: User,       path: "/profile"   },
  ];

  return (
    <>
      <style>{`
        @keyframes icon-tip {
          0%   { transform: rotate(0deg);   }
          30%  { transform: rotate(30deg);  }
          55%  { transform: rotate(-8deg);  }
          75%  { transform: rotate(5deg);   }
          90%  { transform: rotate(-2deg);  }
          100% { transform: rotate(0deg);   }
        }
        .icon-tip {
          animation: icon-tip 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
      {/* Floating "+" stays visible when nav is hidden */}
      <div
        className="md:hidden fixed z-20"
        style={{
          bottom: `calc(env(safe-area-inset-bottom) + 24px)`,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: navHidden ? 1 : 0,
          pointerEvents: navHidden ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      >
        <button
          onClick={() => setCreateModalOpen(true)}
          style={{ width: 48, height: 48, borderRadius: "50%", background: TEAL, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}
        >
          <Plus style={{ width: 20, height: 20, color: "white" }} strokeWidth={2.5} />
        </button>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20"
        style={{
          background: "#ffffff",
          borderTop: "1px solid #E4DCCF",
          paddingTop: 0,
          paddingBottom: `calc(env(safe-area-inset-bottom) + 28px)`,
          paddingLeft: 16,
          paddingRight: 16,
          transform: navHidden ? "translateY(100%)" : "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Sliding active indicator — 5 flex items each 20% wide, plus is at 50% center so we skip it */}
        <div style={{ position: "relative", height: 3, marginBottom: 9 }}>
          {currentPage && currentPage !== "plus" && (() => {
            // Map page id → center percent of its flex-1 slot
            const centers: Record<string, number> = { wards: 10, events: 30, community: 70, profile: 90 };
            const pct = centers[currentPage];
            if (pct === undefined) return null;
            return (
              <div style={{
                position: "absolute",
                top: 0,
                left: `calc(${pct}% - 14px)`,
                width: 28,
                height: 3,
                borderRadius: 99,
                background: TEAL,
                transition: "left 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                pointerEvents: "none",
              }} />
            );
          })()}
        </div>
        <div className="flex items-center">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;

            // ── Plus button ────────────────────────────────────────────
            if (item.id === "plus") {
              return (
                <div key="plus" className="flex-1 flex items-center justify-center">
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: TEAL,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Plus style={{ width: 20, height: 20, color: "white" }} strokeWidth={2.5} />
                  </button>
                </div>
              );
            }

            // ── Profile ────────────────────────────────────────────────
            if (item.id === "profile") {
              return (
                <button
                  key="profile"
                  onClick={() => { triggerTilt("profile"); navigate("/profile"); }}
                  className="flex-1 flex flex-col items-center relative"
                  style={{ gap: 4 }}
                >
                  <div className={tiltingId === "profile" ? "icon-tip" : ""} style={{ position: "relative", width: 20, height: 20 }}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        referrerPolicy="no-referrer"
                        style={{
                          width: 20, height: 20, borderRadius: "50%", objectFit: "cover",
                          outline: isActive ? `2px solid ${ACTIVE_COLOR}` : "none",
                          outlineOffset: 1,
                        }}
                      />
                    ) : (
                      <User style={{ width: 20, height: 20, color: isActive ? ACTIVE_COLOR : DEFAULT_COLOR }} strokeWidth={isActive ? 2.5 : 2} />
                    )}
                    {unreadNotifications > 0 && (
                      <span style={{
                        position: "absolute", top: -3, right: -5,
                        minWidth: 14, height: 14,
                        background: CE_ERROR, color: "#fff",
                        fontSize: 9, fontWeight: 700, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "0 2px", lineHeight: 1,
                      }}>
                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: INTER, fontSize: 10, fontWeight: 500,
                    color: isActive ? ACTIVE_COLOR : DEFAULT_COLOR,
                    lineHeight: 1,
                  }}>
                    Profile
                  </span>
                </button>
              );
            }

            // ── Regular nav item ───────────────────────────────────────
            const Icon = item.Icon!;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "events") {
                    localStorage.setItem("seenGoingCount", String(goingCount));
                    setSeenCount(goingCount);
                  }
                  triggerTilt(item.id);
                  navigate(item.path!);
                }}
                className="flex-1 flex flex-col items-center relative"
                style={{ gap: 4 }}
              >
                <div style={{ position: "relative", width: 20, height: 20 }}>
                  <Icon
                    className={tiltingId === item.id ? "icon-tip" : ""}
                    style={{ width: 20, height: 20, color: isActive ? ACTIVE_COLOR : DEFAULT_COLOR }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {item.id === "events" && unreadBadge > 0 && (
                    <span style={{
                      position: "absolute", top: -3, right: -5,
                      minWidth: 14, height: 14,
                      background: CE_ERROR, color: "#fff",
                      fontSize: 9, fontWeight: 700, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 2px", lineHeight: 1,
                    }}>
                      {unreadBadge > 9 ? "9+" : unreadBadge}
                    </span>
                  )}
                </div>
                <span style={{
                  fontFamily: INTER, fontSize: 10, fontWeight: 500,
                  color: isActive ? ACTIVE_COLOR : DEFAULT_COLOR,
                  lineHeight: 1,
                }}>
                  {item.label}
                </span>
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
