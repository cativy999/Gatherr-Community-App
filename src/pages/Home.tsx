import { Users, Heart, CalendarDays, ChevronDown, MapPin } from "lucide-react";
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
};

const timeFilters = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "This Weekend" },
];

const sortOptions = [
  { id: "latest", label: "Latest" },
  { id: "free", label: "Free" },
];

const Home = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
const userId = session?.user?.id;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeFilter, setActiveTimeFilter] = useState<string | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [sortOpen, setSortOpen] = useState(false);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const { location, setLocation, locationLat, locationLng } = useLocation();
  const { preferredAgeMin, preferredAgeMax } = useUserProfile();

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, image_url, date, time, attendees, is_free, age_min, age_max, created_at, location, lat, lng")
        .eq("status", "published")
        .eq("category", "community")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching events:", error);
      } else {
        setEvents(data ?? []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [location]);
  useEffect(() => {
    if (!userId) return;
    const fetchSaved = async () => {
      const { data } = await supabase.from("saved_events").select("event_id").eq("user_id", userId);
      if (data) setSavedEvents(new Set(data.map((s: any) => s.event_id)));
    };
    fetchSaved();
  }, [userId]);

  const toggleSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast.error("Please log in to save events"); return; }
    const isSaved = savedEvents.has(id);
    if (isSaved) {
      await supabase.from("saved_events").delete().eq("event_id", id).eq("user_id", userId);
      setSavedEvents((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success("Removed from saved");
    } else {
      await supabase.from("saved_events").insert({ event_id: id, user_id: userId });
      setSavedEvents((prev) => new Set(prev).add(id));
      toast.success("Event saved!");
    }
  };
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3958.8; // miles
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const weekendStart = new Date(today);
    weekendStart.setDate(today.getDate() + (6 - today.getDay()));

    if (activeTimeFilter === "today") {
      result = result.filter((e) => {
        const d = new Date(e.date);
        return d >= today && d < tomorrow;
      });
    } else if (activeTimeFilter === "tomorrow") {
      result = result.filter((e) => {
        const d = new Date(e.date);
        return d >= tomorrow && d < new Date(tomorrow.getTime() + 86400000);
      });
    } else if (activeTimeFilter === "weekend") {
      result = result.filter((e) => {
        const d = new Date(e.date);
        return d >= weekendStart;
      });
    }

    if (freeOnly) result = result.filter((e) => e.is_free);

    if (sortBy === "latest") {
      result.sort((a, b) => {
        // First sort by distance if we have coords
        if (locationLat && locationLng && a.lat && b.lat) {
          const distA = getDistance(locationLat, locationLng, a.lat, a.lng);
          const distB = getDistance(locationLat, locationLng, b.lat, b.lng);
          if (Math.abs(distA - distB) > 5) return distA - distB; // 5 mile threshold
        }
        // Then by date soonest first
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    }else if (sortBy === "free") {
      result = result.filter((e) => e.is_free);
    }

    return result;
  }, [events, activeTimeFilter, freeOnly, sortBy, locationLat, locationLng, preferredAgeMin, preferredAgeMax]);

  const currentSort = sortOptions.find((s) => s.id === sortBy);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
         
        <div className="flex items-center gap-2.5">
            <Users className="h-7 w-7 text-primary" strokeWidth={2.5} />
            <span className="text-xl font-bold tracking-tight">Gatherr</span>
          </div>

          <LocationSelector value={location} onChange={setLocation} />
        </div>
      </header>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {timeFilters.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveTimeFilter(activeTimeFilter === chip.id ? null : chip.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTimeFilter === chip.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                }`}
              >
                {chip.label}
              </button>
            ))}
            <button
              onClick={() => setFreeOnly(!freeOnly)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                freeOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/80"
              }`}
            >
              Free
            </button>
          </div>

          <div className="flex justify-end relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sort: {currentSort?.label}
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
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
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
                        <Heart className={`h-4 w-4 ${savedEvents.has(event.id) ? "text-red-500 fill-current" : "text-foreground"}`} />
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
                ))}
              </div>

              {filteredEvents.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium">No events found</p>
                  <p className="text-sm mt-1">Try a different filter</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav currentPage="home" />
    </div>
  );
};

export default Home;