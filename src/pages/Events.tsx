import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ThumbsUp, Smile, Heart, Clock } from "lucide-react";
import TimelineSection, { groupByWeek } from "@/components/TimelineSection";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const tabs = [
  { id: "going", label: "Going", icon: ThumbsUp },
  { id: "interested", label: "Interests", icon: Smile },
  { id: "saved", label: "Saved", icon: Heart },
  { id: "past", label: "Past", icon: Clock },
];

const Events = () => {
  const [activeTab, setActiveTab] = useState("going");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [creatorWards, setCreatorWards] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchEvents();
  }, [activeTab, userId]);

  const fetchCreatorWards = async (events: any[]) => {
    const userIds = [...new Set(events.map((e: any) => e.user_id).filter(Boolean))];
    if (userIds.length === 0) return;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, ward")
      .in("user_id", userIds);
    const wardMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => { if (p.ward) wardMap[p.user_id] = p.ward; });
    setCreatorWards(wardMap);
  };


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
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const toLocal = (d: string) => { const [y,m,day] = d.split("-").map(Number); return new Date(y, m-1, day); };
        const upcoming = (data ?? []).map((r: any) => r.events).filter((e: any) => e && toLocal(e.date) >= today);
        setEvents(upcoming);
        await fetchCreatorWards(upcoming);
      } else if (activeTab === "saved") {
        const { data, error } = await supabase.from("saved_events").select("events(*)").eq("user_id", userId);
        if (error) throw error;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const toLocal = (d: string) => { const [y,m,day] = d.split("-").map(Number); return new Date(y, m-1, day); };
        const upcoming = (data ?? []).map((r: any) => r.events).filter((e: any) => e && toLocal(e.date) >= today);
        setEvents(upcoming);
        await fetchCreatorWards(upcoming);
      } else if (activeTab === "past") {
        const [rsvpRes, savedRes] = await Promise.all([
          supabase.from("rsvps").select("events(*)").eq("user_id", userId),
          supabase.from("saved_events").select("events(*)").eq("user_id", userId),
        ]);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const toLocal = (d: string) => { const [y,m,day] = d.split("-").map(Number); return new Date(y, m-1, day); };
        const allEvents = [
          ...(rsvpRes.data ?? []).map((r: any) => r.events),
          ...(savedRes.data ?? []).map((r: any) => r.events),
        ].filter((e: any) => e && toLocal(e.date) < today);
        const seen = new Set();
        const unique = allEvents.filter((e: any) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
        setEvents(unique);
        await fetchCreatorWards(unique);
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



  const { thisWeek, nextWeek, later } = groupByWeek(events);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">

      {/* Sticky Header + Tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="px-5 py-3">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>My Events</h1>
          </div>
        </div>
        <div className="pb-3">
        <div className="max-w-4xl mx-auto px-5 md:px-0 flex md:justify-center gap-2 overflow-x-auto md:pr-0"
 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tabs.map((tab) => {
  const Icon = tab.icon;
  return (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
        activeTab === tab.id
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-white text-foreground border-[#BBBBBB] hover:bg-gray-50"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {tab.label}
    </button>
  );
})}
          </div>
        </div>

      </div>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto">
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
            <div className="space-y-8">
              <TimelineSection label="This Week" events={thisWeek} creatorWards={creatorWards} />
              <TimelineSection label="Next Week" events={nextWeek} creatorWards={creatorWards} />
              <TimelineSection label="Later" events={later} creatorWards={creatorWards} />
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

export default Events;