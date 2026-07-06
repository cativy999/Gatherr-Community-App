import { MapPin, Globe, Link, Link2, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TimelineSection, { groupByWeek } from "@/components/TimelineSection";
import ShareMenu from "@/components/ShareMenu";

const GroupProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { session } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, { name: string; avatar_url: string | null }>>({});
  const [communityProfiles, setCommunityProfiles] = useState<Record<string, { name: string; avatar_url: string | null }>>({});
  const [groupCreator, setGroupCreator] = useState<{ name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [isCoAdmin, setIsCoAdmin] = useState(false);
  const [groupCoAdmin, setGroupCoAdmin] = useState<{ name: string; avatar_url: string | null } | null>(null);

  const shareUrl = `https://gatherr-one.vercel.app/group/${id}`;

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
      const titleY = wrapText(group.name || "", pad, 1380, maxW, 110, "bold 96px 'Helvetica Neue', Helvetica, sans-serif");

      if (group.address) {
        ctx.font = "48px 'Helvetica Neue', Helvetica, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(group.address, pad, titleY + 80);
      }
    };

    const drawLogoWatermark = async () => {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
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
          const file = new File([blob], "beyond-sunday-group.png", { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file] });
            } catch (e: any) {
              if (e?.name !== "AbortError") toast.error("Sharing failed");
            }
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "beyond-sunday-group.png";
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Image saved! Upload it to your Instagram Story.");
          }
          resolve();
        }, "image/png");
      });
    };

    drawBackground();

    if (group.cover_image_url) {
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
        img.onerror = () => resolve();
        img.src = group.cover_image_url;
      });
    }

    drawOverlayAndText();
    await drawLogoWatermark();
    await doShare();
  };

  // Check if current user is an accepted co-admin
  useEffect(() => {
    if (!id || !session?.user.id) return;
    supabase
      .from("group_admins")
      .select("id")
      .eq("group_id", id)
      .eq("user_id", session.user.id)
      .eq("status", "accepted")
      .maybeSingle()
      .then(({ data }) => setIsCoAdmin(!!data));
  }, [id, session?.user.id]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("groups")
      .select("*")
      .eq("id", id)
      .single()
      .then(async ({ data: groupData }) => {
        setGroup(groupData);
        setLoading(false);
        if (!groupData) return;

        // Fetch group creator profile
        if (groupData.user_id) {
          const { data: creatorData } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", groupData.user_id)
            .maybeSingle();
          if (creatorData) setGroupCreator({ name: creatorData.name, avatar_url: creatorData.avatar_url ?? null });
        }

        // Fetch accepted co-admin
        const { data: adminRow } = await supabase
          .from("group_admins")
          .select("user_id")
          .eq("group_id", groupData.id)
          .eq("status", "accepted")
          .maybeSingle();
        if (adminRow?.user_id) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", adminRow.user_id)
            .maybeSingle();
          if (adminProfile) setGroupCoAdmin({ name: adminProfile.name, avatar_url: adminProfile.avatar_url ?? null });
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

        // 1. Find ward members (profiles whose ward matches this group's name)
        const { data: wardProfiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .eq("ward", groupData.name);

        // 2. Fetch events — by community_id OR by ward members
        const FIELDS = "id, title, image_url, date, time, start_time, end_time, end_date, attendees, is_free, age_min, age_max, created_at, location, lat, lng, ward_type, user_id, food, duration, virtual_link, community_id";
        const dateFilter = `end_date.gte.${today},and(end_date.is.null,date.gte.${today})`;

        // Always fetch events posted as this community
        const { data: communityEvents } = await supabase
          .from("events")
          .select(FIELDS)
          .eq("status", "published")
          .eq("community_id", groupData.id)
          .or(dateFilter)
          .order("date", { ascending: true });

        // Also fetch events by ward members (legacy path)
        let wardEvents: any[] = [];
        if (wardProfiles && wardProfiles.length > 0) {
          const wardUserIds = wardProfiles.map((p: any) => p.user_id);
          const { data } = await supabase
            .from("events")
            .select(FIELDS)
            .eq("status", "published")
            .in("user_id", wardUserIds)
            .is("community_id", null) // don't double-count community-posted events
            .or(dateFilter)
            .order("date", { ascending: true });
          wardEvents = data ?? [];
        }

        // Merge, dedupe by id
        const seen = new Set<string>();
        const eventsData = [...(communityEvents ?? []), ...wardEvents].filter((e: any) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
        setEvents(eventsData);

        // 3. Fetch creator profiles for events posted by individuals
        const individualEvents = eventsData.filter((e: any) => !e.community_id);
        if (individualEvents.length > 0) {
          const uniqueUserIds = [...new Set(individualEvents.map((e: any) => e.user_id))];
          const { data: creatorData } = await supabase
            .from("profiles")
            .select("user_id, name, avatar_url")
            .in("user_id", uniqueUserIds as string[]);
          const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
          (creatorData ?? []).forEach((p: any) => {
            profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url ?? null };
          });
          setCreatorProfiles(profileMap);
        }

        // 4. Build community profiles map for community-posted events
        const communityEventsList = eventsData.filter((e: any) => e.community_id);
        if (communityEventsList.length > 0) {
          const uniqueGroupIds = [...new Set(communityEventsList.map((e: any) => e.community_id))];
          const { data: groupData2 } = await supabase
            .from("groups")
            .select("id, name, avatar_url")
            .in("id", uniqueGroupIds as string[]);
          const communityMap: Record<string, { name: string; avatar_url: string | null }> = {};
          (groupData2 ?? []).forEach((g: any) => {
            communityMap[g.id] = { name: g.name, avatar_url: g.avatar_url ?? null };
          });
          setCommunityProfiles(communityMap);
        }
      });
  }, [id]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!group) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Group not found</div>;

  const { thisWeek, nextWeek, later } = groupByWeek(events);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <div className="relative">
        <div className="w-full h-52 bg-secondary overflow-hidden">
          {group.cover_image_url && <img src={group.cover_image_url} className="w-full h-full object-cover" />}
        </div>
        {(session?.user?.id === group?.user_id || isCoAdmin) && (
          <button
            onClick={() => navigate(`/create-group/${id}`)}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors text-white text-sm font-medium"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full bg-muted border-4 border-background overflow-hidden flex items-center justify-center">
            {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" /> : <span className="text-2xl">👥</span>}
          </div>
        </div>
      </div>

      <div className="mt-14 px-5 flex flex-col items-center text-center space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{group.name}</h1>
          <div className="flex-shrink-0">
            <button
              ref={shareButtonRef}
              onClick={() => setShareMenuOpen((prev) => !prev)}
              className="hover:opacity-70 transition-opacity"
              aria-label="Share"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              </svg>
            </button>
            <ShareMenu
              open={shareMenuOpen}
              onClose={() => setShareMenuOpen(false)}
              triggerRef={shareButtonRef}
              items={[
                { label: "Copy Link", onClick: () => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); } },
                { label: "Share Link", onClick: () => navigator.share?.({ title: group.name, url: shareUrl }), hidden: !navigator.share },
                { label: "Share to Story", onClick: shareToStory },
              ]}
            />
          </div>
        </div>
        {group.address && (
          <a href={"https://maps.google.com/?q=" + encodeURIComponent(group.address)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {group.address}
          </a>
        )}
        {(groupCreator || groupCoAdmin) && (
          <div className="flex items-center justify-center gap-4 pt-1 flex-wrap">
            {groupCreator && (
              <div className="flex items-center gap-1.5">
                {groupCreator.avatar_url ? (
                  <img src={groupCreator.avatar_url} referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: '#94A3B8', fontSize: 9, fontWeight: 700 }}>
                    {groupCreator.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  Admin: <span className="font-semibold text-foreground">{groupCreator.name}</span>
                </span>
              </div>
            )}
            {groupCoAdmin && (
              <div className="flex items-center gap-1.5">
                {groupCoAdmin.avatar_url ? (
                  <img src={groupCoAdmin.avatar_url} referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: '#94A3B8', fontSize: 9, fontWeight: 700 }}>
                    {groupCoAdmin.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  Co-admin: <span className="font-semibold text-foreground">{groupCoAdmin.name}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2 mt-4 px-5 flex-wrap">
        {group.facebook_url && (
          <a href={group.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors">
            <Link className="h-3.5 w-3.5" /> Facebook
          </a>
        )}
        {group.instagram_url && (
          <a href={group.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors">
            <Link2 className="h-3.5 w-3.5" /> Instagram
          </a>
        )}
        {group.website_url && (
          <a href={group.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors">
            <Globe className="h-3.5 w-3.5" /> Website
          </a>
        )}
      </div>

      <main className="flex-1 px-5 py-6 space-y-6 max-w-2xl mx-auto w-full">
        {group.description && (
          <div className="space-y-2">
            <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{group.description}</p>
          </div>
        )}
        {group.good_to_know && (
          <div className="space-y-2">
            <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Good to Know</h2>
            <div className="bg-accent/40 rounded-2xl px-4 py-3">
              <p className="text-sm font-medium">{group.good_to_know}</p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Events</h2>
          {events.length > 0 ? (
            <div className="space-y-8">
              <TimelineSection label="This Week" events={thisWeek} creatorProfiles={creatorProfiles} communityProfiles={communityProfiles} />
              <TimelineSection label="Next Week" events={nextWeek} creatorProfiles={creatorProfiles} communityProfiles={communityProfiles} />
              <TimelineSection label="Later" events={later} creatorProfiles={creatorProfiles} communityProfiles={communityProfiles} />
            </div>
          ) : (
            <div className="py-6 px-4 rounded-2xl bg-accent/30 text-center">
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GroupProfile;