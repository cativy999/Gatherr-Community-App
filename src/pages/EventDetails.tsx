import { ArrowLeft, Calendar, MapPin, Users, Heart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

// Mock data - in a real app, this would come from an API or database
const eventData: Record<string, any> = {
  "1": {
    id: 1,
    category: "COMMUNITY EVENT",
    title: "Local Art Fair",
    description: "Join us for a day of art, music, and food in the park. Featuring local artists and artisans.",
    image: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&h=600&fit=crop",
    date: "Today, 10:00 AM",
    location: "Central Park",
    attendees: 45,
    likes: 128,
    comments: [
      { id: 1, author: "Sarah Johnson", time: "2 hours ago", text: "Can't wait! This is going to be amazing!" },
      { id: 2, author: "Mike Chen", time: "4 hours ago", text: "Will there be food vendors?" },
    ],
  },
  "2": {
    id: 2,
    category: "OUTDOOR ACTIVITY",
    title: "Hiking Adventure",
    description: "Explore the scenic trails of the nearby mountains. Moderate difficulty, suitable for all fitness levels.",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop",
    date: "March 18, 7:00 AM",
    location: "Mountain Trail Head",
    attendees: 12,
    likes: 34,
    comments: [],
  },
};

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = eventData[id || "1"];
  const [comment, setComment] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(event?.likes || 0);
  const [comments, setComments] = useState(event?.comments || []);
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "maybe" | "not-going" | null>(null);

  if (!event) {
    return <div>Event not found</div>;
  }

  const handleSubmitComment = () => {
    if (comment.trim()) {
      const newComment = {
        id: comments.length + 1,
        author: "You",
        time: "Just now",
        text: comment,
      };
      setComments([newComment, ...comments]);
      setComment("");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className={`${isSaved ? 'text-red-500' : ''}`}
            onClick={() => setIsSaved(!isSaved)}
          >
            <Heart className={`h-6 w-6 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Event Image */}
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-64 object-cover rounded-3xl"
          />

          {/* Event Info */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              {event.category}
            </p>
            <h1 className="text-4xl font-bold">{event.title}</h1>
            
            <div className="flex flex-col gap-3 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>{event.attendees} attendees</span>
              </div>
            </div>

            <p className="text-lg leading-relaxed pt-4">{event.description}</p>
          </div>

          {/* Comments Section */}
          <div className="space-y-6 pt-4">
            <h2 className="text-2xl font-bold">Comments</h2>

            {/* Write Comment */}
            <div className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none rounded-2xl"
                rows={3}
              />
              <Button onClick={handleSubmitComment} className="rounded-full">
                Post Comment
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-card rounded-2xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{c.author}</p>
                      <p className="text-sm text-muted-foreground">{c.time}</p>
                    </div>
                    <p className="text-muted-foreground">{c.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky RSVP Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-6 py-4 z-10">
        <div className="grid grid-cols-3 gap-3 max-w-4xl mx-auto">
          <Button
            variant={rsvpStatus === "going" ? "default" : "outline"}
            size="lg"
            className="rounded-full"
            onClick={() => setRsvpStatus(rsvpStatus === "going" ? null : "going")}
          >
            Going
          </Button>
          <Button
            variant={rsvpStatus === "maybe" ? "default" : "outline"}
            size="lg"
            className="rounded-full"
            onClick={() => setRsvpStatus(rsvpStatus === "maybe" ? null : "maybe")}
          >
            Maybe
          </Button>
          <Button
            variant={rsvpStatus === "not-going" ? "default" : "outline"}
            size="lg"
            className="rounded-full"
            onClick={() => setRsvpStatus(rsvpStatus === "not-going" ? null : "not-going")}
          >
            Not Going
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
