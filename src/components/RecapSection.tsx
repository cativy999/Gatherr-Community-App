import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

      {/* Photo */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {current > 0 && (
          <button
            onClick={prev}
            className="hidden md:flex"
            style={{
              position: "absolute", left: 16, zIndex: 2,
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
              alignItems: "center", justifyContent: "center",
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
            maxWidth: "100%", maxHeight: "100%",
            objectFit: "contain",
            borderRadius: 4,
            userSelect: "none",
            WebkitUserDrag: "none" as any,
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
  const photos = recap.photos;
  const p0 = photos[0] ?? null;
  const p1 = photos[1] ?? null;
  const p2 = photos[2] ?? null;
  const remaining = photos.length - 3;

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
      onClick={() => photos.length > 0 && onPhotoClick(photos, 0, recap.event_title)}
    >
      {/* 3-photo mosaic: 2 stacked left, 1 tall right */}
      <div style={{ height: 200, display: "flex", gap: 2, background: DIV }}>
        {/* Left column: 2 stacked */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {p0 ? (
            <div style={{ flex: 1, overflow: "hidden", background: "#e0d8ce" }}>
              <img src={p0} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ) : (
            <div style={{ flex: 1, background: DIV }} />
          )}
          {p1 ? (
            <div style={{ flex: 1, overflow: "hidden", background: "#e0d8ce" }}>
              <img src={p1} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ) : (
            <div style={{ flex: 1, background: "#e8e0d5" }} />
          )}
        </div>
        {/* Right column: 1 tall */}
        <div style={{ flex: 1.1, overflow: "hidden", position: "relative", background: "#e0d8ce" }}>
          {p2 ? (
            <img src={p2} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: DIV }} />
          )}
          {remaining > 0 && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(44,37,35,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: INTER, fontSize: 20, fontWeight: 700, color: "#fff" }}>+{remaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px 14px" }}>
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
          events!inner(title, date, location, age_min, age_max)
        `)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!recapData || recapData.length === 0) return;

      // Filter by audience — loose overlap check
      const filtered = recapData.filter((r: any) => {
        if (!r.events) return false;
        const ageMin = r.events.age_min ?? 0;
        const ageMax = r.events.age_max ?? 999;
        if (audience === "YSA") return ageMin <= 30 && ageMax >= 18;
        if (audience === "MSA") return ageMin <= 45 && ageMax >= 31;
        return true; // "SA" or "All"
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
