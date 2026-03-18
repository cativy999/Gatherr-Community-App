import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, CalendarDays, Heart, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const tabs = [
  { id: "going", label: "Going" },
  { id: "interested", label: "Interests" },
  { id: "saved", label: "Saved" },
  { id: "past", label: "Past" },
];

const Events = () => {
  const [activeTab, setActiveTab] = useState("going");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchEvents();
  }, [activeTab, userId]);

  const fetchEvents = async () => {
    setLoading(true);
    setEvents([]);
    try {
      if (activeTab === "going" || activeTab === "interested") {
        const { data, error } = await supabase
          .from("rsvps")
          .select("status, events(*)")
          .eq("user_id", userId)
          .eq("status", activeTab === "interested" ? "interested" : "going");
        if (error) throw error;
        const upcoming = (data ?? []).map((r: any) => r.events).filter((e: any) => e && new Date(e.date) >= new Date());
        setEvents(upcoming);
      } else if (activeTab === "saved") {
        const { data, error } = await supabase.from("saved_events").select("events(*)").eq("user_id", userId);
        if (error) throw error;
        const upcoming = (data ?? []).map((r: any) => r.events).filter((e: any) => e && new Date(e.date) >= new Date());
        setEvents(upcoming);
      } else if (activeTab === "past") {
        const [rsvpRes, savedRes] = await Promise.all([
          supabase.from("rsvps").select("events(*)").eq("user_id", userId),
          supabase.from("saved_events").select("events(*)").eq("user_id", userId),
        ]);
        const allEvents = [
          ...(rsvpRes.data ?? []).map((r: any) => r.events),
          ...(savedRes.data ?? []).map((r: any) => r.events),
        ].filter((e: any) => e && new Date(e.date) < new Date());
        const seen = new Set();
        setEvents(allEvents.filter((e: any) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; }));
      }
      const { data: savedData } = await supabase.from("saved_events").select("event_id").eq("user_id", userId);
      setSavedIds(new Set((savedData ?? []).map((s: any) => s.event_id)));
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaved = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast.error("Please log in"); return; }
    const isSaved = savedIds.has(eventId);
    if (isSaved) {
      await supabase.from("saved_events").delete().eq("event_id", eventId).eq("user_id", userId);
      setSavedIds(prev => { const n = new Set(prev); n.delete(eventId); return n; });
      if (activeTab === "saved") setEvents(prev => prev.filter(ev => ev.id !== eventId));
      toast.success("Removed from saved");
    } else {
      await supabase.from("saved_events").insert({ event_id: eventId, user_id: userId });
      setSavedIds(prev => new Set(prev).add(eventId));
      toast.success("Event saved!");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">

      {/* Sticky Header + Tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="px-5 py-3">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold">Events</h1>
          </div>
        </div>
        <div className="px-5 pb-3">
          <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="border-b border-border" />
      </div>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <p className="text-lg font-medium">
                {activeTab === "going" && "No events you're going to yet"}
                {activeTab === "interested" && "No events you're interested in yet"}
                {activeTab === "saved" && "No saved events yet"}
                {activeTab === "past" && "No past events"}
              </p>
              <p className="text-sm">
                {activeTab === "past" ? "Events you attended will appear here" : "Browse events and tap Going, Interested, or ♥ to add them here"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="relative">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 bg-secondary flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">No image</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => toggleSaved(event.id, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors"
                    >
                      <Heart className={`h-4 w-4 ${savedIds.has(event.id) ? "text-red-500 fill-current" : "text-foreground"}`} />
                    </button>
                  </div>
                  <div className="p-3 space-y-1">
                    <h3 className="font-semibold text-base leading-tight line-clamp-2">{event.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3 flex-shrink-0" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav currentPage="events" />
    </div>
  );
};

export default Events;