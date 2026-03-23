import { MessageCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface EventCardProps {
  event: {
    id: number;
    category: string;
    title: string;
    description: string;
    image: string;
    date: string;
    hasComment?: boolean;
    attendees?: number;
  };
}

const EventCard = ({ event }: EventCardProps) => {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);

  const handleCardClick = () => {
    navigate(`/event/${event.id}`);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-card rounded-3xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex gap-4 p-4">
        {/* Content */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              {event.category}
            </p>
            <h3 className="text-xl font-bold mt-1">{event.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{event.date}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {event.description}
          </p>
          {event.attendees && (
            <p className="text-sm font-semibold text-primary">
              {event.attendees} people going
            </p>
          )}
          <div className="flex items-center gap-2">
            {event.hasComment && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary hover:bg-accent -ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/event/${event.id}`);
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Comment
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={`ml-auto -mr-2 ${isSaved ? 'text-[rgb(172,42,42)]' : 'text-muted-foreground'}`}
              onClick={handleSaveClick}
            >
              <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="flex-shrink-0">
          <img
            src={event.image}
            alt={event.title}
            className="w-28 h-28 object-cover rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
};

export default EventCard;
