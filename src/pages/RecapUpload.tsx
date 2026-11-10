import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, X, ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DARK  = "#2C2523";
const MID   = "#635C59";
const TEAL  = "#1F4E5B";
const BG    = "#FAF6F0";
const DIV   = "#E4DCCF";
const INTER = "'Inter', sans-serif";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const MAX_PHOTOS = 10;

/** Compress an image file using canvas — max 1000px wide, JPEG 0.75 quality */
const compressImage = (file: File): Promise<Blob> =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 1000;
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.75);
    };
    img.src = url;
  });

const RecapUpload = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [event, setEvent] = useState<any>(null);
  const [existingRecap, setExistingRecap] = useState<any>(null);
  const [photos, setPhotos] = useState<{ file?: File; preview: string; url?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    const load = async () => {
      const [eventRes, recapRes] = await Promise.all([
        supabase.from("events").select("id, title, image_url, date, location, user_id").eq("id", eventId).single(),
        supabase.from("event_recaps").select("id").eq("event_id", eventId).maybeSingle(),
      ]);
      setEvent(eventRes.data);
      if (recapRes.data) {
        setExistingRecap(recapRes.data);
        // Load existing photos
        const { data: photoData } = await supabase
          .from("recap_photos")
          .select("photo_url, order_index")
          .eq("recap_id", recapRes.data.id)
          .order("order_index");
        if (photoData) {
          setPhotos(photoData.map(p => ({ preview: p.photo_url, url: p.photo_url })));
        }
      }
      setLoading(false);
    };
    load();
  }, [eventId]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) { toast.error(`Max ${MAX_PHOTOS} photos`); return; }
    const toAdd = Array.from(files).slice(0, remaining);
    const newPhotos = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      const updated = [...prev];
      if (updated[idx].preview && !updated[idx].url) {
        URL.revokeObjectURL(updated[idx].preview);
      }
      updated.splice(idx, 1);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!session?.user || !event) return;
    if (photos.length === 0) { toast.error("Add at least one photo"); return; }
    setSaving(true);

    try {
      // 1. Create or reuse recap row
      let recapId = existingRecap?.id;
      if (!recapId) {
        const { data, error } = await supabase
          .from("event_recaps")
          .insert({ event_id: eventId, created_by: session.user.id })
          .select("id")
          .single();
        if (error) throw error;
        recapId = data.id;
      } else {
        // Clear old photos
        await supabase.from("recap_photos").delete().eq("recap_id", recapId);
      }

      // 2. Upload new files, keep existing URLs as-is
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        if (photo.url && !photo.file) {
          // Already uploaded
          uploadedUrls.push(photo.url);
        } else if (photo.file) {
          const compressed = await compressImage(photo.file);
          const filename = `${session.user.id}/${recapId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
          const { error: uploadErr } = await supabase.storage
            .from("recap-photos")
            .upload(filename, compressed, { contentType: "image/jpeg" });
          if (uploadErr) throw uploadErr;
          const { data: { publicUrl } } = supabase.storage.from("recap-photos").getPublicUrl(filename);
          uploadedUrls.push(publicUrl);
        }
      }

      // 3. Insert photo rows
      await supabase.from("recap_photos").insert(
        uploadedUrls.map((url, i) => ({ recap_id: recapId, photo_url: url, order_index: i }))
      );

      // 4. Mark notification as read (if any)
      if (session.user.id) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", session.user.id)
          .eq("type", "recap_reminder")
          .eq("event_id", eventId);
      }

      toast.success("Recap saved!");
      navigate(-1);
    } catch (err: any) {
      console.error(err);
      toast.error("Couldn't save recap. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${DIV}`, borderTopColor: TEAL, animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: INTER, color: MID }}>Event not found.</p>
      </div>
    );
  }

  const isHost = session?.user?.id === event.user_id;
  if (!isHost) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: INTER, color: MID }}>Only the event host can add a recap.</p>
      </div>
    );
  }

  const eventDate = (() => {
    try {
      const d = new Date(event.date + "T00:00:00");
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch { return event.date; }
  })();

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: "calc(140px + env(safe-area-inset-bottom))", fontFamily: INTER }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: BG, borderBottom: `1px solid ${DIV}`,
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 20px",
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ChevronLeft size={22} color={DARK} />
        </button>
        <h1 style={{ fontFamily: CORMORANT, fontSize: 22, fontWeight: 600, color: DARK, flex: 1 }}>
          Add Event Recap
        </h1>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        {/* Event poster */}
        <div style={{
          borderRadius: 16, overflow: "hidden",
          background: event.image_url ? "transparent" : DIV,
          marginBottom: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}>
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ImagePlus size={40} color={MID} />
            </div>
          )}
          <div style={{ padding: "14px 16px 16px" }}>
            <p style={{ fontSize: 13, color: TEAL, fontWeight: 600, marginBottom: 4 }}>{eventDate}</p>
            <h2 style={{ fontFamily: CORMORANT, fontSize: 20, fontWeight: 600, color: DARK, margin: 0 }}>{event.title}</h2>
            {event.location && <p style={{ fontSize: 13, color: MID, marginTop: 4 }}>{event.location}</p>}
          </div>
        </div>

        {/* Photos section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: 0 }}>Recap Photos</h3>
            <span style={{ fontSize: 13, color: MID }}>{photos.length}/{MAX_PHOTOS}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {photos.map((photo, idx) => (
              <div key={idx} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", background: DIV }}>
                <img src={photo.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button
                  onClick={() => removePhoto(idx)}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={12} color="#fff" />
                </button>
              </div>
            ))}

            {/* Add button */}
            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  aspectRatio: "1", borderRadius: 10, border: `2px dashed ${DIV}`,
                  background: "transparent", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                <Plus size={20} color={MID} />
                <span style={{ fontSize: 11, color: MID, fontWeight: 500 }}>Add</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={e => handleFiles(e.target.files)}
          />

          <p style={{ fontSize: 12, color: MID, marginTop: 10, lineHeight: 1.5 }}>
            Photos are compressed automatically. Add up to {MAX_PHOTOS} photos from the event.
          </p>
        </div>
      </div>

      {/* Save bar — sits above the mobile bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: BG, borderTop: `1px solid ${DIV}`,
        padding: "12px 20px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        display: "flex", gap: 10,
        zIndex: 50,
      }}
        className="recap-save-bar"
      >
        <style>{`
          @media (max-width: 767px) {
            .recap-save-bar { bottom: 64px !important; padding-bottom: 12px !important; }
          }
        `}</style>
        <button
          onClick={() => navigate(-1)}
          style={{
            flex: 1, height: 48, borderRadius: 24,
            border: `1.5px solid ${DIV}`, background: "transparent",
            fontFamily: INTER, fontSize: 15, fontWeight: 600, color: DARK, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || photos.length === 0}
          style={{
            flex: 2, height: 48, borderRadius: 24, border: "none",
            background: photos.length === 0 ? DIV : TEAL,
            fontFamily: INTER, fontSize: 15, fontWeight: 600,
            color: photos.length === 0 ? MID : "#fff",
            cursor: photos.length === 0 ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {saving ? "Saving…" : existingRecap ? "Update Recap" : "Save Recap"}
        </button>
      </div>
    </div>
  );
};

export default RecapUpload;
