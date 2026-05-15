import { Heart, Pizza, CupSoda, Cookie, Hamburger, IceCreamCone, Salad, HandPlatter, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    image_url: string | null;
    date: string;
    time: string | null;
    attendees: number;
    is_free: boolean;
    age_min: number;
    age_max: number;
    ward_type: string | null;
    user_id: string;
    food?: string[];
    duration?: string;
    virtual_link?: string | null;
    created_at?: string;
    start_time?: string | null;
    end_time?: string | null;
    end_date?: string | null;
    is_recurring?: boolean;
    recurring_day?: string | null;
    location?: string | null;
    lat?: number | null;
    lng?: number | null;
    timezone?: string | null;
  };
  creatorWard?: string;
  isSaved?: boolean;
  onToggleSave?: (id: string, e: React.MouseEvent) => void;
}

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

// Returns state abbreviation from lat/lng bounding boxes (most reliable).
// Covers states most likely to appear in the app; returns null for anything else.
const stateFromCoords = (lat: number, lng: number): string | null => {
  if (lat >= 32.5 && lat <= 42.1 && lng >= -124.5 && lng <= -114.1) return 'CA';
  if (lat >= 37.0 && lat <= 42.0 && lng >= -114.1 && lng <= -109.0) return 'UT';
  if (lat >= 31.3 && lat <= 37.0 && lng >= -114.9 && lng <= -109.0) return 'AZ';
  if (lat >= 35.0 && lat <= 42.1 && lng >= -120.0 && lng <= -114.0) return 'NV';
  if (lat >= 41.9 && lat <= 46.3 && lng >= -124.7 && lng <= -116.5) return 'OR';
  if (lat >= 45.5 && lat <= 49.1 && lng >= -124.8 && lng <= -116.9) return 'WA';
  if (lat >= 41.9 && lat <= 49.1 && lng >= -117.3 && lng <= -111.0) return 'ID';
  if (lat >= 36.9 && lat <= 41.0 && lng >= -109.1 && lng <= -102.0) return 'CO';
  if (lat >= 31.3 && lat <= 37.0 && lng >= -109.1 && lng <= -103.0) return 'NM';
  if (lat >= 25.8 && lat <= 36.6 && lng >= -106.7 && lng <= -93.5)  return 'TX';
  if (lat >= 24.4 && lat <= 31.1 && lng >= -87.7  && lng <= -79.9)  return 'FL';
  if (lat >= 40.4 && lat <= 45.1 && lng >= -79.8  && lng <= -71.9)  return 'NY';
  if (lat >= 38.8 && lat <= 42.7 && lng >= -88.1  && lng <= -84.8)  return 'IN';
  if (lat >= 41.6 && lat <= 42.1 && lng >= -88.2  && lng <= -82.4)  return 'OH';
  return null;
};

const getRegionTag = (
  location: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined
): string | null => {
  // 1. Coordinates-first: most reliable, works even when location text is missing/malformed
  if (lat != null && lng != null) {
    const state = stateFromCoords(lat, lng);
    if (state === 'CA') return lat < 36.5 ? 'SoCal' : 'NorCal';
    if (state) return state;
  }

  // 2. lng-only fallback for CA (covers events where lat is null but lng is stored)
  if (lng != null && lat == null) {
    // California longitude range; use lng to split SoCal/NorCal
    if (lng >= -124.5 && lng <= -114.1) {
      return lng < -119.0 ? 'NorCal' : 'SoCal';
    }
  }

  // 3. Text parsing fallback
  if (!location) return null;
  const parts = location.split(/[,/]/).map(p => p.trim()).filter(Boolean);
  let stateAbbr: string | null = null;
  for (const part of parts) {
    if (/^[A-Z]{2}$/i.test(part)) {
      const up = part.toUpperCase();
      if (Object.values(STATE_ABBR).includes(up)) { stateAbbr = up; break; }
    }
    if (STATE_ABBR[part]) { stateAbbr = STATE_ABBR[part]; break; }
  }
  if (!stateAbbr) return null;
  if (stateAbbr === 'CA') return null; // can't split without coords
  return stateAbbr;
};

const TZ_ABBR: Record<string, string> = {
  'America/Los_Angeles': 'PT',
  'America/Denver':      'MT',
  'America/Phoenix':     'MT',
  'America/Chicago':     'CT',
  'America/New_York':    'ET',
  'America/Anchorage':   'AKT',
  'Pacific/Honolulu':    'HT',
};
const getTzAbbr = (tz: string | null | undefined): string =>
  tz ? (TZ_ABBR[tz] ?? '') : '';

const getInitialColor = (name: string) => {
  const l = (name || '?').charAt(0).toUpperCase();
  if ('ABCD'.includes(l)) return '#F97066';
  if ('EFGH'.includes(l)) return '#38BDF8';
  if ('IJKL'.includes(l)) return '#A78BFA';
  if ('MNOP'.includes(l)) return '#4ADE80';
  if ('QRST'.includes(l)) return '#FB923C';
  if ('UVWX'.includes(l)) return '#F472B6';
  if ('YZ'.includes(l))   return '#2DD4BF';
  return '#94A3B8';
};

const EventCard = ({ event, creatorWard, isSaved = false, onToggleSave }: EventCardProps) => {
  const navigate = useNavigate();
  const [attendeeAvatars, setAttendeeAvatars] = useState<{url: string | null; name: string}[]>([]);

  const foodIconMap: Record<string, any> = {
    pizza: Pizza,
    drinks: CupSoda,
    cookies: Cookie,
    burgers: Hamburger,
    icecream: IceCreamCone,
    salad: Salad,
    catered: HandPlatter,
  };

  useEffect(() => {
    const fetchAvatars = async () => {
      const { data } = await supabase
        .from("rsvps")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("status", "going")
        .limit(3);
      if (data && data.length > 0) {
        const userIds = data.map((r: any) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, avatar_url, name")
          .in("user_id", userIds);
        setAttendeeAvatars((profiles ?? []).map((p: any) => ({ url: p.avatar_url ?? null, name: p.name || '?' })));
      }
    };
    fetchAvatars();
  }, [event.id]);

  const isNew = event.created_at
    ? (Date.now() - new Date(event.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7
    : false;

  const [y, m, d] = event.date.split("-").map(Number);
  const startDateObj = new Date(y, m - 1, d);
  const dateLine = event.is_recurring
    ? `Every ${event.recurring_day}`
    : event.end_date
    ? (() => {
        const [ey, em, ed] = event.end_date.split("-").map(Number);
        const endDateObj = new Date(ey, em - 1, ed);
        const startStr = startDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const endStr = endDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${startStr} – ${endStr}`;
      })()
    : startDateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const formatTime = (t: string) =>
    new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).toLowerCase();

  const timePart = event.start_time
    ? event.end_time
      ? `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
      : formatTime(event.start_time)
    : event.time
    ? new Date(`2000-01-01T${event.time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).toLowerCase()
    : "";
  const durationPart =
    typeof event.duration === "string" ? event.duration.trim() : event.duration != null ? String(event.duration).trim() : "";
  const timeAndDuration = [timePart, durationPart].filter(Boolean).join(" · ");

  return (
    <div
      onClick={() => navigate(`/event/${event.id}`)}
      className="bg-card rounded-2xl cursor-pointer flex-shrink-0 min-w-0 w-[65vw] md:w-full select-none"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Image */}
      <div className="relative">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-44 object-cover rounded-2xl" />
        ) : (
          <div className="w-full h-44 bg-secondary rounded-2xl flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}

        {/* Attendee avatars top left */}
        {event.attendees > 0 && (
          <div className="absolute top-2 left-0 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-tr-full rounded-br-full px-2 py-1">
            <div className="flex -space-x-1.5">
              {attendeeAvatars.slice(0, 3).map((p, i) => (
                p.url
                  ? <img key={i} src={p.url} className="w-5 h-5 rounded-full border border-white object-cover" referrerPolicy="no-referrer" />
                  : <div key={i} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: getInitialColor(p.name), fontSize: 8, fontWeight: 700 }}>{p.name.charAt(0).toUpperCase()}</div>
              ))}
              {attendeeAvatars.length === 0 && (
                <div className="w-5 h-5 rounded-full border border-white bg-gray-400" />
              )}
            </div>
            <span className="text-gray-800 text-xs font-medium">
              {event.attendees > 3 ? `+${event.attendees - 3} people` : `${event.attendees} going`}
            </span>
          </div>
        )}

        {/* Don't miss this banner */}
        {event.attendees >= 2 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-2xl px-3 py-2 flex justify-center">
            <span className="text-white text-xs font-bold tracking-wide">🔥 Don't miss this!</span>
          </div>
        )}


        {/* Region tag bottom right */}
        {(() => {
          const tag = getRegionTag(event.location, event.lat, event.lng);
          return tag ? (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
              <span className="text-white text-[10px] font-bold tracking-wide">{tag}</span>
            </div>
          ) : null;
        })()}

        {/* Heart top right */}
        <button
          onClick={(e) => onToggleSave?.(event.id, e)}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
        >
          <Heart className={`h-4 w-4 ${isSaved ? "text-[rgb(172,42,42)] fill-current" : "text-gray-600"}`} />
        </button>
      </div>

      {/* Content */}
      <div className="min-w-0 px-1 pt-2 space-y-1.5">
      <h3 className="font-bold text-sm leading-tight text-foreground" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{event.title}</h3>
        {event.virtual_link && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Video className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs">Virtual Event</span>
          </div>
        )}

        <p className="text-xs font-medium min-w-0 leading-snug">
          <span className="text-foreground">
            {dateLine}{timePart ? `  ·  ${timePart}` : ""}
            {timePart && getTzAbbr(event.timezone) ? <span className="text-muted-foreground"> {getTzAbbr(event.timezone)}</span> : null}
          </span>
          {durationPart && <span className="text-muted-foreground"> · {durationPart}</span>}
        </p>

        {event.food && event.food.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            {event.food.map((f) => {
              const Icon = foodIconMap[f];
              return Icon ? <Icon key={f} className="h-4 w-4 text-muted-foreground" /> : null;
            })}
          </div>
        )}

        {isNew && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF3FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>
            </svg>
            <span className="text-xs font-bold" style={{ color: '#FF3FA5' }}>New Added</span>
          </div>
        )}

      </div>
    </div>
  );
};

export default EventCard;