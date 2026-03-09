import { Heart, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import BottomNav from "@/components/BottomNav";
import LocationSelector from "@/components/LocationSelector";
import { useLocation } from "@/contexts/LocationContext";

const USER_WARD = "Arcadia Ward";

const wardActivities = [
  {
    id: 101, title: "Sunday Potluck Dinner", wardName: "Arcadia Ward",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
    time: "Today, 5:00 PM", distance: 0.3, isToday: true, isSunday: false, type: "mingle",
  },
  {
    id: 102, title: "Youth Service Project", wardName: "Arcadia Ward",
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop",
    time: "Sunday, 9:00 AM", distance: 0.3, isToday: false, isSunday: true, type: "devotional",
  },
  {
    id: 103, title: "Family Movie Night", wardName: "Pasadena 1st Ward",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
    time: "Today, 7:00 PM", distance: 2.1, isToday: true, isSunday: false, type: "mingle",
  },
  {
    id: 104, title: "Choir Practice", wardName: "Monrovia Ward",
    image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop",
    time: "Sunday, 4:00 PM", distance: 3.5, isToday: false, isSunday: true, type: "devotional",
  },
  {
    id: 105, title: "Pancake Breakfast", wardName: "Arcadia Ward",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop",
    time: "Today, 8:00 AM", distance: 0.3, isToday: true, isSunday: false, type: "mingle",
  },
  {
    id: 106, title: "Volleyball Tournament", wardName: "Duarte Ward",
    image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=300&fit=crop",
    time: "Sunday, 2:00 PM", distance: 5.2, isToday: false, isSunday: true, type: "mingle",
  },
  {
    id: 107, title: "Book of Mormon Study", wardName: "Pasadena 2nd Ward",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=300&fit=crop",
    time: "Today, 10:00 AM", distance: 2.8, isToday: true, isSunday: false, type: "devotional",
  },
  {
    id: 108, title: "Temple Trip", wardName: "Monrovia Ward",
    image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=400&h=300&fit=crop",
    time: "Sunday, 6:00 AM", distance: 3.5, isToday: false, isSunday: true, type: "devotional",
  },
];

const filterChips = [
  { id: "today", label: "Today" },
  { id: "sunday", label: "This Sunday" },
  { id: "my-ward", label: "My Ward" },
  { id: "mingle", label: "Mingle" },
  { id: "devotional", label: "Devotional" },
];

const Wards = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [savedEvents, setSavedEvents] = useState<Set<number>>(new Set());
  const { location, setLocation } = useLocation();

  const toggleSaved = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedEvents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredActivities = useMemo(() => {
    let result = [...wardActivities];
    if (activeFilter === "today") result = result.filter((a) => a.isToday);
    else if (activeFilter === "sunday") result = result.filter((a) => a.isSunday);
    else if (activeFilter === "my-ward") result = result.filter((a) => a.wardName === USER_WARD);
    result.sort((a, b) => a.distance - b.distance);
    return result;
  }, [activeFilter]);

  const getDisplayWardName = (wardName: string) =>
    wardName === USER_WARD ? `${wardName} (Your Ward)` : wardName;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Ward Activities</h1>
          <LocationSelector value={location} onChange={setLocation} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(activeFilter === chip.id ? null : chip.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === chip.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Activities Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => navigate(`/event/${activity.id}`)}
                className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="relative">
                  <img src={activity.image} alt={activity.title} className="w-full h-28 object-cover" />
                  <button
                    onClick={(e) => toggleSaved(activity.id, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors"
                  >
                    <Heart className={`h-4 w-4 ${savedEvents.has(activity.id) ? "text-red-500 fill-current" : "text-foreground"}`} />
                  </button>
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{activity.title}</h3>
                  <p className={`text-xs font-medium ${activity.wardName === USER_WARD ? "text-primary" : "text-muted-foreground"}`}>
                    {getDisplayWardName(activity.wardName)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredActivities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No activities found</p>
              <p className="text-sm mt-1">Try a different filter</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav currentPage="wards" />
    </div>
  );
};

export default Wards;
