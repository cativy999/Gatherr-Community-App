import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Calendar, MapPin, Image as ImageIcon, Trash2, Loader2, Clock, SunMedium, LandPlot, HandPlatter, Rainbow, ArrowLeft, Pizza, CupSoda, Cookie, Hamburger, IceCreamCone, Salad, Link } from "lucide-react";
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
  const [category, setCategory] = useState<"ward" | "community" | null>("ward");
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
  const [savedAddresses, setSavedAddresses] = useState<{display: string, city: string, lat: number, lng: number, count: number}[]>(() => {
    try { return JSON.parse(localStorage.getItem("address_history") || "[]"); }
    catch { return []; }
  });
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
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState("");
  const [foodProvided, setFoodProvided] = useState(false);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [duration, setDuration] = useState("");

  const toggleFood = (id: string) => {
    setSelectedFoods(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const foodOptions = [
    { id: "pizza", icon: Pizza },
    { id: "drinks", icon: CupSoda },
    { id: "cookies", icon: Cookie },
    { id: "burgers", icon: Hamburger },
    { id: "icecream", icon: IceCreamCone },
    { id: "salad", icon: Salad },
    { id: "catered", icon: HandPlatter },
  ];

  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
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
      setIsVirtual(!!data.virtual_link);
      setVirtualLink(data.virtual_link ?? "");
      setSelectedFoods(data.food ?? []);
      setFoodProvided((data.food ?? []).length > 0);
      setDuration(data.duration ?? "");
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
          return { display: item.display_name, city: `${cityName}, ${state || country}`, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
        });
        setLocationResults(locations);
      } catch { setLocationResults([]); }
      setLocationSearching(false);
    }, 400);
  }, [locationSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setLocationOpen(false);
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

  const confirmDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { alert("Failed to delete event."); console.error(error); }
    else { navigate("/post"); }
  };

  const handleSubmit = async () => {
    if (!title || !date || (!address && !virtualLink)) {
      alert("Please fill in title, date and location!");
      return;
    }
    if (sessionLoading) { alert("Still loading, please wait a moment!"); return; }
    if (!session?.user) { alert("Not logged in!"); return; }
    setLoading(true);
    let imageUrl = imagePreview;
    if (imageFile) {
      const fileName = `${session.user.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("event-images").upload(fileName, imageFile);
      if (uploadError) { console.error("Image upload error:", uploadError); }
      else {
        const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }
    }
    const eventData = {
      user_id: session.user.id, title, description, category, is_free: isFree, date,
      location: location || address, image_url: imageUrl, status: "published",
      age_min: ageRange[0], age_max: ageRange[1], time, address, lat, lng,
      ward_type: category === "ward" ? wardType : null,
      food: selectedFoods, duration, virtual_link: virtualLink || null,
    };
    let error;
    if (isEditing) {
      ({ error } = await supabase.from("events").update(eventData).eq("id", id));
    } else {
      ({ error } = await supabase.from("events").insert(eventData));
    }
    if (error) { console.error("Error saving event:", JSON.stringify(error)); alert(JSON.stringify(error)); }
    else {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#a855f7", "#ec4899", "#f97316", "#facc15", "#4ade80"] });
      setTimeout(() => {
        confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#a855f7", "#ec4899", "#f97316"] });
        confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#facc15", "#4ade80", "#60a5fa"] });
      }, 200);
      setTimeout(() => navigate("/post"), 2200);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold">{isEditing ? "Edit Event" : "Create Single Event"}</h1>
          </div>
          {isEditing && (
            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => setDeleteOpen(true)} disabled={loading}>
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex flex-col gap-4">

            {/* Image Upload */}
            <div className="relative w-full flex-shrink-0">
              <div className="relative flex items-center justify-center w-full h-56 bg-secondary rounded-2xl border border-gray-400 overflow-hidden" onClick={() => fileInputRef.current?.click()}>
                <img src={imagePreview || "/Peoplebeach.png"} alt="Event image" className="w-full h-full object-cover" />
                {!imagePreview && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <button type="button" className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-full border border-white/60" style={{ backgroundColor: "rgba(144, 144, 144, 0.5)" }}>
                      <ImageIcon className="h-4 w-4" />
                      Tap to upload event image
                    </button>
                  </div>
                )}
                {imagePreview && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                    <span className="px-4 py-1.5 bg-black/50 text-white backdrop-blur-sm rounded-full text-xs font-semibold">Change Image</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            </div>

            <div className="flex-1 space-y-4">

              {/* Event Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Event Title</label>
                <Input placeholder="e.g., Community Picnic" className="h-12 text-base" value={title}
                  onChange={(e) => { const val = e.target.value; setTitle(val.charAt(0).toUpperCase() + val.slice(1)); }} maxLength={80} />
                <div className="text-sm text-gray-500 text-right">{title.length}/80</div>
              </div>

              {/* Event Location */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Event Location
                </label>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Enter a physical address or a virtual link (Zoom, Google Meet, etc.)</p>
                  <div className="relative" ref={locationRef}>
                    <Input
                      placeholder="Address or virtual link..."
                      className="h-12 text-base"
                      value={locationSearch || virtualLink}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isLink = val.startsWith("http://") || val.startsWith("https://");
                        if (isLink) {
                          setVirtualLink(val); setIsVirtual(true); setLocationSearch(""); setAddress(""); setLat(null); setLng(null);
                        } else {
                          setIsVirtual(false); setVirtualLink(""); setLocationSearch(val); setLocation(val); setAddress(val); setLat(null); setLng(null);
                        }
                      }}
                      onFocus={() => setLocationOpen(true)}
                    />

                    {/* Virtual link preview */}
                    {isVirtual && virtualLink && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-xl mt-2">
                        <Link className="h-4 w-4 text-primary flex-shrink-0" />
                        <a href={virtualLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline truncate">{virtualLink}</a>
                        <button type="button" onClick={() => { setVirtualLink(""); setIsVirtual(false); }} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                    )}

                    {/* Address dropdown */}
                    {locationOpen && !isVirtual && (locationResults.length > 0 || (locationSearch === "" && savedAddresses.length > 0)) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto">
                        {locationSearching && <div className="flex items-center justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                        {locationSearch === "" && savedAddresses.length > 0 && (
                          <>
                            <div className="px-4 py-2 text-xs text-muted-foreground font-medium">Recent</div>
                            {savedAddresses.slice(0, 3).map((result) => (
                              <button key={result.display} type="button"
                                onClick={() => { setLocation(result.city); setAddress(result.display); setLocationSearch(result.display); setLat(result.lat); setLng(result.lng); setLocationOpen(false); }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />{result.display}
                              </button>
                            ))}
                            <div className="border-t border-border mx-4" />
                          </>
                        )}
                        {locationResults.map((result) => (
                          <button key={result.display} type="button"
                            onClick={() => {
                              setLocation(result.city); setAddress(result.display); setLocationSearch(result.display); setLat(result.lat); setLng(result.lng); setLocationOpen(false);
                              const history = JSON.parse(localStorage.getItem("address_history") || "[]");
                              const existing = history.find((a: any) => a.display === result.display);
                              if (existing) { existing.count += 1; } else { history.push({ display: result.display, city: result.city, lat: result.lat, lng: result.lng, count: 1 }); }
                              history.sort((a: any, b: any) => b.count - a.count);
                              localStorage.setItem("address_history", JSON.stringify(history.slice(0, 10)));
                              setSavedAddresses(history.slice(0, 3));
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />{result.display}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Map preview */}
                  {lat && lng && (
                    <div className="rounded-2xl overflow-hidden border border-border mt-2 relative">
                      <div className="absolute top-3 left-3 right-10 z-10 bg-white rounded-xl shadow px-3 py-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate leading-tight">{address.split(",")[0]}</p>
                          <p className="text-xs text-muted-foreground truncate">{address.split(",").slice(1).join(",").trim()}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setLat(null); setLng(null); setAddress(""); setLocationSearch(""); setLocation(""); }}
                        className="absolute top-3 right-3 z-10 bg-white rounded-full p-1.5 shadow hover:bg-gray-100 transition-colors">
                        <span className="text-gray-500 text-sm font-medium leading-none">✕</span>
                      </button>
                      <iframe width="100%" height="200" style={{ border: 0, display: "block" }} loading="lazy" allowFullScreen
                        src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`} />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea placeholder="Tell people about your event..." className="min-h-32 text-base" value={description}
                  onChange={(e) => { const val = e.target.value; setDescription(val.charAt(0).toUpperCase() + val.slice(1)); }} maxLength={2000} />
                <div className="text-sm text-gray-500 text-right">{description.length}/2000</div>
              </div>

              {/* Type */}
              <div className="space-y-3 pb-12">
                <label className="text-sm font-medium">Type</label>
                <div className="grid grid-cols-2 gap-3 mb-12">
                  {[
                    { id: "spiritual", label: "Spiritual", desc: "Temple, study, devotionals", icon: <SunMedium className="h-4 w-4" /> },
                    { id: "fhe", label: "FHE", desc: "Family Home Evening activities", icon: <LandPlot className="h-4 w-4" /> },
                    { id: "service", label: "Service", desc: "Volunteering, charity work", icon: <HandPlatter className="h-4 w-4" /> },
                    { id: "general", label: "General", desc: "Social gatherings & other", icon: <Rainbow className="h-4 w-4" /> },
                  ].map((type) => (
                    <button key={type.id} type="button" onClick={() => setWardType(type.id)}
                      className={`rounded-xl text-left transition-all overflow-hidden ${wardType === type.id ? "border-[2px] border-primary" : "border-[1px] border-black"}`}>
                      {wardType === type.id ? (
                        <>
                          <div className="bg-primary px-3 py-2 flex items-center gap-1.5">
                            <span className="text-white">{type.icon}</span>
                            <p className="font-semibold text-sm text-white">{type.label}</p>
                          </div>
                          <div className="px-3 py-2"><p className="text-xs text-black">{type.desc}</p></div>
                        </>
                      ) : (
                        <div className="p-3">
                          <div className="flex items-center gap-1.5 mb-0.5">{type.icon}<p className="font-semibold text-sm">{type.label}</p></div>
                          <p className="text-xs text-muted-foreground mt-0.5">{type.desc}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Provided */}
              <div className="space-y-3 pb-12">
                <label className="text-sm font-medium">Food Provided?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => { setFoodProvided(false); setSelectedFoods([]); }}
                    className={`h-12 rounded-xl text-sm font-semibold transition-all border-[1px] ${!foodProvided ? "border-[2px] border-primary bg-primary/5" : "border-black"}`}>No</button>
                  <button type="button" onClick={() => setFoodProvided(true)}
                    className={`h-12 rounded-xl text-sm font-semibold transition-all border-[1px] ${foodProvided ? "border-[2px] border-primary bg-primary/5" : "border-black"}`}>Yes 🍽️</button>
                </div>
                {foodProvided && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Pick up to 2</p>
                    <div className="flex flex-wrap gap-2">
                      {foodOptions.map(({ id, icon: Icon }) => (
                        <button key={id} type="button" onClick={() => toggleFood(id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${selectedFoods.includes(id) ? "border-[2px] border-primary bg-primary/5" : "border-transparent bg-secondary"}`}>
                          <Icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Age Range */}
              <div className="space-y-3 pb-12">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Age Range</label>
                  <span className="text-sm font-bold text-primary">{ageRange[0]}–{ageRange[1]}</span>
                </div>
                <div className="relative">
                  <div className="relative flex justify-between mb-2" style={{ paddingLeft: `${((ageRange[0] - 18) / 62) * 100}%`, paddingRight: `${((80 - ageRange[1]) / 62) * 100}%` }}>
                    <span className="text-xs font-semibold text-primary">{ageRange[0]}</span>
                    <span className="text-xs font-semibold text-primary">{ageRange[1]}</span>
                  </div>
                  <Slider min={18} max={80} step={1} value={ageRange} onValueChange={(val) => setAgeRange(val as [number, number])} className="w-full" />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4 pb-12">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4" />Date</label>
                  <Input type="date" className="h-12 text-base w-full block" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" />Time</label>
                  <select className="w-full h-12 px-3 text-base rounded-md border border-input bg-background" value={time} onChange={(e) => setTime(e.target.value)}>
                    <option value="">Select a time...</option>
                    <option disabled>── Morning ──</option>
                    {Array.from({ length: 12 }, (_, i) => { const hour = Math.floor(i / 2) + 6; const min = i % 2 === 0 ? "00" : "30"; const val = `${String(hour).padStart(2, "0")}:${min}`; const label = new Date(`2000-01-01T${val}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); return <option key={val} value={val}>{label}</option>; })}
                    <option disabled>── Afternoon ──</option>
                    {Array.from({ length: 12 }, (_, i) => { const hour = Math.floor(i / 2) + 12; const min = i % 2 === 0 ? "00" : "30"; const val = `${String(hour).padStart(2, "0")}:${min}`; const label = new Date(`2000-01-01T${val}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); return <option key={val} value={val}>{label}</option>; })}
                    <option disabled>── Evening ──</option>
                    {Array.from({ length: 12 }, (_, i) => { const hour = Math.floor(i / 2) + 18; const min = i % 2 === 0 ? "00" : "30"; const val = `${String(hour).padStart(2, "0")}:${min}`; const label = new Date(`2000-01-01T${val}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); return <option key={val} value={val}>{label}</option>; })}
                    <option disabled>── Late Night ──</option>
                    {Array.from({ length: 12 }, (_, i) => { const hour = Math.floor(i / 2); const min = i % 2 === 0 ? "00" : "30"; const val = `${String(hour).padStart(2, "0")}:${min}`; const label = new Date(`2000-01-01T${val}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); return <option key={`late-${val}`} value={val}>{label}</option>; })}
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3 pb-12">
                <label className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" />Duration</label>
                <div className="flex flex-wrap gap-2">
                  {["1 hr", "1.5 hrs", "2 hrs", "3 hrs", "4 hrs", "Half day", "Full day"].map((d) => (
                    <button key={d} type="button" onClick={() => setDuration(d)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${duration === d ? "border-[2px] border-primary bg-primary/5" : "border-black"}`}>{d}</button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Publish Button */}
          <div className="flex gap-3">
            <Button size="lg" className="flex-1 h-14 text-base font-semibold" onClick={handleSubmit} disabled={loading || sessionLoading}>
              {loading ? "Saving..." : "Publish"}
            </Button>
          </div>

          {/* Delete Dialog */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl">
              <DialogHeader><DialogTitle>Delete Event</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Are you sure you want to delete this event? This cannot be undone.</p>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Not now</Button>
                <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Yes, delete</Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </main>

      <BottomNav />

    </div>
  );
};

export default CreateEvent;