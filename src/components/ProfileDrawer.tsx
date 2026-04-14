import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, LogOut, X, CalendarDays, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const ProfileDrawer = ({ open, onClose }: ProfileDrawerProps) => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const user = session?.user;

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [ward, setWard] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [publishedCount, setPublishedCount] = useState(0);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, location, ward, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setName(data.name ?? "");
          setLocation(data.location ?? "");
          setWard(data.ward ?? "");
          setAvatarUrl(data.avatar_url ?? user.user_metadata?.avatar_url ?? null);
        }
      });

    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "published")
      .then(({ count }) => {
        setPublishedCount(count ?? 0);
      });
  }, [user]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    onClose();
    navigate("/");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleBackdropClick}
      />

      {/* Drawer panel — slides in from LEFT */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-[300px] max-w-[85vw] bg-background shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-6 border-b border-border">
          <button
            onClick={() => { onClose(); navigate("/profile"); }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Edit profile
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* User info */}
        <div className="flex flex-col items-center gap-3 px-6 py-8 border-b border-border">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl ?? undefined} referrerPolicy="no-referrer" />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
              {name || "Your Name"}
            </h2>
            {location && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </p>
            )}
            {ward && (
              <p className="text-xs text-muted-foreground">{ward}</p>
            )}
          </div>
        </div>

        {/* Published events stat */}
        <div className="px-5 py-2">
          <button
            onClick={() => { onClose(); navigate("/my-published-events"); }}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-accent transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">{publishedCount} Published Events</p>
                <p className="text-xs text-muted-foreground">View all your events</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Log out */}
        <div className="px-5 pb-10 border-t border-border pt-4">
          <button
            onClick={handleLogOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfileDrawer;
