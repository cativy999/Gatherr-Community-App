import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { isOwnerUserId } from "@/lib/admin";
import { toast } from "sonner";

type RoomSize = "large" | "medium" | "small";
type OptionType = "airbnb" | "hotel" | "custom";

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
  const perPersonPerNight = perNight > 0 && guestsAssigned > 0 ? perNight / guestsAssigned : 0;

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
  const headerTitle = propertyName || TYPE_LABELS[currentType];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* datalist for room name suggestions */}
      <datalist id="room-presets">
        {ROOM_PRESETS.map((r) => <option key={r} value={r} />)}
      </datalist>

      {/* ── Desktop: two-column wrapper ── */}
      <div className="md:grid md:grid-cols-2 md:min-h-screen">

        {/* ════════════════════════════════
            LEFT COLUMN: image + listing info
            ════════════════════════════════ */}
        <div className="md:border-r md:border-border">
          {/* Back button */}
          <div className="px-5 pt-6 pb-3 flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {fetchLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
            )}
          </div>

          {/* Hero image */}
          <div className="w-full aspect-video md:aspect-[4/3] overflow-hidden bg-muted relative">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <span className="text-6xl">
                  {currentType === "hotel" ? "🏨" : currentType === "custom" ? "📍" : "🏡"}
                </span>
                {fetchLoading ? (
                  <p className="text-xs animate-pulse">Fetching photo…</p>
                ) : (
                  <p className="text-xs">
                    {currentType === "custom" ? "Custom location" : "Paste a URL to auto-fill"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Property info below hero */}
          <div className="px-5 py-5 space-y-5">
            {/* Property name — large, editable */}
            <div>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder={ph.name}
                className="w-full text-2xl font-bold bg-transparent outline-none border-b-2 border-transparent focus:border-foreground/20 transition-colors pb-1 placeholder:text-muted-foreground/40"
                style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
              />
            </div>

            {/* Listing URL (auto-fills name & photo) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {currentType === "custom" ? "Address" : "Listing URL"}
              </label>
              <div className="relative">
                <input
                  type={currentType === "custom" ? "text" : "url"}
                  value={propertyUrl}
                  onChange={(e) => setPropertyUrl(e.target.value)}
                  placeholder={ph.url}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-1 focus:ring-foreground/30 transition-all pr-10"
                />
                {fetchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {currentType !== "custom" && !propertyUrl && (
                <p className="text-xs text-muted-foreground">
                  Paste the link — name &amp; photo fill in automatically
                </p>
              )}
              {imageUrl && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Photo URL (auto-filled)"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/40 text-xs outline-none focus:ring-1 focus:ring-foreground/30 transition-all text-muted-foreground"
                />
              )}
            </div>

            {/* Guests Assigned */}
            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-border bg-card">
              <div>
                <p className="text-sm font-semibold">Guests Assigned</p>
                <p className="text-xs text-muted-foreground mt-0.5">Max capacity: {maxCapacity} guests</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setGuestsAssigned((c) => Math.max(1, c - 1))}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-light"
                >
                  −
                </button>
                <span className="text-base font-semibold w-5 text-center tabular-nums">{guestsAssigned}</span>
                <button
                  onClick={() => setGuestsAssigned((c) => Math.min(maxCapacity, c + 1))}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-light"
                >
                  +
                </button>
              </div>
            </div>

            {/* Cost + Nights (two fields) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Total Cost ($)
                </label>
                <input
                  type="number"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="2250"
                  min="0"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-1 focus:ring-foreground/30 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Nights
                </label>
                <input
                  type="number"
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                  placeholder="2"
                  min="1"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-1 focus:ring-foreground/30 transition-all"
                />
              </div>
            </div>

            {/* Desktop-only Save button */}
            <div className="hidden md:block pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !propertyName.trim()}
                className="w-full py-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-85 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Option"}
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════
            RIGHT COLUMN: sleeping spaces + pricing
            ════════════════════════════════ */}
        <div className="px-5 py-6 space-y-4">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            Sleeping Spaces / Rooms
          </p>

          {sleepingSpaces.map((space, idx) => {
            const roomTotalPerNight = perPersonPerNight * space.sleeps;
            return (
              <div key={idx} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Room name row */}
                <div className="flex items-center gap-2 px-4 py-3.5">
                  <input
                    type="text"
                    list="room-presets"
                    value={space.name}
                    onChange={(e) => updateSpace(idx, { name: e.target.value })}
                    placeholder="e.g. Master Bedroom"
                    className="flex-1 text-sm font-semibold bg-transparent outline-none min-w-0 placeholder:text-muted-foreground/40"
                  />
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setOpenMenuIdx(openMenuIdx === idx ? null : idx)}
                      className="p-1 rounded-full hover:bg-muted transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {openMenuIdx === idx && (
                      <div className="absolute right-0 top-7 z-20 bg-popover border border-border rounded-xl shadow-xl p-1 min-w-[130px]">
                        <button
                          onClick={() => removeSpace(idx)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete room
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Room size row */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-sm text-muted-foreground w-20 flex-shrink-0">Room Size</span>
                  <div className="flex gap-1.5">
                    {(["large", "medium", "small"] as RoomSize[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateSpace(idx, { size: s })}
                        className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                          space.size === s
                            ? "bg-foreground text-background border border-foreground"
                            : "border border-border text-foreground/70 hover:bg-muted"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleeps row */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-sm text-muted-foreground w-20 flex-shrink-0">Sleeps</span>
                  <div className="flex items-center gap-4 ml-auto">
                    <button
                      onClick={() => updateSpace(idx, { sleeps: Math.max(1, space.sleeps - 1) })}
                      className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-light"
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold w-4 text-center tabular-nums">{space.sleeps}</span>
                    <button
                      onClick={() => updateSpace(idx, { sleeps: space.sleeps + 1 })}
                      className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-light"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Per-room pricing rows */}
                {totalCostNum > 0 && (
                  <>
                    <div className="h-px bg-border mx-4" />
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Per person / night</span>
                        <span className="text-sm text-muted-foreground">
                          ${perPersonPerNight.toFixed(0)}/person
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-sm font-bold">
                          ${roomTotalPerNight.toFixed(0)} / per person
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Add Sleeping Space button */}
          <button
            onClick={addSpace}
            className="w-full py-3.5 rounded-2xl border border-foreground text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
          >
            + Add Sleeping Space
          </button>

          {/* Pricing Summary */}
          {totalCostNum > 0 && (
            <div className="rounded-2xl bg-muted/50 border border-border px-4 py-4">
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-3">
                Pricing Summary
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  ${perNight.toFixed(0)} / night
                </span>
                <span className="text-sm font-bold">
                  ${totalCostNum.toLocaleString()} total ({nightsNum} {nightsNum === 1 ? "night" : "nights"})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky Save button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-sm border-t border-border md:hidden">
        <button
          onClick={handleSave}
          disabled={saving || !propertyName.trim()}
          className="w-full py-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Option"}
        </button>
      </div>
    </div>
  );
};

export default LodgingOption;
