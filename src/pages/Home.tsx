import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";

const events = [
  {
    id: 1,
    category: "Today",
    title: "Community Picnic",
    description: "Join us for a fun picnic in the park. Bring your favorite dish to share!",
    image: "https://images.unsplash.com/photo-1506368083636-6defb67639a7?w=400&h=300&fit=crop",
  },
  {
    id: 2,
    category: "Tomorrow",
    title: "Book Club Meeting",
    description: "Discussing 'The Secret Garden' at the local library. All are welcome!",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=300&fit=crop",
  },
  {
    id: 3,
    category: "Next Week",
    title: "Yoga in the Park",
    description: "Relax and rejuvenate with a morning yoga session. Mats provided.",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
  },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" strokeWidth={2.5} />
            <span className="text-2xl font-bold">Gather</span>
          </div>
          <Button
            variant="default"
            size="lg"
            className="rounded-full px-6"
            onClick={() => navigate("/")}
          >
            Log In
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold">Happening Now</h1>

          {/* Events List */}
          <div className="space-y-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </main>

      <BottomNav currentPage="home" />
    </div>
  );
};

export default Home;
