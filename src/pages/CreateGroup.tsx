import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, Image as ImageIcon, Loader2,
  Link, Link2, Globe, Check, Search, X, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Ward data ───────────────────────────────────────────────────────────────

interface WardEntry {
  name: string;
  city?: string;
  type: "YSA" | "SA" | "MSA" | "Branch";
  state: string;
  region: string;
}

const WARD_DATA: WardEntry[] = [
  // ── California · Orange County ──────────────────────────────────────────
  { state: "California", region: "Orange County", name: "Huntington Beach YSA",      city: "Huntington Beach", type: "YSA" },
  { state: "California", region: "Orange County", name: "Huntington Beach SA",       city: "Huntington Beach", type: "SA"  },
  { state: "California", region: "Orange County", name: "Heritage Park Mid-Singles", city: "Orange County",    type: "MSA" },
  { state: "California", region: "Orange County", name: "Heritage Park SA",          city: "Orange County",    type: "SA"  },
  { state: "California", region: "Orange County", name: "Newport Area YSA",          city: "Newport Beach",    type: "YSA" },
  { state: "California", region: "Orange County", name: "Irvine Area YSA",           city: "Irvine",           type: "YSA" },
  { state: "California", region: "Orange County", name: "San Clemente YSA",          city: "San Clemente",     type: "YSA" },

  // ── California · Los Angeles ────────────────────────────────────────────
  { state: "California", region: "Los Angeles", name: "Santa Monica YSA",       city: "Santa Monica",    type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Santa Monica 3rd YSA",   city: "Santa Monica",    type: "YSA" },
  { state: "California", region: "Los Angeles", name: "South Bay YSA",          city: "Torrance",        type: "YSA" },
  { state: "California", region: "Los Angeles", name: "San Gabriel Valley YSA", city: "San Gabriel",     type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Los Angeles 1st YSA",    city: "Los Angeles",     type: "YSA" },
  { state: "California", region: "Los Angeles", name: "UCLA Ward",              city: "Westwood",        type: "YSA" },
  { state: "California", region: "Los Angeles", name: "USC Ward",               city: "Los Angeles",     type: "YSA" },
  { state: "California", region: "Los Angeles", name: "West Valley YSA",        city: "West Hills",      type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Chatsworth 3rd YSA",     city: "Chatsworth",      type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Santa Clarita 2nd YSA",  city: "Santa Clarita",   type: "YSA" },
  { state: "California", region: "Los Angeles", name: "Los Angeles Midsingles",  city: "Los Angeles",     type: "MSA" },
  { state: "California", region: "Los Angeles", name: "Glendale SA Ward",       city: "Glendale",        type: "SA"  },
  { state: "California", region: "Los Angeles", name: "Glendale Single Adult",  city: "Glendale",        type: "SA"  },

  // ── California · Inland Empire ──────────────────────────────────────────
  { state: "California", region: "Inland Empire", name: "Inland Empire YSA",        city: "Rancho Cucamonga", type: "YSA" },
  { state: "California", region: "Inland Empire", name: "Inland Empire Mid-Singles", city: "Rancho Cucamonga", type: "MSA" },
  { state: "California", region: "Inland Empire", name: "Corona Single Adult",       city: "Corona",           type: "SA"  },
  { state: "California", region: "Inland Empire", name: "Chino Valley YSA",          city: "Chino",            type: "YSA" },
  { state: "California", region: "Inland Empire", name: "Claremont 3rd YSA",         city: "Claremont",        type: "YSA" },
  { state: "California", region: "Inland Empire", name: "Riverside 1st YSA",         city: "Riverside",        type: "YSA" },

  // ── California · San Diego ──────────────────────────────────────────────
  { state: "California", region: "San Diego", name: "San Diego Bay YSA",   city: "San Diego",   type: "YSA" },
  { state: "California", region: "San Diego", name: "Cowles Mountain YSA", city: "San Diego",   type: "YSA" },

  // ── California · Sacramento ─────────────────────────────────────────────
  { state: "California", region: "Sacramento", name: "Folsom Lake YSA", city: "Folsom", type: "YSA" },

  // ── California · Bay Area ───────────────────────────────────────────────
  { state: "California", region: "Bay Area", name: "Berkeley YSA",      city: "Berkeley",   type: "YSA" },
  { state: "California", region: "Bay Area", name: "Antioch YSA",       city: "Antioch",    type: "YSA" },
  { state: "California", region: "Bay Area", name: "Silicon Valley YSA", city: "San Jose",  type: "YSA" },
  { state: "California", region: "Bay Area", name: "Stanford Singles",   city: "Palo Alto", type: "YSA" },
  { state: "California", region: "Bay Area", name: "East Bay Singles",   city: "Oakland",   type: "SA"  },

  // ── Nevada · Las Vegas ──────────────────────────────────────────────────
  { state: "Nevada", region: "Las Vegas", name: "Redrock YSA Ward",          city: "Las Vegas", type: "YSA"    },
  { state: "Nevada", region: "Las Vegas", name: "Robindale YSA Ward",        city: "Las Vegas", type: "YSA"    },
  { state: "Nevada", region: "Las Vegas", name: "Virgin Valley YSA Branch",  city: "Mesquite",  type: "Branch" },
  { state: "Nevada", region: "Las Vegas", name: "Las Vegas Single Adult Ward", city: "Las Vegas", type: "SA"   },
  { state: "Nevada", region: "Las Vegas", name: "Las Vegas Mid-Singles",     city: "Las Vegas", type: "MSA"    },
];

const ALL_US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const STATES_WITH_WARDS = [...new Set(WARD_DATA.map((w) => w.state))];

type FilterType = "All" | "YSA" | "MSA" | "SA";

const TYPE_COLOR: Record<string, string> = {
  YSA:    "bg-blue-100 text-blue-700",
  MSA:    "bg-purple-100 text-purple-700",
  SA:     "bg-orange-100 text-orange-700",
  Branch: "bg-green-100 text-green-700",
};

// ─── WardPicker component ─────────────────────────────────────────────────────

interface WardPickerProps {
  value: string;
  onChange: (ward: string) => void;
  claimedWards: string[];
  userId: string;
}

const WardPicker = ({ value, onChange, claimedWards, userId }: WardPickerProps) => {
  const [open, setOpen]               = useState(false);
  const [stateQuery, setStateQuery]   = useState("");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [filter, setFilter]           = useState<FilterType>("All");
  const [showCantFind, setShowCantFind] = useState(false);
  const [customWard, setCustomWard]   = useState("");
  const [submitting, setSubmitting]   = useState(false);

  // Pre-select state when editing an existing group
  useEffect(() => {
    if (!open || !value) return;
    const found = WARD_DATA.find((w) => w.name === value);
    if (found) {
      setSelectedState(found.state);
      setStateQuery(found.state);
    }
  }, [open, value]);

  const stateMatches =
    stateQuery.length > 0
      ? ALL_US_STATES.filter((s) =>
          s.toLowerCase().startsWith(stateQuery.toLowerCase())
        )
      : [];

  const wardsForState = selectedState
    ? WARD_DATA.filter((w) => w.state === selectedState)
    : [];

  const filteredWards =
    filter === "All"
      ? wardsForState
      : wardsForState.filter((w) => {
          if (filter === "YSA") return w.type === "YSA" || w.type === "Branch";
          if (filter === "MSA") return w.type === "MSA";
          if (filter === "SA")  return w.type === "SA";
          return true;
        });

  // Group filtered wards by region
  const byRegion: Record<string, WardEntry[]> = {};
  filteredWards.forEach((w) => {
    if (!byRegion[w.region]) byRegion[w.region] = [];
    byRegion[w.region].push(w);
  });

  const handleSelectState = (state: string) => {
    setSelectedState(state);
    setStateQuery(state);
    setFilter("All");
    setShowCantFind(false);
  };

  const handleSelectWard = (wardName: string) => {
    const isClaimed = claimedWards.includes(wardName) && wardName !== value;
    if (isClaimed) return;
    onChange(wardName);
    setOpen(false);
  };

  const handleSubmitCustomWard = async () => {
    if (!customWard.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("ward_requests").insert({
      requested_by: userId,
      ward_name: customWard.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't submit. Please try again.");
      return;
    }
    setCustomWard("");
    setShowCantFind(false);
    toast.success("Got it! We'll add your ward to the list soon 🙏");
  };

  const handleClose = () => {
    setOpen(false);
    setShowCantFind(false);
    // Reset state search back to the previously selected state (or empty)
    const found = WARD_DATA.find((w) => w.name === value);
    setSelectedState(found?.state ?? null);
    setStateQuery(found?.state ?? "");
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-12 px-3 text-left text-base rounded-md border border-input bg-background flex items-center justify-between gap-2"
      >
        <span className={value ? "text-foreground truncate" : "text-muted-foreground"}>
          {value || "Select a ward..."}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* ── Modal backdrop ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
          />

          {/* Sheet — bottom sheet on mobile, centered modal on desktop */}
          <div className="relative bg-background flex flex-col shadow-xl
            rounded-t-2xl max-h-[85vh]
            md:rounded-2xl md:max-h-[75vh] md:w-full md:max-w-lg">
            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 pt-3 flex items-center justify-between border-b flex-shrink-0">
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                Select Your Ward
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* ── State search ── */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={stateQuery}
                  onChange={(e) => {
                    setStateQuery(e.target.value);
                    setSelectedState(null);
                  }}
                  placeholder="Search by state  (e.g. Nevada, California)"
                  className="w-full h-12 pl-9 pr-9 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="off"
                />
                {stateQuery && (
                  <button
                    type="button"
                    onClick={() => { setStateQuery(""); setSelectedState(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* State suggestions */}
              {stateMatches.length > 0 && !selectedState && (
                <div className="mt-1 rounded-xl border border-input bg-background shadow-lg overflow-hidden">
                  {stateMatches.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSelectState(s)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-accent border-b border-border last:border-0 flex items-center justify-between"
                    >
                      <span>{s}</span>
                      {!STATES_WITH_WARDS.includes(s) && (
                        <span className="text-xs text-muted-foreground">No wards yet</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Empty state: no state selected yet ── */}
            {!selectedState && stateQuery.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Search className="h-10 w-10 opacity-30" />
                <p className="text-sm">Type a state to find your ward</p>
              </div>
            )}

            {/* ── State selected: show wards ── */}
            {selectedState && (
              <div className="space-y-4">

                {/* Filter tabs */}
                <div className="flex gap-2 flex-wrap">
                  {(["All", "YSA", "MSA", "SA"] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        filter === f
                          ? "bg-foreground text-background border-foreground"
                          : "bg-transparent text-muted-foreground border-border hover:border-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Ward list */}
                {wardsForState.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No wards listed for {selectedState} yet.
                  </p>
                ) : filteredWards.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No {filter} wards in {selectedState}.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(byRegion).map(([region, wards]) => (
                      <div key={region}>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                          {region}
                        </p>
                        <div className="space-y-2">
                          {wards.map((ward) => {
                            const isClaimed  = claimedWards.includes(ward.name) && ward.name !== value;
                            const isSelected = value === ward.name;
                            return (
                              <button
                                key={ward.name}
                                type="button"
                                onClick={() => handleSelectWard(ward.name)}
                                disabled={isClaimed}
                                className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                                  isSelected
                                    ? "border-foreground bg-foreground/5"
                                    : isClaimed
                                    ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
                                    : "border-border hover:border-foreground hover:bg-accent cursor-pointer"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium truncate ${isClaimed ? "text-muted-foreground" : ""}`}>
                                    {ward.name}
                                  </p>
                                  {ward.city && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{ward.city}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLOR[ward.type] ?? "bg-gray-100 text-gray-600"}`}>
                                    {ward.type}
                                  </span>
                                  {isClaimed && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                      Claimed
                                    </span>
                                  )}
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-foreground" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Can't find your ward */}
                <div className="pt-4 pb-6 border-t border-border">
                  {!showCantFind ? (
                    <button
                      type="button"
                      onClick={() => setShowCantFind(true)}
                      className="text-sm text-primary underline underline-offset-2"
                    >
                      Can't find your ward?
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Enter your ward name</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          We'll review and add it to the list soon.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customWard}
                          onChange={(e) => setCustomWard(e.target.value)}
                          placeholder="e.g. Provo 12th Ward"
                          className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          onKeyDown={(e) => { if (e.key === "Enter") handleSubmitCustomWard(); }}
                        />
                        <Button
                          type="button"
                          onClick={handleSubmitCustomWard}
                          disabled={!customWard.trim() || submitting}
                          size="sm"
                          className="h-10 rounded-lg px-4"
                        >
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCantFind(false)}
                        className="text-xs text-muted-foreground underline underline-offset-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
          </div>{/* end sheet */}
        </div>
      )}
    </>
  );
};

// ─── CreateGroup page ─────────────────────────────────────────────────────────

const CreateGroup = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { id } = useParams();
  const isEditing = !!id;
  const coverInputRef  = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [goodToKnow, setGoodToKnow]   = useState("");
  const [address, setAddress]         = useState("");
  const [facebook, setFacebook]       = useState("");
  const [instagram, setInstagram]     = useState("");
  const [website, setWebsite]         = useState("");
  const [coverPreview, setCoverPreview]   = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile]   = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving]         = useState(false);
  const [claimedWards, setClaimedWards] = useState<string[]>([]);
  const [existingCoverUrl, setExistingCoverUrl]   = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);

  // Load claimed wards (all group names except current group when editing)
  useEffect(() => {
    supabase
      .from("groups")
      .select("name, id")
      .then(({ data }) => {
        setClaimedWards(
          (data ?? [])
            .filter((g: any) => g.id !== id)
            .map((g: any) => g.name)
        );
      });
  }, [id]);

  // Load existing data when editing
  useEffect(() => {
    if (!id) return;
    supabase.from("groups").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) return;
      setName(data.name ?? "");
      setDescription(data.description ?? "");
      setGoodToKnow(data.good_to_know ?? "");
      setAddress(data.address ?? "");
      setFacebook(data.facebook_url ?? "");
      setInstagram(data.instagram_url ?? "");
      setWebsite(data.website_url ?? "");
      if (data.cover_image_url) { setCoverPreview(data.cover_image_url); setExistingCoverUrl(data.cover_image_url); }
      if (data.avatar_url)      { setAvatarPreview(data.avatar_url);     setExistingAvatarUrl(data.avatar_url); }
    });
  }, [id]);

  const handleImagePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (v: string) => void,
    setFile: (f: File) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File, folder: string) => {
    const fileName = `${folder}/${session!.user.id}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("group-images").upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from("group-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Please select a ward"); return; }
    if (!session?.user) return;

    setSaving(true);

    let coverUrl  = existingCoverUrl;
    let avatarUrl = existingAvatarUrl;

    if (coverFile)  coverUrl  = await uploadImage(coverFile,  "covers");
    if (avatarFile) avatarUrl = await uploadImage(avatarFile, "avatars");

    const payload = {
      user_id:           session.user.id,
      name:              name.trim(),
      description:       description.trim(),
      good_to_know:      goodToKnow.trim(),
      address:           address.trim(),
      facebook_url:      facebook.trim()  || null,
      instagram_url:     instagram.trim() || null,
      website_url:       website.trim()   || null,
      cover_image_url:   coverUrl,
      avatar_url:        avatarUrl,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("groups").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("groups").insert(payload));
    }

    if (error) {
      console.error(error);
      toast.error(isEditing ? "Failed to update group." : "Failed to create group. Try again.");
    } else {
      toast.success(isEditing ? "Group updated! ✅" : "Group created! 🎉");
      navigate(isEditing ? `/group/${id}` : "/community");
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            {isEditing ? "Edit Group" : "Create Group"}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-6">
        <div className="max-w-xl mx-auto space-y-6">

          {/* Cover Photo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cover Photo</label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="relative w-full h-40 rounded-2xl overflow-hidden border border-border cursor-pointer bg-secondary flex items-center justify-center"
            >
              {coverPreview ? (
                <img src={coverPreview} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-sm">Tap to upload cover photo</span>
                </div>
              )}
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleImagePick(e, setCoverPreview, setCoverFile)} />
          </div>

          {/* Avatar */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Profile Picture</label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-20 h-20 rounded-full border border-border cursor-pointer bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Tap to upload a profile picture for your group</p>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleImagePick(e, setAvatarPreview, setAvatarFile)} />
          </div>

          {/* Ward picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Your Ward *</label>
            <WardPicker
              value={name}
              onChange={setName}
              claimedWards={claimedWards}
              userId={session?.user.id ?? ""}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Address
            </label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 3400 Sawtelle Blvd, Los Angeles, CA" className="h-12" />
          </div>

          {/* About */}
          <div className="space-y-2">
            <label className="text-sm font-medium">About</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people about your group..."
              className="w-full h-28 px-4 py-3 rounded-xl border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={500} />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>

          {/* Good to Know */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Good to Know</label>
            <textarea value={goodToKnow} onChange={(e) => setGoodToKnow(e.target.value)}
              placeholder="e.g. Sacrament Meeting: 12:30 PM, Parking available..."
              className="w-full h-24 px-4 py-3 rounded-xl border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={300} />
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Social Links</label>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Link className="h-4 w-4 text-blue-600" />
              </div>
              <Input value={facebook} onChange={(e) => setFacebook(e.target.value)}
                placeholder="Facebook URL" className="h-11" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <Link2 className="h-4 w-4 text-pink-600" />
              </div>
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)}
                placeholder="Instagram URL" className="h-11" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Globe className="h-4 w-4 text-green-600" />
              </div>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)}
                placeholder="Website URL" className="h-11" />
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="w-full h-12 rounded-2xl text-base font-semibold"
          >
            {saving
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : isEditing ? "Save Changes ✅" : "Create Group 🎉"}
          </Button>

        </div>
      </main>
    </div>
  );
};

export default CreateGroup;
