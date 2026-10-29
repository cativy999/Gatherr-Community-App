import { CE_BG, CE_LIGHT } from '../tokens';
import { ChevronLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

// ── Design tokens ──────────────────────────────────────────────────────────
const BG      = CE_BG;
const ICON_BG = "#E4DCCF";
const DARK    = "#2C2523";
const MID     = "#635C59";
const TEAL    = "#1F4E5B";
const DIVIDER = CE_LIGHT;
const NUDE    = "#EAD4C4";

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
    case "mention":                return "🏷️";
    case "like":                   return "❤️";
    case "reply":                  return "💬";
    case "cohost_accepted":        return "🤝";
    case "ward_request":           return "🏛️";
    case "group_coadmin_invite":   return "👑";
    case "group_coadmin_accepted": return "✅";
    case "group_coadmin_declined": return "👋";
    case "new_signup":             return "👤";
    case "new_event":              return "📅";
    case "access_request":         return "🔒";
    case "access_approved":        return "✦";
    case "access_declined":        return "👋";
    default:                       return "🔔";
  }
};

// ── Access Request Popup ───────────────────────────────────────────────────
type AccessPopup = {
  notif: any;
  requestId: string | null;
  requesterName: string;
  requesterAvatar: string | null;
  eventTitle: string;
};

const AccessRequestModal = ({
  popup,
  onClose,
  onDecision,
}: {
  popup: AccessPopup;
  onClose: () => void;
  onDecision: (requestId: string, notifId: string, approve: boolean) => void;
}) => {
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-5"
        style={{ background: "rgba(44,37,35,0.45)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      >
        {/* Modal — stop propagation so clicks inside don't close */}
        <div
          className="relative w-full max-w-sm"
          style={{
            background: BG,
            borderRadius: 24,
            padding: "32px 28px 28px",
            boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: ICON_BG }}
          >
            <X className="h-4 w-4" style={{ color: MID }} />
          </button>

          {/* Lock icon */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
            style={{ background: "rgba(31,78,91,0.1)" }}
          >
            <span style={{ fontSize: 22 }}>🔒</span>
          </div>

          {/* Requester info */}
          <div className="flex items-center gap-3 mb-4">
            {popup.requesterAvatar
              ? <img src={popup.requesterAvatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
              : <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ background: TEAL }}>{popup.requesterName.charAt(0)}</div>
            }
            <div className="min-w-0">
              <p className="font-semibold text-sm" style={{ color: DARK }}>{popup.requesterName}</p>
              <p className="text-xs" style={{ color: MID }}>wants to join your private event</p>
            </div>
          </div>

          {/* Event name */}
          <p
            className="mb-7 leading-snug"
            style={{ color: DARK, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 600 }}
          >
            "{popup.eventTitle}"
          </p>

          {/* Buttons */}
          {popup.requestId ? (
            <div className="flex gap-3">
              <button
                onClick={() => onDecision(popup.requestId!, popup.notif.id, false)}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ border: `1.5px solid ${DIVIDER}`, color: MID, background: "white" }}
              >
                Decline
              </button>
              <button
                onClick={() => onDecision(popup.requestId!, popup.notif.id, true)}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-80"
                style={{ background: TEAL }}
              >
                Accept
              </button>
            </div>
          ) : (
            <p className="text-sm text-center" style={{ color: MID }}>This request has already been handled.</p>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

// ── Component ──────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessPopup, setAccessPopup] = useState<AccessPopup | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);

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

  const handleTap = async (n: any) => {
    if (n.type === "group_coadmin_invite" && n.reference_id) {
      navigate(`/group-admin-invite/${n.reference_id}`);
    } else if (n.type === "access_request" && n.event_id) {
      // Show quick accept/decline modal
      setPopupLoading(true);
      const [profileRes, requestRes, eventRes] = await Promise.all([
        supabase.from("profiles").select("name, avatar_url").eq("user_id", n.from_user_id).maybeSingle(),
        supabase.from("event_access_requests")
          .select("id")
          .eq("event_id", n.event_id)
          .eq("requester_id", n.from_user_id)
          .eq("status", "pending")
          .maybeSingle(),
        supabase.from("events").select("title").eq("id", n.event_id).maybeSingle(),
      ]);
      setPopupLoading(false);
      setAccessPopup({
        notif: n,
        requestId: requestRes.data?.id ?? null,
        requesterName: profileRes.data?.name || "Someone",
        requesterAvatar: profileRes.data?.avatar_url || null,
        eventTitle: eventRes.data?.title || "your event",
      });
    } else if (n.event_id) {
      navigate(`/event/${n.event_id}`);
    }
  };

  const handleAccessDecision = async (requestId: string, notifId: string, approve: boolean) => {
    if (!user) return;
    await supabase.from("event_access_requests").update({ status: approve ? "approved" : "declined" }).eq("id", requestId);
    // Notify the requester
    const popup = accessPopup!;
    await supabase.from("notifications").insert({
      user_id: popup.notif.from_user_id,
      from_user_id: user.id,
      type: approve ? "access_approved" : "access_declined",
      event_id: popup.notif.event_id,
      message: approve
        ? `You've been approved to join "${popup.eventTitle}"! Tap to view the event.`
        : `Your request to join "${popup.eventTitle}" was not approved this time.`,
    });
    // Remove notification from list
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    setAccessPopup(null);
    toast.success(approve ? "Access granted!" : "Request declined.");
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
                    disabled={!isClickable || popupLoading}
                    className="w-full flex items-start gap-4 py-4 text-left rounded-xl transition-opacity"
                    style={{ cursor: isClickable ? "pointer" : "default", opacity: 1 }}
                    onMouseEnter={(e) => { if (isClickable) (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  >
                    {/* Icon circle */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full text-xl"
                      style={{ background: n.type === "access_request" ? "rgba(31,78,91,0.1)" : ICON_BG }}
                    >
                      {notifIcon(n.type)}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p
                        className="text-sm leading-snug"
                        style={{ color: DARK, fontFamily: "'Inter', sans-serif", fontWeight: n.read ? 400 : 500 }}
                      >
                        {n.message || "(no message)"}
                      </p>
                      {n.type === "access_request" && (
                        <p className="text-xs font-semibold mt-1" style={{ color: TEAL }}>
                          Tap to accept or decline →
                        </p>
                      )}
                      <p
                        className="text-xs mt-1"
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

                  {/* Divider */}
                  {i < notifications.length - 1 && (
                    <div className="h-px" style={{ background: DIVIDER, marginLeft: "60px" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Access request popup */}
      {accessPopup && (
        <AccessRequestModal
          popup={accessPopup}
          onClose={() => setAccessPopup(null)}
          onDecision={handleAccessDecision}
        />
      )}
    </div>
  );
};

export default NotificationsPage;
