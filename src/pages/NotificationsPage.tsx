import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchAndMarkRead = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(data ?? []);

      // Mark all as read
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
    };
    fetchAndMarkRead();
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-border px-4 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate("/profile")} className="p-1 -ml-1 rounded-full hover:bg-accent transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Notifications</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <span className="text-4xl mb-3">🔔</span>
            <p className="text-base font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">You'll see mentions and updates here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => n.event_id && navigate(`/event/${n.event_id}`)}
                className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/40 ${!n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
              >
                <span className="text-xl mt-0.5 flex-shrink-0">
                  {n.type === "mention" ? "🏷️" : n.type === "like" ? "❤️" : n.type === "reply" ? "💬" : n.type === "cohost_accepted" ? "🤝" : "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                    })}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
