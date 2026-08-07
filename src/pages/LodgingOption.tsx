import { CE_BG,CE_LIGHT } from '../tokens';
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ChevronLeft, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { isOwnerUserId } from "@/lib/admin";
import { toast } from "sonner";

type RoomSize = "large" | "medium" | "small";
type OptionType = "airbnb" | "hotel" | "custom";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG      = CE_BG;
const ICON_BG = "#E4DCCF";
const DARK    = "#2C2523";
const MID     = "#635C59";
const TEAL    = "#1F4E5B";
const DIVIDER = CE_LIGHT;
const SERIF   = "'EB Garamond', Georgia, serif";

interface SleepingSpace {
  id?: string;
  name: string;
  size: RoomSize;
  sleeps: number;
}

const TYPE_LABELS: Record<OptionType, string> = {
  airbnb: "Airbnb / Vacation Rental",
  hotel: "Hotel / Shared Room Block",
  custom: "Custom Address",
};

const TYPE_PLACEHOLDERS: Record<OptionType, { name: string; url: string }> = {
  airbnb: { name: "e.g. Modern 5-Bedroom House", url: "https://www.airbnb.com/rooms/…" },
  hotel:  { name: "e.g. Marriott Conference Center", url: "https://www.marriott.com/…" },
  custom: { name: "e.g. Sarah's place", url: "123 Main St, Los Angeles, CA" },
};

const ROOM_PRESETS = [
  "Master Bedroom",
  "Guest Bedroom",
  "Bedroom 2",
  "Bedroom 3",
  "Bedroom 4",
  "Loft",
  "Den",
  "Bunk Room",
  "Living Room (pull-out)",
  "Studio",
  "Couch / Common Area",
];

const LodgingOption = () => {
  const { eventId, groupId, type: typeParam, optionId } = useParams<{
    eventId: string;
    groupId: string;
    type?: string;
    optionId?: string;
  }>();

  const isNew = !!typeParam;
  const optionType = (typeParam ?? "airbnb") as OptionType;
  const navigate = useNavigate();
  const { session } = useAuth();

  const [displayType, setDisplayType] = useState<OptionType>(optionType);
  const [propertyName, setPropertyName] = useState("");
  const [propertyUrl, setPropertyUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [nights, setNights] = useState("");
  const [guestsAssigned, setGuestsAssigned] = useState(5);
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [sleepingSpaces, setSleepingSpaces] = useState<SleepingSpace[]>([
    { name: "Master Bedroom", size: "large", sleeps: 2 },
  ]);
  const [saving, setSaving] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isOwnerUserId(session?.user?.id)) return <Navigate to="/wards" replace />;

  // ── Auto-calculate nights from event ──────
  useEffect(() => {
    if (!eventId) return;
    supabase
      .from("events")
      .select("date, end_date")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (!data?.date || nights) return;
        if (data.end_date) {
          const start = new Date(data.date);
          const end = new Date(data.end_date);
          const diffNights = Math.max(1, Math.round(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
          ));
          setNights(diffNights.toString());
        }
      });
  }, [eventId]);

  // ── Auto-fetch OG data when URL pasted ────
  useEffect(() => {
    if (displayType === "custom") return;
    const url = propertyUrl.trim();
    if (!url.startsWith("http")) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => autoFill(url), 900);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [propertyUrl]);

  const autoFill = async (url: string) => {
    setFetchLoading(true);
    try {
      const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.status !== "success" || !json.data) return;
      const { title, description, image } = json.data;
      if (title && !propertyName) {
        const cleaned = title.replace(/^Airbnb\s*\|\s*/i, "").split("·")[0].trim();
        if (cleaned) setPropertyName(cleaned);
      }
      if (image?.url && !imageUrl) setImageUrl(image.url);
      const combined = `${title ?? ""} ${description ?? ""}`;
      const guestMatch = combined.match(/(\d+)\s+guests?/i);
      if (guestMatch) {
        const cap = parseInt(guestMatch[1]);
        setMaxCapacity(cap);
        setGuestsAssigned((prev) => Math.min(prev, cap));
      }
    } catch {
      // silent fail
    } finally {
      setFetchLoading(false);
    }
  };

  // ── Load existing option ──────────────────
  useEffect(() => {
    if (isNew || !optionId) return;
    supabase
      .from("lodging_options")
      .select("*, lodging_sleeping_spaces(*)")
      .eq("id", optionId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setDisplayType((data.type as OptionType) ?? "airbnb");
        setPropertyName(data.name ?? "");
        setPropertyUrl(data.url ?? "");
        setImageUrl(data.image_url ?? "");
        setTotalCost(data.total_cost?.toString() ?? "");
        setNights(data.nights?.toString() ?? "");
        setGuestsAssigned(data.guests_assigned ?? 5);
        setMaxCapacity(data.max_capacity ?? 10);
        const spaces = (data.lodging_sleeping_spaces ?? [])
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            size: (s.size ?? "large") as RoomSize,
            sleeps: s.sleeps ?? 1,
          }));
        if (spaces.length > 0) setSleepingSpaces(spaces);
      });
  }, [optionId, isNew]);

  // ── Derived pricing ───────────────────────
  const totalCostNum = parseFloat(totalCost) || 0;
  const nightsNum = parseInt(nights) || 1;
  const perNight = totalCostNum > 0 ? totalCostNum / nightsNum : 0;
  const roomCostForStay = (space: SleepingSpace) =>
    totalCostNum > 0 && guestsAssigned > 0
      ? (space.sleeps / guestsAssigned) * totalCostNum
      : 0;

  // ── Save ──────────────────────────────────
  const handleSave = async () => {
    if (!propertyName.trim()) { toast.error("Please enter a property name"); return; }
    setSaving(true);
    try {
      const payload = {
        lodging_group_id: groupId,
        name: propertyName.trim(),
        url: propertyUrl.trim() || null,
        image_url: imageUrl.trim() || null,
        total_cost: totalCostNum || null,
        nights: nightsNum || null,
        guests_assigned: guestsAssigned,
        max_capacity: maxCapacity,
      };
      let savedOptionId = optionId;
      if (isNew) {
        const { data, error } = await supabase
          .from("lodging_options")
          .insert({ ...payload, type: displayType })
          .select("id").single();
        if (error || !data) { toast.error(error?.message || "Failed to save"); return; }
        savedOptionId = data.id;
      } else {
        const { error } = await supabase.from("lodging_options").update(payload).eq("id", optionId!);
        if (error) { toast.error(error.message || "Failed to save"); return; }
      }
      if (savedOptionId) {
        await supabase.from("lodging_sleeping_spaces").delete().eq("lodging_option_id", savedOptionId);
        if (sleepingSpaces.length > 0) {
          await supabase.from("lodging_sleeping_spaces").insert(
            sleepingSpaces.map((s, i) => ({
              lodging_option_id: savedOptionId,
              name: s.name, size: s.size, sleeps: s.sleeps, sort_order: i,
            }))
          );
        }
      }
      toast.success("Option saved!");
      navigate(`/event/${eventId}/lodging/${groupId}`);
    } finally {
      setSaving(false);
    }
  };

  const addSpace = () =>
    setSleepingSpaces((prev) => [...prev, { name: "", size: "medium", sleeps: 1 }]);
  const updateSpace = (idx: number, patch: Partial<SleepingSpace>) =>
    setSleepingSpaces((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  const removeSpace = (idx: number) => {
    setSleepingSpaces((prev) => prev.filter((_, i) => i !== idx));
    setOpenMenuIdx(null);
  };

  const currentType = displayType;
  const ph = TYPE_PLACEHOLDERS[currentType];

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 112 }}>
      <datalist id="room-presets">
        {ROOM_PRESETS.map((r) => <option key={r} value={r} />)}
      </datalist>

      {/* Desktop two-column wrapper */}
      <div className="md:grid md:grid-cols-2 md:min-h-screen">

        {/* ══ LEFT COLUMN: image + listing info ══ */}
        <div style={{ borderRight: `1px solid ${DIVIDER}` }}>
          {/* Back button */}
          <div className="px-5 pt-6 pb-3 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-70"
              style={{ background: ICON_BG }}
            >
              <ChevronLeft className="h-5 w-5" style={{ color: DARK }} />
            </button>
            {fetchLoading && (
              <Loader2 className="h-4 w-4 animate-spin ml-auto" style={{ color: MID }} />
            )}
          </div>

          {/* Hero image */}
          <div className="w-full aspect-video md:aspect-[4/3] overflow-hidden relative" style={{ background: ICON_BG }}>
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <span className="text-6xl">
                  {currentType === "hotel" ? "🏨" : currentType === "custom" ? "📍" : "🏡"}
                </span>
                {fetchLoading ? (
                  <p className="text-xs animate-pulse" style={{ color: MID }}>Fetching photo…</p>
                ) : (
                  <p className="text-xs" style={{ color: MID }}>
                    {currentType === "custom" ? "Custom location" : "Paste a URL to auto-fill"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Property info */}
          <div className="px-5 py-5 space-y-5">
            {/* Property name */}
            <div>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder={ph.name}
                className="w-full text-2xl font-bold bg-transparent outline-none pb-1 transition-colors"
                style={{
                  fontFamily: SERIF,
                  color: DARK,
                  borderBottom: `2px solid ${DIVIDER}`,
                }}
                onFocus={(e) => (e.target.style.borderBottomColor = TEAL)}
                onBlur={(e) => (e.target.style.borderBottomColor = DIVIDER)}
              />
            </div>

            {/* Listing URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: MID }}>
                {currentType === "custom" ? "Address" : "Listing URL"}
              </label>
              <div className="relative">
                <input
                  type={currentType === "custom" ? "text" : "url"}
                  value={propertyUrl}
                  onChange={(e) => setPropertyUrl(e.target.value)}
                  placeholder={ph.url}
                  className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all pr-10"
                  style={{ border: `1.5px solid ${DIVIDER}`, background: "#fff", color: DARK }}
                />
                {fetchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: MID }} />
                  </div>
                )}
              </div>
              {currentType !== "custom" && !propertyUrl && (
                <p className="text-xs" style={{ color: MID }}>
                  Paste the link — name &amp; photo fill in automatically
                </p>
              )}
              {imageUrl && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Photo URL (auto-filled)"
                  className="w-full h-9 px-3 rounded-lg text-xs outline-none transition-all"
                  style={{ border: `1px solid ${DIVIDER}`, background: ICON_BG, color: MID }}
                />
              )}
            </div>

            {/* Guests Assigned */}
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-xl"
              style={{ border: `1px solid ${DIVIDER}`, background: "#fff" }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: DARK }}>Guests Assigned</p>
                <p className="text-xs mt-0.5" style={{ color: MID }}>Max capacity: {maxCapacity} guests</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setGuestsAssigned((c) => Math.max(1, c - 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 text-lg"
                  style={{ border: `1px solid ${DIVIDER}`, color: DARK }}
                >
                  −
                </button>
                <span className="text-base font-semibold w-5 text-center tabular-nums" style={{ color: DARK }}>
                  {guestsAssigned}
                </span>
                <button
                  onClick={() => setGuestsAssigned((c) => Math.min(maxCapacity, c + 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 text-lg"
                  style={{ border: `1px solid ${DIVIDER}`, color: DARK }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Cost + Nights */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: MID }}>
                  Total Cost ($)
                </label>
                <input
                  type="number"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="2250"
                  min="0"
                  className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all"
                  style={{ border: `1.5px solid ${DIVIDER}`, background: "#fff", color: DARK }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: MID }}>
                  Nights
                </label>
                <input
                  type="number"
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                  placeholder="2"
                  min="1"
                  className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all"
                  style={{ border: `1.5px solid ${DIVIDER}`, background: "#fff", color: DARK }}
                />
              </div>
            </div>

            {/* Desktop Save button */}
            <div className="hidden md:block pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !propertyName.trim()}
                className="w-full py-4 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: TEAL }}
              >
                {saving ? "Saving…" : "Save Option"}
              </button>
            </div>
          </div>
        </div>

        {/* ══ RIGHT COLUMN: sleeping spaces + pricing ══ */}
        <div className="px-5 py-6 space-y-4">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: MID }}>
            Sleeping Spaces / Rooms
          </p>

          {sleepingSpaces.map((space, idx) => {
            const roomTotal = roomCostForStay(space);
            return (
              <div
                key={idx}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${DIVIDER}`, background: "#fff" }}
              >
                {/* Room name row */}
                <div className="flex items-center gap-2 px-4 py-3.5">
                  <input
                    type="text"
                    list="room-presets"
                    value={space.name}
                    onChange={(e) => updateSpace(idx, { name: e.target.value })}
                    placeholder="e.g. Master Bedroom"
                    className="flex-1 text-sm font-semibold bg-transparent outline-none min-w-0"
                    style={{ color: DARK }}
                  />
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setOpenMenuIdx(openMenuIdx === idx ? null : idx)}
                      className="p-1 rounded-full transition-opacity hover:opacity-70"
                    >
                      <MoreVertical className="h-4 w-4" style={{ color: MID }} />
                    </button>
                    {openMenuIdx === idx && (
                      <div
                        className="absolute right-0 top-7 z-20 rounded-xl shadow-xl p-1 min-w-[130px]"
                        style={{ background: "#fff", border: `1px solid ${DIVIDER}` }}
                      >
                        <button
                          onClick={() => removeSpace(idx)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 transition-opacity hover:opacity-70"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete room
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ height: 1, background: DIVIDER }} />

                {/* Room size row */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-sm w-20 flex-shrink-0" style={{ color: MID }}>Room Size</span>
                  <div className="flex gap-1.5">
                    {(["large", "medium", "small"] as RoomSize[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateSpace(idx, { size: s })}
                        className="px-3.5 py-1 rounded-full text-xs font-medium transition-all"
                        style={
                          space.size === s
                            ? { background: TEAL, color: "#fff", border: `1px solid ${TEAL}` }
                            : { border: `1px solid ${DIVIDER}`, color: MID, background: "#fff" }
                        }
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleeps row */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-sm w-20 flex-shrink-0" style={{ color: MID }}>Sleeps</span>
                  <div className="flex items-center gap-4 ml-auto">
                    <button
                      onClick={() => updateSpace(idx, { sleeps: Math.max(1, space.sleeps - 1) })}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 text-lg"
                      style={{ border: `1px solid ${DIVIDER}`, color: DARK }}
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold w-4 text-center tabular-nums" style={{ color: DARK }}>
                      {space.sleeps}
                    </span>
                    <button
                      onClick={() => updateSpace(idx, { sleeps: space.sleeps + 1 })}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 text-lg"
                      style={{ border: `1px solid ${DIVIDER}`, color: DARK }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Per-room cost */}
                {totalCostNum > 0 && roomTotal > 0 && (
                  <>
                    <div style={{ height: 1, background: DIVIDER, marginLeft: 16, marginRight: 16 }} />
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm" style={{ color: MID }}>Room total</span>
                      <span className="text-sm font-bold" style={{ color: DARK }}>
                        ${roomTotal.toFixed(0)} for {nightsNum} {nightsNum === 1 ? "night" : "nights"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Add Sleeping Space */}
          <button
            onClick={addSpace}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ border: `1.5px solid ${DIVIDER}`, color: DARK, background: "#fff" }}
          >
            + Add Sleeping Space
          </button>

          {/* Pricing Summary */}
          {totalCostNum > 0 && (
            <div className="rounded-2xl px-4 py-4" style={{ background: ICON_BG, border: `1px solid ${DIVIDER}` }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: MID }}>
                Pricing Summary
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: MID }}>
                  ${perNight.toFixed(0)} / night
                </span>
                <span className="text-sm font-bold" style={{ color: DARK }}>
                  ${totalCostNum.toLocaleString()} total ({nightsNum} {nightsNum === 1 ? "night" : "nights"})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky Save button */}
      <div
        className="fixed bottom-0 left-0 right-0 p-5 md:hidden"
        style={{ background: BG, borderTop: `1px solid ${DIVIDER}` }}
      >
        <button
          onClick={handleSave}
          disabled={saving || !propertyName.trim()}
          className="w-full py-4 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: TEAL }}
        >
          {saving ? "Saving…" : "Save Option"}
        </button>
      </div>
    </div>
  );
};

export default LodgingOption;
