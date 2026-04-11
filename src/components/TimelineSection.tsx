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
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const endOfNextWeek = new Date(endOfWeek);
  endOfNextWeek.setDate(endOfWeek.getDate() + 7);

  const thisWeek: any[] = [];
  const nextWeek: any[] = [];
  const later: any[] = [];

  events.forEach((event) => {
    const [y, m, d] = event.date.split("-").map(Number);
    const eventDate = new Date(y, m - 1, d);
    if (eventDate <= endOfWeek) thisWeek.push(event);
    else if (eventDate <= endOfNextWeek) nextWeek.push(event);
    else later.push(event);
  });

  return { thisWeek, nextWeek, later };
};

interface TimelineSectionProps {
  label: string;
  events: any[];
  creatorWards?: Record<string, string>;
}

const TimelineSection = ({ label, events, creatorWards = {} }: TimelineSectionProps) => {
  const navigate = useNavigate();
  if (events.length === 0) return null;
  const grouped = groupByDate(events);

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
                    onClick={() => navigate(`/event/${event.id}`)}
                    className="flex items-center gap-3 bg-card rounded-2xl border cursor-pointer p-3 select-none"
                    style={{ borderWidth: '1px', borderColor: 'hsl(0deg 0% 70%)', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      {event.time && (
                        <p className="text-sm font-medium text-foreground">{formatTime(event.time)}</p>
                      )}
                      <h3 className="text-sm font-semibold leading-tight line-clamp-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{event.title}</h3>
                      {creatorWards[event.user_id] && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {creatorWards[event.user_id]}
                        </span>
                      )}
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
                    </div>

                    <div className="flex flex-col items-end justify-between flex-shrink-0 self-stretch">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="w-16 h-16 md:w-24 md:h-24 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl bg-secondary" />
                      )}
                      {event.age_min && event.age_max && (
                        <span className="text-xs text-muted-foreground mt-1">Ages {event.age_min}–{event.age_max}</span>
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
