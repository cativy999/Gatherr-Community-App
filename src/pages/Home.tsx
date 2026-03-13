import { Users, Heart, CalendarDays, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import BottomNav from "@/components/BottomNav";
import LocationSelector from "@/components/LocationSelector";
import ProfilePopup from "@/components/ProfilePopup";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/lib/supabase";

type Event = {
  id: string;
  title: string;
  image_url: string | null;
  date: string;
  attendees: number;
  is_free: boolean;
  age_min: number;
  age_max: number;
  created_at: string;
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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeFilter, setActiveTimeFilter] = useState<string | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [sortOpen, setSortOpen] = useState(false);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const { location, setLocation } = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, image_url, date, attendees, is_free, age_min, age_max, created_at")
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
  }, []);

  const toggleSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedEvents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    let result = [...events];
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
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "free") {
      result = result.filter((e) => e.is_free);
    }

    return result;
  }, [events, activeTimeFilter, freeOnly, sortBy]);

  const currentSort = sortOptions.find((s) => s.id === sortBy);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <Users className="h-7 w-7 text-primary" strokeWidth={2.5} />
            <span className="text-xl font-bold tracking-tight">Gatherr</span>
          </button>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredEvents.map((event) => (
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
                        <Heart className={`h-4 w-4 ${savedEvents.has(event.id) ? "text-red-500 fill-current" : "text-foreground"}`} />
                      </button>
                    </div>
                    <div className="p-3 space-y-1">
                      <h3 className="font-semibold text-sm leading-tight line-clamp-2">{event.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          {event.attendees ?? 0} going
                        </span>
                        <span>·</span>
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
      <ProfilePopup open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
};

export default Home;