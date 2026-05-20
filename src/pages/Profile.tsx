import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, ChevronRight, Bell, CalendarDays, Users, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const Profile = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const avatar = user?.user_metadata?.avatar_url;

  const [name, setName] = useState("");
  const [ward, setWard] = useState("");
  const [publishedCount, setPublishedCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pastEvents, setPastEvents] = useState<{ event_id: string; image_url: string; title: string }[]>([]);

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
      }

      // Published events count
      const { count: eCount } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "published");
      setPublishedCount(eCount ?? 0);

      // Published groups count
      const { count: gCount } = await supabase
        .from("groups")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setGroupCount(gCount ?? 0);

      // Unread notifications count
      const { count: nCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(nCount ?? 0);

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
      label: "Published Groups",
      sub: `${groupCount} groups`,
      onPress: () => navigate("/my-published-groups"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="px-5 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Profile</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-5">

      {/* Avatar + Name + Ward */}
      <div className="flex flex-col items-center gap-3 pb-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatar} referrerPolicy="no-referrer" />
          <AvatarFallback className="text-2xl bg-muted">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center gap-1">
          <p className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{name || "Your Name"}</p>
          {ward && <p className="text-sm text-muted-foreground">{ward}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-8 pt-4">

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

        {/* Personal Info */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Personal Info</p>

          {/* Mobile: single column — Desktop: two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8">
            {[settingsRows.slice(0, 2), settingsRows.slice(2, 4)].map((colRows, colIdx) => (
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
