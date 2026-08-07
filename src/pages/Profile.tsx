import { CE_BG,CE_LIGHT , CE_ERROR} from '../tokens';
import { LogOut, ChevronRight, Bell, CalendarDays, Users, User, Camera, Loader2, ShieldCheck, QrCode, X } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAIL } from "@/lib/admin";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

// ── Design tokens ──────────────────────────────────────────────────────────
const BG      = CE_BG;
const DARK    = "#2C2523";
const MID     = "#635C59";
const TEAL    = "#1F4E5B";
const ICON_BG = "#E4DCCF";
const DIVIDER = CE_LIGHT;

// ── QR Modal (unchanged) ───────────────────────────────────────────────────
const QRModal = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-700" />
        </button>
        <img
          src="/beyondsunday_card.png"
          alt="Beyond Sunday QR Code"
          className="w-full rounded-3xl shadow-2xl"
        />
      </div>
    </div>,
    document.body
  );
};

// ── Component ──────────────────────────────────────────────────────────────
const Profile = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useAuth();
  const user = session?.user;

  const [name, setName]                   = useState("");
  const [ward, setWard]                   = useState("");
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [publishedCount, setPublishedCount]   = useState(0);
  const [groupCount, setGroupCount]           = useState(0);
  const [unreadCount, setUnreadCount]         = useState(0);
  const [adminActivityCount, setAdminActivityCount] = useState(0);
  const [pastEvents, setPastEvents]           = useState<{ event_id: string; image_url: string; title: string }[]>([]);
  const [showQR, setShowQR]               = useState(false);
  const avatarInputRef                    = useRef<HTMLInputElement>(null);

  // Redirect guests to login — after all hooks
  if (!sessionLoading && !session) return <Navigate to="/" replace />;

  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U";

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, ward, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        setName(profile.name ?? "");
        setWard(profile.ward ?? "");
        setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || null);
      } else {
        setAvatarUrl(user.user_metadata?.avatar_url || null);
      }

      // Published events count (owned + co-hosted)
      const [{ count: ownedCount }, { data: cohostRows }] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
        supabase.from("event_cohosts").select("event_id").eq("user_id", user.id),
      ]);
      const cohostIds = (cohostRows ?? []).map((r: any) => r.event_id);
      let cohostCount = 0;
      if (cohostIds.length > 0) {
        const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).in("id", cohostIds).eq("status", "published");
        cohostCount = count ?? 0;
      }
      setPublishedCount((ownedCount ?? 0) + cohostCount);

      // Groups count
      const [{ count: gOwned }, { data: adminRows }] = await Promise.all([
        supabase.from("groups").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("group_admins").select("group_id").eq("user_id", user.id).eq("status", "accepted"),
      ]);
      setGroupCount((gOwned ?? 0) + (adminRows?.length ?? 0));

      // Unread notifications
      const { count: nCount } = await supabase
        .from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("read", false);
      setUnreadCount(nCount ?? 0);

      // Admin activity badge
      if (user.email === ADMIN_EMAIL) {
        const lastVisited = localStorage.getItem("admin_lastVisited");
        if (lastVisited) {
          const [{ count: p }, { count: ev }, { count: fb }] = await Promise.all([
            supabase.from("profiles").select("user_id", { count: "exact", head: true }).gt("created_at", lastVisited),
            supabase.from("events").select("id", { count: "exact", head: true }).gt("created_at", lastVisited),
            supabase.from("feedback").select("id", { count: "exact", head: true }).gt("created_at", lastVisited),
          ]);
          setAdminActivityCount((p ?? 0) + (ev ?? 0) + (fb ?? 0));
        }
      }

      // Past events attended
      const today = new Date().toISOString().split("T")[0];
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("event_id, events!inner(id, image_url, title, date)")
        .eq("user_id", user.id).eq("status", "going")
        .lte("events.date", today)
        .order("created_at", { ascending: false })
        .limit(10);
      if (rsvps) {
        setPastEvents(
          rsvps
            .map((r: any) => ({ event_id: r.event_id, image_url: r.events?.image_url || "", title: r.events?.title || "" }))
            .filter((e) => e.image_url)
        );
      }
    };
    fetchData();
  }, [user]);

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const maxSize = 500;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (!blob) { toast.error("Couldn't process image"); return; }
          setAvatarUploading(true);
          try {
            const fileName = `${user.id}-${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from("avatars").upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
            if (uploadError) { toast.error("Failed to upload image"); return; }
            const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
            await supabase.from("profiles").upsert({ user_id: user.id, avatar_url: data.publicUrl }, { onConflict: "user_id" });
            setAvatarUrl(data.publicUrl);
            toast.success("Profile photo updated!");
          } catch { toast.error("Something went wrong"); }
          finally { setAvatarUploading(false); }
        }, "image/jpeg", 0.8);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  const settingsRows = [
    { icon: User,        label: "Account Info",     sub: null,                          badge: null,                               path: "/account-info" },
    { icon: Bell,        label: "Notifications",    sub: null,                          badge: unreadCount > 0 ? unreadCount : null, path: "/notifications" },
    { icon: CalendarDays,label: "Published Events", sub: `${publishedCount} events`,    badge: null,                               path: "/my-published-events" },
    { icon: Users,       label: "Manage Groups",    sub: `${groupCount} groups`,        badge: null,                               path: "/my-published-groups" },
    ...(isAdmin ? [{ icon: ShieldCheck, label: "Admin Dashboard", sub: null, badge: adminActivityCount > 0 ? adminActivityCount : null, path: "/admin" }] : []),
  ];

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 96 }}>
      <div className="max-w-2xl mx-auto px-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-8 pb-6">
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: "'EB Garamond', Georgia, serif", color: DARK, fontSize: 32 }}
          >
            Profile
          </h1>
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-70"
            style={{ background: ICON_BG }}
            aria-label="Show QR code"
          >
            <QrCode className="h-4 w-4" style={{ color: DARK }} />
          </button>
        </div>

        {showQR && <QRModal onClose={() => setShowQR(false)} />}

        {/* ── Avatar + Name + Ward ───────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="relative">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold" style={{ color: MID }}>{initials}</span>
              )}
            </div>

            {/* Camera button */}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: DARK }}
              aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
            >
              {avatarUploading
                ? <Loader2 className="h-4 w-4 animate-spin text-white" />
                : <Camera className="h-4 w-4 text-white" />}
            </button>

            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
          </div>

          <div className="text-center">
            <p
              className="text-xl font-bold"
              style={{ fontFamily: "'EB Garamond', Georgia, serif", color: DARK }}
            >
              {name || "Your Name"}
            </p>
            {ward && (
              <p className="text-sm mt-0.5" style={{ color: MID, fontFamily: "'Inter', sans-serif" }}>
                {ward}
              </p>
            )}
          </div>
        </div>

        {/* ── Personal Info ───────────────────────────────────────────── */}
        <div className="mb-8">
          <p
            className="text-xl font-semibold mb-3"
            style={{ fontFamily: "'EB Garamond', Georgia, serif", color: DARK }}
          >
            Personal Info
          </p>

          <div>
            {settingsRows.map((row, i) => {
              const Icon = row.icon;
              return (
                <div key={row.label}>
                  <button
                    onClick={() => navigate(row.path)}
                    className="w-full flex items-center gap-4 py-4 text-left transition-opacity hover:opacity-70"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" style={{ color: DARK }} strokeWidth={1.5} />

                    <span className="flex-1 text-sm" style={{ color: DARK, fontFamily: "'Inter', sans-serif" }}>
                      {row.label}
                    </span>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {row.badge != null && (
                        <span className="min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1" style={{ background: CE_ERROR }}>
                          {row.badge > 9 ? "9+" : row.badge}
                        </span>
                      )}
                      {row.sub && (
                        <span className="text-sm" style={{ color: MID, fontFamily: "'Inter', sans-serif" }}>
                          {row.sub}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4" style={{ color: MID }} strokeWidth={1.5} />
                    </div>
                  </button>

                  {i < settingsRows.length - 1 && (
                    <div className="h-px ml-9" style={{ background: DIVIDER }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Events You've Been ─────────────────────────────────────── */}
        {pastEvents.length > 0 && (
          <div className="mb-8">
            <p
              className="text-xl font-semibold mb-3"
              style={{ fontFamily: "'EB Garamond', Georgia, serif", color: DARK }}
            >
              Events You've Been ({pastEvents.length})
            </p>
            <div
              className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5"
              style={{ scrollbarWidth: "none" }}
            >
              {pastEvents.map((e) => (
                <button
                  key={e.event_id}
                  onClick={() => navigate(`/event/${e.event_id}`)}
                  className="flex-shrink-0 transition-opacity hover:opacity-80"
                  style={{ borderRadius: 16, overflow: "hidden", width: 88, height: 88 }}
                >
                  <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Log Out ────────────────────────────────────────────────── */}
        <div className="flex justify-center py-4">
          <button
            onClick={handleLogOut}
            className="text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: "#1F4E5B", fontFamily: "'Inter', sans-serif" }}
          >
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
};

export default Profile;
