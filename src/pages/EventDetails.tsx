import { ArrowLeft, Calendar, MapPin, Heart, Share2, Copy, Loader2, CheckCircle2, ThumbsUp, Smile, User } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "interested" | null>(null);
  const [activeList, setActiveList] = useState<"going" | "maybe" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching event:", error);
      } else {
        setEvent(data);
        setLikeCount(0);

        // Fetch creator name from profiles
        if (data.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", data.user_id)
            .single();
          if (profile?.name) setCreatorName(profile.name);
        }
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id]);

  const rsvpLabels: Record<string, string> = {
    going: "You're going!",
    interested: "You're interested!",
  };

  const handleRsvp = (status: "going" | "interested") => {
    if (rsvpStatus === status) return;
    setRsvpLoading(status);
    setTimeout(() => {
      setRsvpStatus(status);
      setRsvpLoading(null);
    }, 800);
  };

  const shareOptions = [
    { icon: Copy, label: "Copy Link", action: () => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); setShareOpen(false); } },
  ];

  const handleSubmitComment = () => {
    if (comment.trim()) {
      const newComment = { id: comments.length + 1, author: "You", time: "Just now", text: comment };
      setComments([newComment, ...comments]);
      setComment("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Event not found</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className={isSaved ? 'text-red-500' : ''}
            onClick={() => { setIsSaved(!isSaved); setLikeCount((prev) => isSaved ? prev - 1 : prev + 1); }}
          >
            <Heart className={`h-6 w-6 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* RSVP Status Banner */}
          {rsvpStatus && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-3 rounded-2xl">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold">{rsvpLabels[rsvpStatus]}</span>
            </div>
          )}

          {/* Category + Age badge + Title + Meta */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {event.category}
              </p>
              {event.age_min && event.age_max && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary text-foreground">
                  Ages {event.age_min}–{event.age_max}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{likeCount} likes</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            </div>

            {/* Posted by */}
            {creatorName && (
              <div className="flex items-center gap-2 pt-1">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">
                  Posted by <span className="font-semibold text-foreground">{creatorName}</span>
                </span>
              </div>
            )}
          </div>

          {/* Event Image */}
          <div className="relative">
            {event.image_url ? (
              <img src={event.image_url} alt={event.title} className="w-full h-56 object-cover rounded-2xl" />
            ) : (
              <div className="w-full h-56 bg-secondary rounded-2xl flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
            <button
              onClick={() => setShareOpen(true)}
              className="absolute bottom-3 right-3 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors shadow-md"
            >
              <Share2 className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Share Popup */}
          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl p-0 overflow-hidden">
              <DialogHeader className="p-5 pb-3">
                <DialogTitle className="text-lg font-bold">Share Event</DialogTitle>
              </DialogHeader>
              <div className="px-5 pb-5 space-y-1">
                {shareOptions.map(({ icon: Icon, label, action }) => (
                  <button key={label} onClick={action} className="w-full flex items-center gap-3 py-3 hover:bg-accent/30 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Going / Interested */}
          <div className="flex gap-3">
            <button onClick={() => setActiveList("going")} className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-colors">
              <div className="rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D8F7BE' }}>
                <ThumbsUp className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold">0</span> Going
            </button>
            <button onClick={() => setActiveList("maybe")} className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-colors">
              <div className="rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#BFE2F5' }}>
                <Smile className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold">0</span> Interested
            </button>
          </div>

          {/* Description */}
          <p className="text-base leading-relaxed">{event.description}</p>

          {/* Comments */}
          <div className="space-y-6 pt-4">
            <h2 className="text-2xl font-bold">Comments</h2>
            <div className="space-y-3">
              <Textarea placeholder="Write a comment..." value={comment} onChange={(e) => setComment(e.target.value)} className="resize-none rounded-2xl" rows={3} />
              <Button onClick={handleSubmitComment} className="rounded-full">Post Comment</Button>
            </div>
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet. Be the first to comment!</p>
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
        <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
          <Button variant={rsvpStatus === "going" ? "default" : "outline"} size="lg" className="rounded-full" disabled={!!rsvpLoading} onClick={() => handleRsvp("going")}>
            {rsvpLoading === "going" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Going"}
          </Button>
          <Button variant={rsvpStatus === "interested" ? "default" : "outline"} size="lg" className="rounded-full" disabled={!!rsvpLoading} onClick={() => handleRsvp("interested")}>
            {rsvpLoading === "interested" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Interested"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;