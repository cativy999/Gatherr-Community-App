import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { CalendarDays, PenLine, CheckCircle2, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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
    const eventDate = new Date(event.date);
    if (eventDate <= endOfWeek) thisWeek.push(event);
    else if (eventDate <= endOfNextWeek) nextWeek.push(event);
    else later.push(event);
  });

  return { thisWeek, nextWeek, later };
};

const Post = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<"all" | "ward" | "community">("all");
  const [published, setPublished] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric" });
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
        <div className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm bg-green-500/80">
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="p-3 flex flex-col justify-between flex-1">
                <div className="space-y-1">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{event.title}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>{formatDate(event.date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
          <span>{event.age_min && event.age_max ? `Ages ${event.age_min}–${event.age_max}` : "All ages"}</span>
        </div>
      </div>
    </div>
  );

  const filtered = published.filter(e => categoryFilter === "all" || e.category === categoryFilter);
  const { thisWeek, nextWeek, later } = groupEventsByTime(filtered);
  const groups = [
    { label: "This Week", events: thisWeek },
    { label: "Next Week", events: nextWeek },
    { label: "Later", events: later },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-3">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Post</h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-6">

          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold rounded-2xl"
            onClick={() => navigate("/create-event")}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Event
          </Button>

          {loading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="flex gap-2">
                {(["all", "ward", "community"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCategoryFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      categoryFilter === f
                        ? "bg-primary text-white"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {f === "all" ? "All" : f === "ward" ? "Ward" : "Community"}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">Published</h2>
                  <span className="text-sm text-muted-foreground">({filtered.length})</span>
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
            </>
          )}

        </div>
      </main>

      <BottomNav currentPage="post" />
    </div>
  );
};

export default Post;