import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ShareMenu from "@/components/ShareMenu";
import { toast } from "sonner";

const DARK  = "#2C2523";
const MID   = "#635C59";
const TEAL  = "#1F4E5B";
const BG    = "#FAF6F0";
const DIV   = "#E4DCCF";
const INTER = "'Inter', sans-serif";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";

type RecapItem = {
  recap_id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_location: string | null;
  event_poster: string | null;
  photos: string[];
};

// ── Photo Viewer ─────────────────────────────────────────────────────────────
const PhotoViewer = ({
  photos,
  startIndex,
  eventTitle,
  onClose,
}: {
  photos: string[];
  startIndex: number;
  eventTitle: string;
  onClose: () => void;
}) => {
  const [current, setCurrent] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setCurrent(i => Math.max(0, i - 1));
  const next = () => setCurrent(i => Math.min(photos.length - 1, i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.92)",
        display: "flex", flexDirection: "column",
        height: "100vh", overflow: "hidden",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: INTER, fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>
          {current + 1} / {photos.length}
        </span>
        <span style={{ fontFamily: CORMORANT, fontSize: 17, color: "#fff", fontWeight: 600, flex: 1, textAlign: "center", padding: "0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {eventTitle}
        </span>
        <button
          onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <X size={18} color="#fff" />
        </button>
      </div>

      {/* Photo — fixed height so chevrons never shift */}
      <div style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        minHeight: 0, // critical for flex shrink
      }}>
        {current > 0 && (
          <button
            onClick={prev}
            className="hidden md:flex"
            style={{
              position: "absolute", left: 16, zIndex: 2,
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={20} color="#fff" />
          </button>
        )}
        <img
          key={current}
          src={photos[current]}
          alt=""
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            borderRadius: 4,
            userSelect: "none",
            WebkitUserDrag: "none" as any,
            display: "block",
          }}
        />
        {current < photos.length - 1 && (
          <button
            onClick={next}
            className="hidden md:flex"
            style={{
              position: "absolute", right: 16, zIndex: 2,
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ChevronRight size={20} color="#fff" />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "16px 0 24px", flexShrink: 0 }}>
          {photos.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === current ? "#fff" : "rgba(255,255,255,0.3)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
};

// ── Recap Card ───────────────────────────────────────────────────────────────
const RecapCard = ({
  recap,
  onPhotoClick,
}: {
  recap: RecapItem;
  onPhotoClick: (photos: string[], index: number, title: string) => void;
}) => {
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLButtonElement>(null);
  const siteUrl = (import.meta.env.VITE_SITE_URL ?? window.location.origin).replace(/\/$/, "");
  const shareUrl = `${siteUrl}/wards`;

  const shareToStory = async () => {
    try {
      // Load all collage images in parallel
      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((res, rej) => {
          const i = new Image(); i.crossOrigin = "anonymous";
          i.onload = () => res(i); i.onerror = rej; i.src = src;
        });

      const srcs = [left0, left1, poster, right0, right1].filter(Boolean) as string[];
      const imgMap: Record<string, HTMLImageElement> = {};
      await Promise.all(srcs.map(async s => { try { imgMap[s] = await loadImg(s); } catch {} }));

      // Canvas: 1080×1080 square card
      const C = 1080, PAD = 48, RADIUS = 36;
      const COLLAGE_H = 560, INFO_H = 220;
      const canvas = document.createElement("canvas");
      canvas.width = C; canvas.height = C;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = "#FAF6F0";
      ctx.fillRect(0, 0, C, C);

      // White card with rounded corners
      const cardX = PAD, cardY = PAD, cardW = C - PAD * 2, cardH = COLLAGE_H + INFO_H;
      ctx.shadowColor = "rgba(0,0,0,0.1)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, RADIUS);
      ctx.fill();
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

      // Clip collage to top of card
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, COLLAGE_H, [RADIUS, RADIUS, 0, 0]);
      ctx.clip();

      // Draw triptych: left col | center poster | right col
      const gap = 3;
      const leftW = Math.round(cardW * 0.29);
      const centerW = Math.round(cardW * 0.4);
      const rightW = cardW - leftW - centerW - gap * 2;
      const halfH = Math.round((COLLAGE_H - gap) / 2);

      const drawCover = (img: HTMLImageElement | undefined, x: number, y: number, w: number, h: number) => {
        if (!img) { ctx.fillStyle = "#E4DCCF"; ctx.fillRect(x, y, w, h); return; }
        const scale = Math.max(w / img.width, h / img.height);
        const sw = img.width * scale, sh = img.height * scale;
        ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
      };

      // Left column
      const lx = cardX;
      drawCover(imgMap[left0!], lx, cardY, leftW, halfH);
      drawCover(imgMap[left1!], lx, cardY + halfH + gap, leftW, halfH);
      // Center poster
      const cx = cardX + leftW + gap;
      drawCover(imgMap[poster!], cx, cardY, centerW, COLLAGE_H);
      // Right column
      const rx = cx + centerW + gap;
      drawCover(imgMap[right0!], rx, cardY, rightW, halfH);
      drawCover(imgMap[right1!], rx, cardY + halfH + gap, rightW, halfH);
      // +N overlay on bottom-right if more photos
      if (remaining > 0) {
        ctx.fillStyle = "rgba(44,37,35,0.5)";
        ctx.fillRect(rx, cardY + halfH + gap, rightW, halfH);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 52px Inter, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`+${remaining}`, rx + rightW / 2, cardY + halfH + gap + halfH / 2);
      }
      ctx.restore();

      // Info section
      const infoY = cardY + COLLAGE_H + 28;
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      // "The recap is here 📸" pill
      ctx.font = "600 24px Inter, sans-serif";
      const pillText = "The recap is here 📸";
      const pillW = ctx.measureText(pillText).width + 36;
      const pillH = 44, pillX = cardX + 28, pillY = infoY - 10;
      ctx.fillStyle = "#1F4E5B";
      ctx.beginPath();
      ctx.roundRect(pillX, pillY - pillH + 8, pillW, pillH, 22);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(pillText, pillX + 18, pillY - pillH / 2 + 10);
      ctx.textBaseline = "alphabetic";

      // Date
      ctx.fillStyle = "#1F4E5B";
      ctx.font = "600 28px Inter, sans-serif";
      ctx.fillText(dateLabel, cardX + 28, infoY + 52);
      // Title
      ctx.fillStyle = "#2C2523";
      ctx.font = "600 46px 'EB Garamond', Georgia, serif";
      const maxW = cardW - 56;
      let title = recap.event_title;
      while (ctx.measureText(title).width > maxW && title.length > 0) title = title.slice(0, -1);
      if (title !== recap.event_title) title += "…";
      ctx.fillText(title, cardX + 28, infoY + 52 + 48);
      // Location
      if (recap.event_location) {
        ctx.fillStyle = "#635C59";
        ctx.font = "400 26px Inter, sans-serif";
        ctx.fillText(recap.event_location, cardX + 28, infoY + 92 + 48);
      }
      // App tag at bottom
      ctx.fillStyle = "#635C59";
      ctx.font = "500 22px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Beyond Sunday", C / 2, C - 22);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "event-recap.jpg", { type: "image/jpeg" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: recap.event_title });
        } else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob); a.download = "event-recap.jpg"; a.click();
        }
      }, "image/jpeg", 0.93);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create share image");
    }
  };
  // Poster in the centre, recap photos on left + right
  const poster = recap.event_poster ?? null;
  const rp = recap.photos; // recap photos
  const left0  = rp[0] ?? null;
  const left1  = rp[1] ?? null;
  const right0 = rp[2] ?? null;
  const right1 = rp[3] ?? null;
  const remaining = rp.length - 4;
  // Full list for the viewer: poster first, then recap photos
  const allPhotos = poster ? [poster, ...rp] : rp;

  const dateLabel = (() => {
    try {
      const d = new Date(recap.event_date + "T00:00:00");
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch { return recap.event_date; }
  })();

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        borderRadius: 16,
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
        cursor: "pointer",
      }}
      onClick={() => allPhotos.length > 0 && onPhotoClick(allPhotos, 0, recap.event_title)}
    >
      {/* Triptych: 2 stacked left │ poster center │ 2 stacked right */}
      <div style={{ height: 210, display: "flex", gap: 2, background: DIV }}>

        {/* Left column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ flex: 1, overflow: "hidden", background: "#ddd5c8" }}>
            {left0 && <img src={left0} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          </div>
          <div style={{ flex: 1, overflow: "hidden", background: "#e4dcd1" }}>
            {left1 && <img src={left1} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          </div>
        </div>

        {/* Centre: poster */}
        <div style={{ flex: 1.3, overflow: "hidden", background: "#ccc4b8" }}>
          {poster && <img src={poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>

        {/* Right column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ flex: 1, overflow: "hidden", background: "#ddd5c8" }}>
            {right0 && <img src={right0} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          </div>
          <div style={{ flex: 1, overflow: "hidden", position: "relative", background: "#e4dcd1" }}>
            {right1 && <img src={right1} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            {remaining > 0 && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(44,37,35,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: INTER, fontSize: 18, fontWeight: 700, color: "#fff" }}>+{remaining}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: TEAL, marginBottom: 4 }}>
              {dateLabel}
            </p>
            <p style={{
              fontFamily: CORMORANT, fontSize: 18, fontWeight: 600, color: DARK,
              margin: 0, lineHeight: 1.2,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {recap.event_title}
            </p>
            {recap.event_location && (
              <p style={{ fontFamily: INTER, fontSize: 12, color: MID, marginTop: 4 }}>{recap.event_location}</p>
            )}
          </div>

          {/* Share button */}
          <button
            ref={shareRef}
            onClick={(e) => { e.stopPropagation(); setShareOpen(prev => !prev); }}
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
              border: "none", background: "#F5F1EC", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 2,
            }}
          >
            <Share2 size={14} color={MID} />
          </button>
        </div>
      </div>

      <ShareMenu
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        triggerRef={shareRef}
        items={[
          { label: "Copy Link", onClick: () => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); } },
          { label: "Share Link", onClick: () => navigator.share?.({ title: recap.event_title, url: shareUrl }), hidden: !navigator.share },
          { label: "Share to Story", onClick: shareToStory },
        ]}
      />
    </div>
  );
};

// ── Recap Section ────────────────────────────────────────────────────────────
const RecapSection = ({ audience }: { audience: string }) => {
  const [recaps, setRecaps] = useState<RecapItem[]>([]);
  const [viewer, setViewer] = useState<{ photos: string[]; index: number; title: string } | null>(null);
  const [viewerMounted, setViewerMounted] = useState(false);

  const openViewer = (photos: string[], index: number, title: string) => {
    setViewerMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setViewer({ photos, index, title })));
  };
  const closeViewer = () => {
    setViewer(null);
    setTimeout(() => setViewerMounted(false), 300);
  };

  useEffect(() => {
    const load = async () => {
      // Get recaps from last 60 days with their events and photos
      const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();

      const { data: recapData } = await supabase
        .from("event_recaps")
        .select(`
          id,
          event_id,
          created_at,
          events!inner(title, date, location, image_url, age_min, age_max, audience_group, ward_type)
        `)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!recapData || recapData.length === 0) return;

      // Filter by audience using audience_group or ward_type field
      const filtered = recapData.filter((r: any) => {
        if (!r.events) return false;
        const ag = r.events.audience_group ?? r.events.ward_type ?? "YSA";
        if (audience === "YSA") return ag === "YSA" || ag == null;
        if (audience === "MSA") return ag === "MSA";
        if (audience === "SA")  return ag === "SA" || ag === "YSA" || ag === "MSA";
        return true;
      });

      // Load photos for each recap
      const recapIds = filtered.map((r: any) => r.id);
      if (recapIds.length === 0) return;

      const { data: photoData } = await supabase
        .from("recap_photos")
        .select("recap_id, photo_url, order_index")
        .in("recap_id", recapIds)
        .order("order_index");

      const photoMap: Record<string, string[]> = {};
      (photoData ?? []).forEach((p: any) => {
        if (!photoMap[p.recap_id]) photoMap[p.recap_id] = [];
        photoMap[p.recap_id].push(p.photo_url);
      });

      setRecaps(
        filtered.map((r: any) => ({
          recap_id: r.id,
          event_id: r.event_id,
          event_title: r.events?.title ?? "Event",
          event_date: r.events?.date ?? "",
          event_location: r.events?.location ?? null,
          event_poster: r.events?.image_url ?? null,
          photos: photoMap[r.id] ?? [],
        })).filter(r => r.photos.length > 0)
      );
    };

    load();
  }, [audience]);

  if (recaps.length === 0) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <h2 style={{ fontFamily: CORMORANT, fontSize: 24, fontWeight: 600, color: DARK, lineHeight: 1, marginBottom: 14 }}>
        Event Recap
      </h2>

      {/* Horizontal scroll */}
      <div style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 4,
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      }}
        className="hide-scrollbar"
      >
        {recaps.map(recap => (
          <div key={recap.recap_id} style={{ scrollSnapAlign: "start" }}>
            <RecapCard recap={recap} onPhotoClick={openViewer} />
          </div>
        ))}
      </div>

      {/* Photo Viewer */}
      {viewerMounted && viewer && (
        <PhotoViewer
          photos={viewer.photos}
          startIndex={viewer.index}
          eventTitle={viewer.title}
          onClose={closeViewer}
        />
      )}
    </div>
  );
};

export default RecapSection;
