import { ArrowLeft, MapPin, Globe, Link, Link2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import TimelineSection, { groupByWeek } from "@/components/TimelineSection";

const GroupProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [group, setGroup] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("groups")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setGroup(data);
        setLoading(false);
      });
    const fetchEvents = async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { data } = await supabase
        .from("events")
        .select("id, title, image_url, date, time, attendees, is_free, age_min, age_max, created_at, location, lat, lng, ward_type, user_id, food, duration, virtual_link")
        .eq("status", "published")
        .gte("date", today)
        .order("date", { ascending: true });
      setEvents(data ?? []);
    };
    fetchEvents();
  }, [id]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!group) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Group not found</div>;

  const { thisWeek, nextWeek, later } = groupByWeek(events);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <div className="relative">
        <div className="w-full h-52 bg-secondary overflow-hidden">
          {group.cover_image_url && <img src={group.cover_image_url} className="w-full h-full object-cover" />}
        </div>
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full bg-muted border-4 border-background overflow-hidden flex items-center justify-center">
            {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" /> : <span className="text-2xl">👥</span>}
          </div>
        </div>
      </div>

      <div className="mt-14 px-5 flex flex-col items-center text-center space-y-1">
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{group.name}</h1>
        {group.address && (
          <a href={"https://maps.google.com/?q=" + encodeURIComponent(group.address)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {group.address}
          </a>
        )}
      </div>

      <div className="flex justify-center gap-2 mt-4 px-5 flex-wrap">
        {group.facebook_url && (
          <a href={group.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors">
            <Link className="h-3.5 w-3.5" /> Facebook
          </a>
        )}
        {group.instagram_url && (
          <a href={group.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors">
            <Link2 className="h-3.5 w-3.5" /> Instagram
          </a>
        )}
        {group.website_url && (
          <a href={group.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors">
            <Globe className="h-3.5 w-3.5" /> Website
          </a>
        )}
      </div>

      <main className="flex-1 px-5 py-6 space-y-6 max-w-2xl mx-auto w-full">
        {group.description && (
          <div className="space-y-2">
            <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{group.description}</p>
          </div>
        )}
        {group.good_to_know && (
          <div className="space-y-2">
            <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Good to Know</h2>
            <div className="bg-accent/40 rounded-2xl px-4 py-3">
              <p className="text-sm font-medium">{group.good_to_know}</p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Events</h2>
          {events.length > 0 ? (
            <div className="space-y-8">
              <TimelineSection label="This Week" events={thisWeek} />
              <TimelineSection label="Next Week" events={nextWeek} />
              <TimelineSection label="Later" events={later} />
            </div>
          ) : (
            <div className="py-6 px-4 rounded-2xl bg-accent/30 text-center">
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GroupProfile;