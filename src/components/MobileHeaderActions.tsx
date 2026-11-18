import { useNavigate } from "react-router-dom";
import { Search, Bell } from "lucide-react";
import { CE_ERROR } from "@/tokens";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const DARK = "#2C2523";
const ICON_BG = "rgba(0,0,0,0.05)";

/** Search + Bell buttons for mobile page headers.
 *  Hidden on md+ (desktop uses the sidebar instead). */
const MobileHeaderActions = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return (
    <div className="flex md:hidden items-center gap-2">
      <button
        onClick={() => navigate("/search")}
        className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
        style={{ width: 36, height: 36, background: ICON_BG }}
        aria-label="Search"
      >
        <Search className="h-[18px] w-[18px]" style={{ color: DARK }} />
      </button>
      <button
        onClick={() => navigate("/notifications")}
        className="relative flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
        style={{ width: 36, height: 36, background: ICON_BG }}
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" style={{ color: DARK }} />
        {unreadCount > 0 && (
          <span
            className="absolute"
            style={{ top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: CE_ERROR }}
          />
        )}
      </button>
    </div>
  );
};

export default MobileHeaderActions;
