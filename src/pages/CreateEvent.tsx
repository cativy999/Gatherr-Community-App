import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Calendar, MapPin, Image as ImageIcon, Trash2, Loader2, Clock, SunMedium, LandPlot, HandPlatter, Rainbow } from "lucide-react";
import confetti from "canvas-confetti";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { session, loading: sessionLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<"ward" | "community" | null>(null);
  const [isFree, setIsFree] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([25, 35]);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState<{ display: string; city: string; lat: number; lng: number }[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [wardType, setWardType] = useState<string | null>(null);

  // Load existing event data if editing
  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
      if (error) { console.error("Error fetching event:", error); return; }
      setTitle(data.title ?? "");
      setDescription(data.description ?? "");
      setCategory(data.category ?? null);
      setIsFree(data.is_free ?? true);
      setDate(data.date ?? "");
      setLocation(data.location ?? "");
      setImagePreview(data.image_url ?? null);
      setAgeRange([data.age_min ?? 25, data.age_max ?? 35]);
      setTime(data.time ?? "");
      setAddress(data.address ?? "");
      setLocationSearch(data.address ?? "");
      setWardType(data.ward_type ?? null);
    };
    fetchEvent();
  }, [id]);

  useEffect(() => {
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    if (!locationSearch.trim()) { setLocationResults([]); return; }
    locationDebounceRef.current = setTimeout(async () => {
      setLocationSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&addressdetails=1&limit=6`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        const locations = data.map((item: any) => {
          const { city, town, village, state, country } = item.address;
          const cityName = city || town || village || item.display_name.split(",")[0];
          return {
            display: item.display_name,
            city: `${cityName}, ${state || country}`,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });
        setLocationResults(locations);
      } catch { setLocationResults([]); }
      setLocationSearching(false);
    }, 400);
  }, [locationSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressed = new File([blob], file.name, { type: "image/jpeg" });
            setImageFile(compressed);
            setImagePreview(URL.createObjectURL(compressed));
          }
        }, "image/jpeg", 0.7);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => { setDeleteOpen(true); };

  const confirmDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { alert("Failed to delete event."); console.error(error); }
    else { navigate("/post"); }
  };

  const handleSubmit = async () => {
    if (!title || !date || !address || !category) {
      alert("Please fill in title, date, location and category!");
      return;
    }
    if (sessionLoading) { alert("Still loading, please wait a moment!"); return; }
    if (!session?.user) { alert("Not logged in!"); return; }

    setLoading(true);
    let imageUrl = imagePreview;

    if (imageFile) {
      const fileName = `${session.user.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, imageFile);
      if (uploadError) {
        console.error("Image upload error:", uploadError);
      } else {
        const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }
    }

    const eventData = {
      user_id: session.user.id,
      title,
      description,
      category,
      is_free: isFree,
      date,
      location: location || address,
      image_url: imageUrl,
      status: "published",     
       age_min: ageRange[0],
      age_max: ageRange[1],
      time,
      address,
      lat,
      lng,
      ward_type: category === "ward" ? wardType : null,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("events").update(eventData).eq("id", id));
    } else {
      ({ error } = await supabase.from("events").insert(eventData));
    }

    if (error) {
      console.error("Error saving event:", JSON.stringify(error));
      alert(JSON.stringify(error));
    } else {
      // 🎉 Confetti celebration!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#a855f7", "#ec4899", "#f97316", "#facc15", "#4ade80"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#a855f7", "#ec4899", "#f97316"],
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#facc15", "#4ade80", "#60a5fa"],
        });
      }, 200);
      setTimeout(() => navigate("/post"), 2200);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">{isEditing ? "Edit Event" : "Create Event"}</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/post")}>
              Cancel
            </Button>
            {isEditing && (
              <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={handleDelete} disabled={loading}>
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Image Upload */}
          <div className="relative">
            <div
              className="flex items-center justify-center w-full h-48 bg-secondary rounded-2xl border-2 border-dashed border-border hover:bg-accent transition-colors cursor-pointer overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <div className="text-center space-y-2">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Tap to upload event image</p>
                </div>
              )}
            </div>
            {imagePreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-background/80 backdrop-blur-sm rounded-full text-xs font-semibold border border-border hover:bg-background transition-colors"
              >
                Change Image
              </button>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

          <div className="space-y-4">

            {/* Event Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Title</label>
              <Input
                placeholder="e.g., Community Picnic"
                className="h-12 text-base"
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitle(val.charAt(0).toUpperCase() + val.slice(1));
                }}

                maxLength={80}
              />
               <div className="text-sm text-gray-500 text-right">
    {title.length}/80
  </div>
            </div>

    
            {/* Address */}
<div className="space-y-2">
  <label className="text-sm font-medium flex items-center gap-2">
    <MapPin className="h-4 w-4" />
    Address
    <span className="text-xs text-muted-foreground font-normal">— Type to search and select from the list</span>
  </label>
  <div className="relative" ref={locationRef}>
    <Input
      placeholder="Search for an address..."
      className="h-12 text-base"
      value={locationSearch}
      onChange={(e) => {
        setLocationSearch(e.target.value);
        setLocation(e.target.value);
        setAddress(e.target.value);
        setLat(null); // clear map when typing
        setLng(null);
      }}
      onFocus={() => setLocationOpen(true)}
    />
    {locationOpen && locationResults.length > 0 && (
      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto">
        {locationSearching && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {locationResults.map((result) => (
          <button
            key={result.display}
            type="button"
            onClick={() => {
              setLocation(result.city);
              setAddress(result.display);
              setLocationSearch(result.display);
              setLat(result.lat);
              setLng(result.lng);
              setLocationOpen(false);
            }}
            className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-2"
          >
            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            {result.display}
          </button>
        ))}
      </div>
    )}
  </div>

  {/* Map preview — shows after address is selected */}
  {lat && lng && (
    <div className="rounded-2xl overflow-hidden border border-border mt-2 relative">
      {/* Address pill overlay */}
      <div className="absolute top-3 left-3 right-10 z-10 bg-white rounded-xl shadow px-3 py-2 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">
            {address.split(",")[0]}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {address.split(",").slice(1).join(",").trim()}
          </p>
        </div>
      </div>
      {/* X to clear */}
      <button
        type="button"
        onClick={() => { setLat(null); setLng(null); setAddress(""); setLocationSearch(""); setLocation(""); }}
        className="absolute top-3 right-3 z-10 bg-white rounded-full p-1.5 shadow hover:bg-gray-100 transition-colors"
      >
        <span className="text-gray-500 text-sm font-medium leading-none">✕</span>
      </button>
      {/* Google Maps iframe */}
      <iframe
        width="100%"
        height="200"
        style={{ border: 0, display: "block" }}
        loading="lazy"
        allowFullScreen
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
      />
    </div>
  )}
</div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Tell people about your event..."
                className="min-h-32 text-base"
                value={description}
                onChange={(e) => {
                  const val = e.target.value;
                  setDescription(val.charAt(0).toUpperCase() + val.slice(1));
                }}
                maxLength={2000}
              />
              <div className="text-sm text-gray-500 text-right">
    {description.length}/2000
  </div>
            </div>

           {/* Category */}
<div className="space-y-2">
  <label className="text-sm font-medium">Activity Category</label>
  <div className="grid grid-cols-2 gap-3">
    <Button
      type="button"
      variant={category === "ward" ? "default" : "outline"}
      size="lg"
      className="rounded-full h-12 text-base"
      onClick={() => setCategory("ward")}
    >
      Ward Activity
    </Button>
    <Button
      type="button"
      variant={category === "community" ? "default" : "outline"}
      size="lg"
      className="rounded-full h-12 text-base"
      onClick={() => setCategory("community")}
    >
      Community Activity
    </Button>
  </div>
</div>

{/* Ward Type — only show when Ward is selected */}
{category === "ward" && (
  <div className="space-y-3 pb-12">
    <label className="text-sm font-medium">Type</label>
    <div className="grid grid-cols-2 gap-3 mb-12">
      {[
        { id: "spiritual", label: "Spiritual", desc: "Temple, study, devotionals", icon: <SunMedium className="h-4 w-4" /> },
        { id: "fhe", label: "FHE", desc: "Family Home Evening activities", icon: <LandPlot className="h-4 w-4" /> },
        { id: "service", label: "Service", desc: "Volunteering, charity work", icon: <HandPlatter className="h-4 w-4" /> },
        { id: "general", label: "General", desc: "Social gatherings & other", icon: <Rainbow className="h-4 w-4" /> },
      ].map((type) => (
        <button
  key={type.id}
  type="button"
  onClick={() => setWardType(type.id)}
  className={`rounded-2xl text-left transition-all overflow-hidden ${
    wardType === type.id
      ? "border-[2px] border-primary"
      : "border-[1px] border-border/20 hover:border-primary/10"
  }`}
>
  {wardType === type.id ? (
    <>
      <div className="bg-primary px-3 py-2 flex items-center gap-1.5">
        {type.icon && <span className="text-white">{type.icon}</span>}
        <p className="font-semibold text-sm text-white">{type.label}</p>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs text-black">{type.desc}</p>
      </div>
    </>
  ) : (
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        {type.icon}
        <p className="font-semibold text-sm">{type.label}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{type.desc}</p>
    </div>
  )}
</button>
      ))}
    </div>
  </div>
)}

            {/* Age Range */}
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Age Range</label>
                <span className="text-sm font-bold text-primary">{ageRange[0]}–{ageRange[1]}</span>
              </div>
              <div className="relative">
                <div className="relative flex justify-between mb-2" style={{
                  paddingLeft: `${((ageRange[0] - 18) / 62) * 100}%`,
                  paddingRight: `${((80 - ageRange[1]) / 62) * 100}%`,
                }}>
                  <span className="text-xs font-semibold text-primary">{ageRange[0]}</span>
                  <span className="text-xs font-semibold text-primary">{ageRange[1]}</span>
                </div>
                <Slider
                  min={18}
                  max={80}
                  step={1}
                  value={ageRange}
                  onValueChange={(val) => setAgeRange(val as [number, number])}
                  className="w-full"
                />
              </div>
            </div>

            {/* Free Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Free Event</label>
                <p className="text-xs text-muted-foreground">
                  {isFree ? "This event is free" : "Attendees need to pay"}
                </p>
              </div>
              <Switch
                checked={isFree}
                onCheckedChange={setIsFree}
                className="data-[state=checked]:bg-green-500"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </label>
                <Input
                  type="date"
                  className="h-12 text-base w-full block"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </label>
                <select
                  className="w-full h-12 px-3 text-base rounded-md border border-input bg-background"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                >
                 <option value="">Select a time...</option>
                  {/* 6 AM – 11:30 PM */}
                  {Array.from({ length: 36 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 6;
                    const min = i % 2 === 0 ? "00" : "30";
                    const val = `${String(hour).padStart(2, "0")}:${min}`;
                    const label = new Date(`2000-01-01T${val}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                    return <option key={val} value={val}>{label}</option>;
                  })}
                  {/* Late Night (12 AM – 5:30 AM) */}
                  <option disabled>── Late Night ──</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = Math.floor(i / 2);
                    const min = i % 2 === 0 ? "00" : "30";
                    const val = `${String(hour).padStart(2, "0")}:${min}`;
                    const label = new Date(`2000-01-01T${val}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                    return <option key={`late-${val}`} value={val}>{label}</option>;
                  })}
                </select>
              </div>
            </div>


          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
          
            <Button
              size="lg"
              className="flex-1 h-14 text-base font-semibold"
              onClick={() => handleSubmit()}
              disabled={loading || sessionLoading}
            >
              {loading ? "Saving..." : "Publish"}
            </Button>
          </div>

          {/* Delete Dialog */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl">
              <DialogHeader>
                <DialogTitle>Delete Event</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Are you sure you want to delete this event? This cannot be undone.</p>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
                  Not now
                </Button>
                <Button variant="destructive" className="flex-1" onClick={confirmDelete}>
                  Yes, delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </main>

      <BottomNav currentPage="post" />
    </div>
  );
};

export default CreateEvent;
