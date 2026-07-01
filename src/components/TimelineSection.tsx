import { MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const groupByDate = (events: any[]) => {
  const groups: Record<string, any[]> = {};
  const sorted = [...events].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
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

export const groupByWeek = (events: any[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Week = Sunday → Saturday
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // back to Sunday

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // this Saturday

  const startOfNextWeek = new Date(endOfWeek);
  startOfNextWeek.setDate(endOfWeek.getDate() + 1); // next Sunday

  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // next Saturday

  const thisWeek: any[] = [];
  const nextWeek: any[] = [];
  const later: any[] = [];

  events.forEach((event) => {
    // Recurring events always appear in both this week and next week
    if (event.is_recurring) {
      thisWeek.push(event);
      nextWeek.push(event);
      return;
    }

    const [y, m, d] = event.date.split("-").map(Number);
    const eventDate = new Date(y, m - 1, d);

    // Don't show past events
    if (eventDate < today) return;

    if (eventDate <= endOfWeek) thisWeek.push(event);
    else if (eventDate <= endOfNextWeek) nextWeek.push(event);
    else later.push(event);
  });

  return { thisWeek, nextWeek, later };
};

interface CreatorProfile {
  name: string;
  avatar_url: string | null;
}

interface TimelineSectionProps {
  label: string;
  events: any[];
  creatorWards?: Record<string, string>;
  creatorProfiles?: Record<string, CreatorProfile>;
  communityProfiles?: Record<string, CreatorProfile>;
  onEventClick?: (eventId: string) => void;
}

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

const TimelineSection = ({ label, events, creatorWards = {}, creatorProfiles = {}, communityProfiles = {}, onEventClick }: TimelineSectionProps) => {
  const navigate = useNavigate();
  if (events.length === 0) return null;
  const grouped = groupByDate(events);

  const handleClick = (eventId: string) => {
    if (onEventClick) onEventClick(eventId);
    else navigate(`/event/${eventId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{label}</span>
        <span className="text-muted-foreground">·</span>
      </div>

      <div className="relative">
        {Object.entries(grouped).map(([dateLabel, dayEvents]) => {
          const parts = dateLabel.split(", ");
          const weekday = parts[0];
          const monthDay = parts.slice(1).join(", ");

          return (
            <div key={dateLabel} className="flex gap-4 mb-6">
              <div className="hidden md:flex flex-col items-end w-28 flex-shrink-0 pt-0.5">
                <span className="text-base font-semibold">{monthDay}</span>
                <span className="text-sm text-muted-foreground">{weekday}</span>
              </div>

              <div className="flex flex-col items-center flex-shrink-0 mt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-foreground flex-shrink-0" />
                <div className="w-px flex-1 bg-border mt-1 min-h-24" />
              </div>

              <div className="flex-1 space-y-3 pb-2">
                <div className="flex items-center gap-2 -mt-0.5 md:hidden">
                  <span className="text-base font-semibold">{monthDay}</span>
                  <span className="text-sm text-muted-foreground">{weekday}</span>
                </div>

                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleClick(event.id)}
                    className="flex items-center gap-3 bg-card rounded-2xl border cursor-pointer p-3 select-none"
                    style={{ borderWidth: '1px', borderColor: 'hsl(0deg 0% 70%)', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      {(event.start_time || event.time) && (
                        <p className="text-[14px] font-medium text-foreground">
                          {event.start_time
                            ? event.end_time
                              ? `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
                              : formatTime(event.start_time)
                            : formatTime(event.time)}
                          {getTzAbbr(event.timezone) && (
                            <span className="text-sm text-muted-foreground font-normal"> {getTzAbbr(event.timezone)}</span>
                          )}
                        </p>
                      )}
                      <h3 className="text-sm font-semibold leading-tight line-clamp-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{event.title}</h3>
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
                      {/* Show community or personal host */}
                      {(event.community_id && communityProfiles[event.community_id]) ? (
                        <div className="flex items-center gap-1.5 pt-1">
                          {communityProfiles[event.community_id].avatar_url ? (
                            <img src={communityProfiles[event.community_id].avatar_url!} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <span className="text-[10px]">👥</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Hosted by <span className="font-medium text-foreground">{communityProfiles[event.community_id].name}</span>
                          </span>
                        </div>
                      ) : creatorProfiles[event.user_id] ? (
                        <div className="flex items-center gap-1.5 pt-1">
                          {creatorProfiles[event.user_id].avatar_url ? (
                            <img src={creatorProfiles[event.user_id].avatar_url!} className="w-4 h-4 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white"
                              style={{ backgroundColor: getInitialColor(creatorProfiles[event.user_id].name), fontSize: 8, fontWeight: 700 }}>
                              {creatorProfiles[event.user_id].name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Posted by <span className="font-medium text-foreground">{creatorProfiles[event.user_id].name}</span>
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-end justify-between flex-shrink-0 self-stretch">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="w-16 h-16 md:w-24 md:h-24 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl bg-secondary" />
                      )}
                      {event.age_min && (
                        <span className="text-xs text-muted-foreground mt-1">Ages {event.age_min}{event.age_max ? `–${event.age_max}` : "+"}</span>
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

export default TimelineSection;
