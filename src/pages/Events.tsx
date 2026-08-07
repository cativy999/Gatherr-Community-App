import { CE_BG,CE_SURFACE,CE_SUCCESS_BG,CE_SUCCESS_TEXT } from '../tokens';
import { getRegionTag } from '@/components/EventCard';
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ThumbsUp, Smile, Heart, MapPin, Users, MoreHorizontal, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ── Design tokens ──────────────────────────────────────────────────────────
const BG        = CE_BG;
const DARK      = "#2C2523";
const MID       = "#635C59";
const TEAL      = "#1F4E5B";
const ICON_BG   = "#E4DCCF";
const DIVIDER   = "#E4DCCF";
const GARAMOND  = "'EB Garamond', Georgia, serif";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const INTER     = "'Inter', sans-serif";

// ── Chips ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "going",     label: "Going",     Icon: ThumbsUp },
  { id: "interests", label: "Interests", Icon: Smile    },
  { id: "saved",     label: "Saved",     Icon: Heart    },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Time helpers ───────────────────────────────────────────────────────────
const TZ_ABBR: Record<string, string> = {
  "America/Los_Angeles": "PT", "America/Denver": "MT",
  "America/Phoenix": "MT",     "America/Chicago": "CT",
  "America/New_York": "ET",    "America/Anchorage": "AKT",
  "Pacific/Honolulu": "HT",
};
const fmtTime = (t: string) =>
  new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const getEventTime = (ev: any) => {
  const t = ev.start_time ?? ev.time;
  if (!t) return null;
  const tz = ev.timezone ? (TZ_ABBR[ev.timezone] ?? "") : "";
  return tz ? `${fmtTime(t)} ${tz}` : fmtTime(t);
};

const toLocal = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};

const isRecurring = (dateStr: string) => parseInt(dateStr.split("-")[0], 10) >= 2099;

const fmtDateLabel = (dateStr: string) => {
  if (isRecurring(dateStr)) return { monthDay: "Recurring", weekday: "" };
  const date = toLocal(dateStr);
  const monthDay = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const weekday  = date.toLocaleDateString("en-US", { weekday: "long" });
  return { monthDay, weekday };
};

const groupByDate = (evs: any[]) => {
  const map = new Map<string, any[]>();
  for (const ev of evs) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date)!.push(ev);
  }
  return Array.from(map.entries()).map(([date, events]) => ({ date, events }));
};

// ── Event card (Figma-matched) ──────────────────────────────────────────────
const EventCard = ({ event, onClick }: { event: any; onClick: () => void }) => {
  const timeStr = getEventTime(event);
  const ageLabel = event.age_min
    ? `Ages ${event.age_min}${event.age_max ? `–${event.age_max}` : "+"}`
    : null;
  return (
    <>
    <style>{`
      .ev-thumb-wrap { overflow: hidden; border-radius: 8px; flex-shrink: 0; position: relative; }
      .ev-thumb { transition: transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94); display: block; }
      .ev-thumb-overlay {
        position: absolute; inset: 0; border-radius: 8px; pointer-events: none;
        background: linear-gradient(to top, rgba(0,0,0,0.70) 0%, transparent 60%);
        opacity: 0; transition: opacity 0.4s ease;
        display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px;
      }
      .ev-thumb-overlay span {
        color: rgba(255,255,255,0.93);
        font-size: 13px; font-weight: 700;
        font-family: 'Cormorant Garamond', Georgia, serif;
        letter-spacing: 2px;
      }
      @media (min-width: 768px) {
        .ev-card:hover .ev-thumb { transform: scale(1.1); }
        .ev-card:hover .ev-thumb-overlay { opacity: 1; }
      }
    `}</style>
    <div
      onClick={onClick}
      className="ev-card flex gap-3 cursor-pointer transition-opacity hover:opacity-90"
      style={{
        background: "white", borderRadius: 12,
        padding: 14, border: `1px solid ${DIVIDER}`,
      }}
    >
      <div className="flex-1 min-w-0" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {timeStr && (
          <p style={{
            color: CE_SUCCESS_TEXT, fontFamily: INTER, fontSize: 11,
            fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {timeStr}
          </p>
        )}
        <h3 style={{ color: "#2C2523", fontFamily: INTER, fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>
          {event.title}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: MID }} />
              <span className="line-clamp-1" style={{ color: MID, fontFamily: INTER, fontSize: 12 }}>
                {event.location}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 flex-shrink-0" style={{ color: MID }} />
            <span style={{ color: MID, fontFamily: INTER, fontSize: 12 }}>
              {event.attendees ?? 0} going
            </span>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end" style={{ gap: 8 }}>
        {event.image_url ? (
          <div className="ev-thumb-wrap" style={{ width: 80, height: 80 }}>
            <img
              src={event.image_url}
              alt={event.title}
              className="ev-thumb"
              style={{ width: 80, height: 80, objectFit: "cover" }}
            />
            <div className="ev-thumb-overlay">
              {(() => { const tag = getRegionTag(event.location, event.lat, event.lng); return tag ? <span>{tag}</span> : null; })()}
            </div>
          </div>
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: 8, background: ICON_BG, flexShrink: 0 }} />
        )}
        {ageLabel && (
          <span style={{
            background: CE_SUCCESS_BG, color: CE_SUCCESS_TEXT,
            fontFamily: INTER, fontSize: 11, fontWeight: 600,
            padding: "4px 10px", borderRadius: 100, whiteSpace: "nowrap",
          }}>
            {ageLabel}
          </span>
        )}
      </div>
    </div>
    </>
  );
};

// ── Timeline section ────────────────────────────────────────────────────────
const TimelineSection = ({
  label, dateGroups, onNavigate, isLastSection,
}: {
  label: string;
  dateGroups: { date: string; events: any[] }[];
  onNavigate: (id: string) => void;
  isLastSection: boolean;
}) => (
  <div style={{ marginBottom: 8 }}>
    {/* Section label */}
    <p style={{
      fontFamily: INTER, fontSize: 11, fontWeight: 600,
      color: MID, letterSpacing: "0.08em", textTransform: "uppercase",
      paddingBottom: 12,
    }}>
      {label}
    </p>

    {/* Timeline */}
    {dateGroups.map(({ date, events }, i) => {
      const isLastInSection = i === dateGroups.length - 1;
      const isVeryLast = isLastInSection && isLastSection;
      const { monthDay, weekday } = fmtDateLabel(date);
      return (
        <div key={date} style={{ display: "flex", gap: 12 }}>

          {/* ── Timeline track ── */}
          <div style={{ width: 24, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            {/* top cap */}
            <div style={{ width: 1.5, height: 8, background: i === 0 ? "transparent" : DIVIDER }} />
            {/* dot — solid teal with white ring */}
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              background: "rgb(91, 138, 122)", flexShrink: 0,
              border: "2.5px solid white",
            }} />
            {/* vertical line down — always shown; ends naturally at bottom of content */}
            <div style={{ width: 1.5, flex: 1, background: DIVIDER, minHeight: 20 }} />
          </div>

          {/* ── Node content ── */}
          <div style={{ flex: 1, paddingBottom: isVeryLast ? 0 : 28 }}>
            {/* Date label */}
            <div style={{ display: "flex", gap: 6, alignItems: "baseline", marginBottom: 10 }}>
              <span style={{ fontFamily: CORMORANT, fontSize: 24, fontWeight: 600, color: DARK, lineHeight: 1 }}>
                {monthDay}
              </span>
              {weekday && (
                <span style={{ fontFamily: INTER, fontSize: 13, color: MID }}>
                  {weekday}
                </span>
              )}
            </div>
            {/* Event cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {events.map((ev) => (
                <EventCard key={ev.id} event={ev} onClick={() => onNavigate(ev.id)} />
              ))}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

// ── Empty state ─────────────────────────────────────────────────────────────
const Empty = ({ tab }: { tab: TabId }) => {
  const msg = {
    going:     "Events you RSVP to will appear here",
    interests: "Events you mark as Interested will appear here",
    saved:     "Events you save will appear here",
  }[tab];
  return (
    <div className="flex flex-col items-center text-center pt-16 gap-3">
      <img src="/Empty%20state/tent.png?v=6" alt="" style={{ width: 180, height: 180, objectFit: "contain" }} />
      <p style={{ fontFamily: GARAMOND, color: DARK, fontSize: 18, fontWeight: 600 }}>Nothing here yet</p>
      <p style={{ fontFamily: INTER, color: MID, fontSize: 14 }}>{msg}</p>
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────────────────
const Events = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [activeTab, setActiveTab] = useState<TabId>("going");
  const [events, setEvents]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!userId) { setEvents([]); return; }
    setLoading(true);
    setEvents([]);

    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (activeTab === "going" || activeTab === "interests") {
      const status = activeTab === "going" ? "going" : "interested";
      supabase
        .from("rsvps")
        .select("events(*)")
        .eq("user_id", userId)
        .eq("status", status)
        .then(({ data }) => {
          const upcoming = (data ?? [])
            .map((r: any) => r.events)
            .filter((e: any) => e && toLocal(e.date) >= today)
            .sort((a: any, b: any) => a.date.localeCompare(b.date));
          setEvents(upcoming);
          setLoading(false);
        });
    } else {
      supabase
        .from("saved_events")
        .select("events(*)")
        .eq("user_id", userId)
        .then(({ data }) => {
          const upcoming = (data ?? [])
            .map((r: any) => r.events)
            .filter((e: any) => e && toLocal(e.date) >= today)
            .sort((a: any, b: any) => a.date.localeCompare(b.date));
          setEvents(upcoming);
          setLoading(false);
        });
    }
  }, [userId, activeTab]);

  // ── Section bucketing ───────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endThisWeek = new Date(today);
  endThisWeek.setDate(today.getDate() + (6 - today.getDay())); // through Saturday
  const endNextWeek = new Date(endThisWeek);
  endNextWeek.setDate(endThisWeek.getDate() + 7);

  const thisWeek  = events.filter(ev => toLocal(ev.date) <= endThisWeek);
  const nextWeek  = events.filter(ev => { const d = toLocal(ev.date); return d > endThisWeek && d <= endNextWeek; });
  const later     = events.filter(ev => toLocal(ev.date) > endNextWeek);

  const sections = [
    { label: "This Week", groups: groupByDate(thisWeek)  },
    { label: "Next Week", groups: groupByDate(nextWeek)  },
    { label: "Later",     groups: groupByDate(later)     },
  ].filter(s => s.groups.length > 0);

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 96 }}>
      <div className="max-w-2xl mx-auto px-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-8 pb-5">
          <h1 style={{ fontFamily: CORMORANT, color: DARK, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
            My Events
          </h1>

          {/* ⋮ menu */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-70"
              style={{ background: ICON_BG }}
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" style={{ color: DARK }} />
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: "white", borderRadius: 14,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                  border: `1px solid ${DIVIDER}`,
                  overflow: "hidden", minWidth: 180, zIndex: 50,
                }}
              >
                <button
                  onClick={() => { setMenuOpen(false); navigate("/my-published-events"); }}
                  className="flex items-center gap-2.5 w-full transition-colors hover:bg-[#F5F0EA]"
                  style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, color: DARK, fontFamily: INTER }}
                >
                  <CalendarDays className="h-4 w-4 flex-shrink-0" style={{ color: MID }} />
                  Published Events
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Chips ──────────────────────────────────────────────────── */}
        <div
          className="flex gap-2 pb-6 -mx-5 px-5"
          style={{ overflowX: "auto", scrollbarWidth: "none" }}
        >
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
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
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        {!session ? (
          <div className="flex flex-col items-center text-center pt-16 gap-3">
            <p style={{ fontFamily: GARAMOND, color: DARK, fontSize: 18 }}>Sign in to see your events</p>
          </div>
        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className="sk" style={{ width: 10, height: 10, borderRadius: "50%" }} />
                  <div className="sk" style={{ width: 1.5, height: 120, marginTop: 4 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="sk" style={{ height: 20, width: 140, borderRadius: 6, marginBottom: 10 }} />
                  <div className="sk" style={{ height: 100, borderRadius: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Empty tab={activeTab} />
        ) : (
          <div>
            {sections.map(({ label, groups }, si) => (
              <TimelineSection
                key={label}
                label={label}
                dateGroups={groups}
                onNavigate={(id) => navigate(`/event/${id}`)}
                isLastSection={si === sections.length - 1}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default Events;
