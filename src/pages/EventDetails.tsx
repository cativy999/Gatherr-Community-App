import { ArrowLeft, MapPin, Heart, Copy, Loader2, ThumbsUp, Smile, User, Trash2, Link, Video, Clock, Navigation, CalendarPlus, Expand } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [showTitleInHeader, setShowTitleInHeader] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [goingList, setGoingList] = useState<any[]>([]);
  const [goingListOpen, setGoingListOpen] = useState(false);
  const [goingListLoading, setGoingListLoading] = useState(false);
  const [previewAvatars, setPreviewAvatars] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [openEmojiPicker, setOpenEmojiPicker] = useState<string | null>(null);
  const [creatorWard, setCreatorWard] = useState<string | null>(null);
  const [linksExpanded, setLinksExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

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

      // Fetch up to 8 avatars for preview
      const { data: rsvpRows } = await supabase
        .from("rsvps")
        .select("user_id")
        .eq("event_id", id)
        .eq("status", "going")
        .limit(8);
      if (rsvpRows && rsvpRows.length > 0) {
        const uids = rsvpRows.map((r: any) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("avatar_url")
          .in("user_id", uids);
        setPreviewAvatars((profiles ?? []).map((p: any) => p.avatar_url).filter(Boolean));
      }
    };
    fetchCounts();
  }, [id]);

  useEffect(() => {
    if (!id || !userId) return;
    const fetchUserStatus = async () => {
      const { data: rsvp } = await supabase
      .from("rsvps")
      .select("status")
      .eq("event_id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (rsvp) setRsvpStatus(rsvp.status as "going" | "interested");
    
    const { data: saved } = await supabase
      .from("saved_events")
      .select("id")
      .eq("event_id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (saved) setIsSaved(true);
    };
    fetchUserStatus();
  }, [id, userId]);

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
    await supabase.from("events").update({ attendees: count ?? 0 }).eq("id", id);
  };

  const handleRsvp = async (status: "going" | "interested") => {
    if (!userId) { toast.error("Please log in to RSVP"); return; }
    setRsvpLoading(status);
    try {
      if (rsvpStatus === status) {
        await supabase.from("rsvps").delete().eq("event_id", id).eq("user_id", userId);
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
        await supabase.from("saved_events").delete().eq("event_id", id).eq("user_id", userId);
        await supabase.from("liked_events").delete().eq("event_id", id).eq("user_id", userId);
        setIsSaved(false);
        setLikeCount(prev => Math.max(0, prev - 1));
        toast.success("Removed from saved");
      } else {
        await supabase.from("saved_events").insert({ event_id: id, user_id: userId });
        await supabase.from("liked_events").insert({ event_id: id, user_id: userId });
        setIsSaved(true);
        setLikeCount(prev => prev + 1);
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
    const anyExisting = reactions[commentId]?.find(r => r.user_id === userId);
    const clickedSame = anyExisting?.emoji === emoji;
    if (anyExisting) {
      await supabase.from("comment_reactions").delete().eq("id", anyExisting.id);
      setReactions(prev => ({
        ...prev,
        [commentId]: (prev[commentId] || []).filter(r => r.id !== anyExisting.id),
      }));
    }
    if (clickedSame) return;
    const { data } = await supabase
      .from("comment_reactions")
      .insert({ comment_id: commentId, user_id: userId, emoji })
      .select()
      .single();
    if (data) {
      setReactions(prev => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), data],
      }));
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== userId) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) { toast.error("Failed to delete comment"); return; }
    setComments(comments.filter(c => c.id !== commentId));
    toast.success("Comment deleted");
  };

  const handleAddToCalendar = (type: "google" | "ics") => {
    const [y, m, d] = event.date.split("-").map(Number);
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (dt: Date) => `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;

    let start: Date;
    let end: Date;

    if (event.start_time) {
      // New events: start_time and end_time are in 24hr "HH:MM" format
      const [sh, sm] = event.start_time.split(":").map(Number);
      start = new Date(y, m - 1, d, sh, sm);
      if (event.end_date && event.end_time) {
        // Multi-day: end date + end time
        const [ey, em2, ed] = event.end_date.split("-").map(Number);
        const [eh, emin] = event.end_time.split(":").map(Number);
        end = new Date(ey, em2 - 1, ed, eh, emin);
      } else if (event.end_date) {
        // Multi-day, no end time: end at midnight of end date
        const [ey, em2, ed] = event.end_date.split("-").map(Number);
        end = new Date(ey, em2 - 1, ed, 23, 59);
      } else if (event.end_time) {
        const [eh, em2] = event.end_time.split(":").map(Number);
        end = new Date(y, m - 1, d, eh, em2);
      } else {
        end = new Date(start.getTime() + 60 * 60000);
      }
    } else if (event.time) {
      // Legacy events: time is "7:30 PM" format + duration
      const [timePart, period] = event.time.split(" ");
      let [hours, minutes] = timePart.split(":").map(Number);
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      start = new Date(y, m - 1, d, hours, minutes || 0);
      const parseDuration = (dur: string) => {
        if (!dur || dur === "Full day") return 480;
        if (dur === "Half day") return 240;
        return parseFloat(dur) * 60;
      };
      end = new Date(start.getTime() + parseDuration(event.duration) * 60000);
    } else {
      // No time info at all
      start = new Date(y, m - 1, d, 12, 0);
      end = new Date(y, m - 1, d, 13, 0);
    }

    if (type === "google") {
      const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${fmt(start)}/${fmt(end)}`, details: event.description ?? "", location: event.address ?? "" });
      window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank");
    } else {
      const ics = ["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT",`SUMMARY:${event.title}`,`DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,`LOCATION:${event.address ?? ""}`, "END:VEVENT","END:VCALENDAR"].join("\r\n");
      const blob = new Blob([ics], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${event.title}.ics`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const shareOptions = [
    {
      icon: Copy, label: "Copy Link",
      action: () => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); setShareOpen(false); }
    },
  ];

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowTitleInHeader(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

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
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const truncateUrl = (url: string) => {
    try {
      const u = new URL(url);
      const display = u.hostname.replace(/^www\./, "") + u.pathname + u.search;
      return display.length > 45 ? display.slice(0, 45) + "…" : display;
    } catch {
      return url.length > 45 ? url.slice(0, 45) + "…" : url;
    }
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

  const eventDate = (() => {
    const [y, m, d] = event.date.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-3">
          <button onClick={() => { if (window.history.length > 1) { navigate(-1); } else { navigate("/wards"); } }} className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0">
            <ArrowLeft className="h-6 w-6" />
          </button>
          {showTitleInHeader && (
            <span className="font-semibold truncate flex-1 text-center" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '17px' }}>
              {event.title}
            </span>
          )}
          {!isGuest && (
            <Button variant="ghost" size="icon" className={`flex-shrink-0 ${isSaved ? "text-[rgb(172,42,42)]" : ""}`} onClick={handleSave} disabled={saveLoading}>
              <Heart className={`h-6 w-6 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto">
        <div className="md:grid md:grid-cols-[1fr,420px] md:gap-16 md:items-start">

        {/* LEFT COLUMN */}
        <div className="space-y-6">


          {/* Event Image — mobile only */}
          <div className="relative md:hidden">
            {event.image_url ? (
              <img src={event.image_url} alt={event.title} className="w-full h-56 object-cover rounded-2xl" />
            ) : (
              <div className="w-full h-56 bg-secondary rounded-2xl flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
            {/* Expand icon */}
            {event.image_url && (
              <button
                onClick={() => setImageExpanded(true)}
                className="absolute top-3 left-3 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
              >
                <Expand className="h-4 w-4 text-gray-700" />
              </button>
            )}
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-2 bg-white text-gray-800 rounded-full shadow-md hover:bg-gray-50 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Copy & Share</span>
            </button>
          </div>

          {/* Lightbox overlay */}
          {imageExpanded && event.image_url && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setImageExpanded(false)}
            >
              <img
                src={event.image_url}
                alt={event.title}
                className="max-w-full max-h-full rounded-2xl object-contain"
              />
              <button
                className="absolute top-5 right-5 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                onClick={() => setImageExpanded(false)}
              >
                <span className="text-white text-lg leading-none">✕</span>
              </button>
            </div>
          )}

          {/* Category + Age + Title */}
          <div className="space-y-2">
            <h1 ref={titleRef} className="font-bold md:text-[36px] text-[28px]" style={{ fontFamily: "'Hanken Grotesk', sans-serif", lineHeight: '1.2' }}>{event.title}</h1>
            {(event.age_min || event.age_max) && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary text-foreground w-fit">
                {event.age_min && event.age_max
                  ? `Ages ${event.age_min}–${event.age_max}`
                  : event.age_min
                  ? `Ages ${event.age_min}+`
                  : `Ages up to ${event.age_max}`}
              </span>
            )}
          </div>

          {/* Date + Location card */}
          <div className="rounded-2xl overflow-hidden">

            {/* Date row */}
            <div className="relative flex items-center gap-4 py-3 border-b" style={{ borderColor: 'hsl(0deg 0% 90%)' }}>
              <div className="flex flex-col rounded-xl w-12 h-12 flex-shrink-0 overflow-hidden" style={{ border: '1px solid #D9D9D9' }}>
                <div className="w-full flex items-center justify-center flex-1" style={{ backgroundColor: 'rgb(191, 33, 33)' }}>
                  <span className="text-[9px] font-bold uppercase text-white tracking-widest leading-none" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    {eventDate.toLocaleDateString("en-US", { month: "short" })}
                  </span>
                </div>
                <div className="w-full bg-background flex items-center justify-center flex-[1.4]">
                  <span className="text-lg font-bold leading-none text-foreground" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    {eventDate.getDate()}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  {event.end_date
                    ? (() => {
                        const [ey, em, ed] = event.end_date.split("-").map(Number);
                        const endDateObj = new Date(ey, em - 1, ed);
                        return `${eventDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${endDateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
                      })()
                    : eventDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
                {(event.start_time || event.time) && (
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium">
                      {event.start_time
                        ? event.end_time
                          ? `${new Date(`2000-01-01T${event.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()} – ${new Date(`2000-01-01T${event.end_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()}`
                          : new Date(`2000-01-01T${event.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
                        : `${event.time}${event.duration ? ` · ${event.duration}` : ""}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Add to Calendar button */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setCalendarOpen(!calendarOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary hover:bg-accent transition-colors"
                >
                  <CalendarPlus className="h-5 w-5 text-foreground" />
                </button>

                {/* Calendar picker popup */}
                {calendarOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setCalendarOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-30 w-44">
                      <button
                        onClick={() => { handleAddToCalendar("google"); setCalendarOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors border-b border-gray-100"
                      >
                        <CalendarPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                        Google
                      </button>
                      <button
                        onClick={() => { handleAddToCalendar("ics"); setCalendarOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        <CalendarPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                        Apple / Outlook
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Location row — virtual OR in-person, never both */}
            {event.virtual_link ? (
              <a
                href={event.virtual_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 py-3 hover:bg-accent transition-colors" 
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0" style={{ border: '1px solid #D9D9D9' }}>
                  <Video className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Virtual Event</p>
                  <p className="text-xs text-primary underline truncate max-w-[220px]">{event.virtual_link}</p>
                </div>
              </a>
            ) : event.address ? (
              <div
                className="flex items-center gap-4 py-3"
                onContextMenu={(e) => { e.preventDefault(); navigator.clipboard.writeText(event.address); toast.success("Address copied!"); }}
                onTouchStart={(e) => {
                  const t = setTimeout(() => { navigator.clipboard.writeText(event.address); toast.success("Address copied!"); }, 600);
                  const cancel = () => clearTimeout(t);
                  e.currentTarget.addEventListener("touchend", cancel, { once: true });
                  e.currentTarget.addEventListener("touchmove", cancel, { once: true });
                }}
              >
                {event.lat && event.lng ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <iframe width="48" height="48" style={{ border: 0, display: "block", pointerEvents: "none" }} loading="lazy"
                      src={`https://maps.google.com/maps?q=${event.lat},${event.lng}&z=15&output=embed`} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{event.address}</p>
                </div>
                <div className="relative flex-shrink-0">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary hover:bg-accent transition-colors"
                  >
                    <Navigation className="h-5 w-5 text-foreground" />
                  </a>
                </div>
              </div>
            ) : null}

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
                  goingList.map(person => (
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


          {/* About */}
          <div className="space-y-3">
            <h2 className="text-md font-bold font-display">About</h2>
            <p className={`text-base leading-snug whitespace-pre-wrap ${!descExpanded ? "line-clamp-4" : ""}`}>
              {renderDescription(event.description?.replace(/\n{3,}/g, '\n\n'))}
            </p>
            {event.description?.length > 200 && (
              <button onClick={() => setDescExpanded(e => !e)} className="text-sm font-medium text-primary">
                {descExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          {/* Social Links */}
          {event.social_links?.filter(Boolean).length > 0 && (() => {
            const links = event.social_links.filter(Boolean);
            const getPlatform = (url: string) => {
              if (/facebook\.com/i.test(url)) return "facebook";
              if (/instagram\.com/i.test(url)) return "instagram";
              return "link";
            };
            return (
              <div className="space-y-3">
                <h2 className="text-md font-bold font-display">Links</h2>
                <div className="space-y-2">
                  {links.map((link: string, i: number) => {
                    const platform = getPlatform(link);
                    return (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 border border-[#e7e7e7] rounded-xl hover:bg-accent transition-colors md:max-w-[360px]"
                      >
                        {platform === "facebook" && (
                          <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                          </svg>
                        )}
                        {platform === "instagram" && (
                          <img src="/icons/instagram.png" alt="Instagram" className="h-5 w-5 flex-shrink-0 object-contain" />
                        )}
                        {platform === "link" && (
                          <Link className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-sm text-[#323232] truncate">{link}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Attendees — mobile only, left-aligned */}
          <div className="md:hidden">
            <button
              onClick={() => { setGoingListOpen(true); fetchGoingList(); }}
              className="flex flex-col gap-2 text-left"
            >
              <p className="text-sm font-semibold text-muted-foreground">
                <span className="text-foreground font-bold">{goingCount}</span> Going · <span className="text-foreground font-bold">{likeCount}</span> Liked · <span className="text-foreground font-bold">{interestedCount}</span> Interested
              </p>
              {previewAvatars.length > 0 && (
                <div className="flex">
                  {previewAvatars.slice(0, 8).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border-2 border-white"
                      style={{ marginLeft: i === 0 ? 0 : -10 }}
                    />
                  ))}
                </div>
              )}
            </button>
          </div>

          {/* Host */}
          {creatorName && (
            <div className="space-y-3">
              <h2 className="text-md font-bold font-display">Host</h2>
              <div className="flex items-center gap-2">
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
                  {creatorWard && <p className="text-xs text-muted-foreground">{creatorWard}</p>}
                  <p className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-6 pt-4">
            <div className="border-t border-dashed" style={{ borderColor: 'hsl(0deg 0% 84.3%)' }} />
            <h2 className="text-md font-bold font-display">Comments</h2>
            {!isGuest ? (
              <div className="space-y-3">
                <Textarea placeholder="Write a comment..." value={comment} onChange={e => setComment(e.target.value)} className="resize-none rounded-2xl" rows={3} />
                <div className="flex gap-2">
                  {["📣", "🎉", "❤️", "😢", "😮"].map(emoji => (
                    <button key={emoji} type="button" onClick={() => setComment(prev => prev + emoji)} className="text-xl px-2 py-1 rounded-xl hover:bg-accent transition-colors">
                      {emoji}
                    </button>
                  ))}
                </div>
                <Button onClick={handleSubmitComment} className="rounded-full">Post Comment</Button>
              </div>
            ) : (
              <button onClick={() => navigate("/")} className="w-full py-3 px-4 rounded-2xl border border-dashed border-border text-sm text-muted-foreground hover:bg-accent transition-colors text-center">
                🔒 Log in to leave a comment
              </button>
            )}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map(c => (
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
                            <button onClick={() => handleDeleteComment(c.id, c.user_id)} className="text-muted-foreground transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">{c.content}</p>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {["❤️", "😢", "😮", "😂", "👍"].map(emoji => {
                          const emojiReactions = (reactions[c.id] || []).filter(r => r.emoji === emoji);
                          if (emojiReactions.length === 0) return null;
                          const hasReacted = emojiReactions.some(r => r.user_id === userId);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(c.id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border ${hasReacted ? "bg-primary/10 border-primary/30 font-semibold" : "bg-accent/50 border-transparent hover:bg-accent"}`}
                            >
                              <span>{emoji}</span>
                              <span className="text-muted-foreground">{emojiReactions.length}</span>
                            </button>
                          );
                        })}
                        <div className="relative">
                          <button onClick={() => setOpenEmojiPicker(openEmojiPicker === c.id ? null : c.id)} className="p-1 rounded-full hover:bg-accent transition-colors">
                            <Smile className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {openEmojiPicker === c.id && (
                            <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border rounded-2xl px-2 py-1.5 shadow-lg z-10">
                              {["❤️", "😢", "😮", "😂", "👍"].map(emoji => (
                                <button key={emoji} onClick={() => { handleReaction(c.id, emoji); setOpenEmojiPicker(null); }} className="text-lg hover:scale-125 transition-transform">
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

        </div>{/* end left column */}

        {/* RIGHT COLUMN — sticky image + attendees, desktop only */}
        <div className="hidden md:block sticky top-20 self-start space-y-4">
          <div className="relative">
            {event.image_url ? (
              <img src={event.image_url} alt={event.title} className="w-full rounded-2xl object-cover" />
            ) : (
              <div className="w-full aspect-video bg-secondary rounded-2xl flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-2 bg-white text-gray-800 rounded-full shadow-md hover:bg-gray-50 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Copy & Share</span>
            </button>
          </div>

          {/* Attendees — desktop, centered under image */}
          {(goingCount > 0 || likeCount > 0 || interestedCount > 0) && (
            <button
              onClick={() => { setGoingListOpen(true); fetchGoingList(); }}
              className="w-full flex flex-col items-center gap-2 text-center"
            >
              <p className="text-sm font-semibold text-muted-foreground">
                <span className="text-foreground font-bold">{goingCount}</span> Going · <span className="text-foreground font-bold">{likeCount}</span> Liked · <span className="text-foreground font-bold">{interestedCount}</span> Interested
              </p>
              {previewAvatars.length > 0 && (
                <div className="flex justify-center">
                  {previewAvatars.slice(0, 8).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border-2 border-white"
                      style={{ marginLeft: i === 0 ? 0 : -10 }}
                    />
                  ))}
                </div>
              )}
            </button>
          )}
        </div>

        </div>{/* end grid */}
        </div>{/* end max-w */}
      </main>

      {/* Sticky RSVP Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-6 py-4 z-50">
        <div className="max-w-4xl mx-auto">
          {isGuest ? (
            <Button size="lg" className="w-full rounded-full" onClick={() => navigate("/")}>
              Log in to RSVP & join the fun 🎉
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button variant={rsvpStatus === "going" ? "default" : "outline"} size="lg" className="rounded-full" disabled={!!rsvpLoading} onClick={() => handleRsvp("going")}>
                {rsvpLoading === "going" ? <Loader2 className="h-4 w-4 animate-spin" /> : rsvpStatus === "going" ? "👍 You're Going!" : "Going"}
              </Button>
              <Button variant={rsvpStatus === "interested" ? "default" : "outline"} size="lg" className="rounded-full" disabled={!!rsvpLoading} onClick={() => handleRsvp("interested")}>
                {rsvpLoading === "interested" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Interested"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Floating edit button — only visible to the event creator */}
      {userId && event && userId === event.user_id && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center z-40 pointer-events-none">
          <button
            onClick={() => navigate(`/create-event/${id}`)}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-black text-white text-sm font-medium rounded-full shadow-lg hover:bg-gray-800 active:scale-95 transition-all"
          >
            <span>✏️</span>
            Need to edit this post? Click here
          </button>
        </div>
      )}

    </div>
  );
};

export default EventDetails;
