import { CE_BG, CE_SURFACE } from '../tokens';
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ThumbsUp, Smile, Heart, MapPin, Users,
  ChevronLeft, ChevronRight, ChevronDown,
  Church, Video, Presentation, LandPlot, HandPlatter, HeartHandshake, Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import CalendarView from "@/components/CalendarView";
import LocationSelector from "@/components/LocationSelector";

// ── Design tokens ──────────────────────────────────────────────────────────
const BG       = CE_BG;
const DARK     = "#2C2523";
const MID      = "#635C59";
const TEAL     = "#1F4E5B";
const DIV      = "#E4DCCF";
const SURFACE  = "#EFECE6";
const INTER    = "'Inter', sans-serif";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Personal events tabs ───────────────────────────────────────────────────
const TABS = [
  { id: "going",     label: "Going",     Icon: ThumbsUp },
  { id: "interests", label: "Interests", Icon: Smile    },
  { id: "saved",     label: "Saved",     Icon: Heart    },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Filter chips (same as homepage) ───────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────
const TZ_ABBR: Record<string, string> = {
  "America/Los_Angeles": "PT", "America/Denver": "MT",
  "America/Phoenix": "MT",     "America/Chicago": "CT",
  "America/New_York": "ET",    "America/Anchorage": "AKT",
  "Pacific/Honolulu": "HT",
};
const fmtTime = (t: string) =>
  new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const toLocal = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};
const isRecurring = (dateStr: string) => parseInt(dateStr.split("-")[0], 10) >= 2099;

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Small event card for right panel ──────────────────────────────────────
const SmallEventCard = ({ event, onClick }: { event: any; onClick: () => void }) => {
  const t = event.start_time ?? event.time;
  const tz = event.timezone ? (TZ_ABBR[event.timezone] ?? "") : "";
  const timeStr = t ? (tz ? `${fmtTime(t)} ${tz}` : fmtTime(t)) : null;

  const dateStr = (() => {
    if (event.is_recurring) return "Recurring event";
    if (!event.date) return null;
    const [y, m, d] = event.date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  })();

  const metaLine = [dateStr, timeStr].filter(Boolean).join(" · ");
  const attendees = event.attendees ?? 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", gap: 10, cursor: "pointer",
        padding: "10px 0", borderBottom: `1px solid ${DIV}`,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
    >
      {event.image_url ? (
        <img src={event.image_url} alt={event.title}
          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 56, height: 56, borderRadius: 8, background: SURFACE, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {metaLine && (
          <p style={{ fontFamily: INTER, fontSize: 10, fontWeight: 600, color: TEAL, textTransform: "uppercase", letterSpacing: "0.05em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {metaLine}
          </p>
        )}
        <p style={{ fontFamily: INTER, fontSize: 13, fontWeight: 600, color: DARK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          {event.location && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
              <MapPin style={{ width: 10, height: 10, color: MID, flexShrink: 0 }} />
              <span style={{ fontFamily: INTER, fontSize: 11, color: MID, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {event.location}
              </span>
            </div>
          )}
          {attendees > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0, marginLeft: 6 }}>
              <Users style={{ width: 10, height: 10, color: MID }} />
              <span style={{ fontFamily: INTER, fontSize: 11, color: MID }}>{attendees}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────────────────
const Events = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { location, setLocation, locationLat, locationLng } = useLocation();
  const { preferredAgeMin, preferredAgeMax } = useUserProfile();

  const [locationOpen, setLocationOpen] = useState(false);

  // ── Layout ──
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 860);
  useEffect(() => {
    const h = () => setIsDesktop(window.innerWidth >= 860);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── User profile (avatar + name for CalendarView) ──
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [goingEventIds, setGoingEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Pull avatar from OAuth session metadata first (Google / Apple)
    const meta = session?.user?.user_metadata;
    const metaAvatar = meta?.avatar_url || meta?.picture || null;
    const metaName = meta?.full_name || meta?.name || "";
    if (metaAvatar) setUserAvatar(metaAvatar);
    if (metaName) setUserName(metaName);

    if (!userId) return;

    // Also check profiles table (may override with a custom uploaded photo)
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setUserAvatar(data.avatar_url);
        if (data?.full_name) setUserName(data.full_name);
      });

    supabase
      .from("rsvps")
      .select("event_id")
      .eq("user_id", userId)
      .eq("status", "going")
      .then(({ data }) => {
        setGoingEventIds(new Set((data ?? []).map((r: any) => r.event_id)));
      });
  }, [userId, session]);

  // ── Big calendar: all events ──
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [jumpDate, setJumpDate] = useState<Date | undefined>();

  const cityName = location.split(",")[0].trim();

  const fetchEvents = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    supabase
      .from("events")
      .select("id, title, image_url, date, time, start_time, end_time, end_date, attendees, is_free, age_min, age_max, created_at, location, lat, lng, ward_type, user_id, food, duration, virtual_link, is_recurring, recurring_day, recurring_days, recurring_week_of_month, timezone, community_id, description")
      .eq("status", "published")
      .eq("category", "ward")
      .or(`end_date.gte.${today},and(end_date.is.null,date.gte.${today})`)
      .then(({ data }) => setAllEvents(data ?? []));
  };

  useEffect(() => {
    fetchEvents();
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const filteredEvents = useMemo(() => {
    let result = [...allEvents];
    if (location !== "Everywhere") {
      const locationParts = location.split(",").map((s: string) => s.trim());
      const userState = locationParts.length > 1 ? locationParts[locationParts.length - 1].toLowerCase() : null;
      const isStatePick = locationParts.length === 1;
      const stateAbbr = STATE_ABBR[location] ?? null;
      const abbrRegex = stateAbbr ? new RegExp(`\\b${stateAbbr}\\b`, 'i') : null;
      result = result.filter((e) => {
        const eventLoc = e.location?.toLowerCase() ?? "";
        if (isStatePick) {
          if (eventLoc.includes(location.toLowerCase())) return true;
          if (abbrRegex && abbrRegex.test(e.location ?? "")) return true;
          return false;
        }
        if (locationLat && locationLng && e.lat && e.lng) return getDistance(locationLat, locationLng, e.lat, e.lng) <= 75;
        if (userState) return eventLoc.includes(userState);
        return cityName ? eventLoc.includes(cityName.toLowerCase()) : true;
      });
    }
    result = result.filter((e) => {
      if (!e.age_min || !e.age_max) return true;
      return e.age_min <= preferredAgeMax && e.age_max >= preferredAgeMin;
    });
    if (["spiritual","fhe","service","conference"].includes(activeFilter)) result = result.filter((e) => e.ward_type === activeFilter);
    if (activeFilter === "food") result = result.filter((e) => e.food && e.food.length > 0);
    if (activeFilter === "virtual") result = result.filter((e) => e.virtual_link);
    if (activeFilter === "popular") return result.sort((a, b) => (b.attendees ?? 0) - (a.attendees ?? 0));
    result.sort((a, b) => {
      if (locationLat && locationLng && a.lat && b.lat) {
        const dA = getDistance(locationLat, locationLng, a.lat, a.lng!);
        const dB = getDistance(locationLat, locationLng, b.lat, b.lng!);
        if (Math.abs(dA - dB) <= 20) return new Date(a.date).getTime() - new Date(b.date).getTime();
        return dA - dB;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    return result;
  }, [allEvents, activeFilter, locationLat, locationLng, preferredAgeMin, preferredAgeMax, location, cityName]);

  // ── Mini calendar ──
  const [miniMonth, setMiniMonth] = useState(new Date());

  const eventDateSet = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach(ev => { if (ev.date && !isRecurring(ev.date)) set.add(ev.date); });
    return set;
  }, [allEvents]);

  const renderMiniCalendar = () => {
    const year = miniMonth.getFullYear();
    const month = miniMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
      <div>
        {/* Month header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 600, color: DARK }}>
            {MONTHS[month]} {year}
          </span>
          <div style={{ display: "flex", gap: 2 }}>
            <button
              onClick={() => setMiniMonth(new Date(year, month - 1, 1))}
              style={{ border: "none", background: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center" }}
            >
              <ChevronLeft size={14} color={MID} />
            </button>
            <button
              onClick={() => setMiniMonth(new Date(year, month + 1, 1))}
              style={{ border: "none", background: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center" }}
            >
              <ChevronRight size={14} color={MID} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontFamily: INTER, fontSize: 10, fontWeight: 600, color: MID, padding: "2px 0" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} style={{ aspectRatio: "1" }} />;
            const dateKey = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const hasEvt = eventDateSet.has(dateKey);
            const isToday = dateKey === todayKey;
            return (
              <button
                key={dateKey}
                onClick={() => setJumpDate(new Date(year, month, day))}
                style={{
                  aspectRatio: "1", borderRadius: 6, border: "none", cursor: "pointer",
                  background: isToday ? TEAL : "transparent",
                  color: isToday ? "white" : DARK,
                  fontFamily: INTER, fontSize: 11, fontWeight: isToday ? 700 : 400,
                  position: "relative", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", padding: 0,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = SURFACE; }}
                onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = "transparent"; }}
              >
                {day}
                {hasEvt && !isToday && (
                  <span style={{
                    position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
                    width: 4, height: 4, borderRadius: "50%", background: TEAL,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Personal events (right panel) ──
  const [activeTab, setActiveTab] = useState<TabId>("going");
  const [personalEvents, setPersonalEvents] = useState<any[]>([]);
  const [personalLoading, setPersonalLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setPersonalEvents([]); return; }
    setPersonalLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (activeTab === "going" || activeTab === "interests") {
      const status = activeTab === "going" ? "going" : "interested";
      supabase.from("rsvps").select("events(*)").eq("user_id", userId).eq("status", status)
        .then(({ data }) => {
          const upcoming = (data ?? []).map((r: any) => r.events)
            .filter((e: any) => e && toLocal(e.date) >= today)
            .sort((a: any, b: any) => a.date.localeCompare(b.date));
          setPersonalEvents(upcoming);
          setPersonalLoading(false);
        });
    } else {
      supabase.from("saved_events").select("events(*)").eq("user_id", userId)
        .then(({ data }) => {
          const upcoming = (data ?? []).map((r: any) => r.events)
            .filter((e: any) => e && toLocal(e.date) >= today)
            .sort((a: any, b: any) => a.date.localeCompare(b.date));
          setPersonalEvents(upcoming);
          setPersonalLoading(false);
        });
    }
  }, [userId, activeTab]);

  // Group personal events by month (recurring events get their own group)
  const groupedPersonal = useMemo(() => {
    const recurring: any[] = [];
    const map = new Map<string, any[]>();
    personalEvents.forEach(ev => {
      if (ev.is_recurring) { recurring.push(ev); return; }
      if (!ev.date) return;
      const [y, m] = ev.date.split("-");
      const key = `${y}-${m}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    const groups = Array.from(map.entries()).map(([key, evs]) => {
      const [y, m] = key.split("-");
      const label = new Date(parseInt(y), parseInt(m) - 1, 1)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { label, events: evs };
    });
    if (recurring.length > 0) groups.push({ label: "Recurring Events", events: recurring });
    return groups;
  }, [personalEvents]);

  // ── Right panel ─────────────────────────────────────────────────────────
  const RightPanel = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Mini calendar — sticky, never scrolls away */}
      <div style={{ flexShrink: 0, paddingBottom: 16, borderBottom: `1px solid ${DIV}` }}>
        {renderMiniCalendar()}
      </div>

      {/* Your upcoming events — scrolls within its own container */}
      <div style={{ flex: 1, overflowY: "auto", marginTop: 20, paddingBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontFamily: CORMORANT, fontSize: 22, fontWeight: 700, color: DARK, lineHeight: 1 }}>
            Your upcoming events
          </h2>
          {personalEvents.length > 0 && (
            <span style={{ fontFamily: INTER, fontSize: 12, color: MID }}>{personalEvents.length}</span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 999,
                  fontFamily: INTER, fontSize: 12, fontWeight: active ? 600 : 500,
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                  background: active ? TEAL : CE_SURFACE,
                  color: active ? "white" : MID,
                }}
              >
                <Icon style={{ width: 12, height: 12 }} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {!session ? (
          <p style={{ fontFamily: INTER, fontSize: 13, color: MID, textAlign: "center", paddingTop: 24 }}>
            Sign in to see your events
          </p>
        ) : personalLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, background: DIV }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ height: 10, width: "60%", borderRadius: 4, background: DIV }} />
                  <div style={{ height: 13, width: "90%", borderRadius: 4, background: DIV }} />
                </div>
              </div>
            ))}
          </div>
        ) : personalEvents.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 24 }}>
            <p style={{ fontFamily: INTER, fontSize: 13, color: MID }}>
              {activeTab === "going" ? "Events you RSVP to will appear here" :
               activeTab === "interests" ? "Events you marked as Interested will appear here" :
               "Events you save will appear here"}
            </p>
          </div>
        ) : (
          <div>
            {groupedPersonal.map(({ label, events }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <p style={{
                  fontFamily: INTER, fontSize: 10, fontWeight: 700,
                  color: MID, textTransform: "uppercase", letterSpacing: "0.08em",
                  marginBottom: 4,
                }}>
                  {label}
                </p>
                {events.map(ev => (
                  <SmallEventCard key={ev.id} event={ev} onClick={() => navigate(`/event/${ev.id}`)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>{/* end upcoming scroll area */}
    </div>
  );

  return (
    <>
      <style>{`
        .ev-page-layout {
          display: flex;
          min-height: 100vh;
          background: ${BG};
          padding: 0 48px;
        }
        .ev-page-left {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid ${DIV};
        }
        .ev-page-filter-bar {
          padding: 12px 0 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: ${BG};
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .ev-page-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 12px;
        }
        .ev-page-chips::-webkit-scrollbar { display: none; }
        .ev-page-right {
          width: 300px;
          flex-shrink: 0;
          padding: 108px 20px 0;
          overflow: hidden;
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          background: ${BG};
          border-left: 1px solid ${DIV};
        }
        @media (max-width: 860px) {
          .ev-page-layout { flex-direction: column; padding: 0 12px; }
          .ev-page-left { border-right: none; }
          .ev-page-filter-bar { position: static; }
          .ev-page-right {
            width: 100%;
            max-height: none;
            position: static;
            border-left: none;
            border-top: 1px solid ${DIV};
            padding: 20px 20px 96px;
          }
        }
      `}</style>

      <div className="ev-page-layout">

        {/* ── Left: filter bar + big calendar ── */}
        <div className="ev-page-left">

          {/* Filter bar */}
          <div className="ev-page-filter-bar">
            {/* Location title row — exact same as homepage */}
            <div className="flex items-center justify-between pt-4 pb-2" style={{ paddingLeft: 24, paddingRight: 24 }}>
              <div className="relative">
                <button
                  onClick={() => setLocationOpen(v => !v)}
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
              {session && (
                <button
                  onClick={() => navigate("/create-event")}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 100, background: TEAL, border: "none", cursor: "pointer", fontFamily: INTER, fontSize: 14, fontWeight: 600, color: "#FAF6F0", boxShadow: "0 2px 8px rgba(31,78,91,0.22)", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Create Event
                </button>
              )}
            </div>

            {/* Category chips — exact same as homepage */}
            <div
              className="flex gap-2 overflow-x-auto pb-3"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", paddingLeft: 24, paddingRight: 24 }}
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

          {/* Big calendar */}
          <div style={{ flex: 1, paddingLeft: 24, paddingRight: 24 }}>
            <CalendarView
              events={filteredEvents as any}
              navigate={navigate}
              isLoggedIn={!!session}
              userId={userId}
              userName={userName}
              userAvatar={userAvatar}
              session={session}
              goingEventIds={goingEventIds}
              jumpDate={jumpDate}
              onEventCreated={fetchEvents}
            />
          </div>
        </div>

        {/* ── Right: mini calendar + personal events ── */}
        <div className="ev-page-right">
          <RightPanel />
        </div>

      </div>
    </>
  );
};

export default Events;
