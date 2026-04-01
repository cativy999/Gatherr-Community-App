import { ArrowLeft, Calendar, MapPin, Heart, Share2, Copy, Loader2, CheckCircle2, ThumbsUp, Smile, User, Trash2, Link } from "lucide-react";
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
  const isGuest = !session;

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
  const [likeCount, setLikeCount] = useState(0);

  const [shareOpen, setShareOpen] = useState(false);
  const [goingList, setGoingList] = useState<any[]>([]);
  const [goingListOpen, setGoingListOpen] = useState(false);
  const [goingListLoading, setGoingListLoading] = useState(false);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [openEmojiPicker, setOpenEmojiPicker] = useState<string | null>(null);
  const [creatorWard, setCreatorWard] = useState<string | null>(null);

  // ── Fetch event + creator
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
        setGoingCount(data.attendees ?? 0);

        if (data.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url, ward")
            .eq("user_id", data.user_id)
            .single();
          setCreatorName(profile?.name || "Anonymous");
          if (profile?.avatar_url) setCreatorAvatar(profile.avatar_url);
          if (profile?.ward) setCreatorWard(profile.ward);
        }
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id]);

  // ── Fetch RSVP counts
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

  // ── Fetch current user's RSVP + saved status
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

  // ── Fetch like count
  useEffect(() => {
    if (!id) return;
    const fetchLikes = async () => {
      const { count } = await supabase
        .from("liked_events")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id);
      setLikeCount(count ?? 0);
    };
    fetchLikes();
  }, [id]);

  // ── Fetch comments
  useEffect(() => {
    if (!id) return;
    const fetchComments = async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);

        const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));
        const mapped = data.map((c: any) => ({
          ...c,
          author: profileMap[c.user_id]?.name || "Anonymous",
          avatar: profileMap[c.user_id]?.avatar_url || null,
        }));
        setComments(mapped);
        fetchReactions(mapped.map((c: any) => c.id));
      } else {
        setComments([]);
      }
    };
    fetchComments();
  }, [id]);

  const fetchReactions = async (commentIds: string[]) => {
    if (commentIds.length === 0) return;
    const { data } = await supabase
      .from("comment_reactions")
      .select("*")
      .in("comment_id", commentIds);

    const grouped: Record<string, any[]> = {};
    (data ?? []).forEach((r: any) => {
      if (!grouped[r.comment_id]) grouped[r.comment_id] = [];
      grouped[r.comment_id].push(r);
    });
    setReactions(grouped);
  };

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

  const handleSave = async () => {
    if (!userId) { toast.error("Please log in to like events"); return; }
    setSaveLoading(true);

    try {
      if (isSaved) {
        await supabase.from("saved_events").delete()
          .eq("event_id", id).eq("user_id", userId);
        await supabase.from("liked_events").delete()
          .eq("event_id", id).eq("user_id", userId);
        setIsSaved(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
        toast.success("Removed from saved");
      } else {
        await supabase.from("saved_events")
          .insert({ event_id: id, user_id: userId });
        await supabase.from("liked_events")
          .insert({ event_id: id, user_id: userId });
        setIsSaved(true);
        setLikeCount((prev) => prev + 1);
        toast.success("Event saved!");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    if (!userId) { toast.error("Please log in to comment"); return; }

    const { data, error } = await supabase
      .from("comments")
      .insert({ event_id: id, user_id: userId, content: comment.trim().charAt(0).toUpperCase() + comment.trim().slice(1) })
      .select("id, content, created_at, user_id")
      .single();

    if (error) { toast.error("Failed to post comment"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("user_id", userId)
      .single();

    setComments([{
      ...data,
      author: profile?.name || "Anonymous",
      avatar: profile?.avatar_url || null,
    }, ...comments]);
    setComment("");
    toast.success("Comment posted!");
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!userId) { toast.error("Please log in to react"); return; }

    const anyExisting = reactions[commentId]?.find((r) => r.user_id === userId);
    const clickedSame = anyExisting?.emoji === emoji;

    if (anyExisting) {
      await supabase.from("comment_reactions").delete().eq("id", anyExisting.id);
      setReactions((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || []).filter((r) => r.id !== anyExisting.id),
      }));
    }

    if (clickedSame) return;

    const { data } = await supabase
      .from("comment_reactions")
      .insert({ comment_id: commentId, user_id: userId, emoji })
      .select()
      .single();
    if (data) {
      setReactions((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), data],
      }));
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== userId) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) { toast.error("Failed to delete comment"); return; }
    setComments(comments.filter((c) => c.id !== commentId));
    toast.success("Comment deleted");
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

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const renderDescription = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all inline-flex items-center gap-1">
          <Link className="h-3.5 w-3.5 flex-shrink-0" />
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
        <button onClick={() => { if (window.history.length > 1) { navigate(-1); } else { navigate("/home"); } }} className="p-2 hover:bg-accent rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          {!isGuest && (
            <Button
              variant="ghost"
              size="icon"
              className={isSaved ? "text-[rgb(172,42,42)]" : ""}
              onClick={handleSave}
              disabled={saveLoading}
            >
              <Heart className={`h-6 w-6 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">


            {/* Guest banner */}
            {isGuest && (
            <div className="flex items-center justify-between bg-primary/10 px-4 py-3 rounded-2xl">
              <p className="text-sm font-medium text-primary">👋 Join to RSVP and connect with others!</p>
              <Button size="sm" className="rounded-full text-xs" onClick={() => navigate("/")}>
                Log in
              </Button>
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
                <Calendar className="h-4 w-4" />
                <span>{(() => { const [y,m,d] = event.date.split("-").map(Number); return new Date(y, m-1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); })()}</span>
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
  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}
  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 hover:opacity-90 text-white rounded-xl transition-colors shadow-md"
  style={{ backgroundColor: 'rgba(144, 144, 144, 0.5)' }}>
  <Copy className="h-3.5 w-3.5" />
  <span className="text-xs font-medium">Copy Link</span>
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

          {/* Going / Interested / Liked counts */}
          <div className="flex gap-4">
            <button
              onClick={() => { setGoingListOpen(true); fetchGoingList(); }}
              className="flex items-center gap-2 py-2 rounded-full text-sm font-semibold transition-colors"
            >
              <div className="rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D8F7BE' }}>
                <ThumbsUp className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold">{goingCount}</span> Going
            </button>
            <button
              onClick={() => {}}
              className="flex items-center gap-2 py-2 rounded-full text-sm font-semibold transition-colors"
            >
              <div className="rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#BFE2F5' }}>
                <Smile className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold">{interestedCount}</span> Interested
            </button>
            <div className="flex items-center gap-2 py-2 text-sm font-semibold">
              <div className="rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFD6D6' }}>
                <Heart className={`w-4 h-4 ${isSaved ? 'text-[rgb(172,42,42)] fill-current' : 'text-black'}`} />
              </div>
              <span className="font-bold">{likeCount}</span> Liked
            </div>
          </div>

          {/* Description */}
          <p className="text-base leading-snug whitespace-pre-wrap">{renderDescription(event.description?.replace(/\n{3,}/g, '\n\n'))}</p>

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
                {creatorWard && (
    <p className="text-xs text-muted-foreground">{creatorWard}</p>
  )}
                <p className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</p>
              </div>
            </div>
          )}

          {/* Dashed divider */}
          <div className="border-t border-dashed" style={{ borderColor: 'hsl(0deg 0% 84.3%)' }} />

          {/* ── Event Location ── */}
          {event.address && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">Event Location</h2>

              {event.lat && event.lng ? (
                /* Entire card is a link to Google Maps */
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl overflow-hidden border border-border relative"
                >
                  {/* Address pill overlay */}
                  <div className="absolute top-3 left-3 right-3 z-10 bg-white rounded-xl shadow px-3 py-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate leading-tight">
                        {event.address.split(",")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {event.address.split(",").slice(1).join(",").trim()}
                      </p>
                    </div>
                  </div>

                  {/* Map — pointer-events none so clicks go to the <a> */}
                  <iframe
                    width="100%"
                    height="220"
                    style={{ border: 0, display: "block", pointerEvents: "none" }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${event.lat},${event.lng}&z=16&output=embed`}
                  />
                </a>
              ) : (
                /* Fallback for older events without lat/lng */
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-full bg-secondary">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{event.location}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline"
                    >
                      {event.address}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="space-y-6 pt-4">
            <div className="border-t border-dashed" style={{ borderColor: 'hsl(0deg 0% 84.3%)' }} />
            <h2 className="text-lg font-bold">Comments</h2>
            {!isGuest ? (
              <div className="space-y-3">
                <Textarea placeholder="Write a comment..." value={comment} onChange={(e) => setComment(e.target.value)} className="resize-none rounded-2xl" rows={3} />
                <div className="flex gap-2">
                  {["📣", "🎉", "❤️", "😢", "😮"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setComment((prev) => prev + emoji)}
                      className="text-xl px-2 py-1 rounded-xl hover:bg-accent transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <Button onClick={handleSubmitComment} className="rounded-full">Post Comment</Button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 px-4 rounded-2xl border border-dashed border-border text-sm text-muted-foreground hover:bg-accent transition-colors text-center"
              >
                🔒 Log in to leave a comment
              </button>
            )}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.author} className="w-9 h-9 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 bg-card rounded-2xl p-3 border border-border">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold text-sm">{c.author}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
                          {c.user_id === userId && (
                            <button
                              onClick={() => handleDeleteComment(c.id, c.user_id)}
                              className="text-muted-foreground transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">{c.content}</p>

                      {/* Reactions */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {["❤️", "😢", "😮", "😂", "👍"].map((emoji) => {
                          const emojiReactions = (reactions[c.id] || []).filter((r) => r.emoji === emoji);
                          if (emojiReactions.length === 0) return null;
                          const hasReacted = emojiReactions.some((r) => r.user_id === userId);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(c.id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border ${
                                hasReacted
                                  ? "bg-primary/10 border-primary/30 font-semibold"
                                  : "bg-accent/50 border-transparent hover:bg-accent"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-muted-foreground">{emojiReactions.length}</span>
                            </button>
                          );
                        })}

                        <div className="relative">
                          <button
                            onClick={() => setOpenEmojiPicker(openEmojiPicker === c.id ? null : c.id)}
                            className="p-1 rounded-full hover:bg-accent transition-colors"
                          >
                            <Smile className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {openEmojiPicker === c.id && (
                            <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border rounded-2xl px-2 py-1.5 shadow-lg z-10">
                              {["❤️", "😢", "😮", "😂", "👍"].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => { handleReaction(c.id, emoji); setOpenEmojiPicker(null); }}
                                  className="text-lg hover:scale-125 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

     {/* Sticky RSVP Bar */}
     <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-6 py-4 z-10">
        <div className="max-w-4xl mx-auto">
          {isGuest ? (
            <Button size="lg" className="w-full rounded-full" onClick={() => navigate("/")}>
              Log in to RSVP & join the fun 🎉
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={rsvpStatus === "going" ? "default" : "outline"}
                size="lg"
                className="rounded-full"
                disabled={!!rsvpLoading}
                onClick={() => handleRsvp("going")}
              >
               {rsvpLoading === "going" ? <Loader2 className="h-4 w-4 animate-spin" /> : rsvpStatus === "going" ? "👍 You're Going!" : "Going"}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;