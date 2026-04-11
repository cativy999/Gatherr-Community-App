import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Users, Loader2, ThumbsUp, Smile, Heart, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
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

  // Group events by date
  const groupByDate = (events: any[]) => {
    const groups: Record<string, any[]> = {};
    const sorted = [...events].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      // Same date — sort by time
      const timeA = a.time ?? "00:00";
      const timeB = b.time ?? "00:00";
      return timeA.localeCompare(timeB);
    });
    sorted.forEach((event) => {
      const [y, m, d] = event.date.split("-").map(Number);
      const dateKey = new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", weekday: "long" });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    });
    return groups;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  };

  // Group by week
  const groupByWeek = (events: any[]) => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfWeek.getDate() + 7);

    const thisWeek: any[] = [];
    const nextWeek: any[] = [];
    const later: any[] = [];

    events.forEach((event) => {
      const [y, m, d] = event.date.split("-").map(Number);
      const eventDate = new Date(y, m - 1, d);
      if (eventDate <= endOfWeek) thisWeek.push(event);
      else if (eventDate <= endOfNextWeek) nextWeek.push(event);
      else later.push(event);
    });

    return { thisWeek, nextWeek, later };
  };

  const TimelineSection = ({ label, events }: { label: string, events: any[] }) => {
    if (events.length === 0) return null;
    const grouped = groupByDate(events);

    return (
      <div className="space-y-4">
        {/* Week label */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{label}</span>
          <span className="text-muted-foreground">·</span>
        </div>

        {/* Timeline */}
        <div className="relative">
          {Object.entries(grouped).map(([dateLabel, dayEvents], groupIndex) => {
            const parts = dateLabel.split(", ");
            const weekday = parts[0];
            const monthDay = parts.slice(1).join(", ");

            return (
              <div key={dateLabel} className="flex gap-4 mb-6">

                {/* Desktop date label — hidden on mobile */}
                <div className="hidden md:flex flex-col items-end w-28 flex-shrink-0 pt-0.5">
                  <span className="text-base font-semibold">{monthDay}</span>
                  <span className="text-sm text-muted-foreground">{weekday}</span>
                </div>

                {/* Timeline dot + line */}
                <div className="flex flex-col items-center flex-shrink-0 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-foreground flex-shrink-0" />
                  <div className="w-px flex-1 bg-border mt-1 min-h-24" />
                </div>

                {/* Date + Events */}
                <div className="flex-1 space-y-3 pb-2">
                  {/* Date header — mobile only */}
                  <div className="flex items-center gap-2 -mt-0.5 md:hidden">
                    <span className="text-base font-semibold">{monthDay}</span>
                    <span className="text-sm text-muted-foreground">{weekday}</span>
                  </div>

               {/* Event cards */}
{dayEvents.map((event) => (
  <div
    key={event.id}
    onClick={() => navigate(`/event/${event.id}`)}
    className="flex items-center gap-3 bg-card rounded-2xl border cursor-pointer p-3 select-none"
    style={{ borderWidth: '1px', borderColor: 'hsl(0deg 0% 70%)', WebkitTapHighlightColor: 'transparent' }}
  >
                      {/* Left — time + details */}
                      <div className="flex-1 space-y-1 min-w-0">
                        {event.time && (
                          <p className="text-sm font-medium text-foreground">{formatTime(event.time)}</p>
                        )}
                        <h3 className="text-sm font-semibold leading-tight line-clamp-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{event.title}</h3>
{creatorWards[event.user_id] && (
  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
    {creatorWards[event.user_id]}
  </span>
)}
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{event.attendees ?? 0} going</span>
                        </div>
                      </div>

                      {/* Right — image + age */}
                      <div className="flex flex-col items-end justify-between flex-shrink-0 self-stretch">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-16 h-16 md:w-24 md:h-24 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl bg-secondary" />
                        )}
                        {event.age_min && event.age_max && (
                          <span className="text-xs text-muted-foreground mt-1">Ages {event.age_min}–{event.age_max}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const { thisWeek, nextWeek, later } = groupByWeek(events);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">

      {/* Sticky Header + Tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="px-5 py-3">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Events</h1>
          </div>
        </div>
        <div className="pb-3">
        <div className="max-w-4xl mx-auto px-5 md:px-0 flex gap-2 overflow-x-auto md:pr-0"
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
              <TimelineSection label="This Week" events={thisWeek} />
              <TimelineSection label="Next Week" events={nextWeek} />
              <TimelineSection label="Later" events={later} />
            </div>
          )}
        </div>
      </main>

      <BottomNav currentPage="events" />
    </div>
  );
};

export default Events;