import { Heart, CalendarDays, MapPin, ChevronDown, Navigation, Balloon, Church, HeartHandshake, Sparkles } from "lucide-react";import { useState, useEffect, useMemo } from "react";
import BottomNav from "@/components/BottomNav";
import LocationSelector from "@/components/LocationSelector";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { toast } from "sonner";
import EventCard from "@/components/EventCard";
import { useNavigate } from "react-router-dom";

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
  user_id: string;
  food?: string[];
  duration?: string;
};

const sortOptions = [
  { id: "latest", label: "Latest" },
  { id: "free", label: "Free" },
];

const filterChips = [
  { id: "all", label: "All", icon: null },
  { id: "fhe", label: "FHE", icon: Balloon },
  { id: "spiritual", label: "Spiritual", icon: Church },
  { id: "popular", label: "Popular", icon: Sparkles },
  { id: "service", label: "Service", icon: HeartHandshake },
];

const Wards = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const { location, setLocation, locationLat, locationLng } = useLocation();
  const { preferredAgeMin, preferredAgeMax } = useUserProfile();
  const [creatorWards, setCreatorWards] = useState<Record<string, string>>({});

  const cityName = location.split(",")[0].trim();

  useEffect(() => {
    const fetchEvents = async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("events")
        .select("id, title, image_url, date, time, attendees, is_free, age_min, age_max, created_at, location, lat, lng, ward_type, user_id, food, duration, virtual_link")
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


const userIds = [...new Set((data ?? []).map((e: any) => e.user_id).filter(Boolean))];
if (userIds.length > 0) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, ward")
    .in("user_id", userIds);
  const wardMap: Record<string, string> = {};
  (profiles ?? []).forEach((p: any) => { if (p.ward) wardMap[p.user_id] = p.ward; });
  setCreatorWards(wardMap);
}
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

    // 1. Filter by city
    if (location !== "Everywhere" && cityName) {
      result = result.filter((e) =>
        e.location?.toLowerCase().includes(cityName.toLowerCase())
      );
    }

    // 2. Filter by age preference
    result = result.filter((e) => {
      if (!e.age_min || !e.age_max) return true;
      return e.age_min <= preferredAgeMax && e.age_max >= preferredAgeMin;
    });

    // 3. Filter by ward type
    if (activeFilter === "spiritual" || activeFilter === "fhe" || activeFilter === "service") {
      result = result.filter((e) => e.ward_type === activeFilter);
    }



    // 5. Sort
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
  }, [events, activeFilter, locationLat, locationLng, preferredAgeMin, preferredAgeMax, location, cityName]);

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
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  const EmptySection = ({ label, isThisWeek, nextWeekHasEvents }: { label: string; isThisWeek?: boolean; nextWeekHasEvents?: boolean }) => (
    <div className="py-6 px-4 rounded-2xl bg-accent/30 text-center space-y-1">
      <p className="text-sm font-medium text-muted-foreground">
        No events in {location === "Everywhere" ? "your area" : cityName} {label.toLowerCase()}
      </p>
      {isThisWeek && nextWeekHasEvents && (
        <p className="text-xs text-muted-foreground">Check out upcoming events below ↓</p>
      )}
    </div>
  );

  

  const { thisWeek, nextWeek, later } = groupEventsByTime(filteredEvents);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm ">
      <div className="px-5 py-3">
  <div className="flex justify-center max-w-4xl mx-auto">
    <LocationSelector value={location} onChange={setLocation} />
  </div>
</div>

        <div className="pb-3">
          <div className="max-w-4xl mx-auto px-5 md:px-0">
          <div className="flex md:justify-center gap-2 overflow-x-auto -mr-5 pr-10 md:mr-0 md:pr-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {filterChips.map((chip) => {
  const Icon = chip.icon;
  return (
    <button
      key={chip.id}
      onClick={() => setActiveFilter(chip.id)}
      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
        activeFilter === chip.id
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-white text-foreground border-[#BBBBBB] hover:bg-gray-50"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {chip.label}
    </button>
  );
})}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-4">

          

          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading events...</p>
          ) : (
            <div className="space-y-8">
              <div className="space-y-3">
                <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>This Week</h2>
                {thisWeek.length > 0 ? (
                  <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {thisWeek.map((event) => (
    <EventCard
      key={event.id}
      event={event}
      creatorWard={creatorWards[event.user_id]}
      isSaved={savedEvents.has(event.id)}
      onToggleSave={toggleSaved}
    />
  ))}
                  </div>
                ) : (
                  <EmptySection label="This Week" isThisWeek nextWeekHasEvents={nextWeek.length > 0} />
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Next Week</h2>
                {nextWeek.length > 0 ? (
                  <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {nextWeek.map((event) => (
    <EventCard
      key={event.id}
      event={event}
      creatorWard={creatorWards[event.user_id]}
      isSaved={savedEvents.has(event.id)}
      onToggleSave={toggleSaved}
    />
  ))}
                  </div>
                ) : (
                  <EmptySection label="Next Week" />
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Later</h2>
                {later.length > 0 ? (
                 <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {later.map((event) => (
    <EventCard
      key={event.id}
      event={event}
      creatorWard={creatorWards[event.user_id]}
      isSaved={savedEvents.has(event.id)}
      onToggleSave={toggleSaved}
    />
  ))}
                  </div>
                ) : (
                  <EmptySection label="Later" />
                )}
              </div>

              {/* Wards Near You */}
              <div className="space-y-3">
                <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Wards Near You</h2>
                <div className="flex gap-4 overflow-x-auto -mx-5 px-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <div
                    onClick={() => navigate("/ward/santa-monica")}
                    className="flex-shrink-0 w-44 bg-card rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="w-full h-24 bg-secondary" />
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold leading-tight" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Santa Monica Ward</p>
                      <p className="text-xs text-muted-foreground">3400 Sawtelle Blvd</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav currentPage="wards" />
    </div>
  );
};

export default Wards;