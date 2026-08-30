import { CE_BG,CE_LIGHT } from '../tokens';
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

// ── Design tokens ──────────────────────────────────────────────────────────
const BG      = CE_BG;
const ICON_BG = "#E4DCCF";
const DARK    = "#2C2523";
const MID     = "#635C59";
const TEAL    = "#1F4E5B";
const DIVIDER = CE_LIGHT;

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
};

const notifIcon = (type: string): string => {
  if (["carpool_request", "carpool_accepted", "carpool_declined",
       "carpool_cancelled", "carpool_offer", "carpool_phone_request"].includes(type)) return "🚗";
  switch (type) {
    case "mention":              return "🏷️";
    case "like":                 return "❤️";
    case "reply":                return "💬";
    case "cohost_accepted":      return "🤝";
    case "ward_request":         return "🏛️";
    case "group_coadmin_invite": return "👑";
    case "group_coadmin_accepted": return "✅";
    case "group_coadmin_declined": return "👋";
    case "new_signup":           return "👤";
    case "new_event":            return "📅";
    default:                     return "🔔";
  }
};

// ── Component ──────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchAndMarkRead = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(data ?? []);
      setLoading(false);

      // Mark all as read
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
    };

    fetchAndMarkRead();
  }, [user]);

  const handleTap = (n: any) => {
    if (n.type === "group_coadmin_invite" && n.reference_id) {
      navigate(`/group-admin-invite/${n.reference_id}`);
    } else if (n.event_id) {
      navigate(`/event/${n.event_id}`);
    }
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 96 }}>
      <div className="max-w-2xl mx-auto px-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 pt-8 pb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-70"
            style={{ background: ICON_BG }}
          >
            <ChevronLeft className="h-5 w-5" style={{ color: DARK }} />
          </button>
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: "'EB Garamond', Georgia, serif", color: DARK, fontSize: 32 }}
          >
            Notifications
          </h1>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: TEAL, borderTopColor: "transparent" }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-16 pb-8 px-6">
            <img src="/Empty%20state/bells.png?v=4" alt="" style={{ width: 220, height: 220, objectFit: "contain" }} className="mb-1" />
            <p className="font-semibold mb-2" style={{ fontFamily: "'EB Garamond', Georgia, serif", color: DARK, fontSize: 20 }}>
              No notifications yet
            </p>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: MID }}>
              When you receive notifications, they'll show up here.
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((n, i) => {
              const isClickable = !!n.event_id || n.type === "group_coadmin_invite";
              return (
                <div key={n.id}>
                  <button
                    onClick={() => handleTap(n)}
                    disabled={!isClickable}
                    className="w-full flex items-start gap-4 py-4 text-left rounded-xl transition-opacity"
                    style={{ cursor: isClickable ? "pointer" : "default", opacity: 1 }}
                    onMouseEnter={(e) => { if (isClickable) (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  >
                    {/* Icon circle */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full text-xl"
                      style={{ background: ICON_BG }}
                    >
                      {notifIcon(n.type)}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p
                        className="text-sm leading-snug"
                        style={{ color: DARK, fontFamily: "'Inter', sans-serif", fontWeight: n.read ? 400 : 500 }}
                      >
                        {n.message}
                      </p>
                      <p
                        className="text-xs mt-1.5"
                        style={{ color: MID, fontFamily: "'Inter', sans-serif" }}
                      >
                        {formatDate(n.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div
                        className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
                        style={{ background: TEAL }}
                      />
                    )}
                  </button>

                  {/* Divider (not after last item) */}
                  {i < notifications.length - 1 && (
                    <div className="h-px ml-15" style={{ background: DIVIDER, marginLeft: "60px" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
