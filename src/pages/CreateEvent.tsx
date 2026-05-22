import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Image as ImageIcon, Trash2, Loader2, Clock, SunMedium, LandPlot, HandPlatter, Rainbow, ArrowLeft, Pizza, CupSoda, Cookie, Hamburger, IceCreamCone, Salad, Link, ChevronDown, Globe, Star, Circle, CheckCircle2, FileText, Car, DollarSign, Ticket, Utensils } from "lucide-react";

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
import confetti from "canvas-confetti";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Time options starting at 6 PM, wrapping around
const TIME_OPTIONS = (() => {
  const opts = [];
  // 6 PM → 11:30 PM
  for (let h = 18; h < 24; h++)
    for (const m of ['00', '30'])
      opts.push(`${String(h).padStart(2, '0')}:${m}`);
  // 12 AM → 5:30 AM
  for (let h = 0; h < 6; h++)
    for (const m of ['00', '30'])
      opts.push(`${String(h).padStart(2, '0')}:${m}`);
  // 6 AM → 5:30 PM
  for (let h = 6; h < 18; h++)
    for (const m of ['00', '30'])
      opts.push(`${String(h).padStart(2, '0')}:${m}`);
  return opts;
})();

const formatTime = (v: string) =>
  new Date(`2000-01-01T${v}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const TimePicker = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (open && value && listRef.current) {
      const idx = TIME_OPTIONS.indexOf(value);
      if (idx !== -1) {
        const item = listRef.current.children[idx] as HTMLElement;
        item?.scrollIntoView({ block: 'center' });
      }
    }
  }, [open]);

  return (
    <div className="relative flex-1">
      <div
        className="h-12 flex items-center justify-between px-3 rounded-xl border border-black bg-white cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span className={`text-sm ${value ? 'text-black' : 'text-muted-foreground'}`}>
          {value ? formatTime(value) : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div ref={listRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-black rounded-2xl shadow-xl z-30 overflow-y-auto" style={{ maxHeight: '220px' }}>
          {TIME_OPTIONS.map(t => (
            <button key={t} type="button"
              onClick={() => { onChange(t); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${value === t ? 'bg-black text-white font-semibold' : 'hover:bg-gray-50 text-black'}`}>
              {formatTime(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
  const [minAge, setMinAge] = useState<string>("");
  const [maxAge, setMaxAge] = useState<string>("");
  const [minAgeOpen, setMinAgeOpen] = useState(false);
  const [maxAgeOpen, setMaxAgeOpen] = useState(false);
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
  const dateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [wardType, setWardType] = useState<string | null>(null);
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");
  const [foodProvided, setFoodProvided] = useState(false);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState("Sunday");
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiStyle, setAiStyle] = useState("botanical");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiPendingFile, setAiPendingFile] = useState<File | null>(null);
  const [aiGenerations, setAiGenerations] = useState(0);
  const AI_MAX_GENERATIONS = 3;
  const [additionalInfo, setAdditionalInfo] = useState<{title: string; description: string; icon?: string}[]>([]);

  const INFO_ICONS = [
    { key: "calendar", Icon: Calendar },
    { key: "star",     Icon: Star },
    { key: "circle",   Icon: Circle },
    { key: "check",    Icon: CheckCircle2 },
    { key: "note",     Icon: FileText },
    { key: "car",      Icon: Car },
    { key: "pin",      Icon: MapPin },
    { key: "dollar",   Icon: DollarSign },
    { key: "ticket",   Icon: Ticket },
    { key: "food",     Icon: Utensils },
  ];

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
      setMinAge(data.age_min ? String(data.age_min) : "");
      setMaxAge(data.age_max ? String(data.age_max) : "+");
      setStartTime(data.start_time ?? "");
      setEndTime(data.end_time ?? "");
      setEndDate(data.end_date ?? "");
      setAddress(data.address ?? "");
      setLocationSearch(data.address ?? "");
      setWardType(data.ward_type ?? null);
      setIsVirtual(!!data.virtual_link);
      setVirtualLink(data.virtual_link ?? "");
      setFacebookLink(data.social_links?.[0] ?? "");
      setInstagramLink(data.social_links?.[1] ?? "");
      setWebsiteLink(data.social_links?.[2] ?? "");
      setSelectedFoods(data.food ?? []);
      setFoodProvided((data.food ?? []).length > 0);
      setIsRecurring(data.is_recurring ?? false);
      setRecurringDay(data.recurring_day ?? "Sunday");
      setTimezone(data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
      setAdditionalInfo(data.additional_info ?? []);
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
    else { navigate("/wards"); }
  };

  const scanPoster = async () => {
    if (!imageFile) return;
    setScanning(true);
    try {
      // Convert image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // strip data:image/...;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const mediaType = imageFile.type || 'image/jpeg';

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `Today's date is ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Extract event details from this flyer or poster image and return ONLY a JSON object with these fields (use null if not found):
{
  "title": "event name",
  "description": "full description or details shown on the flyer. Write each sentence on its own line separated by a newline character.",
  "date": "YYYY-MM-DD format only, null if not found. Today is ${new Date().toISOString().split('T')[0]}. If no year is shown on the poster, you MUST use ${new Date().getFullYear()} as the year. Never use any other year unless the poster explicitly shows a different year.",
  "end_date": "YYYY-MM-DD format only if the event spans multiple days and an end date is shown, otherwise null. Same rule: use ${new Date().getFullYear()} if no year shown.",
  "start_time": "HH:MM 24-hour format only, null if not found",
  "end_time": "HH:MM 24-hour format only, null if not found",
  "location": "venue or address text, null if not found"
}
Return only the JSON, no explanation.` }
            ]
          }]
        })
      });

      const data = await res.json();
      const text = data.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const extracted = JSON.parse(jsonMatch[0]);

      if (extracted.title) setTitle(extracted.title);
      if (extracted.description) {
        // Add a line break after every sentence (period, exclamation, question mark)
        const formatted = extracted.description
          .replace(/([.!?])\s+/g, '$1\n')
          .trim();
        setDescription(formatted);
      }
      if (extracted.date) setDate(extracted.date);
      if (extracted.end_date) setEndDate(extracted.end_date);
      if (extracted.start_time) setStartTime(extracted.start_time);
      if (extracted.end_time) setEndTime(extracted.end_time);
      if (extracted.location) { setLocation(extracted.location); setAddress(extracted.location); }

      toast.success('✨ Event details filled in! Review and adjust as needed.');
    } catch (e) {
      console.error(e);
      toast.error('Could not read the poster. Try a clearer image.');
    }
    setScanning(false);
  };

  const AI_STYLES = [
    { key: "botanical",  label: "🌿 Botanical",  suffix: "illustrated in a soft botanical watercolor style, cream background, delicate floral accents, warm muted earthy tones, airy and elegant" },
    { key: "watercolor", label: "🎨 Watercolor", suffix: "in dreamy pastel watercolor style, soft color washes, light and whimsical, warm glowing light, gentle brushstrokes" },
    { key: "minimal",    label: "✨ Minimal",    suffix: "as a clean minimal flat illustration, soft pastel palette, simple shapes, lots of white space, modern and elegant" },
    { key: "vibrant",    label: "🌈 Vibrant",    suffix: "as a bold vibrant illustration, rich saturated colors, energetic and fun, colorful, modern pop art style" },
    { key: "retro",      label: "🎪 Retro",      suffix: "as a vintage retro poster illustration, warm aged tones, classic typography feel, nostalgic 1960s-70s style, grainy texture" },
  ];

  const generateImage = async () => {
    if (aiGenerations >= AI_MAX_GENERATIONS) return;
    setGenerating(true);
    setAiPreview(null);
    try {
      const styleObj = AI_STYLES.find(s => s.key === aiStyle)!;
      const base = aiPrompt.trim() || title || 'community event';
      const titleText = aiTitle.trim();
      const textInstruction = titleText
        ? `Include the text "${titleText}" in large elegant typography as the focal title of the design.`
        : 'No text or words in the image.';
      const prompt = `Event flyer design: ${base}, ${styleObj.suffix}. ${textInstruction} No brand names, no watermarks, no logos, no extra text.`;
      // Send user's auth token so server can upload directly to Supabase storage
      const userToken = session?.access_token;
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userToken }),
      });
      const data = await res.json();
      const url = data?.data?.[0]?.url;
      if (!url) throw new Error('No image returned');

      // If server returned a permanent Supabase URL, mark it so applyAiImage skips re-upload
      if (data.permanentUrl) {
        setAiPendingFile(null); // no file needed — URL is already permanent
      }

      setAiPreview(url);
      setAiGenerations(prev => prev + 1);
    } catch (e) {
      console.error(e);
      toast.error('Could not generate image. Try again.');
    }
    setGenerating(false);
  };

  const applyAiImage = async () => {
    if (!aiPreview) return;
    // If the server already uploaded to Supabase, the URL is permanent — just use it directly
    const isPermanent = aiPreview.includes('supabase.co');
    if (isPermanent) {
      setImageFile(null); // no re-upload needed
    } else if (aiPendingFile) {
      setImageFile(aiPendingFile);
    } else {
      setImageFile(null); // last resort — URL may expire
    }
    setImagePreview(aiPreview);
    setAiPendingFile(null);
    setAiModalOpen(false);
    setAiPreview(null);
    toast.success('🎨 Image applied!');
  };

  const handleSubmit = async () => {
    if (!title || (!isRecurring && !date) || (!address && !virtualLink)) {
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
      user_id: session.user.id, title, description, category, is_free: isFree,
      date: isRecurring ? "2099-12-31" : date,
      location: location || address, image_url: imageUrl, status: "published",
      age_min: minAge ? parseInt(minAge) : null, age_max: maxAge && maxAge !== "+" ? parseInt(maxAge) : null, start_time: startTime, end_time: endTime, end_date: isRecurring ? null : (endDate || null), address, lat, lng,
      ward_type: category === "ward" ? wardType : null,
      food: selectedFoods, virtual_link: virtualLink || null,
      social_links: [facebookLink, instagramLink, websiteLink].filter(Boolean).length > 0 ? [facebookLink, instagramLink, websiteLink].filter(Boolean) : null,
      is_recurring: isRecurring,
      recurring_day: isRecurring ? recurringDay : null,
      timezone: timezone || null,
      additional_info: additionalInfo.filter(item => item.title.trim()).length > 0
        ? additionalInfo.filter(item => item.title.trim())
        : null,
    };
    let error; let savedId = id;
    if (isEditing) {
      ({ error } = await supabase.from("events").update(eventData).eq("id", id));
    } else {
      const { data: inserted, error: insertError } = await supabase.from("events").insert(eventData).select("id").single();
      error = insertError;
      if (inserted) savedId = inserted.id;
    }
    if (error) { console.error("Error saving event:", JSON.stringify(error)); alert(JSON.stringify(error)); }
    else {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#a855f7", "#ec4899", "#f97316", "#facc15", "#4ade80"] });
      setTimeout(() => {
        confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#a855f7", "#ec4899", "#f97316"] });
        confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#facc15", "#4ade80", "#60a5fa"] });
      }, 200);
      setTimeout(() => navigate("/wards", { state: { scrollToEventId: savedId } }), 2200);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-28">
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
                <img src={imagePreview || "/placeholder-event.png"} alt="Event image" className="w-full h-full object-cover" />
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

            {/* AI image link + scan poster */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => { setAiPrompt(title || ""); setAiTitle(title || ""); setAiPreview(null); setAiModalOpen(true); }}
                className="text-sm font-medium text-pink-500 hover:text-pink-600 transition-colors flex items-center gap-1"
              >
                ✨ AI-generated image
              </button>
              {imageFile && (
                <button
                  type="button"
                  onClick={scanPoster}
                  disabled={scanning}
                  className="text-sm font-medium text-purple-500 hover:text-purple-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {scanning ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Reading...</> : <>✨ Auto-fill from poster</>}
                </button>
              )}
            </div>

            {/* AI Image Generation Modal */}
            <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
              <DialogContent className="w-[calc(100%-32px)] max-w-[420px] rounded-2xl p-5">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">✨ Generate Event Image</DialogTitle>
                </DialogHeader>

                {/* Style chips */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Choose a style</p>
                  <div className="flex flex-wrap gap-2">
                    {AI_STYLES.map(s => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setAiStyle(s.key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${aiStyle === s.key ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title on image */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Title to show on image <span className="text-xs text-gray-400">(optional)</span></p>
                  <input
                    type="text"
                    placeholder="e.g. Meet & Eat, Beach Bbq Night..."
                    className="w-full text-sm rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-black transition-colors"
                    value={aiTitle}
                    onChange={e => setAiTitle(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
                  />
                </div>

                {/* Custom prompt */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Describe your event</p>
                  <textarea
                    rows={3}
                    placeholder="e.g. BBQ sunset near the beach, outdoor summer gathering..."
                    className="w-full text-sm rounded-xl border border-gray-300 px-3 py-2.5 resize-none outline-none focus:border-black transition-colors"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                  />
                </div>

                {/* Preview */}
                {aiPreview && (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <img src={aiPreview} alt="Generated" className="w-full h-48 object-cover" />
                  </div>
                )}

                {/* Generation counter */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                  <span>{aiGenerations}/{AI_MAX_GENERATIONS} generations used</span>
                  {aiGenerations >= AI_MAX_GENERATIONS && (
                    <span className="text-red-400 font-medium">No more generations for this event</span>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  {aiPreview ? (
                    <>
                      {/* Use this image — prominent */}
                      <button
                        type="button"
                        onClick={applyAiImage}
                        className="flex-1 h-11 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                      >
                        ✅ Use this image
                      </button>
                      {/* Regenerate — subtle */}
                      <button
                        type="button"
                        onClick={generateImage}
                        disabled={generating || aiGenerations >= AI_MAX_GENERATIONS}
                        className="h-11 px-4 rounded-xl border border-gray-300 text-gray-500 text-sm font-medium hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
                      >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔄"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={generateImage}
                      disabled={generating || aiGenerations >= AI_MAX_GENERATIONS}
                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60"
                    >
                      {generating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating...</> : <>🎨 Generate</>}
                    </button>
                  )}
                </div>

                {/* Auto-fill from poster after image is generated */}
                {aiPreview && imageFile && (
                  <button
                    type="button"
                    onClick={() => { applyAiImage(); setTimeout(scanPoster, 300); }}
                    disabled={scanning}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-purple-300 bg-purple-50 text-purple-600 text-sm font-medium hover:bg-purple-100 transition-colors"
                  >
                    {scanning ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Reading poster...</> : <>✨ Use this image + auto-fill event details</>}
                  </button>
                )}
              </DialogContent>
            </Dialog>

            <div className="flex-1 space-y-4">

              {/* Event Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Event Title</label>
                <Input placeholder="e.g., Community Picnic" className="h-12 text-base" value={title}
                  onChange={(e) => { const val = e.target.value; setTitle(val.charAt(0).toUpperCase() + val.slice(1)); }} maxLength={80} />
                <div className="text-sm text-gray-500 text-right">{title.length}/80</div>
              </div>

              {/* Date, Start time → End time */}
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-4 ${isRecurring ? "opacity-40 pointer-events-none" : ""}`}>
                {/* Start date → End date */}
                <div className="flex items-center gap-2 w-full sm:flex-1">
                  {/* Start date */}
                  <div className="relative flex-1 cursor-pointer" onClick={() => dateRef.current?.showPicker()}>
                    <input ref={dateRef} type="date" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      value={date} onChange={(e) => setDate(e.target.value)} />
                    <div className="h-12 flex items-center justify-between px-3 rounded-xl border border-black bg-white">
                      <span className={`text-sm ${date ? "text-black" : "text-muted-foreground"}`}>
                        {date ? new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Start date"}
                      </span>
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>

                  <span className="text-sm font-medium shrink-0 text-muted-foreground">–</span>

                  {/* End date (optional) */}
                  <div className="relative flex-1 cursor-pointer" onClick={() => endDateRef.current?.showPicker()}>
                    <input ref={endDateRef} type="date" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      min={date || undefined} />
                    <div className="h-12 flex items-center justify-between px-3 rounded-xl border border-black bg-white">
                      <span className={`text-sm ${endDate ? "text-black" : "text-muted-foreground"}`}>
                        {endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "End date"}
                      </span>
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Start time + To + End time */}
                <div className="flex items-center gap-3 sm:contents">
                  <TimePicker value={startTime} onChange={setStartTime} placeholder="Start time" />
                  <span className="text-sm font-medium shrink-0">To</span>
                  <TimePicker value={endTime} onChange={setEndTime} placeholder="End time" />
                </div>
              </div>

              {/* Timezone picker */}
              {(startTime || endTime) && (() => {
                const TZ_OPTIONS = [
                  { label: "Pacific Time (PT)",        value: "America/Los_Angeles" },
                  { label: "Mountain Time (MT)",       value: "America/Denver" },
                  { label: "Mountain Time – AZ (no DST)", value: "America/Phoenix" },
                  { label: "Central Time (CT)",        value: "America/Chicago" },
                  { label: "Eastern Time (ET)",        value: "America/New_York" },
                  { label: "Alaska Time (AKT)",        value: "America/Anchorage" },
                  { label: "Hawaii Time (HT)",         value: "Pacific/Honolulu" },
                ];
                const selected = TZ_OPTIONS.find(o => o.value === timezone);
                const displayLabel = selected ? selected.label : timezone;
                return (
                  <div className="relative">
                    <div
                      className="h-11 flex items-center justify-between px-3 rounded-xl border border-black bg-white cursor-pointer"
                      onClick={() => setTimezoneOpen(!timezoneOpen)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🌐</span>
                        <span className="text-sm text-black">{displayLabel}</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${timezoneOpen ? "rotate-180" : ""}`} />
                    </div>
                    {timezoneOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black rounded-xl shadow-lg z-30 overflow-hidden">
                        {TZ_OPTIONS.map(opt => (
                          <button key={opt.value} type="button"
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${timezone === opt.value ? "font-bold" : ""}`}
                            onClick={() => { setTimezone(opt.value); setTimezoneOpen(false); }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Recurring toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium">Recurring event 🔁</p>
                  {isRecurring && <p className="text-xs text-muted-foreground mt-0.5">Appears every week in "This Week"</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isRecurring ? "bg-black" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRecurring ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {/* Day of week picker + time — shown when recurring */}
              {isRecurring && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Repeats every</p>
                    <div className="flex gap-2 flex-wrap">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => {
                        const full = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" }[d]!;
                        return (
                          <button key={d} type="button" onClick={() => setRecurringDay(full)}
                            className={`h-10 w-12 rounded-xl text-sm font-semibold border transition-all ${recurringDay === full ? "bg-black text-white border-black" : "bg-white text-black border-black"}`}>
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time pickers for recurring event */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Time</p>
                    <div className="flex items-center gap-3">
                      <TimePicker value={startTime} onChange={setStartTime} placeholder="Start time" />
                      <span className="text-sm font-medium shrink-0">To</span>
                      <TimePicker value={endTime} onChange={setEndTime} placeholder="End time" />
                    </div>
                  </div>
                </div>
              )}

              {/* Event Location */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Event Location
                </label>
                <div className="space-y-2">
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
                <Textarea placeholder="Tell people about your event..." className="min-h-32 text-base resize-none overflow-y-auto" style={{ maxHeight: '260px' }} value={description}
                  onChange={(e) => { const val = e.target.value; setDescription(val.charAt(0).toUpperCase() + val.slice(1)); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 260) + 'px'; }} maxLength={2000} />
                <div className="text-sm text-gray-500 text-right">{description.length}/2000</div>
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Additional Info</label>
                {additionalInfo.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-black bg-white p-3 space-y-2.5">
                    {/* Title row */}
                    <div className="flex items-center gap-2">
                      {/* Show selected icon preview */}
                      {item.icon && (() => {
                        const found = INFO_ICONS.find(i => i.key === item.icon);
                        return found ? <found.Icon className="h-4 w-4 flex-shrink-0 text-gray-500" /> : null;
                      })()}
                      <input
                        type="text"
                        placeholder="Section title (e.g. What to Bring)"
                        className="flex-1 text-sm font-semibold outline-none bg-transparent placeholder:font-normal placeholder:text-muted-foreground"
                        value={item.title}
                        onChange={(e) => {
                          const next = [...additionalInfo];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setAdditionalInfo(next);
                        }}
                        maxLength={60}
                      />
                      <button
                        type="button"
                        onClick={() => setAdditionalInfo(additionalInfo.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>

                    {/* Icon picker */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {INFO_ICONS.map(({ key, Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            const next = [...additionalInfo];
                            next[idx] = { ...next[idx], icon: key };
                            setAdditionalInfo(next);
                          }}
                          className={`p-3 rounded-xl border transition-all ${
                            item.icon === key
                              ? "bg-black border-black text-white"
                              : "bg-white border-gray-300 text-gray-500 hover:border-gray-500"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      ))}
                    </div>

                    {/* Description */}
                    <div style={{ borderLeft: '2px solid rgba(0,0,0,0.09)' }} className="pl-3">
                      <textarea
                        placeholder="Description..."
                        rows={2}
                        className="w-full text-sm resize-none outline-none bg-transparent placeholder:text-muted-foreground overflow-hidden"
                        value={item.description}
                        onChange={(e) => {
                          const next = [...additionalInfo];
                          next[idx] = { ...next[idx], description: e.target.value };
                          setAdditionalInfo(next);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        maxLength={500}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setAdditionalInfo([...additionalInfo, { title: "", description: "", icon: "check" }])}
                  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.3)' }}>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1v8M1 5h8" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  Add section
                </button>
              </div>

              <div className="pt-4" />

              {/* Social Links */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FacebookIcon className="h-4 w-4" />
                  <InstagramIcon className="h-4 w-4" />
                  <Globe className="h-4 w-4" />
                  Social Links
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 h-12 rounded-xl border border-black px-3 bg-white">
                    <FacebookIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      type="url"
                      placeholder="Facebook URL"
                      className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                      value={facebookLink}
                      onChange={(e) => setFacebookLink(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3 h-12 rounded-xl border border-black px-3 bg-white">
                    <InstagramIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      type="url"
                      placeholder="Instagram URL"
                      className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                      value={instagramLink}
                      onChange={(e) => setInstagramLink(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3 h-12 rounded-xl border border-black px-3 bg-white">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      type="url"
                      placeholder="Website URL"
                      className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                      value={websiteLink}
                      onChange={(e) => setWebsiteLink(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Type */}
              <div className="space-y-3 pb-12">
                <label className="text-sm font-medium">Choose a category</label>
                <div className="flex gap-3">
                  {[
                    { id: "spiritual", label: "Spiritual", icon: <SunMedium className="h-4 w-4" /> },
                    { id: "fhe", label: "FHE", icon: <LandPlot className="h-4 w-4" /> },
                    { id: "service", label: "Service", icon: <HandPlatter className="h-4 w-4" /> },
                    { id: "general", label: "General", icon: <Rainbow className="h-4 w-4" /> },
                  ].map((type) => (
                    <button key={type.id} type="button" onClick={() => setWardType(type.id)}
                      className={`flex-1 rounded-xl transition-all overflow-hidden p-3 flex items-center justify-center gap-1.5 ${wardType === type.id ? "bg-black border-[2px] border-black text-white" : "border-[1px] border-black text-black"}`}>
                      {type.icon}
                      <p className="font-semibold text-sm">{type.label}</p>
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
                <label className="text-sm font-medium">Age Range</label>
                <div className="flex items-center gap-3">

                  {/* Min age */}
                  <div className="relative flex-1">
                    <div
                      className="h-12 flex items-center justify-between px-3 rounded-xl border border-black bg-white cursor-pointer"
                      onClick={() => { setMinAgeOpen(!minAgeOpen); setMaxAgeOpen(false); }}>
                      <span className={`text-sm ${minAge ? "text-black" : "text-muted-foreground"}`}>
                        {minAge || "Min"}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${minAgeOpen ? "rotate-180" : ""}`} />
                    </div>
                    {minAgeOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-black rounded-xl shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto">
                        {[18, 25, 30, 35, 40, 45, 50, 55, 60].map(age => (
                          <button key={age} type="button"
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${minAge === String(age) ? "font-bold" : ""}`}
                            onClick={() => { setMinAge(String(age)); setMinAgeOpen(false); }}>
                            {age}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-sm font-medium shrink-0">To</span>

                  {/* Max age */}
                  <div className="relative flex-1">
                    <div
                      className="h-12 flex items-center justify-between px-3 rounded-xl border border-black bg-white cursor-pointer"
                      onClick={() => { setMaxAgeOpen(!maxAgeOpen); setMinAgeOpen(false); }}>
                      <span className={`text-sm ${maxAge ? "text-black" : "text-muted-foreground"}`}>
                        {maxAge || "Max"}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${maxAgeOpen ? "rotate-180" : ""}`} />
                    </div>
                    {maxAgeOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-black rounded-xl shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto">
                        <button type="button"
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${maxAge === "+" ? "font-bold" : ""}`}
                          onClick={() => { setMaxAge("+"); setMaxAgeOpen(false); }}>
                          <p className="text-sm">+</p>
                          <p className="text-xs text-muted-foreground">(above)</p>
                        </button>
                        {[25, 30, 35, 40, 45, 50, 55, 60].map(opt => (
                          <button key={opt} type="button"
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${maxAge === String(opt) ? "font-bold" : ""}`}
                            onClick={() => { setMaxAge(String(opt)); setMaxAgeOpen(false); }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>


            </div>
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

      {/* Floating Publish Button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-2xl"
          onClick={handleSubmit}
          disabled={loading || sessionLoading}
        >
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Publish Event"}
        </Button>
      </div>

    </div>
  );
};

export default CreateEvent;