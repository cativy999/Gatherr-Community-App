import { Users, Heart, CalendarDays, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import BottomNav from "@/components/BottomNav";

const events = [
{
  id: 1,
  category: "Today",
  title: "Community Picnic",
  description: "Join us for a fun picnic in the park. Bring your favorite dish to share!",
  image: "https://images.unsplash.com/photo-1506368083636-6defb67639a7?w=400&h=300&fit=crop",
  date: "Today, 2:00 PM",
  attendees: 28,
  price: 0,
  likes: 45,
  createdAt: "2026-03-09",
  isHappeningNow: true,
  isToday: true,
  isTomorrow: false,
  isWeekend: false,
  isHoliday: false
},
{
  id: 2,
  category: "Tomorrow",
  title: "Book Club Meeting",
  description: "Discussing 'The Secret Garden' at the local library. All are welcome!",
  image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=300&fit=crop",
  date: "Tomorrow, 6:00 PM",
  attendees: 15,
  price: 0,
  likes: 22,
  createdAt: "2026-03-08",
  isHappeningNow: false,
  isToday: false,
  isTomorrow: true,
  isWeekend: false,
  isHoliday: false
},
{
  id: 3,
  category: "Next Week",
  title: "Yoga in the Park",
  description: "Relax and rejuvenate with a morning yoga session. Mats provided.",
  image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
  date: "March 15, 8:00 AM",
  attendees: 42,
  price: 0,
  likes: 67,
  createdAt: "2026-03-07",
  isHappeningNow: false,
  isToday: false,
  isTomorrow: false,
  isWeekend: true,
  isHoliday: false
},
{
  id: 4,
  category: "Today",
  title: "Neighborhood Cleanup",
  description: "Help clean up the local park and streets. Gloves and bags provided.",
  image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
  date: "Today, 10:00 AM",
  attendees: 35,
  price: 0,
  likes: 30,
  createdAt: "2026-03-09",
  isHappeningNow: true,
  isToday: true,
  isTomorrow: false,
  isWeekend: false,
  isHoliday: false
},
{
  id: 5,
  category: "Weekend",
  title: "Cooking Workshop",
  description: "Learn to cook authentic Italian pasta from a local chef.",
  image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
  date: "March 15, 3:00 PM",
  attendees: 20,
  price: 15,
  likes: 55,
  createdAt: "2026-03-06",
  isHappeningNow: false,
  isToday: false,
  isTomorrow: false,
  isWeekend: true,
  isHoliday: false
},
{
  id: 6,
  category: "Holiday",
  title: "Spring Festival",
  description: "Celebrate spring with music, food, and fun activities for the whole family.",
  image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop",
  date: "March 20, 12:00 PM",
  attendees: 120,
  price: 0,
  likes: 89,
  createdAt: "2026-03-05",
  isHappeningNow: false,
  isToday: false,
  isTomorrow: false,
  isWeekend: false,
  isHoliday: true
},
{
  id: 7,
  category: "Tomorrow",
  title: "Photography Walk",
  description: "Capture the beauty of the city with fellow photography enthusiasts.",
  image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=300&fit=crop",
  date: "Tomorrow, 9:00 AM",
  attendees: 18,
  price: 0,
  likes: 33,
  createdAt: "2026-03-08",
  isHappeningNow: false,
  isToday: false,
  isTomorrow: true,
  isWeekend: false,
  isHoliday: false
},
{
  id: 8,
  category: "Today",
  title: "Board Game Night",
  description: "Bring your favorite games or try something new. Snacks provided!",
  image: "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400&h=300&fit=crop",
  date: "Today, 7:00 PM",
  attendees: 24,
  price: 5,
  likes: 41,
  createdAt: "2026-03-09",
  isHappeningNow: false,
  isToday: true,
  isTomorrow: false,
  isWeekend: false,
  isHoliday: false
}];


type FilterChip = {
  id: string;
  label: string;
  type: "filter" | "sort";
};

const filterChips: FilterChip[] = [
{ id: "happening-now", label: "Happening Now", type: "filter" },
{ id: "today", label: "Today", type: "filter" },
{ id: "tomorrow", label: "Tomorrow", type: "filter" },
{ id: "weekend", label: "Weekend", type: "filter" },
{ id: "holiday", label: "Holiday", type: "filter" },
{ id: "popular", label: "Popular", type: "sort" },
{ id: "soonest", label: "Soonest", type: "sort" },
{ id: "newest", label: "Newest", type: "sort" },
{ id: "free", label: "Free", type: "filter" }];


const Home = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [savedEvents, setSavedEvents] = useState<Set<number>>(new Set());

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

    if (activeFilter) {
      switch (activeFilter) {
        case "happening-now":
          result = result.filter((e) => e.isHappeningNow);
          break;
        case "today":
          result = result.filter((e) => e.isToday);
          break;
        case "tomorrow":
          result = result.filter((e) => e.isTomorrow);
          break;
        case "weekend":
          result = result.filter((e) => e.isWeekend);
          break;
        case "holiday":
          result = result.filter((e) => e.isHoliday);
          break;
        case "free":
          result = result.filter((e) => e.price === 0);
          break;
        case "popular":
          result.sort((a, b) => b.likes - a.likes);
          break;
        case "soonest":
          result.sort((a, b) => a.id - b.id);
          break;
        case "newest":
          result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
      }
    }

    return result;
  }, [activeFilter]);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" strokeWidth={2.5} />
            <span className="text-2xl font-bold">Gatherr</span>
          </div>
          <button
            onClick={() => navigate("/wards")}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <Search className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-5">
          

          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {filterChips.map((chip) =>
            <button
              key={chip.id}
              onClick={() => setActiveFilter(activeFilter === chip.id ? null : chip.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === chip.id ?
              "bg-primary text-primary-foreground" :
              "bg-accent text-accent-foreground hover:bg-accent/80"}`
              }>
              
                {chip.label}
              </button>
            )}
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredEvents.map((event) =>
            <div
              key={event.id}
              onClick={() => navigate(`/event/${event.id}`)}
              className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer">
              
                {/* Image with heart overlay */}
                <div className="relative">
                  <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-28 object-cover" />
                
                  <button
                  onClick={(e) => toggleSaved(event.id, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors">
                  
                    <Heart
                    className={`h-4 w-4 ${
                    savedEvents.has(event.id) ?
                    "text-red-500 fill-current" :
                    "text-foreground"}`
                    } />
                  
                  </button>
                </div>

                {/* Card content */}
                <div className="p-3 space-y-1">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>{event.date}</span>
                  </div>
                  <p className="text-xs font-medium text-primary">
                    {event.attendees} going
                  </p>
                </div>
              </div>
            )}
          </div>

          {filteredEvents.length === 0 &&
          <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No events found</p>
              <p className="text-sm mt-1">Try a different filter</p>
            </div>
          }
        </div>
      </main>

      <BottomNav currentPage="home" />
    </div>);

};

export default Home;