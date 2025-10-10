import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventCardProps {
  event: {
    id: number;
    category: string;
    title: string;
    description: string;
    image: string;
    hasComment?: boolean;
  };
}

const EventCard = ({ event }: EventCardProps) => {
  return (
    <div className="bg-card rounded-3xl overflow-hidden border border-border hover:shadow-lg transition-all">
      <div className="flex gap-4 p-4">
        {/* Content */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              {event.category}
            </p>
            <h3 className="text-xl font-bold mt-1">{event.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {event.description}
          </p>
          {event.hasComment && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary hover:bg-accent -ml-2"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Comment
            </Button>
          )}
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
