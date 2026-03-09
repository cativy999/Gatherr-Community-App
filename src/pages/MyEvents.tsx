import { ArrowLeft, Heart, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const goingEvents = [
  { id: 1, title: "Community Picnic", image: "https://images.unsplash.com/photo-1506368083636-6defb67639a7?w=400&h=300&fit=crop", date: "Today, 2:00 PM", attendees: 28 },
  { id: 8, title: "Board Game Night", image: "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400&h=300&fit=crop", date: "Today, 7:00 PM", attendees: 24 },
];

const savedEvents = [
  { id: 3, title: "Yoga in the Park", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop", date: "March 15, 8:00 AM", attendees: 42 },
  { id: 5, title: "Cooking Workshop", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop", date: "March 15, 3:00 PM", attendees: 20 },
  { id: 6, title: "Spring Festival", image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop", date: "March 20, 12:00 PM", attendees: 120 },
];

const pastEvents = [
  { id: 9, title: "Movie Night", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop", date: "March 1, 7:00 PM", attendees: 30 },
  { id: 10, title: "Beach Cleanup", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop", date: "Feb 28, 9:00 AM", attendees: 55 },
];

const tabs = [
  { id: "going", label: "Going" },
  { id: "saved", label: "Saved" },
  { id: "past", label: "Past" },
];

const MyEvents = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("going");

  const eventsMap: Record<string, typeof goingEvents> = {
    going: goingEvents,
    saved: savedEvents,
    past: pastEvents,
  };

  const currentEvents = eventsMap[activeTab];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold">My Events</h1>
        </div>
      </header>

      <div className="px-5 pt-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto">
          {currentEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No events here yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {currentEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="relative">
                    <img src={event.image} alt={event.title} className="w-full h-28 object-cover" />
                    <button className="absolute top-2 right-2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm">
                      <Heart className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                  <div className="p-3 space-y-1">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{event.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      <span>{event.date}</span>
                    </div>
                    <p className="text-xs font-medium text-primary">{event.attendees} going</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav currentPage="profile" />
    </div>
  );
};

export default MyEvents;
