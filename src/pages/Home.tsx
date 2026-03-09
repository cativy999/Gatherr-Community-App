import { Users, Heart, CalendarDays, Search, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import BottomNav from "@/components/BottomNav";
import LocationSelector from "@/components/LocationSelector";

const events = [
  {
    id: 1, title: "Community Picnic",
    image: "https://images.unsplash.com/photo-1506368083636-6defb67639a7?w=400&h=300&fit=crop",
    date: "Today, 2:00 PM", attendees: 28, price: 0, likes: 45, createdAt: "2026-03-09",
    isHappeningNow: true, isToday: true, isTomorrow: false, isWeekend: false, isHoliday: false,
    happeningInHours: 2,
  },
  {
    id: 2, title: "Book Club Meeting",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=300&fit=crop",
    date: "Tomorrow, 6:00 PM", attendees: 15, price: 0, likes: 22, createdAt: "2026-03-08",
    isHappeningNow: false, isToday: false, isTomorrow: true, isWeekend: false, isHoliday: false,
  },
  {
    id: 3, title: "Yoga in the Park",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
    date: "March 15, 8:00 AM", attendees: 42, price: 0, likes: 67, createdAt: "2026-03-07",
    isHappeningNow: false, isToday: false, isTomorrow: false, isWeekend: true, isHoliday: false,
  },
  {
    id: 4, title: "Neighborhood Cleanup",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
    date: "Today, 10:00 AM", attendees: 35, price: 0, likes: 30, createdAt: "2026-03-09",
    isHappeningNow: true, isToday: true, isTomorrow: false, isWeekend: false, isHoliday: false,
    happeningInHours: 1,
  },
  {
    id: 5, title: "Cooking Workshop",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
    date: "March 15, 3:00 PM", attendees: 20, price: 15, likes: 55, createdAt: "2026-03-06",
    isHappeningNow: false, isToday: false, isTomorrow: false, isWeekend: true, isHoliday: false,
  },
  {
    id: 6, title: "Spring Festival",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop",
    date: "March 20, 12:00 PM", attendees: 120, price: 0, likes: 89, createdAt: "2026-03-05",
    isHappeningNow: false, isToday: false, isTomorrow: false, isWeekend: false, isHoliday: true,
  },
  {
    id: 7, title: "Photography Walk",
    image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=300&fit=crop",
    date: "Tomorrow, 9:00 AM", attendees: 18, price: 0, likes: 33, createdAt: "2026-03-08",
    isHappeningNow: false, isToday: false, isTomorrow: true, isWeekend: false, isHoliday: false,
  },
  {
    id: 8, title: "Board Game Night",
    image: "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400&h=300&fit=crop",
    date: "Today, 7:00 PM", attendees: 24, price: 5, likes: 41, createdAt: "2026-03-09",
    isHappeningNow: false, isToday: true, isTomorrow: false, isWeekend: false, isHoliday: false,
  },
];

const timeFilters = [
  { id: "happening-now", label: "Happening Now" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "This Weekend" },
  { id: "holiday", label: "Holiday" },
];

const sortOptions = [
  { id: "popular", label: "Popular" },
  { id: "latest", label: "Latest" },
];

const Home = () => {
  const navigate = useNavigate();
  const [activeTimeFilter, setActiveTimeFilter] = useState<string | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState("popular");
  const [sortOpen, setSortOpen] = useState(false);
  const [savedEvents, setSavedEvents] = useState<Set<number>>(new Set());
  const [location, setLocation] = useState("San Diego, CA");

  const toggleSaved = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedEvents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Time filter
    if (activeTimeFilter) {
      switch (activeTimeFilter) {
        case "happening-now": result = result.filter((e) => e.isHappeningNow); break;
        case "today": result = result.filter((e) => e.isToday); break;
        case "tomorrow": result = result.filter((e) => e.isTomorrow); break;
        case "weekend": result = result.filter((e) => e.isWeekend); break;
        case "holiday": result = result.filter((e) => e.isHoliday); break;
      }
    }

    // Free filter (combinable)
    if (freeOnly) {
      result = result.filter((e) => e.price === 0);
    }

    // Sort
    if (sortBy === "popular") {
      result.sort((a, b) => b.likes - a.likes);
    } else if (sortBy === "latest") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [activeTimeFilter, freeOnly, sortBy]);

  const currentSort = sortOptions.find((s) => s.id === sortBy);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5">
            <Users className="h-7 w-7 text-primary" strokeWidth={2.5} />
            <span className="text-xl font-bold tracking-tight">Gatherr</span>
          </div>
          <div className="flex items-center gap-2">
            <LocationSelector value={location} onChange={setLocation} />
            <button
              onClick={() => navigate("/browse")}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Filter Chips Row */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {timeFilters.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveTimeFilter(activeTimeFilter === chip.id ? null : chip.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTimeFilter === chip.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                }`}
              >
                {chip.label}
              </button>
            ))}
            <button
              onClick={() => setFreeOnly(!freeOnly)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                freeOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/80"
              }`}
            >
              Free
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex justify-end relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sort: {currentSort?.label}
              <ChevronDown className={`h-4 w-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            {sortOpen && (
              <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden min-w-[140px]">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors ${
                      sortBy === opt.id ? "text-primary font-semibold" : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredEvents.map((event) => (
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
                  {event.isHappeningNow && event.happeningInHours && (
                    <p className="text-xs font-semibold text-orange-500">
                      🔥 In {event.happeningInHours} {event.happeningInHours === 1 ? 'hour' : 'hours'}
                    </p>
                  )}
                  <p className="text-xs font-medium text-primary">{event.attendees} going</p>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No events found</p>
              <p className="text-sm mt-1">Try a different filter</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav currentPage="home" />
    </div>
  );
};

export default Home;
