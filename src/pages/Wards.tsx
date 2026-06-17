import {
  Balloon, Church, HeartHandshake, Sparkles, Search, PizzaIcon, Video } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import LocationSelector from "@/components/LocationSelector";
import ChallengeCard from "@/components/ChallengeCard";
import VideoBackground from "@/components/VideoBackground";

import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { toast } from "sonner";
import EventCard from "@/components/EventCard";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";

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
  is_recurring?: boolean;
  recurring_day?: string | null;
  timezone?: string | null;
};

const filterChips = [
  { id: "all", label: "All", icon: null },
  { id: "fhe", label: "FHE", icon: Balloon },
  { id: "spiritual", label: "Spiritual", icon: Church },
  { id: "food", label: "Provide Food", icon: PizzaIcon },
  { id: "popular", label: "Popular", icon: Sparkles },
  { id: "service", label: "Service", icon: HeartHandshake },
  { id: "virtual", label: "Virtual", icon: Video },

];

const Wards = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [signInDismissed, setSignInDismissed] = useState(false);
  const isLoggedIn = !!session || signInDismissed;
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const { location, setLocation, locationLat, locationLng } = useLocation();
  const { preferredAgeMin, preferredAgeMax } = useUserProfile();
  const [creatorWards, setCreatorWards] = useState<Record<string, string>>({});

  const routerLocation = useRouterLocation();
  const thisWeekRef = useRef<HTMLDivElement>(null);
  const nextWeekRef = useRef<HTMLDivElement>(null);
  const laterRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const cityName = location.split(",")[0].trim();

  useEffect(() => {
    const fetchEvents = async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("events")
        .select("id, title, image_url, date, time, start_time, end_time, end_date, attendees, is_free, age_min, age_max, created_at, location, lat, lng, ward_type, user_id, food, duration, virtual_link, is_recurring, recurring_day, timezone")
        .eq("status", "published")
        .eq("category", "ward")
        .or(`end_date.gte.${today},and(end_date.is.null,date.gte.${today})`)
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

      setEvents((data ?? []).map((e: any) => ({ ...e, attendees: countMap[e.id] ?? 0 })));

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

  // Scroll to the specific event card after publishing/editing — only once
  useEffect(() => {
    const scrollToEventId = (routerLocation.state as any)?.scrollToEventId;
    if (!scrollToEventId || loading) return;

    setTimeout(() => {
      const el = document.querySelector(`[data-event-id="${scrollToEventId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 500);

    // Clear the state so back navigation doesn't re-trigger the scroll
    navigate(routerLocation.pathname, { replace: true, state: {} });
  }, [loading, routerLocation.state]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setSavedEvents(new Set(data.map((s: any) => s.event_id)));
      });
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
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filteredEvents = useMemo(() => {
    let result = [...events];
    if (location !== "Everywhere") {
      // Extract state from user location string e.g. "Torrance, CA" or "Torrance, California"
      const locationParts = location.split(",").map(s => s.trim());
      const userState = locationParts.length > 1 ? locationParts[locationParts.length - 1].toLowerCase() : null;
      // Detect state-level pick: no comma means it's just "Hawaii" or "California"
      const isStatePick = locationParts.length === 1;

      const STATE_ABBR: Record<string, string> = {
        'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
        'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
        'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS',
        'Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA',
        'Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT',
        'Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM',
        'New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK',
        'Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
        'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
        'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
      };
      const stateAbbr = STATE_ABBR[location] ?? null; // e.g. "Utah" → "UT"
      // Use word-boundary regex so "HI" doesn't match "Philadelphia", "UT" doesn't match "but", etc.
      const abbrRegex = stateAbbr ? new RegExp(`\\b${stateAbbr}\\b`, 'i') : null;

      result = result.filter((e) => {
        const eventLoc = e.location?.toLowerCase() ?? "";
        // State-level pick (e.g. "Hawaii", "Utah") — match by full name OR abbreviation (whole word only)
        if (isStatePick) {
          if (eventLoc.includes(location.toLowerCase())) return true;
          if (abbrRegex && abbrRegex.test(e.location ?? "")) return true;
          return false;
        }
        // City-level pick with coordinates — use 75 mile radius
        if (locationLat && locationLng && e.lat && e.lng) {
          return getDistance(locationLat, locationLng, e.lat, e.lng) <= 75;
        }
        // Fallback: match state so nearby cities still show up
        if (userState) return eventLoc.includes(userState);
        return cityName ? eventLoc.includes(cityName.toLowerCase()) : true;
      });
    }
    result = result.filter((e) => {
      if (!e.age_min || !e.age_max) return true;
      return e.age_min <= preferredAgeMax && e.age_max >= preferredAgeMin;
    });
    if (activeFilter === "spiritual" || activeFilter === "fhe" || activeFilter === "service") {
      result = result.filter((e) => e.ward_type === activeFilter);
    }
    if (activeFilter === "food") {
      result = result.filter((e) => e.food && e.food.length > 0);
    }
    if (activeFilter === "virtual") {
      result = result.filter((e) => e.virtual_link);
    }
    result.sort((a, b) => {
      if (locationLat && locationLng && a.lat && b.lat) {
        const distA = getDistance(locationLat, locationLng, a.lat, a.lng!);
        const distB = getDistance(locationLat, locationLng, b.lat, b.lng!);
        if (Math.abs(distA - distB) <= 20) return new Date(a.date).getTime() - new Date(b.date).getTime();
        return distA - distB;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    return result;
  }, [events, activeFilter, locationLat, locationLng, preferredAgeMin, preferredAgeMax, location, cityName]);

  const groupEventsByTime = (evts: Event[]) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Week = Sunday → Saturday
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // back to this Sunday

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // this Saturday

    const startOfNextWeek = new Date(endOfWeek);
    startOfNextWeek.setDate(endOfWeek.getDate() + 1); // next Sunday

    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // next Saturday

    const thisWeek: Event[] = [];
    const nextWeek: Event[] = [];
    const later: Event[] = [];

    const DAY_NUM: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    const todayDayNum = today.getDay();

    evts.forEach((e) => {
      if (e.is_recurring) {
        const recurringDayNum = e.recurring_day ? (DAY_NUM[e.recurring_day] ?? -1) : -1;
        // Only show in This Week if the recurring day hasn't passed yet this week (>= today)
        if (recurringDayNum >= todayDayNum) thisWeek.push(e);
        // Always show in Next Week
        nextWeek.push(e);
        return;
      }
      const [y, m, d] = e.date.split("-").map(Number);
      const eventDate = new Date(y, m - 1, d);

      if (eventDate < today) return; // skip past events
      if (eventDate <= endOfWeek) thisWeek.push(e);
      else if (eventDate <= endOfNextWeek) nextWeek.push(e);
      else later.push(e);
    });

    return { thisWeek, nextWeek, later };
  };
  
  const groupByMonth = (evts: Event[]) => {
    const map: Record<string, Event[]> = {};
    evts.forEach((e) => {
      const d = new Date(e.date);
      const key = d.toLocaleString("default", { month: "long", year: "numeric" });
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  };

  const EmptySection = ({ label, isThisWeek, nextWeekHasEvents }: { label: string; isThisWeek?: boolean; nextWeekHasEvents?: boolean }) => (
    <div className="py-6 px-4 rounded-2xl bg-white/90 backdrop-blur-sm text-center space-y-1">
      <p className="text-sm font-medium text-muted-foreground">
        No events {location === "Everywhere" ? "" : `in ${cityName}`} {label.toLowerCase()}
      </p>
      {isThisWeek && nextWeekHasEvents && (
        <p className="text-xs text-muted-foreground">Check out upcoming events below ↓</p>
      )}
    </div>
  );

  const { thisWeek, nextWeek, later } = groupEventsByTime(filteredEvents);

  return (
    <div className="relative flex min-h-screen flex-col pb-20">

      {/* ── Fixed video background ── */}
      <VideoBackground />

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
        <div className="px-3 py-3">
          <div className="flex items-center justify-center max-w-4xl mx-auto relative">
            <img src="/BeyondSundayLogo.png" alt="Beyond Sunday" className="md:hidden absolute left-0 h-10 w-auto object-contain" />
            <LocationSelector value={location} onChange={setLocation} />
            <button
              onClick={() => navigate("/search")}
              className="md:hidden absolute right-0 p-2 hover:bg-accent rounded-full transition-colors"
            >
              <Search className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="pb-3">
          <div className="max-w-4xl mx-auto px-5 md:px-0">
            <div
              className="flex md:justify-center gap-2 overflow-x-auto -mr-5 pr-10 md:mr-0 md:pr-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
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

      {/* ── Main content ── */}
      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Challenge Card */}
          {isLoggedIn && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Weekly Challenge</h2>
              </div>
              <ChallengeCard />
            </div>
          )}

          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading events...</p>
          ) : (
            <>
              {/* This Week */}
              <div className="space-y-3" ref={thisWeekRef}>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>This Week</h2>
                  {isLoggedIn && (
                    <button
                      onClick={() => {
                        const url = window.location.href;
                        const text = "Check out these LDS singles events on Gatherr! 🎉";
                        if (navigator.share) {
                          navigator.share({ title: "Gatherr Events", text, url }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(url);
                          toast.success("Link copied!");
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
                      style={{ background: "#F6D581", color: "#000" }}
                    >
                      <span>🎉</span>
                      Invite friends
                    </button>
                  )}
                </div>
                {thisWeek.length > 0 ? (
                  <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {thisWeek.map((event) => (
                      <div key={event.id} data-event-id={event.id}><EventCard event={event} creatorWard={creatorWards[event.user_id]} isSaved={savedEvents.has(event.id)} onToggleSave={toggleSaved} /></div>
                    ))}
                  </div>
                ) : (
                  <EmptySection label="This Week" isThisWeek nextWeekHasEvents={nextWeek.length > 0} />
                )}
              </div>

              {/* Wards Near You — hidden for now */}

              {/* Next Week + Later — soft gated for guests */}
              <div className={!isLoggedIn ? "relative -mx-5 md:mx-0" : ""}>

              {/* Blurred content for guests */}
              <div className={!isLoggedIn ? "pointer-events-none select-none blur-sm px-5 md:px-0" : ""}>

              {/* Next Week */}
<div className="space-y-3" ref={nextWeekRef}>
  <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Next Week</h2>
  {nextWeek.length > 0 ? (
    <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      {nextWeek.map((event) => (
        <div key={event.id} data-event-id={event.id}><EventCard event={event} creatorWard={creatorWards[event.user_id]} isSaved={savedEvents.has(event.id)} onToggleSave={toggleSaved} /></div>
      ))}
    </div>
  ) : (
    <EmptySection label="Next Week" />
  )}
</div>

              {/* Later */}
<div className="space-y-3 mt-8" ref={laterRef}>
  <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Later</h2>
  {later.filter(e => !e.is_recurring).length > 0 ? (
    <div className="space-y-6">
      {Object.entries(groupByMonth([...later.filter(e => !e.is_recurring)].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))).map(([month, evts]) => (
        <div key={month} className="space-y-3" ref={(el) => { monthRefs.current[month] = el; }}>
          <h3 className="text-sm font-semibold text-muted-foreground">{month}</h3>
          <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {evts.map((event) => (
              <div key={event.id} data-event-id={event.id}><EventCard event={event} creatorWard={creatorWards[event.user_id]} isSaved={savedEvents.has(event.id)} onToggleSave={toggleSaved} /></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <EmptySection label="Later" />
  )}
</div>

              {/* End blurred content */}
              </div>

              {/* Gradient fade for guests */}
              {!isLoggedIn && (
                <div className="absolute -top-8 left-0 right-0 bottom-0 bg-gradient-to-b from-transparent via-white/90 to-white pointer-events-none" />
              )}

              {/* End soft gate wrapper */}
              </div>

            </>
          )}
        </div>
      </main>

      {/* Floating sign-in card for guests — fixed so it stays visible while scrolling */}
      {!session && !signInDismissed && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50 pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-5 text-center space-y-3 max-w-sm w-full border border-gray-100">
            <p className="font-bold text-lg" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>See what's coming up 👀</p>
            <img src="/Nonlogginpopup.png" alt="Upcoming events preview" className="w-full rounded-xl object-cover" />
            <p className="text-sm text-muted-foreground">Sign in to see all events, RSVP, and connect with your community</p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setSignInDismissed(true)}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Wards;
