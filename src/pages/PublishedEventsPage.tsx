import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Copy, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  image_url: string | null;
  age_min?: number;
  age_max?: number;
  user_id: string;
};

const tabs = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

const toLocal = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};

const groupByWeek = (events: Event[]) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + 7);
  const endOfNextWeek = new Date(endOfWeek); endOfNextWeek.setDate(endOfWeek.getDate() + 7);
  const thisWeek: Event[] = [], nextWeek: Event[] = [], later: Event[] = [];
  events.forEach((e) => {
    const d = toLocal(e.date);
    if (d < endOfWeek) thisWeek.push(e);
    else if (d < endOfNextWeek) nextWeek.push(e);
    else later.push(e);
  });
  return { thisWeek, nextWeek, later };
};

const formatDate = (dateStr: string) =>
  toLocal(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const PublishedEventsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    setEvents([]);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    supabase
      .from("events")
      .select("id, title, date, location, image_url, age_min, age_max, user_id")
      .eq("user_id", session.user.id)
      .eq("status", "published")
      .order("date", { ascending: activeTab === "upcoming" })
      .then(({ data, error }) => {
        if (!error && data) {
          setEvents(data.filter((e: any) =>
            activeTab === "upcoming" ? toLocal(e.date) >= today : toLocal(e.date) < today
          ));
        }
        setLoading(false);
      });
  }, [session, activeTab]);

  const deleteEvent = async (id: string) => {
    setOpenMenuId(null);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { toast.error("Failed to delete event"); return; }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success("Event deleted");
  };

  const duplicateEvent = async (id: string) => {
    setOpenMenuId(null);
    if (!session?.user) return;
    const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
    if (error || !data) { toast.error("Failed to duplicate event"); return; }
    const { id: _id, created_at: _ca, ...rest } = data;
    const { data: newEvent, error: insertError } = await supabase
      .from("events")
      .insert({ ...rest, title: `${data.title} (Copy)`, status: "published", user_id: session.user.id })
      .select("id, title, date, location, image_url, age_min, age_max, user_id")
      .single();
    if (insertError || !newEvent) { toast.error("Failed to duplicate"); return; }
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
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
                <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Duplicate
              </button>
              <button
                onClick={() => deleteEvent(event.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3
          className="font-semibold text-sm leading-tight line-clamp-2"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          {event.title}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          <span>{formatDate(event.date)}</span>
        </div>
        {event.age_min && event.age_max && (
          <p className="text-xs text-muted-foreground">Ages {event.age_min}–{event.age_max}</p>
        )}
      </div>
    </div>
  );

  const Group = ({ label, items }: { label: string; items: Event[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground">{label}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      </div>
    );
  };

  const { thisWeek, nextWeek, later } = groupByWeek(events);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-10">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 max-w-4xl mx-auto px-5 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Published Events
          </h1>
          <span className="text-sm text-muted-foreground">({events.length})</span>
        </div>

        <div className="px-5 pb-3 max-w-4xl mx-auto">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-foreground border-[#BBBBBB] hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-lg">
                {activeTab === "upcoming" ? "No upcoming events" : "No past events"}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeTab === "upcoming" ? "Events you publish will appear here." : "Your past events will show up here."}
              </p>
              {activeTab === "upcoming" && (
                <button
                  onClick={() => navigate("/create-event")}
                  className="mt-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                >
                  Create Event
                </button>
              )}
            </div>
          ) : activeTab === "upcoming" ? (
            <div className="space-y-6">
              <Group label="This Week" items={thisWeek} />
              <Group label="Next Week" items={nextWeek} />
              <Group label="Later" items={later} />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PublishedEventsPage;
