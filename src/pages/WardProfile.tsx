import { ArrowLeft, MapPin, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import TimelineSection, { groupByWeek } from "@/components/TimelineSection";

const WARD = {
  name: "Santa Monica Ward",
  address: "3400 Sawtelle Blvd, Los Angeles, CA",
  mapsUrl: "https://maps.google.com/?q=3400+Sawtelle+Blvd,+Los+Angeles,+CA",
  about: "Come worship with us. We have weekly meetings, activities, and a welcoming community.",
  sacramentTime: "Sacrament Meeting: 12:30 PM",
};

const WardProfile = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { data } = await supabase
        .from("events")
        .select("id, title, image_url, date, time, attendees, is_free, age_min, age_max, created_at, location, lat, lng, ward_type, user_id, food, duration, virtual_link")
        .eq("status", "published")
        .eq("category", "ward")
        .ilike("location", "%Santa Monica%")
        .gte("date", today)
        .order("date", { ascending: true });
      setEvents(data ?? []);
    };
    fetchEvents();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Hero */}
      <div className="relative">
        <div className="w-full h-52 bg-secondary" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        {/* Avatar */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full bg-muted border-4 border-background" />
        </div>
      </div>

      {/* Header info */}
      <div className="mt-14 px-5 flex flex-col items-center text-center space-y-1">
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          {WARD.name}
        </h1>
        <a
          href={WARD.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-primary"
        >
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          {WARD.address}
        </a>
      </div>

      {/* Action chips */}
      <div className="flex justify-center gap-2 mt-4 px-5">
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          Facebook
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          Instagram
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors">
          <Globe className="h-3.5 w-3.5" />
          Website
        </button>
      </div>

      <main className="flex-1 px-5 py-6 space-y-6 max-w-2xl mx-auto w-full">

        {/* About */}
        <div className="space-y-2">
          <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{WARD.about}</p>
        </div>

        {/* Good to Know */}
        <div className="space-y-2">
          <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Good to Know</h2>
          <div className="bg-accent/40 rounded-2xl px-4 py-3">
            <p className="text-sm font-medium">{WARD.sacramentTime}</p>
          </div>
        </div>

        {/* Events */}
        <div className="space-y-3">
          <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Events</h2>
          {events.length > 0 ? (
            <div className="space-y-8">
              {(() => {
                const { thisWeek, nextWeek, later } = groupByWeek(events);
                return (
                  <>
                    <TimelineSection label="This Week" events={thisWeek} />
                    <TimelineSection label="Next Week" events={nextWeek} />
                    <TimelineSection label="Later" events={later} />
                  </>
                );
              })()}
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

export default WardProfile;
