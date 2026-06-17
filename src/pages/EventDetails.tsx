import { ArrowLeft, MapPin, Heart, Copy, Loader2, ThumbsUp, Smile, User, Trash2, Link, Video, Clock, Navigation, CalendarPlus, Expand, Balloon, Calendar, Star, Circle, CheckCircle2, FileText, Car, DollarSign, Ticket, Utensils, Pizza, CupSoda, Cookie, Hamburger, IceCreamCone, Salad, HandPlatter, Flame, Popcorn } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const STATE_ABBR: Record<string, string> = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS',
  'Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA',
  'Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT',
  'Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM',
  'New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK',
  'Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
  'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
  'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
};

const formatAddress = (addr: string): string => {
  if (!addr) return addr;
  const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
  const filtered = parts.filter(p => p !== 'United States' && !p.includes('County'));
  const zipIdx = filtered.findIndex(p => /^\d{5}$/.test(p));
  const zip = zipIdx !== -1 ? filtered[zipIdx] : '';
  const stateIdx = filtered.findIndex(p => STATE_ABBR[p]);
  const state = stateIdx !== -1 ? STATE_ABBR[filtered[stateIdx]] : '';
  const remaining = filtered.filter((_, i) => i !== zipIdx && i !== stateIdx);
  let street = '';
  let city = '';
  if (remaining.length >= 2) {
    street = /^\d+$/.test(remaining[0]) ? `${remaining[0]} ${remaining[1]}` : remaining[0];
    city = remaining[remaining.length - 1] === street.split(' ')[0] ? remaining[1] : remaining[remaining.length - 1];
  } else {
    street = remaining[0] || '';
    city = '';
  }
  return [street, city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
};

const getInitialColor = (name: string) => {
  const l = (name || '?').charAt(0).toUpperCase();
  if ('ABCD'.includes(l)) return '#F97066';
  if ('EFGH'.includes(l)) return '#38BDF8';
  if ('IJKL'.includes(l)) return '#A78BFA';
  if ('MNOP'.includes(l)) return '#4ADE80';
  if ('QRST'.includes(l)) return '#FB923C';
  if ('UVWX'.includes(l)) return '#F472B6';
  if ('YZ'.includes(l))   return '#2DD4BF';
  return '#94A3B8';
};

const TZ_ABBR: Record<string, string> = {
  'America/Los_Angeles': 'PT',
  'America/Denver':      'MT',
  'America/Phoenix':     'MT',
  'America/Chicago':     'CT',
  'America/New_York':    'ET',
  'America/Anchorage':   'AKT',
  'Pacific/Honolulu':    'HT',
};
const getTzAbbr = (tz: string | null | undefined): string =>
  tz ? (TZ_ABBR[tz] ?? '') : '';

// Converts "HH:MM" from fromTz to a formatted time string in toTz
const convertTime = (timeStr: string, fromTz: string, toTz: string): string => {
  if (!timeStr || fromTz === toTz) return '';
  try {
    const today = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    const baseUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0);
    const baseDate = new Date(baseUtc);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: fromTz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(baseDate);
    const tzH = parseInt(parts.find(p => p.type === 'hour')!.value) % 24;
    const tzM = parseInt(parts.find(p => p.type === 'minute')!.value);
    const diffMs = ((h - tzH) * 60 + (m - tzM)) * 60 * 1000;
    const converted = new Date(baseUtc + diffMs);
    return new Intl.DateTimeFormat('en-US', { timeZone: toTz, hour: 'numeric', minute: '2-digit', hour12: true }).format(converted).toLowerCase();
  } catch { return ''; }
};

const INFO_ICON_MAP: Record<string, React.ElementType> = {
  calendar: Calendar,
  star:     Star,
  circle:   Circle,
  check:    CheckCircle2,
  note:     FileText,
  car:      Car,
  pin:      MapPin,
  dollar:   DollarSign,
  ticket:   Ticket,
  food:     Utensils,
};

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
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [showTitleInHeader, setShowTitleInHeader] = useState(false);
  const [ambientColor, setAmbientColor] = useState<[number, number, number] | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [goingList, setGoingList] = useState<any[]>([]);
  const [goingListOpen, setGoingListOpen] = useState(false);
  const [goingListLoading, setGoingListLoading] = useState(false);
  const [previewAvatars, setPreviewAvatars] = useState<{url: string | null; name: string}[]>([]);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [openEmojiPicker, setOpenEmojiPicker] = useState<string | null>(null);
  const [creatorWard, setCreatorWard] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [linksExpanded, setLinksExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [similarEvents, setSimilarEvents] = useState<any[]>([]);
  const [expandedInfoItems, setExpandedInfoItems] = useState<Set<number>>(new Set());
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

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

  // Fetch similar events after main event loads
  useEffect(() => {
    if (!event) return;
    const fetchSimilar = async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const isVirtualEvent = !!event.virtual_link;

      const { data } = await supabase
        .from("events")
        .select("id, title, image_url, date, start_time, location, lat, lng, virtual_link")
        .eq("status", "published")
        .eq("category", "ward")
        .gte("date", today)
        .neq("id", id)
        .order("date", { ascending: true })
        .limit(20);
      if (!data) return;

      const city = (event.location || "").split(",")[0].trim().toLowerCase();
      const sorted = [...data].sort((a, b) => {
        if (isVirtualEvent) {
          const aOnline = !!a.virtual_link;
          const bOnline = !!b.virtual_link;
          if (aOnline !== bOnline) return aOnline ? -1 : 1;
          const aDate = new Date(a.date);
          const bDate = new Date(b.date);
          const aSameMonth = aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear ? 0 : 1;
          const bSameMonth = bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear ? 0 : 1;
          return aSameMonth - bSameMonth;
        } else {
          const aMatch = (a.location || "").toLowerCase().includes(city) ? 0 : 1;
          const bMatch = (b.location || "").toLowerCase().includes(city) ? 0 : 1;
          return aMatch - bMatch;
        }
      });
      setSimilarEvents(sorted.slice(0, 6));
    };
    fetchSimilar();
  }, [event, id]);

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
          .select("avatar_url, name")
          .in("user_id", uids);
        setPreviewAvatars((profiles ?? []).map((p: any) => ({ url: p.avatar_url || null, name: p.name || '?' })));
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .single();
    if (profile?.avatar_url) setUserAvatar(profile.avatar_url);
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
        .select("id, content, created_at, user_id, parent_id")
        .eq("event_id", id)
        .order("created_at", { ascending: true });

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
        // Split top-level vs replies
        const topLevel = mapped.filter((c: any) => !c.parent_id).reverse();
        const replyMap: Record<string, any[]> = {};
        mapped.filter((c: any) => c.parent_id).forEach((c: any) => {
          if (!replyMap[c.parent_id]) replyMap[c.parent_id] = [];
          replyMap[c.parent_id].push(c);
        });
        setComments(topLevel);
        setReplies(replyMap);
        fetchReactions(mapped.map((c: any) => c.id));
      } else {
        setComments([]);
        setReplies({});
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

    // Send notification if comment mentions the host
    const hostUserId = event?.user_id;
    if (hostUserId && userId !== hostUserId && creatorName && comment.toLowerCase().includes(`@${creatorName.toLowerCase()}`)) {
      await supabase.from("notifications").insert({
        user_id: hostUserId,
        from_user_id: userId,
        type: "mention",
        event_id: id,
        message: `${profile?.name || "Someone"} mentioned you in "${event?.title}"`,
        read: false,
      });
    }

    setComment("");
    toast.success("Comment posted!");
  };

  const handleSubmitReply = async (parentComment: any) => {
    if (!replyText.trim()) return;
    if (!userId) { toast.error("Please log in to reply"); return; }
    const { data, error } = await supabase
      .from("comments")
      .insert({ event_id: id, user_id: userId, content: replyText.trim().charAt(0).toUpperCase() + replyText.trim().slice(1), parent_id: parentComment.id })
      .select("id, content, created_at, user_id, parent_id")
      .single();
    if (error) { toast.error("Failed to post reply"); return; }
    const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", userId).single();
    const newReply = { ...data, author: profile?.name || "Anonymous", avatar: profile?.avatar_url || null };
    setReplies(prev => ({ ...prev, [parentComment.id]: [...(prev[parentComment.id] || []), newReply] }));

    // Notify the comment author that someone replied
    if (parentComment.user_id && userId !== parentComment.user_id) {
      await supabase.from("notifications").insert({
        user_id: parentComment.user_id,
        from_user_id: userId,
        type: "reply",
        event_id: id,
        message: `${profile?.name || "Someone"} replied to your comment on "${event?.title}"`,
        read: false,
      });
    }

    setReplyText("");
    setReplyingTo(null);
    toast.success("Reply posted!");
  };

  const shareToStory = async () => {
    setShareMenuOpen(false);

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;

    const drawBackground = () => {
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, "#0f0f0f");
      bg.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawOverlayAndText = () => {
      const overlay = ctx.createLinearGradient(0, canvas.height * 0.35, 0, canvas.height);
      overlay.addColorStop(0, "rgba(0,0,0,0)");
      overlay.addColorStop(0.5, "rgba(0,0,0,0.6)");
      overlay.addColorStop(1, "rgba(0,0,0,0.92)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string, color = "white") => {
        ctx.font = font;
        ctx.fillStyle = color;
        const words = text.split(" ");
        let line = "";
        let currentY = y;
        for (const word of words) {
          const test = line + word + " ";
          if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line.trim(), x, currentY);
            line = word + " ";
            currentY += lineHeight;
          } else {
            line = test;
          }
        }
        ctx.fillText(line.trim(), x, currentY);
        return currentY;
      };

      const pad = 90;
      const maxW = canvas.width - pad * 2;
      const titleY = wrapText(event.title || "", pad, 1380, maxW, 110, "bold 96px 'Helvetica Neue', Helvetica, sans-serif");

      const dateStr = eventDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      ctx.font = "52px 'Helvetica Neue', Helvetica, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(dateStr, pad, titleY + 80);

      if (event.start_time) {
        const [h, m] = event.start_time.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        ctx.font = "52px 'Helvetica Neue', Helvetica, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(`${hour}:${String(m).padStart(2, "0")} ${ampm}`, pad, titleY + 150);
      }

      if (event.location) {
        ctx.font = "48px 'Helvetica Neue', Helvetica, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(event.location, pad, titleY + 230);
      }

    };

    const drawLogoWatermark = async () => {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Recolor the logo to transparent white, keeping its shape/alpha intact
          const logoW = 320;
          const logoH = (img.height / img.width) * logoW;
          const tmp = document.createElement("canvas");
          tmp.width = logoW;
          tmp.height = logoH;
          const tctx = tmp.getContext("2d")!;
          tctx.drawImage(img, 0, 0, logoW, logoH);
          tctx.globalCompositeOperation = "source-in";
          tctx.fillStyle = "white";
          tctx.fillRect(0, 0, logoW, logoH);

          ctx.globalAlpha = 0.55;
          ctx.drawImage(tmp, 90, 90, logoW, logoH);
          ctx.globalAlpha = 1;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = "/BeyondSundaySplashLogo.png";
      });
    };

    const doShare = async () => {
      return new Promise<void>((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { toast.error("Couldn't generate image"); resolve(); return; }
          const file = new File([blob], "beyond-sunday-event.png", { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              // Share file only (no title) to prevent double-paste on some apps
              await navigator.share({ files: [file] });
            } catch (e: any) {
              if (e?.name !== "AbortError") toast.error("Sharing failed");
            }
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "beyond-sunday-event.png";
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Image saved! Upload it to your Instagram Story.");
          }
          resolve();
        }, "image/png");
      });
    };

    drawBackground();

    if (event.image_url) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          resolve();
        };
        img.onerror = () => resolve(); // use dark bg if image fails
        img.src = event.image_url;
      });
    }

    drawOverlayAndText();
    await drawLogoWatermark();
    await doShare();
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

  const shareUrl = `https://gatherr-one.vercel.app/event/${id}`;

  const shareOptions = [
    {
      icon: Copy, label: "Copy Link",
      action: () => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); setShareOpen(false); }
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
    <div
      className="relative flex min-h-screen flex-col pb-24"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Full-bleed ambient background — fixed so it extends under the desktop
          sidebar too, instead of stopping at the content column's left edge. */}
      <div
        className="fixed inset-0 -z-10 transition-colors duration-700"
        style={{
          background: ambientColor
            ? `linear-gradient(180deg, rgba(${ambientColor[0]},${ambientColor[1]},${ambientColor[2]},0.22) 0%, rgba(${ambientColor[0]},${ambientColor[1]},${ambientColor[2]},0.10) 40%, rgba(${ambientColor[0]},${ambientColor[1]},${ambientColor[2]},0.03) 70%, white 100%)`
            : 'white',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 bg-transparent">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-3">
          <button
            onClick={() => { if (window.history.length > 1) { navigate(-1); } else { navigate("/wards"); } }}
            className="p-2.5 rounded-full transition-colors flex-shrink-0 bg-white/30 backdrop-blur-md hover:bg-white/50"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          {!isGuest && (
            <button
              onClick={handleSave}
              disabled={saveLoading}
              className={`p-2.5 rounded-full transition-colors flex-shrink-0 bg-white/30 backdrop-blur-md hover:bg-white/50 ${isSaved ? "text-[rgb(172,42,42)]" : ""}`}
            >
              <Heart className={`h-6 w-6 ${isSaved ? "fill-current" : ""}`} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 py-4">
        <div className="max-w-5xl mx-auto">
        <div className="md:grid md:grid-cols-[1fr,420px] md:gap-16 md:items-start">

        {/* LEFT COLUMN */}
        <div className="space-y-6 min-w-0">


          {/* Event Image — mobile only */}
          <div className="relative md:hidden" style={{ filter: 'drop-shadow(0px 4px 24px rgba(0,0,0,0.15))' }}>
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-72 object-cover rounded-2xl"
                style={{ boxShadow: '0px 4px 20px 6px rgba(0,0,0,0.08)' }}
                onLoad={() => {
                  if (!event.image_url) return;
                  const img = new Image();
                  img.crossOrigin = "anonymous";
                  img.onload = () => {
                    try {
                      const canvas = document.createElement("canvas");
                      canvas.width = 10;
                      canvas.height = 10;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      ctx.drawImage(img, 0, 0, 10, 10);
                      const data = ctx.getImageData(0, 0, 10, 10).data;
                      // Find most vibrant pixel
                      let best: [number,number,number] = [128,128,128];
                      let bestSat = -1;
                      for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i+1], b = data[i+2];
                        const max = Math.max(r,g,b), min = Math.min(r,g,b);
                        const sat = max === 0 ? 0 : (max - min) / max;
                        if (sat > bestSat) { bestSat = sat; best = [r,g,b]; }
                      }
                      // Boost: convert to HSL, pump saturation & lightness, back to RGB
                      const [r,g,b] = best.map(v => v/255);
                      const max = Math.max(r,g,b), min = Math.min(r,g,b);
                      let h = 0, s = 0, l = (max+min)/2;
                      if (max !== min) {
                        const d = max - min;
                        s = l > 0.5 ? d/(2-max-min) : d/(max+min);
                        if (max===r) h = ((g-b)/d + (g<b?6:0))/6;
                        else if (max===g) h = ((b-r)/d + 2)/6;
                        else h = ((r-g)/d + 4)/6;
                      }
                      s = Math.min(1, s * 1.2);   // subtle saturation boost
                      l = Math.min(0.88, Math.max(0.72, l * 1.6)); // keep very light/pastel
                      const hue2rgb = (p:number,q:number,t:number) => {
                        if(t<0)t+=1; if(t>1)t-=1;
                        if(t<1/6)return p+(q-p)*6*t;
                        if(t<1/2)return q;
                        if(t<2/3)return p+(q-p)*(2/3-t)*6;
                        return p;
                      };
                      const q = l<0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
                      const fr = hue2rgb(p,q,h+1/3), fg = hue2rgb(p,q,h), fb = hue2rgb(p,q,h-1/3);
                      setAmbientColor([Math.round(fr*255), Math.round(fg*255), Math.round(fb*255)]);
                    } catch {}
                  };
                  img.onerror = () => {};
                  img.src = event.image_url + "?color=1";
                }}
              />
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
            {/* Edit pencil — mobile, creator only */}
            {userId === event?.user_id && (
              <button
                onClick={() => navigate(`/create-event/${id}`)}
                className="absolute bottom-3 right-3 p-2 bg-white/30 backdrop-blur-md rounded-full hover:bg-white/50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
              </button>
            )}
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
            <div className="flex items-start justify-between gap-3">
              <h1 ref={titleRef} className="font-bold md:text-[36px] text-[28px]" style={{ fontFamily: "'Hanken Grotesk', sans-serif", lineHeight: '1.2' }}>{event.title}</h1>
              <div className="relative flex-shrink-0 mt-1">
                <button
                  onClick={() => setShareMenuOpen(prev => !prev)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  </svg>
                </button>
                {shareMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShareMenuOpen(false)} />
                    <div className="absolute right-0 top-8 z-30 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-52">
                      {/* Copy Link — straight to clipboard */}
                      <button
                        onClick={() => {
                          setShareMenuOpen(false);
                          navigator.clipboard.writeText(shareUrl);
                          toast.success("Link copied!");
                        }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                        Copy Link
                      </button>
                      {/* Share Link — native share sheet */}
                      {navigator.share && (
                        <button
                          onClick={() => {
                            setShareMenuOpen(false);
                            navigator.share({ title: event.title, url: shareUrl }).catch(() => {});
                          }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-3 border-t border-border"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          Share Link
                        </button>
                      )}
                      {/* Share to Story */}
                      <button
                        onClick={shareToStory}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-3 border-t border-border"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
                        </svg>
                        Share to Story
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {(event.age_min || event.age_max || (event.food && event.food.length > 0)) && (
              <div className="flex flex-wrap items-center gap-2">
                {(event.age_min || event.age_max) && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full text-foreground" style={{ backgroundColor: 'rgba(0,0,0,0.07)' }}>
                    {event.age_min && event.age_max
                      ? `Ages ${event.age_min}–${event.age_max}`
                      : event.age_min
                      ? `Ages ${event.age_min}+`
                      : `Ages up to ${event.age_max}`}
                  </span>
                )}
                {event.food && event.food.length > 0 && (() => {
                  const FOOD_ICON_MAP: Record<string, React.ReactNode> = {
                    pizza: <Pizza className="h-3.5 w-3.5" />,
                    burgers: <Hamburger className="h-3.5 w-3.5" />,
                    bbq: <Flame className="h-3.5 w-3.5" />,
                    catered: <HandPlatter className="h-3.5 w-3.5" />,
                    drinks: <CupSoda className="h-3.5 w-3.5" />,
                    cookies: <Cookie className="h-3.5 w-3.5" />,
                    icecream: <IceCreamCone className="h-3.5 w-3.5" />,
                    popcorn: <Popcorn className="h-3.5 w-3.5" />,
                    salad: <Salad className="h-3.5 w-3.5" />,
                  };
                  return (
                    <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.07)' }}>
                      <Utensils className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="flex items-center gap-1">
                        {event.food.map((f: string) => (
                          <span key={f} title={f}>{FOOD_ICON_MAP[f] || <Utensils className="h-3.5 w-3.5" />}</span>
                        ))}
                      </span>
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Date + Location card */}
          <div className="rounded-2xl overflow-hidden">

            {/* Date row */}
            <div className="relative flex items-center gap-4 py-3">
              <div className="flex flex-col rounded-xl w-12 h-12 flex-shrink-0 overflow-hidden" style={{ border: '1px solid #D9D9D9' }}>
                {event.is_recurring ? (
                  <>
                    <div className="w-full flex items-center justify-center flex-1" style={{ backgroundColor: 'rgb(191, 33, 33)' }}>
                      <span className="text-[9px] font-bold uppercase text-white tracking-widest leading-none" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                        {event.recurring_day ? event.recurring_day.slice(0, 3).toUpperCase() : "WKL"}
                      </span>
                    </div>
                    <div className="w-full bg-background flex items-center justify-center flex-[1.4]">
                      <span className="text-[10px] font-bold leading-none text-foreground tracking-tight uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Every</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-full flex items-center justify-center flex-1" style={{ backgroundColor: 'rgb(191, 33, 33)' }}>
                      <span className="text-[9px] font-bold uppercase text-white tracking-widest leading-none" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                        {eventDate.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                    </div>
                    <div className="w-full bg-background flex items-center justify-center flex-[1.4]">
                      <span className="text-lg font-bold leading-none text-foreground" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                        {eventDate.getDate()}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  {event.is_recurring
                    ? `Every ${event.recurring_day}`
                    : event.end_date
                    ? (() => {
                        const [ey, em, ed] = event.end_date.split("-").map(Number);
                        const endDateObj = new Date(ey, em - 1, ed);
                        return `${eventDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${endDateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
                      })()
                    : eventDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
                {(event.start_time || event.time) && (() => {
                  const fmt = (t: string) => new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
                  const timeDisplay = event.start_time
                    ? event.end_time
                      ? `${fmt(event.start_time)} – ${fmt(event.end_time)}`
                      : fmt(event.start_time)
                    : `${event.time}${event.duration ? ` · ${event.duration}` : ""}`;
                  const tzAbbr = getTzAbbr(event.timezone);
                  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const viewerAbbr = getTzAbbr(viewerTz);
                  const isDifferentTz = event.timezone && viewerTz !== event.timezone;
                  const convertedStart = isDifferentTz && event.start_time ? convertTime(event.start_time, event.timezone!, viewerTz) : '';
                  const convertedEnd = isDifferentTz && event.end_time ? convertTime(event.end_time, event.timezone!, viewerTz) : '';
                  const yourTime = convertedStart
                    ? convertedEnd ? `${convertedStart} – ${convertedEnd}` : convertedStart
                    : '';
                  return (
                    <div className="flex items-start gap-1.5 text-foreground">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[14px] font-medium">
                          {timeDisplay}{tzAbbr ? <span className="text-muted-foreground font-normal"> {tzAbbr}</span> : null}
                        </span>
                        {yourTime && viewerAbbr && (
                          <p className="text-xs text-muted-foreground mt-0.5">{yourTime} {viewerAbbr} <span className="text-muted-foreground">(your time)</span></p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Add to Calendar button */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setCalendarOpen(!calendarOpen)}
                  className="flex items-center justify-center hover:opacity-70 transition-opacity"
                >
                  <CalendarPlus className="h-6 w-6 text-foreground" />
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
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ border: '1px solid #D9D9D9', backgroundColor: 'rgba(0,0,0,0.04)' }}>
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
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border border-black/[0.17]" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <MapPin className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{formatAddress(event.address)}</p>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setMapPickerOpen(true)}
                    className="flex items-center justify-center hover:opacity-70 transition-opacity"
                  >
                    <Navigation className="h-6 w-6 text-foreground" />
                  </button>
                </div>
              </div>
            ) : null}

          </div>

          {/* Map Picker Dialog */}
          <Dialog open={mapPickerOpen} onOpenChange={setMapPickerOpen}>
            <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl p-0 overflow-hidden">
              <DialogHeader className="p-5 pb-3">
                <DialogTitle className="text-lg font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Open in Maps</DialogTitle>
              </DialogHeader>
              <div className="px-5 pb-5 space-y-1">
                {/* Google Maps */}
                <button
                  onClick={() => { window.open(`https://maps.google.com/?q=${encodeURIComponent(event?.address || '')}`, '_blank'); setMapPickerOpen(false); }}
                  className="w-full flex items-center gap-3 py-3 hover:bg-accent/30 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 4C15.16 4 8 11.16 8 20c0 11.87 14.29 23.45 15 24l1 .87 1-.87C25.71 43.45 40 31.87 40 20c0-8.84-7.16-16-16-16z" fill="#EA4335"/>
                      <circle cx="24" cy="20" r="6" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Google Maps</span>
                </button>
                {/* Apple Maps */}
                <button
                  onClick={() => { window.open(`https://maps.apple.com/?q=${encodeURIComponent(event?.address || '')}`, '_blank'); setMapPickerOpen(false); }}
                  className="w-full flex items-center gap-3 py-3 hover:bg-accent/30 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="48" height="48" rx="10" fill="url(#appleGrad)"/>
                      <path d="M24 10l3.5 7 7.5 1.1-5.5 5.3 1.3 7.6L24 27.5l-6.8 3.5 1.3-7.6L13 18.1l7.5-1.1L24 10z" fill="white"/>
                      <defs>
                        <linearGradient id="appleGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#4CD964"/>
                          <stop offset="1" stopColor="#007AFF"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Apple Maps</span>
                </button>
                {/* Waze */}
                <button
                  onClick={() => { window.open(`https://waze.com/ul?q=${encodeURIComponent(event?.address || '')}`, '_blank'); setMapPickerOpen(false); }}
                  className="w-full flex items-center gap-3 py-3 hover:bg-accent/30 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="24" cy="22" rx="16" ry="14" fill="#33CCFF"/>
                      <ellipse cx="24" cy="22" rx="16" ry="14" fill="#05C8F0"/>
                      <circle cx="19" cy="20" r="2.5" fill="#1A1A1A"/>
                      <circle cx="29" cy="20" r="2.5" fill="#1A1A1A"/>
                      <path d="M19 26c1.2 2 8.8 2 10 0" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/>
                      <ellipse cx="34" cy="30" rx="5" ry="4" fill="#FFCC00"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Waze</span>
                </button>
              </div>
            </DialogContent>
          </Dialog>

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
                        <img src={person.avatar_url} alt={person.name} referrerPolicy="no-referrer" style={{ width: 48, height: 48, minWidth: 48, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 48, height: 48, minWidth: 48, borderRadius: '50%', backgroundColor: getInitialColor(person.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 700 }}>
                          {(person.name || '?').charAt(0).toUpperCase()}
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
            <h2 className="text-[16px] font-bold pb-2 border-b" style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: 'rgba(0,0,0,0.1)' }}>About</h2>
            <p className={`text-base leading-snug whitespace-pre-wrap ${!descExpanded ? "line-clamp-6" : ""}`}>
              {renderDescription(event.description?.replace(/\n{3,}/g, '\n\n'))}
            </p>
            {event.description?.length > 200 && (
              <button onClick={() => setDescExpanded(e => !e)} className="w-full text-left text-sm font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: '#424242' }}>
                {descExpanded ? "Show less" : "Show more >"}
              </button>
            )}
          </div>

{/* Additional Details */}
          {event.additional_info && event.additional_info.length > 0 && (
            <div className="space-y-1">
              {/* Section header */}
              <div className="w-full flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                <span className="text-[16px] font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  Additional Details
                </span>
              </div>

              {/* All items always visible */}
              <div className="flex flex-col pl-4 pb-6">
                    {event.additional_info.map((item: {title: string; description: string; icon?: string}, idx: number) => {
                      const isOpen = expandedInfoItems.has(idx);
                      return (
                        <div key={idx}>
                          {/* Row button */}
                          <button
                            onClick={() => {
                              const next = new Set(expandedInfoItems);
                              if (next.has(idx)) next.delete(idx); else next.add(idx);
                              setExpandedInfoItems(next);
                            }}
                            className="w-full flex items-center gap-[15px] h-[56px] text-left"
                          >
                            {(() => {
                              const IconComp = item.icon ? INFO_ICON_MAP[item.icon] : CheckCircle2;
                              return IconComp ? <IconComp className="flex-shrink-0 h-5 w-5" /> : null;
                            })()}
                            <span className="flex-1 font-normal text-black min-w-0" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                              {item.title}
                            </span>
                            <svg
                              width="24" height="24" viewBox="0 0 24 24"
                              fill="none" stroke="currentColor" strokeWidth="2"
                              strokeLinecap="round" strokeLinejoin="round"
                              className="flex-shrink-0"
                              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                            >
                              <path d="m6 9 6 6 6-6"/>
                            </svg>
                          </button>

                          {/* Description — animated slide */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateRows: isOpen ? '1fr' : '0fr',
                              transition: 'grid-template-rows 0.3s ease',
                            }}
                          >
                            <div style={{ overflow: 'hidden', minHeight: 0 }}>
                              <div className="w-full pl-[26px] pb-2">
                                <div
                                  className="pl-6 pb-4 pr-2 text-sm font-normal leading-relaxed whitespace-pre-wrap text-left"
                                  style={{ borderLeft: '2px solid rgba(0,0,0,0.09)', color: 'rgba(0,0,0,0.5)' }}
                                >
                                  {item.description}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          )}

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
                <h2 className="text-[16px] font-bold pb-2 border-b" style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: 'rgba(0,0,0,0.1)' }}>Links</h2>
                <div className="space-y-2">
                  {links.map((link: string, i: number) => {
                    const platform = getPlatform(link);
                    return (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 py-2 hover:opacity-70 transition-opacity md:max-w-[360px]"
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
                        <span className="text-sm truncate" style={{ color: platform === "facebook" ? "#1877F2" : platform === "instagram" ? "#E1306C" : "#3771c8" }}>{link}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })()}

{/* Attendees — mobile only, left-aligned */}
          <div className="md:hidden space-y-3">
            <h2 className="text-[16px] font-bold pb-2 border-b" style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: 'rgba(0,0,0,0.1)' }}>Attendees</h2>
            <button
              onClick={() => { setGoingListOpen(true); fetchGoingList(); }}
              className="flex flex-col gap-2 text-left"
            >
              <p className="text-sm font-semibold text-muted-foreground">
                <span className="text-foreground font-bold">{goingCount}</span> Going · <span className="text-foreground font-bold">{likeCount}</span> Liked · <span className="text-foreground font-bold">{interestedCount}</span> Interested
              </p>
              {previewAvatars.length > 0 && (
                <div className="flex">
                  {previewAvatars.slice(0, 8).map((p, i) => (
                    p.url
                      ? <img key={i} src={p.url} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border-2 border-white" style={{ marginLeft: i === 0 ? 0 : -10 }} />
                      : <div key={i} className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ marginLeft: i === 0 ? 0 : -10, backgroundColor: getInitialColor(p.name) }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                  ))}
                </div>
              )}
            </button>
          </div>

{/* Host */}
          {creatorName && (
            <div className="space-y-3">
              <h2 className="text-[16px] font-bold pb-2 border-b" style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: 'rgba(0,0,0,0.1)' }}>Host</h2>
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

{/* Location */}
          {(event.address || event.lat) && !event.virtual_link && (
            <div className="space-y-3">
              <h2 className="text-[16px] font-bold pb-2 border-b" style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: 'rgba(0,0,0,0.1)' }}>Location</h2>
              {event.address && (
                <p className="text-sm text-muted-foreground">{formatAddress(event.address)}</p>
              )}
              <div className="relative rounded-2xl overflow-hidden cursor-pointer" style={{ height: 200, border: "3px solid #fff", boxShadow: "0 2px 12px rgba(0,0,0,0.10)" }} onClick={() => setMapPickerOpen(true)}>
                <iframe
                  width="100%"
                  height="200"
                  style={{ border: 0, display: 'block', pointerEvents: 'none' }}
                  loading="lazy"
                  src={event.lat && event.lng
                    ? `https://maps.google.com/maps?q=${event.lat},${event.lng}&z=15&output=embed`
                    : `https://maps.google.com/maps?q=${encodeURIComponent(event.address)}&z=15&output=embed`}
                />
                <div className="absolute inset-0 flex items-end justify-end p-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow text-xs font-semibold text-gray-700">
                    <Navigation className="h-3.5 w-3.5" />Open in Maps
                  </div>
                </div>
              </div>
            </div>
          )}

{/* Comments */}
          <div className="space-y-6 pt-4">
            <h2 className="text-[16px] font-bold pb-2 border-b" style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: 'rgba(0,0,0,0.1)' }}>
              {comments.length > 0 ? `Comments (${comments.length})` : "Comments"}
            </h2>
            {!isGuest ? (
              <div className="space-y-3">
                {/* Tag host chip */}
                {creatorName && userId !== event?.user_id && (
                  <button
                    type="button"
                    onClick={() => setComment(prev => prev ? `${prev} @${creatorName} ` : `@${creatorName} `)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm text-muted-foreground hover:bg-accent transition-colors border border-border"
                  >
                    <span className="text-primary font-medium">@{creatorName}</span>
                    <span className="text-xs">tag host</span>
                  </button>
                )}
                {/* Input row */}
                <div className="flex items-start">
                  <textarea
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={2}
                    className="flex-1 resize-none rounded-[22px] border border-[#3a3a3a] px-4 py-3 text-sm outline-none focus:border-gray-500 transition-colors w-full"
                  />
                </div>
                {/* Post button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitComment}
                    className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors"
                  >
                    Post Comment
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => navigate("/")} className="w-full py-3 px-4 rounded-2xl border border-border text-sm text-muted-foreground hover:bg-accent transition-colors text-center">
                🔒 Log in to leave a comment
              </button>
            )}
            <div className="space-y-5">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet. Be the first!</p>
              ) : (
                (showAllComments ? comments : comments.slice(0, 3)).map(c => (
                  <div key={c.id} className="space-y-3">
                    {/* Top-level comment */}
                    <div className="flex gap-3">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.author} className="w-10 h-10 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-sm text-[#383838]">{c.author}</p>
                            <p className="text-xs text-[#949494]">{timeAgo(c.created_at)}</p>
                          </div>
                          {c.user_id === userId && (
                            <button onClick={() => handleDeleteComment(c.id, c.user_id)} className="text-muted-foreground hover:text-foreground transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-foreground leading-snug mt-1">{c.content}</p>
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
                          {!isGuest && (
                            <button
                              onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyText(""); }}
                              className="text-xs text-muted-foreground hover:text-foreground font-medium ml-1 transition-colors"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Existing replies */}
                    {(replies[c.id] || []).length > 0 && (
                      <div className="ml-12 space-y-3">
                        {(replies[c.id] || []).map(r => (
                          <div key={r.id} className="flex gap-2.5">
                            {r.avatar ? (
                              <img src={r.avatar} alt={r.author} className="w-7 h-7 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                <User className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-bold text-xs text-[#383838]">{r.author}</p>
                                  <p className="text-[10px] text-[#949494]">{timeAgo(r.created_at)}</p>
                                </div>
                                {r.user_id === userId && (
                                  <button onClick={() => handleDeleteComment(r.id, r.user_id)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-foreground leading-snug mt-0.5">{r.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline reply input */}
                    {replyingTo === c.id && (
                      <div className="ml-12 flex gap-2 items-start">
                        {userAvatar ? (
                          <img src={userAvatar} className="w-7 h-7 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <User className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <textarea
                            autoFocus
                            placeholder={`Reply to ${c.author}...`}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            rows={2}
                            className="w-full resize-none rounded-2xl border border-[#3a3a3a] px-3 py-2 text-sm outline-none focus:border-gray-500 transition-colors"
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSubmitReply(c)}
                              disabled={!replyText.trim()}
                              className="px-4 py-1.5 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-800 transition-colors disabled:opacity-40"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              {/* Show more / less */}
              {comments.length > 3 && (
                <button
                  onClick={() => setShowAllComments(!showAllComments)}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllComments ? "Show less" : `Show ${comments.length - 3} more comment${comments.length - 3 > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>

          {/* Similar Events */}
          {similarEvents.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                <h2 className="text-[16px] font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Similar Events</h2>
                <button onClick={() => navigate("/wards")} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  See all →
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
                {similarEvents.map((e) => {
                  const [y, m, d] = e.date.split("-").map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <div
                      key={e.id}
                      onClick={() => { navigate(`/event/${e.id}`); window.scrollTo(0, 0); }}
                      className="flex-shrink-0 w-52 cursor-pointer"
                    >
                      <div className="relative w-52 h-36 rounded-xl overflow-hidden bg-secondary mb-1.5">
                        {e.image_url
                          ? <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-secondary" />}
                        {e.virtual_link && (
                          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                            <Video className="h-2.5 w-2.5 text-white" />
                            <span className="text-[9px] font-semibold text-white">Online</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-semibold leading-tight line-clamp-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{e.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>{/* end left column */}

        {/* RIGHT COLUMN — sticky image + attendees, desktop only */}
        <div className="hidden md:block sticky top-20 self-start space-y-4">
          {userId === event?.user_id && (
            <div className="flex justify-end">
              <button
                onClick={() => navigate(`/create-event/${id}`)}
                className="px-4 py-2 text-sm font-semibold rounded-full bg-white border border-black text-black hover:bg-gray-50 transition-colors"
              >
                Edit Post
              </button>
            </div>
          )}
          <div className="relative">
            {event.image_url ? (
              <img src={event.image_url} alt={event.title} className="w-full rounded-2xl object-cover" />
            ) : (
              <div className="w-full aspect-video bg-secondary rounded-2xl flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
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
                  {previewAvatars.slice(0, 8).map((p, i) => (
                    p.url
                      ? <img key={i} src={p.url} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border-2 border-white" style={{ marginLeft: i === 0 ? 0 : -10 }} />
                      : <div key={i} className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ marginLeft: i === 0 ? 0 : -10, backgroundColor: getInitialColor(p.name) }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
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
      <div
        className="fixed bottom-0 left-0 right-0 backdrop-blur-md border-t border-white/40 px-6 py-4 z-50"
        style={{
          background: ambientColor
            ? `rgb(${Math.round(255*0.78 + ambientColor[0]*0.22)},${Math.round(255*0.78 + ambientColor[1]*0.22)},${Math.round(255*0.78 + ambientColor[2]*0.22)})`
            : 'white',
        }}
      >
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


    </div>
  );
};

export default EventDetails;
