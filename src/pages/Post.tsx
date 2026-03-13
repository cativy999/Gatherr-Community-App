import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, PenLine, CheckCircle2, PlusCircle } from "lucide-react";
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
  attendees?: number;
  age_min?: number;
  age_max?: number;
};

const Post = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [drafts, setDrafts] = useState<Event[]>([]);
  const [published, setPublished] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  if (!session?.user) {
    setLoading(false);
    return;
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, date, location, image_url, status, attendees, age_min, age_max")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
    } else {
      setDrafts(data.filter((e) => e.status === "draft"));
      setPublished(data.filter((e) => e.status === "published"));
    }
    setLoading(false);
  };

  fetchEvents();
}, [session]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  const EventCard = ({ event, isDraft }: { event: Event; isDraft: boolean }) => (
    <div
    onClick={() => navigate(`/create-event/${event.id}`)}
      className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="relative">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-28 object-cover" />
        ) : (
          <div className="w-full h-28 bg-secondary flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
        <div className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm ${isDraft ? "bg-background/60" : "bg-green-500/80"}`}>
          {isDraft ? <PenLine className="h-4 w-4 text-foreground" /> : <CheckCircle2 className="h-4 w-4 text-white" />}
        </div>
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{event.title}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          <span>{formatDate(event.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {event.attendees ?? 0} going
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
            {event.age_min && event.age_max ? `Ages ${event.age_min}–${event.age_max}` : "All ages"}
          </span>
        </div>
      </div>
    </div>
  );

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
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">Drafts</h2>
                  <span className="text-sm text-muted-foreground">({drafts.length})</span>
                </div>
                {drafts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No drafts yet</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {drafts.map((event) => <EventCard key={event.id} event={event} isDraft={true} />)}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">Published</h2>
                  <span className="text-sm text-muted-foreground">({published.length})</span>
                </div>
                {published.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No published events yet</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {published.map((event) => <EventCard key={event.id} event={event} isDraft={false} />)}
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