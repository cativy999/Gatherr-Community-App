import { Heart, CalendarDays, MapPin, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import BottomNav from "@/components/BottomNav";
import LocationSelector from "@/components/LocationSelector";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { toast } from "sonner";

type Event = {
  id: string;
  title: string;
  image_url: string | null;
  date: string;
  attendees: number;
  is_free: boolean;
  age_min: number;
  age_max: number;
  time: string | null;
  created_at: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  ward_type: string | null;
};

const sortOptions = [
  { id: "latest", label: "Latest" },
  { id: "free", label: "Free" },
];

const filterChips = [
  { id: "all", label: "All" },
  { id: "spiritual", label: "Spiritual" },
  { id: "fhe", label: "FHE" },
  { id: "service", label: "Service" },
];

const Wards = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("latest");
  const [sortOpen, setSortOpen] = useState(false);
  const { location, setLocation, locationLat, locationLng } = useLocation();
  const { preferredAgeMin, preferredAgeMax } = useUserProfile();

  useEffect(() => {
    const fetchEvents = async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("events")
        .select("id, title, image_url, date, time, attendees, is_free, age_min, age_max, created_at, location, lat, lng, ward_type")
        .eq("status", "published")
        .eq("category", "ward")
        .gte("date", today)
        .order("created_at", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      const ids = (data ?? []).map((e: any) => e.id);
      const { data: rsvpCounts } = await supabase
        .from("rsvps")
        .select("event_id")
        .in("event_id", ids)
        .eq("status", "going");

      const countMap: Record<string, number> = {};
      (rsvpCounts ?? []).forEach((r: any) => {
        countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1;
      });

      setEvents((data ?? []).map((e: any) => ({
        ...e,
        attendees: countMap[e.id] ?? 0,
      })));
      setLoading(false);
    };

    fetchEvents();
  }, [location]);

  useEffect(() => {
    if (!userId) return;
    const fetchSaved = async () => {
      const { data } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", userId);
      if (data) setSavedEvents(new Set(data.map((s: any) => s.event_id)));
    };
    fetchSaved();
  }, [userId]);

  const toggleSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast.error("Please log in to save events"); return; }

    const isSaved = savedEvents.has(id);

    if (isSaved) {
      await supabase.from("saved_events").delete()
        .eq("event_id", id).eq("user_id", userId);
      setSavedEvents((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success("Removed from saved");
    } else {
      await supabase.from("saved_events").insert({ event_id: id, user_id: userId });
      setSavedEvents((prev) => new Set(prev).add(id));
      toast.success("Event saved!");
    }
  };

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const filteredEvents = useMemo(() => {
    let result = [...events];

    result = result.filter((e) => {
      if (!e.age_min || !e.age_max) return true;
      return e.age_min <= preferredAgeMax && e.age_max >= preferredAgeMin;
    });

    if (activeFilter === "spiritual" || activeFilter === "fhe" || activeFilter === "service") {
      result = result.filter((e) => e.ward_type === activeFilter);
    }

    if (sortBy === "free") {
      result = result.filter((e) => e.is_free);
    }

    result.sort((a, b) => {
      if (locationLat && locationLng && a.lat && b.lat) {
        const distA = getDistance(locationLat, locationLng, a.lat, a.lng!);
        const distB = getDistance(locationLat, locationLng, b.lat, b.lng!);
        if (Math.abs(distA - distB) <= 20) {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        return distA - distB;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return result;
  }, [events, activeFilter, sortBy, locationLat, locationLng, preferredAgeMin, preferredAgeMax]);

  const groupEventsByTime = (evts: Event[]) => {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfNextWeek = new Date(startOfToday); startOfNextWeek.setDate(startOfToday.getDate() + 7);
    const startOfLater = new Date(startOfToday); startOfLater.setDate(startOfToday.getDate() + 14);
    const thisWeek: Event[] = [];
    const nextWeek: Event[] = [];
    const later: Event[] = [];
    evts.forEach((e) => {
      const d = new Date(e.date);
      if (d < startOfNextWeek) thisWeek.push(e);
      else if (d < startOfLater) nextWeek.push(e);
      else later.push(e);
    });
    return { thisWeek, nextWeek, later };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  const EventCard = ({ event }: { event: Event }) => (
    <div
      onClick={() => navigate(`/event/${event.id}`)}
      className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="relative">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-36 bg-secondary flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
        <button
          onClick={(e) => toggleSaved(event.id, e)}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors"
        >
          <Heart className={`h-4 w-4 ${savedEvents.has(event.id) ? "text-[rgb(172,42,42)] fill-current" : "text-foreground"}`} />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm leading-tight">{event.title}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3 flex-shrink-0" />
          <span>{formatDate(event.date)}{event.time ? ` · ${new Date(`2000-01-01T${event.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="line-clamp-1">{event.location}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {event.attendees ?? 0} going
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
            {event.age_min && event.age_max ? `Ages ${event.age_min}–${event.age_max}` : "All ages"}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-5 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold">Ward Activities</h1>
            <LocationSelector value={location} onChange={setLocation} />
          </div>
        </div>

        <div className="pb-3">
          <div className="max-w-4xl mx-auto px-5 md:px-0">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mr-5 pr-10 md:mr-0 md:pr-0">
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeFilter === chip.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground hover:bg-accent/80"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-4">

          <div className="flex justify-end relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sort: {sortOptions.find(s => s.id === sortBy)?.label}
              <ChevronDown className={`h-4 w-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            {sortOpen && (
              <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden min-w-[140px]">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors ${
                      sortBy === opt.id ? "text-primary font-semibold" : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading events...</p>
          ) : (
            (() => {
              const { thisWeek, nextWeek, later } = groupEventsByTime(filteredEvents);
              return (
                <div className="space-y-8">
                  {thisWeek.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-base font-bold">This Week</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {thisWeek.map((event) => <EventCard key={event.id} event={event} />)}
                      </div>
                    </div>
                  )}
                  {nextWeek.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-base font-bold">Next Week</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {nextWeek.map((event) => <EventCard key={event.id} event={event} />)}
                      </div>
                    </div>
                  )}
                  {later.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-base font-bold">Later</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {later.map((event) => <EventCard key={event.id} event={event} />)}
                      </div>
                    </div>
                  )}
                  {filteredEvents.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg font-medium">No activities found</p>
                      <p className="text-sm mt-1">Try a different filter</p>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </main>

      <BottomNav currentPage="wards" />
    </div>
  );
};

export default Wards;