import { Search } from "lucide-react";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";

const events = [
  {
    id: 1,
    category: "COMMUNITY EVENT",
    title: "Local Art Fair",
    description: "Join us for a day of art, music, and food in the park. Featuring local artists and artisans.",
    image: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=300&fit=crop",
    date: "Today, 10:00 AM",
    hasComment: true,
  },
  {
    id: 2,
    category: "OUTDOOR ACTIVITY",
    title: "Hiking Adventure",
    description: "Explore the scenic trails of the nearby mountains. Moderate difficulty, suitable for all fitness levels.",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop",
    date: "March 18, 7:00 AM",
    hasComment: true,
  },
  {
    id: 3,
    category: "SOCIAL GATHERING",
    title: "Book Club Meeting",
    description: "Discuss the latest bestseller in a cozy cafe. All book lovers welcome!",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=300&fit=crop",
    date: "March 20, 6:30 PM",
    hasComment: true,
  },
  {
    id: 4,
    category: "COMMUNITY EVENT",
    title: "Farmers Market",
    description: "Fresh produce, local crafts, and live music every Saturday morning. Support your local farmers!",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=300&fit=crop",
    date: "March 16, 8:00 AM",
    hasComment: true,
  },
];

const Browse = () => {
  const [selectedFilter, setSelectedFilter] = useState("today");

  const filters = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">Browse</h1>
          <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <Search className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="sticky top-[73px] z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/80"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </main>

      <BottomNav currentPage="wards" />
    </div>
  );
};

export default Browse;
