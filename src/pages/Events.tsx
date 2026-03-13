import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, CalendarDays, Heart } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const mockEvents = {
  going: [
    { id: "1", title: "Community Picnic", date: "Today, 2:00 PM", location: "Balboa Park", going: 28, image: "https://images.unsplash.com/photo-1506368083636-6defb67639a7?w=400&h=300&fit=crop" },
    { id: "6", title: "Spring Festival", date: "March 20, 12:00 PM", location: "Civic Center Plaza", going: 120, image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop" },
  ],
  interested: [
    { id: "3", title: "Yoga in the Park", date: "March 15, 8:00 AM", location: "Mission Bay Park", going: 42, image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop" },
    { id: "5", title: "Cooking Workshop", date: "March 15, 3:00 PM", location: "Community Kitchen", going: 20, image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop" },
  ],
  saved: [
    { id: "7", title: "Photography Walk", date: "Tomorrow, 9:00 AM", location: "Gaslamp Quarter", going: 18, image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=300&fit=crop" },
  ],
  past: [
    { id: "8", title: "Board Game Night", date: "Last Friday, 7:00 PM", location: "The Game Lounge", going: 24, image: "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400&h=300&fit=crop" },
  ],
};

const tabs = [
  { id: "going", label: "Going" },
  { id: "interested", label: "Interests" },
  { id: "saved", label: "Saved" },
  { id: "past", label: "Past" },
];

const Events = () => {
  const [activeTab, setActiveTab] = useState("going");
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const events = mockEvents[activeTab as keyof typeof mockEvents];

  const toggleSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedEvents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-3">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Events</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No events here yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="relative">
                    <img src={event.image} alt={event.title} className="w-full h-28 object-cover" />
                    <button
                      onClick={(e) => toggleSaved(event.id, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors"
                    >
                      <Heart className={`h-4 w-4 ${savedEvents.has(event.id) ? "text-red-500 fill-current" : "text-foreground"}`} />
                    </button>
                  </div>
                  <div className="p-3 space-y-1">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{event.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{event.location}</span>
                    </div>
                    <p className="text-xs text-primary font-medium">{event.going} going</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav currentPage="events" />
    </div>
  );
};

export default Events;