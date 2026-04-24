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
  };
  creatorWard?: string;
  isSaved?: boolean;
  onToggleSave?: (id: string, e: React.MouseEvent) => void;
}

const EventCard = ({ event, creatorWard, isSaved = false, onToggleSave }: EventCardProps) => {
  const navigate = useNavigate();
  const [attendeeAvatars, setAttendeeAvatars] = useState<string[]>([]);

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
          .select("user_id, avatar_url")
          .in("user_id", userIds);
        setAttendeeAvatars((profiles ?? []).map((p: any) => p.avatar_url).filter(Boolean));
      }
    };
    fetchAvatars();
  }, [event.id]);

  const isNew = event.created_at
    ? (Date.now() - new Date(event.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7
    : false;

  const [y, m, d] = event.date.split("-").map(Number);
  const dateLine = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = event.time
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
              {attendeeAvatars.slice(0, 3).map((avatar, i) => (
                <img
                  key={i}
                  src={avatar}
                  className="w-5 h-5 rounded-full border border-white object-cover"
                  referrerPolicy="no-referrer"
                />
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

        {/* New badge */}
        {isNew && (
          <div className="absolute top-2 right-10 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wide">
            NEW
          </div>
        )}

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
          <span className="text-foreground">{dateLine}{timePart ? `  ·  ${timePart}` : ""}</span>
          {durationPart && <span className="text-muted-foreground"> · {durationPart}</span>}
        </p>

        {creatorWard && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground font-medium">
            {creatorWard} 🏳️
          </span>
        )}
        {event.food && event.food.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            {event.food.map((f) => {
              const Icon = foodIconMap[f];
              return Icon ? <Icon key={f} className="h-4 w-4 text-muted-foreground" /> : null;
            })}
          </div>
        )}
        
      </div>
    </div>
  );
};

export default EventCard;