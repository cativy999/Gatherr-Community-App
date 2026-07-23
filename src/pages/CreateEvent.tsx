import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Image as ImageIcon, Trash2, Loader2, Clock, SunMedium, LandPlot, HandPlatter, Rainbow, ArrowLeft, Pizza, CupSoda, Cookie, Hamburger, IceCreamCone, Salad, Link, ChevronDown, Globe, Star, Circle, CheckCircle2, FileText, Car, DollarSign, Ticket, Utensils, Popcorn, Flame, Presentation, MoreVertical, User, X } from "lucide-react";

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
import { getRecurringLabelFull } from "@/lib/recurring";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// PDF support is loaded on demand (only when a user picks a .pdf file) so it
// doesn't add ~450kb to the bundle every visitor downloads.
const loadPdfjs = async () => {
  const pdfjsLib = await import("pdfjs-dist");
  // @ts-ignore - Vite resolves this to a URL string for the worker bundle
  const pdfWorkerUrl = (await import("pdfjs-dist/build/pdf.worker.min.js?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  return pdfjsLib;
};

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

// Hoisted to module scope so this array isn't rebuilt on every keystroke —
// previously it was recreated inside the component on every re-render.
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

const TimePicker = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view within the dropdown (no page scroll)
  useEffect(() => {
    if (open && value && listRef.current) {
      const idx = TIME_OPTIONS.indexOf(value);
      if (idx !== -1) {
        const item = listRef.current.children[idx] as HTMLElement;
        if (item) {
          listRef.current.scrollTop = item.offsetTop - listRef.current.clientHeight / 2 + item.offsetHeight / 2;
        }
      }
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative flex-1" ref={containerRef}>
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
        <div ref={listRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-black rounded-xl shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto">
          {TIME_OPTIONS.map(t => (
            <button key={t} type="button"
              onClick={() => { onChange(t); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${value === t ? 'font-bold' : 'text-black'}`}>
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
  const [imageExpanded, setImageExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [noImageConfirmOpen, setNoImageConfirmOpen] = useState(false);
  const [minAge, setMinAge] = useState<string>("");
  const [maxAge, setMaxAge] = useState<string>("");

  // Group Assignment
  const [groupAssignmentEnabled, setGroupAssignmentEnabled] = useState(false);
  const [groupTheme, setGroupTheme] = useState<"pizza" | "weather" | "taco" | null>(null);
  const [numGroups, setNumGroups] = useState(4);
  const groupThemeExpandRef = useRef<HTMLDivElement>(null);
  const groupNumPickerRef = useRef<HTMLDivElement>(null);
  const groupHelperTextRef = useRef<HTMLDivElement>(null);
  const GROUP_THEMES = {
    pizza:   { label: "Pizza",        emoji: "🍕", groups: ["Extra Saucy","Half Baked","Well Done","Burnt Edges","Deep Dish","Thin Crust","Stuffed Crust","Extra Crispy","Double Pepperoni"] },
    weather: { label: "Weather",      emoji: "⛈️", groups: ["Sunshine","Rainbow","Thunder","Lightning","Drizzle","Blizzard","Fog","Frost","Tornado"] },
    taco:    { label: "Taco Tuesday", emoji: "🌮", groups: ["Extra Cilantro","No Onions Please","Hot Sauce Enthusiast","Guac Costs Extra","Double Meat","Verde Sauce","Extra Crunchy","Loaded","Taco Supreme"] },
  } as const;
  const [minAgeOpen, setMinAgeOpen] = useState(false);
  const [maxAgeOpen, setMaxAgeOpen] = useState(false);
  const minAgeRef = useRef<HTMLDivElement>(null);
  const maxAgeRef = useRef<HTMLDivElement>(null);

  // Scroll newly revealed group-assignment content into view
  useEffect(() => {
    if (groupAssignmentEnabled) {
      setTimeout(() => groupThemeExpandRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  }, [groupAssignmentEnabled]);

  useEffect(() => {
    if (groupTheme) {
      setTimeout(() => groupHelperTextRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    }
  }, [groupTheme]);

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
  const [recurringDays, setRecurringDays] = useState<string[]>(["Sunday"]);
  const [recurringWeekOfMonth, setRecurringWeekOfMonth] = useState<number | null>(null);
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
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [ownedGroups, setOwnedGroups] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [myProfile, setMyProfile] = useState<{ name: string; avatar_url: string | null } | null>(null);
  // Tracks which "Extra Details" sections are collapsed (by index) — UI-only state, not saved.
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  // Custom drag-to-resize for the Description box. Native CSS `resize` doesn't
  // render a draggable handle on iOS Safari, so we drive the height manually
  // with Pointer Events (which work for mouse, touch, and pen alike).
  //
  // IMPORTANT: this uses setPointerCapture instead of window-level listeners.
  // The first version attached pointermove/pointerup listeners to `window`
  // and only removed them when pointerup fired — but iOS Safari can cancel a
  // touch (e.g. the gesture gets reinterpreted as a scroll) without ever
  // firing pointerup. That left the listeners attached forever, so every
  // later tap/scroll anywhere on the page kept re-triggering a layout
  // recalculation, which is consistent with the page feeling "frozen" right
  // after dragging the handle. Pointer capture guarantees the up/cancel
  // events are delivered to this element no matter where the touch ends, so
  // cleanup always runs.
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionResizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const handleDescriptionResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const textarea = descriptionTextareaRef.current;
    if (!textarea) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    descriptionResizeStateRef.current = { startY: e.clientY, startHeight: textarea.offsetHeight };
  };
  const handleDescriptionResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = descriptionResizeStateRef.current;
    const textarea = descriptionTextareaRef.current;
    if (!state || !textarea) return;
    const newHeight = Math.min(600, Math.max(128, state.startHeight + (e.clientY - state.startY)));
    textarea.style.height = `${newHeight}px`;
  };
  const handleDescriptionResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    descriptionResizeStateRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };
  const toggleSectionCollapsed = (idx: number) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Co-host support: a co-host can edit an event just like the host, but
  // shouldn't be able to silently take over ownership of it (see proceedSubmit,
  // which leaves `user_id` out of the update payload), and access to this page
  // for someone else's event is gated to host + co-hosts (see the fetchEvent
  // effect below).
  // null = still checking, true/false = resolved. Creating a new event is always authorized.
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(id ? null : true);
  const originalEventRef = useRef<any>(null);

  // "Extra Details" per-section overflow menu (Delete lives behind this now,
  // instead of a bare X next to the chevron, so it's harder to tap by accident).
  const [openSectionMenu, setOpenSectionMenu] = useState<number | null>(null);
  const sectionMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (openSectionMenu === null) return;
    const handler = (e: MouseEvent) => {
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target as Node)) {
        setOpenSectionMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openSectionMenu]);

  const toggleFood = (id: string) => {
    setSelectedFoods(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const foodGroups = [
    {
      label: "Warm & Meal",
      items: [
        { id: "pizza",   icon: Pizza,       label: "Pizza" },
        { id: "burgers", icon: Hamburger,   label: "Burgers" },
        { id: "bbq",     icon: Flame,       label: "BBQ" },
        { id: "catered", icon: HandPlatter, label: "Catered" },
        { id: "popcorn", icon: Popcorn,     label: "Popcorn" },
      ],
    },
    {
      label: "Cold & Dessert",
      items: [
        { id: "drinks",   icon: CupSoda,      label: "Drinks" },
        { id: "cookies",  icon: Cookie,       label: "Cookies" },
        { id: "icecream", icon: IceCreamCone, label: "Ice Cream" },
        { id: "salad",    icon: Salad,        label: "Salad" },
      ],
    },
  ];

  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
      if (error) { console.error("Error fetching event:", error); return; }
      originalEventRef.current = data;

      // Authorization: only the host or an invited co-host may edit this event.
      if (sessionLoading) {
        // session not resolved yet — the auth-dependent effect below will re-check.
      } else if (!session?.user) {
        setIsAuthorized(false);
      } else if (data.user_id === session.user.id) {
        setIsAuthorized(true);
      } else {
        const { data: cohostRow } = await supabase
          .from("event_cohosts")
          .select("user_id")
          .eq("event_id", id)
          .eq("user_id", session.user.id)
          .maybeSingle();
        setIsAuthorized(!!cohostRow);
      }

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
      setRecurringDays(
        data.recurring_days?.length ? data.recurring_days
        : data.recurring_day ? [data.recurring_day]
        : ["Sunday"]
      );
      setRecurringWeekOfMonth(data.recurring_week_of_month ?? null);
      setTimezone(data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
      setAdditionalInfo(data.additional_info ?? []);
      setCommunityId(data.community_id ?? null);
    };
    fetchEvent();
  }, [id, session?.user?.id, sessionLoading]);

  useEffect(() => {
    if (isAuthorized === false) {
      toast.error("You don't have permission to edit this event.");
      navigate(id ? `/event/${id}` : "/wards");
    }
  }, [isAuthorized]);

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

  // Fetch the current user's profile + owned/co-admin groups for "Post as" selector
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    supabase.from("profiles").select("name, avatar_url").eq("user_id", userId).maybeSingle()
      .then(({ data }) => setMyProfile(data ? { name: data.name, avatar_url: data.avatar_url ?? null } : null));

    const loadGroups = async () => {
      // Groups the user owns
      const { data: owned } = await supabase
        .from("groups").select("id, name, avatar_url").eq("user_id", userId);

      // Groups the user co-admins (accepted)
      const { data: adminRows } = await supabase
        .from("group_admins").select("group_id").eq("user_id", userId).eq("status", "accepted");

      let coAdminGroups: { id: string; name: string; avatar_url: string | null }[] = [];
      if (adminRows && adminRows.length > 0) {
        const groupIds = adminRows.map((r: any) => r.group_id);
        const { data: groups } = await supabase
          .from("groups").select("id, name, avatar_url").in("id", groupIds);
        coAdminGroups = groups ?? [];
      }

      // Merge, dedupe by id
      const seen = new Set<string>();
      const merged = [...(owned ?? []), ...coAdminGroups].filter((g: any) => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      });
      setOwnedGroups(merged);
    };

    loadGroups();
  }, [session?.user?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setLocationOpen(false);
      if (minAgeRef.current && !minAgeRef.current.contains(e.target as Node)) setMinAgeOpen(false);
      if (maxAgeRef.current && !maxAgeRef.current.contains(e.target as Node)) setMaxAgeOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const compressCanvasAndSet = (canvas: HTMLCanvasElement, fileName: string) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const compressed = new File([blob], fileName, { type: "image/jpeg" });
        setImageFile(compressed);
        setImagePreview(URL.createObjectURL(compressed));
      }
    }, "image/jpeg", 0.7);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      try {
        const pdfjsLib = await loadPdfjs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const maxWidth = 1200;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(2, maxWidth / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        compressCanvasAndSet(canvas, file.name.replace(/\.pdf$/i, ".jpg"));
      } catch (err) {
        console.error("Failed to read PDF:", err);
        alert("Couldn't read that PDF. Please try a different file or upload an image instead.");
      }
      return;
    }

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
        compressCanvasAndSet(canvas, file.name);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const confirmDelete = async () => {
    if (!id) return;
    if (originalEventRef.current && session?.user?.id !== originalEventRef.current.user_id) {
      toast.error("Only the original host can delete this event.");
      return;
    }
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

      const res = await fetch('/api/scan-poster', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to scan poster');
      }

      const extracted = await res.json();

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
      const message = e instanceof Error && e.message ? e.message : 'Could not read the poster. Try a clearer image.';
      toast.error(message);
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

  // Writes a few human-readable "what changed" entries to the event's
  // Activity Log (visible in the Manage Event section) after a successful
  // edit. Intentionally coarse-grained — the goal is a quick history of edits
  // for organizers, not a field-by-field audit trail.
  const logEventChanges = async (newData: Record<string, any>) => {
    const original = originalEventRef.current;
    if (!id || !session?.user || !original) return;
    const messages: string[] = [];

    if (original.title !== newData.title) messages.push("changed the event title");
    if (original.description !== newData.description) messages.push("updated the event description");
    if (
      original.date !== newData.date ||
      original.start_time !== newData.start_time ||
      original.end_time !== newData.end_time ||
      original.end_date !== newData.end_date
    ) messages.push("changed the event time");
    if (original.address !== newData.address) messages.push("changed the event location");
    if (original.image_url !== newData.image_url) {
      messages.push(original.image_url ? "changed the event image" : "added a new image");
    }
    if (JSON.stringify(original.additional_info ?? null) !== JSON.stringify(newData.additional_info ?? null)) {
      messages.push("updated the extra details");
    }
    if (messages.length === 0) return;

    const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", session.user.id).single();
    const actor = profile?.name || "Someone";

    await supabase.from("event_activity_log").insert(
      messages.map(m => ({ event_id: id, user_id: session.user.id, message: `${actor} ${m}.` }))
    );
  };

  const handleSubmit = async () => {
    if (!title || (!isRecurring && !date) || (!address && !virtualLink)) {
      alert("Please fill in title, date and location!");
      return;
    }
    if (sessionLoading) { alert("Still loading, please wait a moment!"); return; }
    if (!session?.user) { alert("Not logged in!"); return; }
    if (!imageFile && !imagePreview) {
      setNoImageConfirmOpen(true);
      return;
    }
    await proceedSubmit();
  };

  const proceedSubmit = async () => {
    setNoImageConfirmOpen(false);
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
    const eventData: Record<string, any> = {
      title, description, category, is_free: isFree,
      date: isRecurring ? "2099-12-31" : date,
      location: location || address, image_url: imageUrl, status: "published",
      age_min: minAge ? parseInt(minAge) : null, age_max: maxAge && maxAge !== "+" ? parseInt(maxAge) : null, start_time: startTime, end_time: endTime, end_date: isRecurring ? null : (endDate || null), address, lat, lng,
      ward_type: category === "ward" ? wardType : null,
      food: selectedFoods, virtual_link: virtualLink || null,
      social_links: [facebookLink, instagramLink, websiteLink].filter(Boolean).length > 0 ? [facebookLink, instagramLink, websiteLink].filter(Boolean) : null,
      is_recurring: isRecurring,
      recurring_days: isRecurring ? recurringDays : null,
      recurring_day: isRecurring ? (recurringDays[0] ?? null) : null,
      recurring_week_of_month: isRecurring ? recurringWeekOfMonth : null,
      timezone: timezone || null,
      additional_info: additionalInfo.filter(item => item.title.trim()).length > 0
        ? additionalInfo.filter(item => item.title.trim())
        : null,
      community_id: communityId ?? null,
    };
    // Only set user_id when creating a brand-new event. On an edit, a co-host
    // saving changes must NOT overwrite who the original host is.
    if (!isEditing) eventData.user_id = session.user.id;

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
      if (isEditing) logEventChanges(eventData);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#a855f7", "#ec4899", "#f97316", "#facc15", "#4ade80"] });
      setTimeout(() => {
        confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#a855f7", "#ec4899", "#f97316"] });
        confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#facc15", "#4ade80", "#60a5fa"] });
      }, 200);
      setTimeout(() => navigate("/wards", { state: { scrollToEventId: savedId } }), 2200);
    }
    setLoading(false);
  };

  // Guests can't create or edit events
  if (!sessionLoading && !session) return <Navigate to="/" replace />;

  if (isAuthorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isAuthorized === false) {
    return null; // the effect above is already redirecting away
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-28">
      <header className="sticky top-0 z-10 bg-transparent px-4 py-2">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 transition-colors flex-shrink-0">
            <ArrowLeft className="h-6 w-6" />
          </button>
          {isEditing && (!originalEventRef.current || session?.user?.id === originalEventRef.current.user_id) && (
            <Button variant="ghost" size="icon" className="p-2.5 rounded-full bg-white/30 backdrop-blur-md hover:bg-white/50 text-red-500" onClick={() => setDeleteOpen(true)} disabled={loading}>
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex flex-col gap-4">

            {/* Page title */}
            <h1 className="font-bold text-center" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '1.5rem' }}>
              {isEditing ? "Edit Event" : "Create Event"}
            </h1>

            {/* Image Upload */}
            <div className="relative w-full flex-shrink-0">
              <div className="relative flex items-center justify-center w-full h-56 bg-secondary rounded-2xl border border-gray-400 overflow-hidden" onClick={() => fileInputRef.current?.click()}>
                <img src={imagePreview || "/placeholder-event.png"} alt="Event image" className="w-full h-full object-cover" />
                {!imagePreview && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <button type="button" className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-full border border-white/60" style={{ backgroundColor: "rgba(144, 144, 144, 0.5)" }}>
                      <ImageIcon className="h-4 w-4" />
                      Tap to upload image or PDF
                    </button>
                  </div>
                )}
                {imagePreview && (
                  <>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                      <span className="px-4 py-1.5 bg-black/50 text-white backdrop-blur-sm rounded-full text-xs font-semibold">Change Image</span>
                    </div>
                    {/* Expand button */}
                    <button
                      type="button"
                      className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setImageExpanded(true); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImagePick} />

              {/* Image lightbox */}
              {imageExpanded && imagePreview && (
                <div
                  className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                  onClick={() => setImageExpanded(false)}
                >
                  <img
                    src={imagePreview}
                    alt="Event image"
                    className="max-w-full max-h-full rounded-2xl object-contain"
                  />
                  <button
                    className="absolute top-5 right-5 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    onClick={() => setImageExpanded(false)}
                  >
                    <span className="text-white text-lg leading-none">✕</span>
                  </button>
                </div>
              )}
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

              {/* Post as — dropdown, always shown (personal profile + any groups) */}
              {(() => {
                const selectedGroup = ownedGroups.find((g) => g.id === communityId);
                const selectedAvatar = communityId === null ? myProfile?.avatar_url : selectedGroup?.avatar_url;
                const selectedName   = communityId === null ? (myProfile?.name || "My Profile") : (selectedGroup?.name || "");
                return (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Post as</label>
                    <div className="relative">
                      <select
                        value={communityId ?? ""}
                        onChange={(e) => setCommunityId(e.target.value === "" ? null : e.target.value)}
                        className="w-full h-12 pl-11 pr-9 rounded-xl border border-gray-300 bg-white text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                      >
                        <option value="">{myProfile?.name || "My Profile"}</option>
                        {ownedGroups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      {/* Avatar overlay */}
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                        {selectedAvatar ? (
                          <img src={selectedAvatar} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {selectedName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Chevron */}
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                );
              })()}

              {/* Event Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Event Title</label>
                <Input placeholder="e.g., Community Picnic" className="h-12 text-base" value={title}
                  onChange={(e) => { const val = e.target.value; setTitle(val.charAt(0).toUpperCase() + val.slice(1)); }} maxLength={80} />
                <div className="text-sm text-gray-500 text-right">{title.length}/80</div>
              </div>

              {/* Date + Time row — stacked on mobile, one equal-width row on desktop */}
              <div className={`flex flex-col md:flex-row md:items-center gap-3 pb-4 ${isRecurring ? "opacity-40 pointer-events-none" : ""}`}>
                {/* Dates — sub-row on mobile, dissolves into parent on desktop */}
                <div className="flex items-center gap-2 md:contents">
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
                  <div className="relative flex-1">
                    <div className="relative cursor-pointer" onClick={() => endDateRef.current?.showPicker()}>
                      <input ref={endDateRef} type="date" className={`absolute inset-0 opacity-0 h-full cursor-pointer ${endDate ? "right-10" : "w-full"}`}
                        value={endDate} onChange={(e) => setEndDate(e.target.value)} min={date || undefined} />
                      <div className="h-12 flex items-center justify-between px-3 rounded-xl border border-black bg-white">
                        <span className={`text-sm ${endDate ? "text-black" : "text-muted-foreground"}`}>
                          {endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "End date"}
                        </span>
                        {endDate ? (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEndDate(""); }} className="relative z-10 p-0.5 rounded-full hover:bg-gray-100">
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ) : (
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Times — sub-row on mobile, dissolves into parent on desktop */}
                <div className="flex items-center gap-2 md:contents">
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

              {/* Day of week picker + week-of-month + time — shown when recurring */}
              {isRecurring && (
                <div className="space-y-4">
                  {/* Day multi-select */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Day(s)</p>
                    <div className="flex gap-2 flex-wrap">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => {
                        const full = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" }[d]!;
                        const selected = recurringDays.includes(full);
                        return (
                          <button key={d} type="button"
                            onClick={() => setRecurringDays(prev =>
                              selected
                                ? prev.length > 1 ? prev.filter(x => x !== full) : prev
                                : [...prev, full]
                            )}
                            className={`h-10 w-12 rounded-xl text-sm font-semibold border transition-all ${selected ? "bg-black text-white border-black" : "bg-white text-black border-black"}`}>
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Week of month */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Which week of the month?</p>
                    <div className="flex gap-2 flex-wrap">
                      {([{ label: "Every week", val: null }, { label: "1st", val: 1 }, { label: "2nd", val: 2 }, { label: "3rd", val: 3 }, { label: "4th", val: 4 }] as { label: string; val: number | null }[]).map(({ label, val }) => (
                        <button key={label} type="button"
                          onClick={() => setRecurringWeekOfMonth(val)}
                          className={`h-10 px-3 rounded-xl text-sm font-semibold border transition-all ${recurringWeekOfMonth === val ? "bg-black text-white border-black" : "bg-white text-black border-black"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {/* Live preview */}
                    <p className="text-xs text-muted-foreground pt-0.5">
                      Shows as: <span className="font-medium text-foreground">{getRecurringLabelFull({ recurring_days: recurringDays, recurring_week_of_month: recurringWeekOfMonth })}</span>
                    </p>
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
                    {locationOpen && !isVirtual && (locationSearch.trim() || locationResults.length > 0 || (locationSearch === "" && savedAddresses.length > 0)) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto">
                        {locationSearching && <div className="flex items-center justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}

                        {/* Use exactly what was typed — geocode it first so we get lat/lng */}
                        {locationSearch.trim() && (
                          <button type="button"
                            onClick={async () => {
                              setAddress(locationSearch);
                              setLocationSearch(locationSearch);
                              setLocation(locationSearch);
                              setLocationOpen(false);
                              // Geocode the typed address so the map and location filtering work
                              try {
                                const res = await fetch(
                                  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&addressdetails=1&limit=1`,
                                  { headers: { "Accept-Language": "en" } }
                                );
                                const data = await res.json();
                                if (data[0]) {
                                  const item = data[0];
                                  const lat = parseFloat(item.lat);
                                  const lng = parseFloat(item.lon);
                                  const a = item.address || {};
                                  const cityName = a.city || a.town || a.village || a.county || "";
                                  const state = a.state || "";
                                  setLat(lat);
                                  setLng(lng);
                                  setLocation(cityName && state ? `${cityName}, ${state}` : locationSearch);
                                }
                              } catch { /* silently fall back to no map */ }
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-2 border-b border-border">
                            <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span><span className="font-semibold text-primary">Use: </span>{locationSearch}</span>
                          </button>
                        )}
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
                <div className="relative">
                  <Textarea ref={descriptionTextareaRef} placeholder="Tell people about your event..." className="min-h-32 text-base resize-none overflow-y-auto pb-5" style={{ maxHeight: '600px' }} value={description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDescription(val.charAt(0).toUpperCase() + val.slice(1));
                    }} maxLength={2000} />
                  <div
                    onPointerDown={handleDescriptionResizeStart}
                    onPointerMove={handleDescriptionResizeMove}
                    onPointerUp={handleDescriptionResizeEnd}
                    onPointerCancel={handleDescriptionResizeEnd}
                    aria-label="Drag to resize description box"
                    className="absolute bottom-0.5 right-0.5 w-6 h-6 flex items-end justify-end p-1 cursor-ns-resize text-gray-400 touch-none select-none"
                    style={{ touchAction: "none" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M9 1 1 9M9 5 5 9M9 9h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div className="text-sm text-gray-500 text-right">{description.length}/2000</div>
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Extra Details</label>
                  <p className="text-xs text-muted-foreground mt-0.5">Add sections like parking, what to bring, schedule, etc.</p>
                </div>

                {/* Quick-add suggestions — always visible, hide already-added ones */}
                {(() => {
                  const suggestions = [
                    { title: "What to Bring", icon: "check" },
                    { title: "Parking", icon: "car" },
                    { title: "Schedule", icon: "calendar" },
                    { title: "Cost Details", icon: "dollar" },
                    { title: "Kids Welcome", icon: "balloon" },
                  ].filter(s => !additionalInfo.some(item => item.title === s.title));
                  if (suggestions.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.title}
                          type="button"
                          onClick={() => setAdditionalInfo([...additionalInfo, { title: suggestion.title, description: "", icon: suggestion.icon }])}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-gray-400 text-xs text-muted-foreground hover:border-black hover:text-black transition-colors"
                        >
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                          {suggestion.title}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {additionalInfo.map((item, idx) => {
                  const collapsed = collapsedSections.has(idx);
                  return (
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
                        onClick={() => toggleSectionCollapsed(idx)}
                        aria-label={collapsed ? "Expand section" : "Collapse section"}
                        className="text-muted-foreground hover:text-black transition-colors flex-shrink-0 p-1.5 -m-1.5"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
                      </button>
                      <div className="relative flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setOpenSectionMenu(openSectionMenu === idx ? null : idx)}
                          aria-label="Section options"
                          className="text-muted-foreground hover:text-black transition-colors p-1.5 -m-1.5"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openSectionMenu === idx && (
                          <div
                            ref={sectionMenuRef}
                            className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setAdditionalInfo(additionalInfo.filter((_, i) => i !== idx));
                                setOpenSectionMenu(null);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete section
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {collapsed && item.description && (
                      <p className="text-xs text-muted-foreground truncate pl-0.5">{item.description}</p>
                    )}

                    {!collapsed && (
                      <>
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
                            rows={4}
                            className="w-full text-sm resize-none outline-none bg-transparent placeholder:text-muted-foreground overflow-y-auto"
                            style={{ maxHeight: '220px' }}
                            value={item.description}
                            onChange={(e) => {
                              const next = [...additionalInfo];
                              next[idx] = { ...next[idx], description: e.target.value };
                              setAdditionalInfo(next);
                            }}
                            maxLength={500}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setAdditionalInfo([...additionalInfo, { title: "", description: "", icon: "check" }])}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-gray-400 text-sm text-muted-foreground hover:border-black hover:text-black transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  Add another section
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
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { id: "spiritual", label: "Spiritual", icon: <SunMedium className="h-4 w-4" /> },
                    { id: "fhe", label: "FHE", icon: <LandPlot className="h-4 w-4" /> },
                    { id: "service", label: "Service", icon: <HandPlatter className="h-4 w-4" /> },
                    { id: "general", label: "General", icon: <Rainbow className="h-4 w-4" /> },
                    { id: "conference", label: "Conference", icon: <Presentation className="h-4 w-4" /> },
                  ].map((type) => (
                    <button key={type.id} type="button" onClick={() => setWardType(type.id)}
                      className={`flex-shrink-0 rounded-xl transition-all px-4 py-3 flex items-center justify-center gap-1.5 ${wardType === type.id ? "bg-black border-[2px] border-black text-white" : "border-[1px] border-black text-black"}`}>
                      {type.icon}
                      <p className="font-semibold text-sm whitespace-nowrap">{type.label}</p>
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
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Pick up to 2</p>
                    {foodGroups.map((group) => (
                      <div key={group.label} className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map(({ id, icon: Icon, label }) => (
                            <button key={id} type="button" onClick={() => toggleFood(id)}
                              className={`flex items-center gap-1.5 min-w-[48px] px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${selectedFoods.includes(id) ? "border-[2px] border-primary bg-primary/5" : "border-transparent bg-secondary"}`}>
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="text-xs">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Age Range */}
              <div className="space-y-3 pb-12">
                <label className="text-sm font-medium">Age Range</label>
                <div className="flex items-center gap-3">

                  {/* Min age */}
                  <div className="relative flex-1" ref={minAgeRef}>
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
                  <div className="relative flex-1" ref={maxAgeRef}>
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
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${maxAge === "+" ? "font-bold" : ""}`}
                          onClick={() => { setMaxAge("+"); setMaxAgeOpen(false); }}>
                          <p className="text-sm">+ <span className="text-xs text-muted-foreground">(above)</span></p>
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

              {/* Group Assignment */}
              <div className="space-y-4 pb-40">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Group Assignment</label>
                  <button
                    type="button"
                    onClick={() => { setGroupAssignmentEnabled(v => !v); if (groupAssignmentEnabled) { setGroupTheme(null); setNumGroups(4); } }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${groupAssignmentEnabled ? "bg-black" : "bg-gray-200"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${groupAssignmentEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {groupAssignmentEnabled && (
                  <div className="space-y-4" ref={groupThemeExpandRef}>
                    {/* Theme cards */}
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.entries(GROUP_THEMES) as [keyof typeof GROUP_THEMES, typeof GROUP_THEMES[keyof typeof GROUP_THEMES]][]).map(([key, theme]) => {
                        const selected = groupTheme === key;
                        return (
                          <div key={key} className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setGroupTheme(selected ? null : key)}
                              className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 transition-all ${selected ? "border-black bg-black text-white" : "border-gray-200 bg-white text-black"}`}
                            >
                              <span className="text-xl">{theme.emoji}</span>
                              <span className="text-xs font-semibold leading-tight text-center">{theme.label}</span>
                            </button>
                            {selected && (
                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1.5">
                                {theme.groups.slice(0, numGroups).map(g => (
                                  <div key={g} className="text-xs text-gray-700 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                                    {g}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Number of groups */}
                    {groupTheme && (
                      <div className="space-y-2" ref={groupNumPickerRef}>
                        <label className="text-sm font-medium">Number of Groups</label>
                        <div className="flex gap-2 flex-wrap">
                          {[2,3,4,5,6,7,8,9].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setNumGroups(n)}
                              className={`w-10 h-10 rounded-full text-sm font-semibold border-2 transition-all ${numGroups === n ? "bg-black text-white border-black" : "bg-white text-black border-gray-200"}`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Anyone who RSVPs "Going" will be randomly assigned to one of these groups and will be able to see their assigned group.
                    </p>
                    <div ref={groupHelperTextRef} />
                  </div>
                )}
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

          {/* No Image Confirmation Dialog */}
          <Dialog open={noImageConfirmOpen} onOpenChange={setNoImageConfirmOpen}>
            <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl">
              <img src="/emptystatenoimage.png" alt="No image added" className="mx-auto h-32 sm:h-36 w-auto object-contain" />
              <DialogHeader><DialogTitle>No image added</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">You haven't added a photo for this event. Events with images get more attention — want to add one?</p>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1" onClick={() => setNoImageConfirmOpen(false)}>Add image</Button>
                <Button className="flex-1" onClick={proceedSubmit}>Publish anyway</Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </main>

      {/* Floating Publish Button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <div className="max-w-xl mx-auto">
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

    </div>
  );
};

export default CreateEvent;