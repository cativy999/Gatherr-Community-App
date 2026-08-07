import { CE_BG,CE_SURFACE , CE_ERROR} from '../tokens';
import {
  Church, Search, Video, Presentation, Bell, MapPin,
  LandPlot, HandPlatter, HeartHandshake, Sparkles, ChevronDown, Heart,
  ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import LocationSelector from "@/components/LocationSelector";
import ChallengeCard from "@/components/ChallengeCard";
import OOTDCard from "@/components/OOTDCard";

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
  recurring_days?: string[] | null;
  recurring_week_of_month?: number | null;
  timezone?: string | null;
  community_id?: string | null;
};

// ── Design tokens ──────────────────────────────────────────────────────────
const DARK     = "#2C2523";
const MID      = "#635C59";
const TEAL     = "#1F4E5B";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const INTER     = "'Inter', sans-serif";

// ── TZ helper (shared with GoingCard) ──────────────────────────────────────
const TZ_ABBR: Record<string, string> = {
  "America/Los_Angeles": "PT", "America/Denver": "MT",
  "America/Phoenix": "MT",     "America/Chicago": "CT",
  "America/New_York": "ET",    "America/Anchorage": "AKT",
  "Pacific/Honolulu": "HT",
};

// ── GoingCard ───────────────────────────────────────────────────────────────
const GoingCard = ({
  event,
  isSaved,
  onToggleSave,
  onNavigate,
  cardWidth,
}: {
  event: any;
  isSaved: boolean;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
  onNavigate: (id: string) => void;
  cardWidth?: number;
}) => {
  const t = event.start_time ?? event.time;

  // Date + time label
  const dateLabel = (() => {
    const [y, m, d] = event.date.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const month   = date.toLocaleDateString("en-US", { month: "short" });
    const datePart = `${weekday}, ${month} ${date.getDate()}`;
    if (!t) return datePart;
    const h = parseInt(t.split(":")[0]);
    const min = t.split(":")[1];
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    const tzAbbr = event.timezone ? (TZ_ABBR[event.timezone] ?? "") : "";
    const timePart = tzAbbr ? `${hour}:${min} ${ampm} ${tzAbbr}` : `${hour}:${min} ${ampm}`;
    return `${datePart} · ${timePart}`;
  })();

  // Duration chip label — prefer stored field, else compute from times, else "Full Day"
  const durationLabel = (() => {
    if (event.duration) return event.duration;
    const start = event.start_time ?? event.time;
    const end   = event.end_time;
    if (start && end) {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) return null;
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      if (hrs === 0) return `${rem} min`;
      if (rem === 0) return hrs === 1 ? "1 hr" : `${hrs} hrs`;
      return `${hrs}h ${rem}m`;
    }
    if (!start) return "Full Day";
    return null;
  })();

  return (
    <>
    <style>{`
      @media (min-width: 768px) {
        .going-card:hover .going-card-img { transform: scale(1.08); }
      }
      .going-card-img {
        transition: transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
    `}</style>
    <div
      onClick={() => onNavigate(event.id)}
      className="going-card cursor-pointer transition-opacity hover:opacity-90 flex-shrink-0"
      style={{
        width: cardWidth ?? "65vw", maxWidth: cardWidth ?? 280,
        display: "flex", flexDirection: "column",
        background: "white",
        border: "1px solid #E4DCCF",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      {/* Image */}
      <div style={{ height: 160, flexShrink: 0, overflow: "hidden" }}>
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="going-card-img" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#E4DCCF" }} />
        )}
      </div>

      {/* Content — flex:1 so it fills remaining height, space-between pins footer */}
      <div style={{
        padding: 16,
        display: "flex", flexDirection: "column",
        flex: 1,
        justifyContent: "space-between",
      }}>
        {/* Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: TEAL, lineHeight: 1.4 }}>
            {dateLabel}
          </p>
          <p style={{
            fontFamily: INTER, fontSize: 18, fontWeight: 700, color: DARK, lineHeight: 1.2,
            overflow: "hidden", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {event.title}
          </p>
          {event.location && (
            <p style={{ fontFamily: INTER, fontSize: 12, fontWeight: 400, color: MID, lineHeight: 1.4 }}>
              {event.location}
            </p>
          )}
        </div>

        {/* Footer — always at bottom */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          {durationLabel ? (
            <div style={{ background: CE_SURFACE, borderRadius: 100, padding: "4px 10px" }}>
              <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 500, color: MID, whiteSpace: "nowrap" }}>
                {durationLabel}
              </span>
            </div>
          ) : <div />}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: INTER, fontSize: 12, fontWeight: 400, color: MID, whiteSpace: "nowrap" }}>
              {event.attendees ?? 0} going
            </span>
            <button
              onClick={(e) => onToggleSave(event.id, e)}
              className="transition-opacity hover:opacity-80 flex items-center justify-center"
              style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: isSaved ? TEAL : CE_SURFACE,
              }}
            >
              <Heart
                className="h-4 w-4"
                style={{ color: isSaved ? "white" : MID }}
                fill={isSaved ? "white" : "none"}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

const filterChips = [
  { id: "all",        label: "All",          icon: null           },
  { id: "conference", label: "Conference",   icon: Presentation   },
  { id: "spiritual",  label: "Spiritual",    icon: Church         },
  { id: "fhe",        label: "FHE",          icon: LandPlot       },
  { id: "food",       label: "Provide Food", icon: HandPlatter    },
  { id: "popular",    label: "Popular",      icon: Sparkles       },
  { id: "service",    label: "Service",      icon: HeartHandshake },
  { id: "virtual",    label: "Virtual",      icon: Video          },
];

const Wards = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .then(({ count }) => setHasUnread((count ?? 0) > 0));
  }, [userId]);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepChallengeJoined, setStepChallengeJoined] = useState(false);
  const [goingEvents, setGoingEvents] = useState<any[]>([]);
  const [goingCardW, setGoingCardW] = useState(0);
  const [goingNeedsLoop, setGoingNeedsLoop] = useState(false);
  const goingContainerRef = useRef<HTMLDivElement>(null);
  const goingScrollRef = useRef<HTMLDivElement>(null);
  const goingPausedRef = useRef(false);
  const goingAnimRef = useRef<number | null>(null);
  const goingNeedsLoopRef = useRef(false);
  const goingBehindStickyRef = useRef(false); // true when section has scrolled under the sticky header
  const goingLeftFadeRef = useRef<HTMLDivElement>(null);
  const goingRightFadeRef = useRef<HTMLDivElement>(null);
  const goingLeftChevRef = useRef<HTMLButtonElement>(null);
  const goingRightChevRef = useRef<HTMLButtonElement>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const isLoggedIn = !!session;
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const { location, setLocation, locationLat, locationLng } = useLocation();
  const { preferredAgeMin, preferredAgeMax } = useUserProfile();
  const [creatorWards, setCreatorWards] = useState<Record<string, string>>({});
  const [communityNames, setCommunityNames] = useState<Record<string, string>>({});
  const [communityAvatars, setCommunityAvatars] = useState<Record<string, string | null>>({});

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
        .select("id, title, image_url, date, time, start_time, end_time, end_date, attendees, is_free, age_min, age_max, created_at, location, lat, lng, ward_type, user_id, food, duration, virtual_link, is_recurring, recurring_day, recurring_days, recurring_week_of_month, timezone, community_id")
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

      // Fetch community names for events posted as a ward/community
      const communityIds = [...new Set((data ?? []).map((e: any) => e.community_id).filter(Boolean))];
      if (communityIds.length > 0) {
        const { data: groups } = await supabase
          .from("groups")
          .select("id, name, avatar_url")
          .in("id", communityIds);
        const nameMap: Record<string, string> = {};
        (groups ?? []).forEach((g: any) => { nameMap[g.id] = g.name; });
        setCommunityNames(nameMap);
        const avatarMap: Record<string, string | null> = {};
        (groups ?? []).forEach((g: any) => { avatarMap[g.id] = g.avatar_url ?? null; });
        setCommunityAvatars(avatarMap);
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

  // Fetch user's upcoming going events for "You're going" section
  useEffect(() => {
    if (!userId) { setGoingEvents([]); return; }
    supabase
      .from("rsvps")
      .select("events(*)")
      .eq("user_id", userId)
      .eq("status", "going")
      .then(({ data }) => {
        const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
        const toLocal = (d: string) => { const [y,m,day] = d.split("-").map(Number); return new Date(y,m-1,day); };
        const upcoming = (data ?? [])
          .map((r: any) => r.events)
          .filter((e: any) => e && toLocal(e.date) >= todayDate);
        setGoingEvents(upcoming);
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
    if (activeFilter === "spiritual" || activeFilter === "fhe" || activeFilter === "service" || activeFilter === "conference") {
      result = result.filter((e) => e.ward_type === activeFilter);
    }
    if (activeFilter === "food") {
      result = result.filter((e) => e.food && e.food.length > 0);
    }
    if (activeFilter === "virtual") {
      result = result.filter((e) => e.virtual_link);
    }
    if (activeFilter === "popular") {
      return result.sort((a, b) => (b.attendees ?? 0) - (a.attendees ?? 0));
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
        // Support multi-day: check if ANY of the recurring days hasn't passed yet this week
        const days = e.recurring_days?.length ? e.recurring_days : (e.recurring_day ? [e.recurring_day] : []);
        const dayNums = days.map(d => DAY_NUM[d] ?? -1).filter(n => n >= 0);
        const hasRemainingDayThisWeek = dayNums.some(n => n >= todayDayNum);
        if (hasRemainingDayThisWeek) thisWeek.push(e);
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

  // ── Going carousel helpers ───────────────────────────────────────────────
  const updateGoingUI = () => {
    if (window.innerWidth < 768) return; // mobile: native scroll only, no overlays
    const el = goingScrollRef.current;
    if (!el) return;
    const atStart    = el.scrollLeft <= 4;
    const overflows  = el.scrollWidth > el.clientWidth + 4;
    const atEnd      = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
    const behindSticky = goingBehindStickyRef.current;

    // fades — always visible based only on scroll position, never hidden by sticky header
    if (goingLeftFadeRef.current)
      goingLeftFadeRef.current.style.opacity = atStart ? "0" : "1";
    if (goingRightFadeRef.current)
      goingRightFadeRef.current.style.opacity = (!overflows || atEnd) ? "0" : "1";

    // chevrons: hide when no content to scroll, OR when behind sticky header
    const leftVisible  = !atStart  && !behindSticky;
    const rightVisible = !atEnd && overflows && !behindSticky;
    if (goingLeftChevRef.current) {
      goingLeftChevRef.current.style.opacity       = leftVisible  ? "1" : "0";
      goingLeftChevRef.current.style.pointerEvents = leftVisible  ? "auto" : "none";
    }
    if (goingRightChevRef.current) {
      goingRightChevRef.current.style.opacity       = rightVisible ? "1" : "0";
      goingRightChevRef.current.style.pointerEvents = rightVisible ? "auto" : "none";
    }
  };

  const scrollGoing = (dir: "left" | "right") => {
    const el = goingScrollRef.current;
    if (!el || !goingCardW) return;
    goingPausedRef.current = true;
    el.scrollBy({ left: dir === "right" ? goingCardW + 16 : -(goingCardW + 16), behavior: "smooth" });
    setTimeout(() => { updateGoingUI(); goingPausedRef.current = false; }, 650);
  };

  // Measure container → card width + detect if looping is needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const measure = () => {
      if (window.innerWidth < 768) { setGoingCardW(0); setGoingNeedsLoop(false); goingNeedsLoopRef.current = false; return; }
      const el = goingContainerRef.current;
      if (!el) return;
      const w = 280; // fixed card width so cards always overflow on desktop
      setGoingCardW(w);
      // Total natural width of one set of cards
      const totalW   = goingEvents.length * w + Math.max(0, goingEvents.length - 1) * 16;
      const needsLoop = totalW > el.offsetWidth + 4;
      setGoingNeedsLoop(needsLoop);
      goingNeedsLoopRef.current = needsLoop;
      setTimeout(updateGoingUI, 80);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [goingEvents.length]);

  // Auto-scroll marquee — desktop only, seamless loop via card duplication
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (window.innerWidth < 768) return;
    const el = goingScrollRef.current;
    if (!el) return;

    let accum = 0;
    const SPEED = 0.45; // px per frame ≈ 27px/s

    const tick = () => {
      if (!goingPausedRef.current && el.scrollWidth > el.clientWidth + 4) {
        accum += SPEED;
        if (accum >= 1) {
          const px = Math.floor(accum);
          accum -= px;
          el.scrollLeft += px;
          // Seamless loop: silently jump back when we've scrolled through the first copy
          if (goingNeedsLoopRef.current && el.scrollLeft >= el.scrollWidth / 2) {
            el.scrollLeft -= el.scrollWidth / 2;
          }
          updateGoingUI();
        }
      }
      goingAnimRef.current = requestAnimationFrame(tick);
    };

    goingAnimRef.current = requestAnimationFrame(tick);
    return () => { if (goingAnimRef.current) cancelAnimationFrame(goingAnimRef.current); };
  }, [goingCardW]);

  // Track whether the carousel is scrolled behind the sticky header.
  // We set a ref (goingBehindStickyRef) and call updateGoingUI — the animation
  // loop also calls updateGoingUI every frame, so the ref value is always picked
  // up correctly without fighting against the loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (window.innerWidth < 768) return;
    const STICKY_H = 130; // sticky header height (title row + filter chips)

    const check = () => {
      const container = goingContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // Hide chevrons only when their midpoint (center of container) passes the filter chips
      const chevronY = rect.top + rect.height / 2;
      const behind = chevronY < STICKY_H;
      if (goingBehindStickyRef.current !== behind) {
        goingBehindStickyRef.current = behind;
        updateGoingUI();
      }
    };

    window.addEventListener("scroll", check, { passive: true });
    check(); // run once on mount in case page is already scrolled
    return () => window.removeEventListener("scroll", check);
  }, [goingCardW]);

  return (
    <div className="relative flex min-h-screen flex-col pb-20" style={{ background: CE_BG }}>
      <style>{`
        @keyframes bell-ring {
          0%   { transform: rotate(0deg);   transform-origin: 50% 4px; }
          8%   { transform: rotate(22deg);  transform-origin: 50% 4px; }
          16%  { transform: rotate(-20deg); transform-origin: 50% 4px; }
          24%  { transform: rotate(15deg);  transform-origin: 50% 4px; }
          32%  { transform: rotate(-12deg); transform-origin: 50% 4px; }
          40%  { transform: rotate(7deg);   transform-origin: 50% 4px; }
          48%  { transform: rotate(0deg);   transform-origin: 50% 4px; }
          100% { transform: rotate(0deg);   transform-origin: 50% 4px; }
        }
        .bell-ring {
          animation: bell-ring 6.5s ease-in-out infinite;
          display: block;
        }
      `}</style>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10" style={{ background: CE_BG }}>

        {/* Title row — city name is the location trigger */}
        <div className="flex items-center justify-between px-5 md:px-3 pt-6 pb-4 max-w-6xl mx-auto">
          <div className="relative">
            <button
              onClick={() => setLocationOpen((v) => !v)}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
              aria-label="Change location"
            >
              <h1 style={{ fontFamily: CORMORANT, fontSize: 32, fontWeight: 700, color: DARK, lineHeight: 1 }}>
                {cityName || "Events"}
              </h1>
              <ChevronDown className="h-5 w-5 mt-1" style={{ color: DARK }} />
            </button>
            <LocationSelector
              value={location}
              onChange={setLocation}
              open={locationOpen}
              onOpenChange={setLocationOpen}
              dropdownAlign="left"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/search")}
              className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
              style={{ width: 40, height: 40, background: "rgba(0,0,0,0.05)" }}
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" style={{ color: DARK }} />
            </button>
            <button
              onClick={() => { setHasUnread(false); navigate("/notifications"); }}
              className="relative flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
              style={{ width: 40, height: 40, background: "rgba(0,0,0,0.05)" }}
              aria-label="Notifications"
            >
              <Bell
                className={`h-[18px] w-[18px]${hasUnread ? " bell-ring" : ""}`}
                style={{ color: hasUnread ? "rgb(31, 78, 91)" : DARK, fill: hasUnread ? "rgb(31, 78, 91)" : "none" }}
              />
              {hasUnread && (
                <span
                  className="absolute"
                  style={{ top: 6, right: 6, width: 11, height: 11, borderRadius: "50%", background: CE_ERROR, border: "2px solid rgb(31, 78, 91)" }}
                />
              )}
            </button>
            <button
              onClick={() => navigate("/create-event")}
              className="hidden md:flex items-center gap-1.5 transition-opacity hover:opacity-70"
              style={{ height: 36, padding: "0 16px", borderRadius: 999, background: TEAL, border: "none", cursor: "pointer" }}
            >
              <span style={{ color: CE_BG, fontSize: 24, lineHeight: 1, marginTop: -1 }}>+</span>
              <span style={{ color: CE_BG, fontSize: 13, fontWeight: 600, fontFamily: INTER }}>Create Event</span>
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="pb-3">
          <div
            className="flex gap-2 overflow-x-auto px-5 md:px-3 max-w-6xl mx-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {filterChips.map((chip) => {
              const Icon = chip.icon;
              const active = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-80"
                  style={{
                    padding: "8px 16px",
                    fontFamily: INTER,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    ...(active
                      ? { background: TEAL, color: CE_BG, border: "none" }
                      : { background: CE_SURFACE, color: MID, border: "1px solid #E4DCCF" }),
                  }}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 px-5 md:px-3 py-4">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* ── You're going ── */}
          {goingEvents.length > 0 && (
            <div className="space-y-3">
              <h2 style={{ fontFamily: CORMORANT, fontSize: 24, fontWeight: 600, color: DARK, lineHeight: 1 }}>
                You're going
              </h2>
              <div ref={goingContainerRef} style={{ position: "relative" }}>
                {/* Left edge fade — desktop only, ref-controlled opacity */}
                <div
                  ref={goingLeftFadeRef}
                  className="hidden md:block"
                  style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 120,
                    background: `linear-gradient(to right, ${CE_BG} 0%, ${CE_BG} 35%, transparent 100%)`,
                    pointerEvents: "none", zIndex: 5,
                    opacity: 0, transition: "opacity 0.4s ease",
                  }}
                />
                {/* Right edge fade — desktop only */}
                <div
                  ref={goingRightFadeRef}
                  className="hidden md:block"
                  style={{
                    position: "absolute", right: 0, top: 0, bottom: 0, width: 120,
                    background: `linear-gradient(to left, ${CE_BG} 0%, ${CE_BG} 35%, transparent 100%)`,
                    pointerEvents: "none", zIndex: 5,
                    opacity: 0, transition: "opacity 0.4s ease",
                  }}
                />
                {/* Left chevron — desktop only, opacity-controlled */}
                <button
                  ref={goingLeftChevRef}
                  onClick={() => scrollGoing("left")}
                  className="hidden md:flex items-center justify-center"
                  style={{
                    opacity: 0, pointerEvents: "none",
                    transition: "opacity 0.25s ease",
                    position: "absolute", left: -20, top: "50%", transform: "translateY(-50%)",
                    zIndex: 10, width: 40, height: 40, borderRadius: "50%",
                    background: "white", border: "none", cursor: "pointer",
                    boxShadow: "0 2px 18px rgba(0,0,0,0.11), 0 1px 4px rgba(0,0,0,0.07)",
                  }}
                >
                  <ChevronLeft size={18} color={DARK} strokeWidth={2} />
                </button>
                {/* Right chevron — desktop only */}
                <button
                  ref={goingRightChevRef}
                  onClick={() => scrollGoing("right")}
                  className="hidden md:flex items-center justify-center"
                  style={{
                    opacity: 0, pointerEvents: "none",
                    transition: "opacity 0.25s ease",
                    position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)",
                    zIndex: 10, width: 40, height: 40, borderRadius: "50%",
                    background: "white", border: "none", cursor: "pointer",
                    boxShadow: "0 2px 18px rgba(0,0,0,0.11), 0 1px 4px rgba(0,0,0,0.07)",
                  }}
                >
                  <ChevronRight size={18} color={DARK} strokeWidth={2} />
                </button>
                {/* Scrollable card strip */}
                <div
                  ref={goingScrollRef}
                  onScroll={updateGoingUI}
                  onMouseEnter={() => { goingPausedRef.current = true; }}
                  onMouseLeave={() => { goingPausedRef.current = false; }}
                  className="flex gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" as any, alignItems: "stretch" }}
                >
                  {(goingNeedsLoop ? [...goingEvents, ...goingEvents] : goingEvents).map((event, idx) => (
                    <GoingCard
                      key={`going-${idx}-${event.id}`}
                      event={event}
                      isSaved={savedEvents.has(event.id)}
                      onToggleSave={toggleSaved}
                      onNavigate={(id) => navigate(`/event/${id}`)}
                      cardWidth={goingCardW || undefined}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Challenge Card */}
          {isLoggedIn && (
            <div className="space-y-3">
              <h2 style={{ fontFamily: CORMORANT, fontSize: 24, fontWeight: 600, color: DARK, lineHeight: 1 }}>
                Weekly Challenge
              </h2>
              <div
                className="flex items-stretch gap-3 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-2 md:overflow-visible"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className="w-[304px] sm:w-[344px] flex-shrink-0 md:w-auto"><OOTDCard tall={stepChallengeJoined} /></div>
                <div className="w-[376px] sm:w-[400px] flex-shrink-0 md:w-auto"><ChallengeCard onHasJoinedChange={setStepChallengeJoined} /></div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-8">
              {[["This Week", 4], ["Next Week", 3], ["Later", 2]].map(([label, count]) => (
                <div key={label as string} className="space-y-3">
                  <div className="sk h-5 w-24" />
                  <div
                    className="flex gap-4 overflow-x-auto -mx-5 px-5 md:grid md:grid-cols-4 lg:grid-cols-5 md:mx-0 md:px-0"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {Array.from({ length: count as number }).map((_, i) => (
                      <div key={i} className="flex-shrink-0 w-[65vw] md:w-auto">
                        <div className="sk h-44 w-full rounded-2xl" />
                        <div className="px-1 pt-2 space-y-1.5">
                          <div className="sk h-4 w-3/4 rounded-lg" />
                          <div className="sk h-3 w-1/2 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* This Week */}
              <div className="space-y-3" ref={thisWeekRef}>
                <div className="flex items-center justify-between">
                  <h2 style={{ fontFamily: CORMORANT, fontSize: 24, fontWeight: 600, color: DARK, lineHeight: 1 }}>This Week</h2>
                  {isLoggedIn && (
                    <button
                      onClick={() => {
                        const url = window.location.href;
                        const text = "Check out these events on Beyond Sunday! 🎉";
                        if (navigator.share) {
                          navigator.share({ title: "Beyond Sunday Events", text, url }).catch(() => {});
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
                  <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {thisWeek.map((event) => (
                      <div key={event.id} data-event-id={event.id}><EventCard event={event} creatorWard={creatorWards[event.user_id]} communityName={event.community_id ? communityNames[event.community_id] : undefined} communityAvatar={event.community_id ? communityAvatars[event.community_id] : undefined} communityId={event.community_id ?? null} isSaved={savedEvents.has(event.id)} onToggleSave={toggleSaved} /></div>
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
  <h2 style={{ fontFamily: CORMORANT, fontSize: 24, fontWeight: 600, color: DARK, lineHeight: 1 }}>Next Week</h2>
  {nextWeek.length > 0 ? (
    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      {nextWeek.map((event) => (
        <div key={event.id} data-event-id={event.id}><EventCard event={event} creatorWard={creatorWards[event.user_id]} communityName={event.community_id ? communityNames[event.community_id] : undefined} communityAvatar={event.community_id ? communityAvatars[event.community_id] : undefined} communityId={event.community_id ?? null} isSaved={savedEvents.has(event.id)} onToggleSave={toggleSaved} /></div>
      ))}
    </div>
  ) : (
    <EmptySection label="Next Week" />
  )}
</div>

              {/* Later */}
<div className="space-y-3 mt-8" ref={laterRef}>
  <h2 style={{ fontFamily: CORMORANT, fontSize: 24, fontWeight: 600, color: DARK, lineHeight: 1 }}>Later</h2>
  {later.filter(e => !e.is_recurring).length > 0 ? (
    <div className="space-y-6">
      {Object.entries(groupByMonth([...later.filter(e => !e.is_recurring)].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))).map(([month, evts]) => (
        <div key={month} className="space-y-3" ref={(el) => { monthRefs.current[month] = el; }}>
          <h3 className="text-sm font-semibold text-muted-foreground">{month}</h3>
          <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {evts.map((event) => (
              <div key={event.id} data-event-id={event.id}><EventCard event={event} creatorWard={creatorWards[event.user_id]} communityName={event.community_id ? communityNames[event.community_id] : undefined} communityAvatar={event.community_id ? communityAvatars[event.community_id] : undefined} communityId={event.community_id ?? null} isSaved={savedEvents.has(event.id)} onToggleSave={toggleSaved} /></div>
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


    </div>
  );
};

export default Wards;
