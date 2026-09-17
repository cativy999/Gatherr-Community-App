import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Upload, Check, Loader2, ImagePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ── Design tokens ────────────────────────────────────────────────────────────
const TEAL    = "#1F4E5B";
const MID     = "#635C59";
const DARK    = "#2C2523";
const DIV     = "#E4DCCF";
const BG      = "#FAF6F0";
const SURFACE = "#EFECE6";
const ERROR   = "#EF4444";
const INTER   = "'Inter', sans-serif";

const TIME_OPTIONS = (() => {
  const opts: string[] = [];
  for (let h = 6; h < 24; h++)
    for (const m of ['00', '30'])
      opts.push(`${String(h).padStart(2, '0')}:${m}`);
  return opts;
})();

const formatTime = (v: string) =>
  new Date(`2000-01-01T${v}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const formatDateShort = (v: string) => {
  if (!v) return '';
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── Category config ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "spiritual",  label: "Spiritual",   emoji: "✦" },
  { id: "fhe",        label: "FHE",         emoji: "🏠" },
  { id: "service",    label: "Service",     emoji: "🤝" },
  { id: "general",    label: "General",     emoji: "⊞" },
  { id: "conference", label: "Conference",  emoji: "🎤" },
];

// ── Food options ───────────────────────────────────────────────────────────────
const FOOD_OPTIONS = [
  { id: "pizza",    label: "Pizza",     emoji: "🍕" },
  { id: "cookies",  label: "Cookies",   emoji: "🍪" },
  { id: "bbq",      label: "BBQ",       emoji: "🍖" },
  { id: "burger",   label: "Burger",    emoji: "🍔" },
  { id: "drink",    label: "Drink",     emoji: "🥤" },
  { id: "icecream", label: "Ice Cream", emoji: "🍦" },
  { id: "salad",    label: "Salad",     emoji: "🥗" },
];

// ── Age range options ──────────────────────────────────────────────────────────
const MIN_AGES = ["18", "21", "25", "30", "35", "40", "50"];
const MAX_AGES = ["25", "30", "35", "40", "50", "60", "+"];

// ── Sub-components ────────────────────────────────────────────────────────────
const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <p style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: MID, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, marginTop: 0 }}>
    {children}{required && <span style={{ color: ERROR, marginLeft: 2 }}>*</span>}
  </p>
);

const FieldBox = ({ children, focused }: { children: React.ReactNode; focused?: boolean }) => (
  <div style={{
    background: focused ? 'white' : BG, borderRadius: 14,
    border: `${focused ? 2 : 1}px solid ${focused ? TEAL : DIV}`,
    height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', cursor: 'text',
  }}>
    {children}
  </div>
);

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button type="button" onClick={onToggle} style={{
    position: "relative", display: "inline-flex", height: 24, width: 44,
    borderRadius: 999, background: on ? TEAL : DIV, border: "none", cursor: "pointer",
    flexShrink: 0, transition: "background 0.2s",
  }}>
    <span style={{
      position: "absolute", top: 2, left: on ? 22 : 2, width: 20, height: 20,
      borderRadius: "50%", background: "white", transition: "left 0.2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    }} />
  </button>
);

// ── Simple time selector ──────────────────────────────────────────────────────
const TimeSelect = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ background: BG, borderRadius: 14, border: `1px solid ${open ? TEAL : DIV}`, height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', cursor: 'pointer', justifyContent: 'space-between' }}
      >
        <span style={{ fontFamily: INTER, fontSize: 14, color: value ? DARK : MID }}>
          {value ? formatTime(value) : placeholder}
        </span>
        <ChevronDown size={14} color={MID} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', borderRadius: 12, border: `1px solid ${DIV}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
          {TIME_OPTIONS.map(t => (
            <button key={t} type="button" onClick={() => { onChange(t); setOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: INTER, fontSize: 14, fontWeight: value === t ? 700 : 400, color: value === t ? TEAL : DARK, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {formatTime(t)}
              {value === t && <Check size={14} color={TEAL} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Age dropdown ──────────────────────────────────────────────────────────────
const AgeSelect = ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: 'white', borderRadius: 14, border: `1px solid ${open ? TEAL : MID}`, height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', cursor: 'pointer', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: INTER, fontSize: 14, color: value ? DARK : '#333' }}>{value || placeholder}</span>
        <ChevronDown size={14} color={MID} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', borderRadius: 12, border: `1px solid ${DIV}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100 }}>
          <button type="button" onClick={() => { onChange(''); setOpen(false); }}
            style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: INTER, fontSize: 14, color: !value ? TEAL : DARK, fontWeight: !value ? 700 : 400 }}>
            Any
          </button>
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: INTER, fontSize: 14, color: value === o ? TEAL : DARK, fontWeight: value === o ? 700 : 400 }}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Image upload box ────────────────────────────────────────────────────────
const ImageUploadBox = ({
  preview, onFile, onClear, height = 301, width = 268, borderRadius = 16, label
}: {
  preview: string | null; onFile: (f: File) => void; onClear?: () => void;
  height?: number; width?: number; borderRadius?: number; label?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{ position: 'relative', width, height, borderRadius, overflow: 'hidden', cursor: 'pointer', background: BG, border: `1px solid ${DIV}`, flexShrink: 0 }}
    >
      {preview ? (
        <>
          <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 100, padding: '6px 14px' }}>
              <span style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: TEAL }}>Update Cover Photo</span>
            </div>
          </div>
          {onClear && (
            <button type="button" onClick={e => { e.stopPropagation(); onClear(); }}
              style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 8, background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={10} color="white" />
            </button>
          )}
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ImagePlus size={24} color={MID} />
          <span style={{ fontFamily: INTER, fontSize: 12, color: MID }}>{label || 'Upload photo'}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  prefillDate?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string | null;
  session?: any;
  onCreated?: () => void;
}

export default function CreateEventModal({
  open, onClose, prefillDate = '', userId, userName = '', userAvatar, session, onCreated,
}: CreateEventModalProps) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [title,        setTitle]        = useState('');
  const [wardType,     setWardType]     = useState<string | null>(null);
  const [startDate,    setStartDate]    = useState(prefillDate);
  const [endDate,      setEndDate]      = useState('');
  const [startTime,    setStartTime]    = useState('');
  const [endTime,      setEndTime]      = useState('');
  const [isRecurring,  setIsRecurring]  = useState(false);
  const [location,     setLocation]     = useState('');
  const [description,  setDescription]  = useState('');
  const [extraTitle,   setExtraTitle]   = useState('');
  const [extraDesc,    setExtraDesc]    = useState('');
  const [socialLinks,  setSocialLinks]  = useState<string[]>(['']);
  const [minAge,       setMinAge]       = useState('');
  const [maxAge,       setMaxAge]       = useState('');
  const [foodProvided, setFoodProvided] = useState(false);
  const [selectedFoods,setSelectedFoods]= useState<string[]>([]);

  // ── Image state ─────────────────────────────────────────────────────────────
  const [coverFile,     setCoverFile]     = useState<File | null>(null);
  const [coverPreview,  setCoverPreview]  = useState<string | null>(null);
  const [extra1File,    setExtra1File]    = useState<File | null>(null);
  const [extra1Preview, setExtra1Preview] = useState<string | null>(null);
  const [extra2File,    setExtra2File]    = useState<File | null>(null);
  const [extra2Preview, setExtra2Preview] = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setTitle(''); setWardType(null);
      setStartDate(prefillDate || ''); setEndDate('');
      setStartTime(''); setEndTime('');
      setIsRecurring(false); setLocation(''); setDescription('');
      setExtraTitle(''); setExtraDesc('');
      setSocialLinks(['']); setMinAge(''); setMaxAge('');
      setFoodProvided(false); setSelectedFoods([]);
      setCoverFile(null); setCoverPreview(null);
      setExtra1File(null); setExtra1Preview(null);
      setExtra2File(null); setExtra2Preview(null);
    }
  }, [open, prefillDate]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Handle file → preview
  const handleCoverFile = (f: File) => {
    setCoverFile(f);
    const url = URL.createObjectURL(f);
    setCoverPreview(url);
  };
  const handleExtra1File = (f: File) => {
    setExtra1File(f);
    setExtra1Preview(URL.createObjectURL(f));
  };
  const handleExtra2File = (f: File) => {
    setExtra2File(f);
    setExtra2Preview(URL.createObjectURL(f));
  };

  // Toggle food selection (max 2)
  const toggleFood = (id: string) => {
    setSelectedFoods(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!title.trim()) { toast.error('Please add an event title'); return; }
    if (!startDate)    { toast.error('Please select a start date'); return; }
    if (!location.trim()) { toast.error('Please add a venue or location'); return; }
    if (!session?.user) { toast.error('You must be logged in'); return; }

    setSaving(true);
    try {
      // Upload cover photo
      let imageUrl: string | null = null;
      if (coverFile) {
        const fileName = `${session.user.id}-${Date.now()}-cover.jpg`;
        const { error: upErr } = await supabase.storage.from('event-images').upload(fileName, coverFile);
        if (!upErr) {
          const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }
      }

      // Upload extra photos
      const extraUrls: (string | null)[] = [null, null];
      const extraFiles = [extra1File, extra2File];
      for (let i = 0; i < extraFiles.length; i++) {
        const f = extraFiles[i];
        if (f) {
          const fn = `${session.user.id}-${Date.now()}-extra${i}.jpg`;
          const { error: upErr } = await supabase.storage.from('event-images').upload(fn, f);
          if (!upErr) {
            const { data } = supabase.storage.from('event-images').getPublicUrl(fn);
            extraUrls[i] = data.publicUrl;
          }
        }
      }

      const allImageUrls = [imageUrl, ...extraUrls].filter(Boolean) as string[];

      const eventData: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        category: 'ward',
        ward_type: wardType,
        date: startDate,
        end_date: endDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        location: location.trim(),
        address: location.trim(),
        image_url: allImageUrls[0] ?? null,
        image_urls: allImageUrls.length > 0 ? allImageUrls : null,
        food: selectedFoods.length > 0 ? selectedFoods : null,
        social_links: socialLinks.filter(Boolean).length > 0 ? socialLinks.filter(Boolean) : null,
        age_min: minAge ? parseInt(minAge) : null,
        age_max: maxAge && maxAge !== '+' ? parseInt(maxAge) : null,
        is_recurring: isRecurring,
        status: 'published',
        user_id: session.user.id,
        additional_info: (extraTitle.trim())
          ? [{ title: extraTitle.trim(), description: extraDesc.trim() }]
          : null,
      };

      const { error } = await supabase.from('events').insert(eventData);
      if (error) throw error;

      toast.success('Event published!');
      onClose();
      onCreated?.();
    } catch (err: any) {
      console.error('Error publishing event:', err);
      toast.error('Could not publish event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // ── Input field style ────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: BG, border: `1px solid ${DIV}`, borderRadius: 14, height: 44,
    width: '100%', padding: '0 16px', fontFamily: INTER, fontSize: 14, color: DARK,
    outline: 'none', boxSizing: 'border-box',
  };

  const textareaStyle: React.CSSProperties = {
    background: BG, border: `1px solid ${DIV}`, borderRadius: 16,
    width: '100%', padding: '12px 16px', fontFamily: INTER, fontSize: 14, color: DARK,
    outline: 'none', boxSizing: 'border-box', resize: 'none', lineHeight: 1.5,
  };

  const sectionTitle = (text: string) => (
    <h2 style={{ fontFamily: INTER, fontSize: 24, fontWeight: 700, color: TEAL, margin: '0 0 20px', padding: 0 }}>{text}</h2>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal container */}
      <div
        style={{ background: 'white', borderRadius: 18, border: `1px solid #e8ddd4`, boxShadow: '0px 12px 48px rgba(44,37,35,0.18)', width: '100%', maxWidth: 1018, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: '50%', background: SURFACE, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
        >
          <X size={16} color={MID} />
        </button>

        {/* ── Top header row: title + Post As ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 56px 0 40px', flexShrink: 0 }}>
          <h1 style={{ fontFamily: INTER, fontSize: 28, fontWeight: 700, color: TEAL, margin: 0 }}>Event Details</h1>
          {/* Post as */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 270, flexShrink: 0 }}>
            <Label required>Post as</Label>
            <div style={{ background: BG, borderRadius: 14, border: `1px solid ${DIV}`, height: 44, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
              {userAvatar
                ? <img src={userAvatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: INTER, fontSize: 12, fontWeight: 700, color: 'white' }}>{(userName || 'M')[0].toUpperCase()}</span>
                  </div>
              }
              <span style={{ fontFamily: INTER, fontSize: 14, color: TEAL, flex: 1 }}>{userName || 'You'}</span>
              <ChevronDown size={16} color={MID} />
            </div>
          </div>
        </div>

        {/* ── Two-column body ── */}
        <div style={{ display: 'flex', gap: 24, flex: 1, overflow: 'hidden', padding: '20px 40px 80px' }}>

          {/* Left: scrollable form */}
          <div ref={leftRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

              {/* ── Section: Event Details ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Event Name */}
                <div>
                  <Label required>Event Name</Label>
                  <input
                    autoFocus
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Give your event a name"
                    style={{ ...inputStyle, border: `2px solid ${title ? TEAL : DIV}`, background: 'white' }}
                  />
                </div>

                {/* Category */}
                <div>
                  <Label>Choose a Category</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CATEGORIES.map(cat => {
                      const active = wardType === cat.id;
                      return (
                        <button key={cat.id} type="button" onClick={() => setWardType(active ? null : cat.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 100, border: active ? '1px solid white' : `1px solid ${DIV}`, background: active ? TEAL : BG, cursor: 'pointer', transition: 'all 0.15s' }}>
                          <span style={{ fontSize: 13 }}>{cat.emoji}</span>
                          <span style={{ fontFamily: INTER, fontSize: 12, fontWeight: active ? 600 : 500, color: active ? 'white' : MID, whiteSpace: 'nowrap' }}>
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <Label required>Start Date</Label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        style={{ ...inputStyle, colorScheme: 'light' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Label>End Date</Label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        min={startDate}
                        style={{ ...inputStyle, colorScheme: 'light' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <Label required>Start Time</Label>
                      <TimeSelect value={startTime} onChange={setStartTime} placeholder="4:30 PM" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Label>End Time</Label>
                      <TimeSelect value={endTime} onChange={setEndTime} placeholder="– –" />
                    </div>
                  </div>
                </div>

                {/* Recurring */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 160 }}>
                  <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 500, color: DARK }}>Recurring Event</span>
                  <Toggle on={isRecurring} onToggle={() => setIsRecurring(o => !o)} />
                </div>

                {/* Location */}
                <div>
                  <Label required>Venue / Location</Label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Zuma Beach, Malibu CA"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* ── Section: Event Descriptions ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {sectionTitle('Event Descriptions')}

                {/* Description */}
                <div>
                  <Label required>Description</Label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Tell people what to expect…"
                    rows={5}
                    style={textareaStyle}
                  />
                </div>

                {/* Extra Details */}
                <div>
                  <Label>Extra Details</Label>
                  <div style={{ border: `1px solid ${DIV}`, borderRadius: 16, overflow: 'hidden' }}>
                    {/* Card header */}
                    <div style={{ background: BG, borderBottom: `1px solid ${DIV}`, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <input
                        value={extraTitle}
                        onChange={e => setExtraTitle(e.target.value)}
                        placeholder="e.g. What to Bring"
                        style={{ background: 'none', border: 'none', outline: 'none', fontFamily: INTER, fontSize: 13, color: DARK, flex: 1 }}
                      />
                      <div style={{ background: SURFACE, border: `1px solid ${DIV}`, borderRadius: 999, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 14 }}>📋</span>
                        <ChevronDown size={12} color={MID} />
                      </div>
                    </div>
                    {/* Card body */}
                    <div style={{ background: BG, padding: '10px 14px' }}>
                      <textarea
                        value={extraDesc}
                        onChange={e => setExtraDesc(e.target.value)}
                        placeholder="Description..."
                        rows={2}
                        style={{ ...textareaStyle, background: 'transparent', border: 'none', padding: 0, fontSize: 13 }}
                      />
                    </div>
                  </div>
                  <p style={{ fontFamily: INTER, fontSize: 12, color: '#9e9590', margin: '6px 0 0', textAlign: 'center', cursor: 'pointer' }}>+ Add another section</p>
                </div>
              </div>

              {/* ── Section: Preferences & Extras ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {sectionTitle('Preferences & Extras')}

                {/* Social Links */}
                <div>
                  <Label>Social Link</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {socialLinks.slice(0, 2).map((link, i) => (
                        <input key={i} value={link} onChange={e => {
                          const next = [...socialLinks];
                          next[i] = e.target.value;
                          setSocialLinks(next);
                        }}
                          placeholder="https://instagram.com/p/..."
                          style={{ ...inputStyle, flex: 1 }} />
                      ))}
                    </div>
                  </div>
                  <p style={{ fontFamily: INTER, fontSize: 12, color: '#9e9590', margin: '6px 0 0', textAlign: 'center', cursor: 'pointer' }}>+ Add another section</p>
                </div>

                {/* Age Group Filter */}
                <div>
                  <Label>Age Group Filter</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AgeSelect value={minAge} onChange={setMinAge} options={MIN_AGES} placeholder="Min Age" />
                    <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: MID, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>To</span>
                    <AgeSelect value={maxAge} onChange={setMaxAge} options={MAX_AGES} placeholder="Max Age" />
                  </div>
                </div>

                {/* Food Provided */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 500, color: DARK }}>Food Provided</span>
                    <Toggle on={foodProvided} onToggle={() => setFoodProvided(o => !o)} />
                  </div>
                  {foodProvided && (
                    <div style={{ paddingTop: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                        {FOOD_OPTIONS.map(food => {
                          const sel = selectedFoods.includes(food.id);
                          return (
                            <button key={food.id} type="button" onClick={() => toggleFood(food.id)}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 12px', borderRadius: 12, border: sel ? `2px solid ${TEAL}` : `1px solid #e0e0e0`, background: sel ? '#ebf5f7' : '#f5f5f5', cursor: 'pointer' }}>
                              <span style={{ fontSize: 16 }}>{food.emoji}</span>
                              <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 500, color: '#4d4d4d' }}>{food.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontFamily: INTER, fontSize: 13, color: '#666', margin: 0 }}>Select up to 2 food options</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Right: sticky image upload column */}
          <div style={{ width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'flex-start', position: 'sticky', top: 0 }}>

            {/* Cover photo */}
            <ImageUploadBox
              preview={coverPreview}
              onFile={handleCoverFile}
              onClear={() => { setCoverFile(null); setCoverPreview(null); }}
              height={301}
              width={268}
              borderRadius={16}
              label="Upload Cover Photo"
            />

            {/* Additional photos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <p style={{ fontFamily: INTER, fontSize: 13, color: '#9b8e82', margin: 0 }}>Additional photos (optional)</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <ImageUploadBox preview={extra1Preview} onFile={handleExtra1File} onClear={() => { setExtra1File(null); setExtra1Preview(null); }} height={72} width={96} borderRadius={12} label="" />
                <ImageUploadBox preview={extra2Preview} onFile={handleExtra2File} onClear={() => { setExtra2File(null); setExtra2Preview(null); }} height={72} width={96} borderRadius={12} label="" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <span style={{ fontSize: 14 }}>✨</span>
                <span style={{ fontFamily: INTER, fontSize: 14, fontWeight: 500, color: '#a06b8a' }}>AI-generated image</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Action bar (sticky bottom) ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderTop: `1px solid ${DIV}`,
          borderRadius: '0 0 18px 18px',
          padding: '16px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16,
        }}>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: INTER, fontSize: 14, fontWeight: 600, color: TEAL }}>
            Preview First
          </button>
          <button type="button" onClick={handlePublish} disabled={saving}
            style={{ padding: '11px 28px', background: saving ? '#a0b8c0' : TEAL, color: BG, border: 'none', borderRadius: 100, cursor: saving ? 'default' : 'pointer', fontFamily: INTER, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}>
            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Publishing…' : 'Publish Now'}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
