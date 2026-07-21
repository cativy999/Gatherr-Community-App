import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, ChevronRight, Bell, CalendarDays, Users, User, Camera, Loader2, ShieldCheck, QrCode, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAIL } from "@/lib/admin";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import VideoBackground from "@/components/VideoBackground";
import { createPortal } from "react-dom";

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
      <div
        className="relative max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-700" />
        </button>

        {/* The card we designed */}
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

const Profile = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const [showQR, setShowQR] = useState(false);

  const [name, setName] = useState("");
  const [ward, setWard] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminActivityCount, setAdminActivityCount] = useState(0);
  const [pastEvents, setPastEvents] = useState<{ event_id: string; image_url: string; title: string }[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U";

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, ward, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        setName(profile.name ?? "");
        setWard(profile.ward ?? "");
        // Prefer a user-uploaded avatar; fall back to the avatar Google (etc.)
        // provided at signup. Email-only sign-ups have neither until they upload one.
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

      // Groups count: owned + co-admin (accepted)
      const [{ count: gOwned }, { data: adminRows }] = await Promise.all([
        supabase.from("groups").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("group_admins").select("group_id").eq("user_id", user.id).eq("status", "accepted"),
      ]);
      setGroupCount((gOwned ?? 0) + (adminRows?.length ?? 0));

      // Unread notifications count
      const { count: nCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(nCount ?? 0);

      // Admin activity badge — count new signups/events/feedback since last admin visit
      if (user.email === ADMIN_EMAIL) {
        const lastVisited = localStorage.getItem("admin_lastVisited");
        if (lastVisited) {
          const [{ count: newProfiles }, { count: newEvents }, { count: newFeedback }] = await Promise.all([
            supabase.from("profiles").select("user_id", { count: "exact", head: true }).gt("created_at", lastVisited),
            supabase.from("events").select("id", { count: "exact", head: true }).gt("created_at", lastVisited),
            supabase.from("feedback").select("id", { count: "exact", head: true }).gt("created_at", lastVisited),
          ]);
          setAdminActivityCount((newProfiles ?? 0) + (newEvents ?? 0) + (newFeedback ?? 0));
        }
      }

      // Last 10 past events user RSVPed to
      const today = new Date().toISOString().split("T")[0];
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("event_id, events!inner(id, image_url, title, date)")
        .eq("user_id", user.id)
        .eq("status", "going")
        .lte("events.date", today)
        .order("created_at", { ascending: false })
        .limit(10);

      if (rsvps) {
        const events = rsvps
          .map((r: any) => ({
            event_id: r.event_id,
            image_url: r.events?.image_url || "",
            title: r.events?.title || "",
          }))
          .filter((e) => e.image_url);
        setPastEvents(events);
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
        // Downscale/compress to a square-ish avatar before upload
        const maxSize = 500;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (!blob) { toast.error("Couldn't process image"); return; }
          setAvatarUploading(true);
          try {
            const fileName = `${user.id}-${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from("avatars")
              .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
            if (uploadError) { toast.error("Failed to upload image"); return; }
            const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
            await supabase.from("profiles").upsert(
              { user_id: user.id, avatar_url: data.publicUrl },
              { onConflict: "user_id" }
            );
            setAvatarUrl(data.publicUrl);
            toast.success("Profile photo updated!");
          } catch {
            toast.error("Something went wrong");
          } finally {
            setAvatarUploading(false);
          }
        }, "image/jpeg", 0.8);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  const settingsRows = [
    {
      icon: User,
      label: "Account Info",
      onPress: () => navigate("/account-info"),
    },
    {
      icon: Bell,
      label: "Notifications",
      badge: unreadCount > 0 ? unreadCount : null,
      onPress: () => navigate("/notifications"),
    },
    {
      icon: CalendarDays,
      label: `Published Events`,
      sub: `${publishedCount} events`,
      onPress: () => navigate("/my-published-events"),
    },
    {
      icon: Users,
      label: "Manage Groups",
      sub: `${groupCount} groups`,
      onPress: () => navigate("/my-published-groups"),
    },
    ...(isAdmin
      ? [
          {
            icon: ShieldCheck,
            label: "Admin Dashboard",
            badge: adminActivityCount > 0 ? adminActivityCount : null,
            onPress: () => navigate("/admin"),
          },
        ]
      : []),
  ];

  return (
    <div className="relative flex min-h-screen flex-col pb-24">
      <VideoBackground />
      {/* Header */}
      <header className="px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Profile</h1>
          <button
            onClick={() => setShowQR(true)}
            className="p-2 rounded-full hover:bg-white/40 transition-colors"
            aria-label="Show QR code"
          >
            <QrCode className="h-6 w-6" />
          </button>
        </div>
      </header>

      {showQR && <QRModal onClose={() => setShowQR(false)} />}

      <div className="max-w-4xl mx-auto w-full px-5">

      {/* Avatar + Name + Ward */}
      <div className="flex flex-col items-center gap-3 pb-4">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl ?? undefined} referrerPolicy="no-referrer" />
            <AvatarFallback className="text-2xl bg-muted">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
          >
            {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarPick}
          />
        </div>
        {!avatarUrl && (
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="text-xs font-medium text-primary hover:underline -mt-1"
          >
            Add a profile photo
          </button>
        )}
        <div className="flex flex-col items-center gap-1">
          <p className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{name || "Your Name"}</p>
          {ward && <p className="text-sm text-muted-foreground">{ward}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-8 pt-4">

        {/* Personal Info */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Personal Info</p>

          {/* Mobile: single column — Desktop: two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8">
            {(() => {
              const mid = Math.ceil(settingsRows.length / 2);
              return [settingsRows.slice(0, mid), settingsRows.slice(mid)];
            })().map((colRows, colIdx) => (
              <div key={colIdx} className="flex flex-col">
                {colRows.map((row, i) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label}>
                      <button
                        onClick={row.onPress}
                        className="w-full flex items-center gap-4 py-3 hover:bg-accent/30 transition-colors rounded-lg -mx-1 px-1"
                      >
                        <Icon className="h-6 w-6 text-foreground flex-shrink-0" strokeWidth={1.5} />
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{row.label}</span>
                            {"badge" in row && row.badge && (
                              <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                {row.badge > 9 ? "9+" : row.badge}
                              </span>
                            )}
                          </div>
                          {"sub" in row && row.sub && (
                            <span className="text-xs text-muted-foreground mr-2">{row.sub}</span>
                          )}
                        </div>
                        <ChevronRight className="h-[18px] w-[18px] text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                      </button>
                      <div className="h-px bg-border ml-10 opacity-[0.12]" />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Events You've Been */}
        {pastEvents.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
              Events You've Been ({pastEvents.length})
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
              {pastEvents.map((e) => (
                <button
                  key={e.event_id}
                  onClick={() => navigate(`/event/${e.event_id}`)}
                  className="flex-shrink-0 rounded-xl overflow-hidden w-[85px] h-[87px] md:w-[140px] md:h-[140px]"
                >
                  <img
                    src={e.image_url}
                    alt={e.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Log Out */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLogOut}
            className="flex items-center gap-4 text-red-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>

      </div>

      </div>
    </div>
  );
};

export default Profile;
