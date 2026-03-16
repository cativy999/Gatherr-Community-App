import { ArrowLeft, Calendar, MapPin, Heart, Share2, Copy, Loader2, CheckCircle2, ThumbsUp, Smile, User } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [event, setEvent] = useState<any>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [creatorAvatar, setCreatorAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);

  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [rsvpStatus, setRsvpStatus] = useState<"going" | "interested" | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  const [goingCount, setGoingCount] = useState(0);
  const [interestedCount, setInterestedCount] = useState(0);

  const [shareOpen, setShareOpen] = useState(false);
  const [goingList, setGoingList] = useState<any[]>([]);
  const [goingListOpen, setGoingListOpen] = useState(false);
  const [goingListLoading, setGoingListLoading] = useState(false);

  // ── Fetch event + creator ──────────────────────────────────────────────────
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

        if (data.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", data.user_id)
            .single();
          setCreatorName(profile?.name || "Anonymous");
          if (profile?.avatar_url) setCreatorAvatar(profile.avatar_url);
        }
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id]);

  // ── Fetch RSVP counts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchCounts = async () => {
      const { count: gCount } = await supabase
        .from("rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "going");

      const { count: iCount } = await supabase
        .from("rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "interested");

      setGoingCount(gCount ?? 0);
      setInterestedCount(iCount ?? 0);
    };
    fetchCounts();
  }, [id]);

  // ── Fetch current user's RSVP + saved status ──────────────────────────────
  useEffect(() => {
    if (!id || !userId) return;

    const fetchUserStatus = async () => {
      const { data: rsvp } = await supabase
        .from("rsvps")
        .select("status")
        .eq("event_id", id)
        .eq("user_id", userId)
        .single();
      if (rsvp) setRsvpStatus(rsvp.status as "going" | "interested");

      const { data: saved } = await supabase
        .from("saved_events")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", userId)
        .single();
      if (saved) setIsSaved(true);
    };

    fetchUserStatus();
  }, [id, userId]);

  // ── Fetch going list ───────────────────────────────────────────────────────
  const fetchGoingList = async () => {
    setGoingListLoading(true);
    const { data } = await supabase
      .from("rsvps")
      .select("user_id")
      .eq("event_id", id)
      .eq("status", "going");

    if (data && data.length > 0) {
      const userIds = data.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      setGoingList(profiles ?? []);
    } else {
      setGoingList([]);
    }
    setGoingListLoading(false);
  };

  // ── Sync going count ───────────────────────────────────────────────────────
  const syncGoingCount = async () => {
    const { count } = await supabase
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "going");

    await supabase
      .from("events")
      .update({ attendees: count ?? 0 })
      .eq("id", id);
  };

  // ── Handle RSVP ───────────────────────────────────────────────────────────
  const handleRsvp = async (status: "going" | "interested") => {
    if (!userId) { toast.error("Please log in to RSVP"); return; }
    setRsvpLoading(status);

    try {
      if (rsvpStatus === status) {
        await supabase.from("rsvps").delete()
          .eq("event_id", id).eq("user_id", userId);
        setRsvpStatus(null);
        if (status === "going") setGoingCount(c => Math.max(0, c - 1));
        else setInterestedCount(c => Math.max(0, c - 1));
        toast.success("RSVP removed");
      } else {
        await supabase.from("rsvps").upsert(
          { event_id: id, user_id: userId, status },
          { onConflict: "user_id,event_id" }
        );
        if (rsvpStatus === "going") setGoingCount(c => Math.max(0, c - 1));
        if (rsvpStatus === "interested") setInterestedCount(c => Math.max(0, c - 1));
        if (status === "going") setGoingCount(c => c + 1);
        else setInterestedCount(c => c + 1);

        setRsvpStatus(status);
        toast.success(status === "going" ? "You're going!" : "Marked as interested!");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      await syncGoingCount();
      setRsvpLoading(null);
    }
  };

  // ── Handle Save (heart) ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!userId) { toast.error("Please log in to save events"); return; }
    setSaveLoading(true);

    try {
      if (isSaved) {
        await supabase.from("saved_events").delete()
          .eq("event_id", id).eq("user_id", userId);
        setIsSaved(false);
        toast.success("Removed from saved");
      } else {
        await supabase.from("saved_events")
          .insert({ event_id: id, user_id: userId });
        setIsSaved(true);
        toast.success("Event saved!");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmitComment = () => {
    if (comment.trim()) {
      const newComment = { id: comments.length + 1, author: "You", time: "Just now", text: comment };
      setComments([newComment, ...comments]);
      setComment("");
    }
  };

  const shareOptions = [
    {
      icon: Copy, label: "Copy Link",
      action: () => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); setShareOpen(false); }
    },
  ];

  const rsvpLabels: Record<string, string> = {
    going: "You're going!",
    interested: "You're interested!",
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
            className={isSaved ? "text-red-500" : ""}
            onClick={handleSave}
            disabled={saveLoading}
          >
            <Heart className={`h-6 w-6 ${isSaved ? "fill-current" : ""}`} />
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

          {/* Category + Age + Title + Meta */}
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
                <span>0 likes</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  {event.time ? ` · ${new Date(`2000-01-01T${event.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            </div>

         
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

          {/* Share Dialog */}
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

          {/* Going List Dialog */}
          <Dialog open={goingListOpen} onOpenChange={setGoingListOpen}>
            <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl p-0 overflow-hidden">
              <DialogHeader className="p-5 pb-3">
                <DialogTitle className="text-lg font-bold">{goingCount} Going</DialogTitle>
              </DialogHeader>
              <div className="px-5 pb-5 space-y-3 max-h-80 overflow-y-auto">
                {goingListLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : goingList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No one yet — be the first!</p>
                ) : (
                  goingList.map((person) => (
                    <div key={person.user_id} className="flex items-center gap-3">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt={person.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <span className="text-sm font-medium">{person.name || "Anonymous"}</span>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Going / Interested counts */}
          <div className="flex gap-3">
            <button
              onClick={() => { setGoingListOpen(true); fetchGoingList(); }}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-colors"
            >
              <div className="rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D8F7BE' }}>
                <ThumbsUp className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold">{goingCount}</span> Going
            </button>
            <button
              onClick={() => {}}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-colors"
            >
              <div className="rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#BFE2F5' }}>
                <Smile className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold">{interestedCount}</span> Interested
            </button>
          </div>

        {/* Description */}
        <p className="text-base leading-relaxed">{event.description}</p>

{/* Posted by */}
{creatorName && (
  <div className="flex items-center gap-2 pt-1">
    {creatorAvatar ? (
      <img src={creatorAvatar} alt={creatorName ?? ""} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-4 w-4 text-primary" />
      </div>
    )}
    <div>
      <span className="text-sm text-muted-foreground">
        Posted by <span className="font-semibold text-foreground">{creatorName}</span>
      </span>
      <p className="text-xs text-muted-foreground">
        {new Date(event.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>
    </div>
  </div>
)}

{/* Dashed divider */}
<div className="border-t border-dashed" style={{ borderColor: 'hsl(0deg 0% 84.3%)' }}/>

{/* Event Location */}
{event.address && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">Event Location</h2>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-full bg-secondary">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{event.location}</p>
                  <p className="text-sm text-muted-foreground">{event.address}</p>
                </div>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-6 pt-4">
          <div className="border-t border-dashed" style={{ borderColor: 'hsl(0deg 0% 84.3%)' }} />
          <h2 className="text-lg font-bold" >Comments</h2>
            <div className="space-y-3">
              <Textarea placeholder="Write a comment..." value={comment} onChange={(e) => setComment(e.target.value)} className="resize-none rounded-2xl" rows={3} />
              <Button onClick={handleSubmitComment} className="rounded-full">Post Comment</Button>
            </div>
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet. Be the first!</p>
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
          <Button
            variant={rsvpStatus === "going" ? "default" : "outline"}
            size="lg"
            className="rounded-full"
            disabled={!!rsvpLoading}
            onClick={() => handleRsvp("going")}
          >
            {rsvpLoading === "going" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Going"}
          </Button>
          <Button
            variant={rsvpStatus === "interested" ? "default" : "outline"}
            size="lg"
            className="rounded-full"
            disabled={!!rsvpLoading}
            onClick={() => handleRsvp("interested")}
          >
            {rsvpLoading === "interested" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Interested"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
