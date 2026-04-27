import { CalendarDays, CheckCircle2, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  image_url: string | null;
  status: string;
  category: string;
  attendees?: number;
  age_min?: number;
  age_max?: number;
};

const groupEventsByTime = (events: Event[]) => {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const endOfNextWeek = new Date(endOfWeek);
  endOfNextWeek.setDate(endOfWeek.getDate() + 7);

  const thisWeek: Event[] = [];
  const nextWeek: Event[] = [];
  const later: Event[] = [];

  events.forEach((event) => {
    const [y,m,d] = event.date.split("-").map(Number);
    const eventDate = new Date(y, m-1, d);
    if (eventDate <= endOfWeek) thisWeek.push(event);
    else if (eventDate <= endOfNextWeek) nextWeek.push(event);
    else later.push(event);
  });

  return { thisWeek, nextWeek, later };
};

const Post = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [published, setPublished] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user) { setLoading(false); return; }

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, date, location, image_url, status, category, attendees, age_min, age_max")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching events:", error);
      } else {
        setPublished(data.filter((e) => e.status === "published"));
      }
      setLoading(false);
    };

    fetchEvents();
  }, [session]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    const [y,m,d] = dateStr.split("-").map(Number);
    return new Date(y, m-1, d).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  const deleteEvent = async (eventId: string) => {
    setOpenMenuId(null);
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) { toast.error("Failed to delete event"); return; }
    setPublished((prev) => prev.filter((e) => e.id !== eventId));
    toast.success("Event deleted");
  };

  const duplicateEvent = async (eventId: string) => {
    setOpenMenuId(null);
    if (!session?.user) return;
    const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (error || !data) { toast.error("Failed to duplicate event"); return; }
    const { id, created_at, ...rest } = data;
    const { data: newEvent, error: insertError } = await supabase
      .from("events")
      .insert({ ...rest, title: `${data.title} (Copy)`, status: "published", user_id: session.user.id })
      .select("id, title, date, location, image_url, status, category, attendees, age_min, age_max")
      .single();
    if (insertError || !newEvent) { toast.error("Failed to duplicate event"); return; }
    setPublished((prev) => {
      const idx = prev.findIndex((e) => e.id === eventId);
      const next = [...prev];
      next.splice(idx + 1, 0, newEvent);
      return next;
    });
    toast.success("Event duplicated!");
  };

  const EventCard = ({ event }: { event: Event }) => (
    <div
      onClick={() => navigate(`/create-event/${event.id}`)}
      className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer flex flex-col"
    >
      <div className="relative">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-28 object-cover" />
        ) : (
          <div className="w-full h-28 bg-secondary flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
        <div className="absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-sm bg-green-500/80">
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>

        {/* More menu */}
        <div
          className="absolute top-2 right-2"
          ref={openMenuId === event.id ? menuRef : null}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === event.id ? null : event.id); }}
            className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <MoreHorizontal className="h-4 w-4 text-white" />
          </button>
          {openMenuId === event.id && (
            <div
              className="absolute right-0 top-8 bg-card border border-border rounded-xl shadow-lg z-20 min-w-[130px] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => duplicateEvent(event.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                Duplicate
              </button>
              <button
                onClick={() => deleteEvent(event.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex flex-col justify-between flex-1">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{event.title}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>{formatDate(event.date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
          <span>{event.age_min ? `Ages ${event.age_min}${event.age_max ? `–${event.age_max}` : "+"}` : "All ages"}</span>
        </div>
      </div>
    </div>
  );

  const filtered = published;
  const { thisWeek, nextWeek, later } = groupEventsByTime(filtered);
  const groups = [
    { label: "This Week", events: thisWeek },
    { label: "Next Week", events: nextWeek },
    { label: "Later", events: later },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-border px-5 py-3">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Create Event</h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/create-event")}
                className="bg-card border border-border rounded-3xl p-6 flex flex-col items-center gap-3 hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <img src="/Single event.jpg" alt="Single Event" className="w-20 h-20 object-contain" />
                <div className="text-center space-y-0.5">
                  <p className="font-bold text-sm">Single Event</p>
                  <p className="text-xs text-muted-foreground">Movie night, beach walk</p>
                </div>
              </button>

              <button
                onClick={() => toast.info("Series of events coming soon!")}
                className="bg-card border border-border rounded-3xl p-6 flex flex-col items-center gap-3 hover:shadow-lg hover:border-primary/30 transition-all opacity-70"
              >
                <img src="/series of event.jpg" alt="Series of Events" className="w-20 h-20 object-contain" />
                <div className="text-center space-y-0.5">
                  <p className="font-bold text-sm">Series of Events</p>
                  <p className="text-xs text-muted-foreground">Conference, weekly workshop</p>
                </div>
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Published</h2>
                <span className="text-sm text-muted-foreground">({published.length})</span>
              </div>

              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No published events yet</p>
              ) : (
                <div className="space-y-6">
                  {groups.map(({ label, events }) =>
                    events.length > 0 ? (
                      <div key={label} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-muted-foreground">{label}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {events.map((event) => (
                            <EventCard key={event.id} event={event} />
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

    </div>
  );
};

export default Post;
