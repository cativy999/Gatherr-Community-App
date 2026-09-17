import { useState, useRef, useEffect } from 'react';
import {
  X, ChevronDown, Check, Loader2, MapPin, MoreVertical, Trash2,
  Calendar, RefreshCw, ArrowRight, Star, Circle, CheckCircle2,
  FileText, Car, DollarSign, Ticket, Utensils, Link,
  SunMedium, LandPlot, HandPlatter, Rainbow, Presentation,
  Image as ImageIcon, ImagePlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  CE_DARK, CE_TEAL, CE_MID, CE_DIV, CE_BG, CE_SURFACE, CE_ERROR, CE_SANS,
} from '../tokens';

// ── Design token aliases ────────────────────────────────────────────────────
const DARK    = CE_DARK;
const TEAL    = CE_TEAL;
const MID     = CE_MID;
const DIV     = CE_DIV;
const BG      = CE_BG;
const SURFACE = CE_SURFACE;
const ERROR   = CE_ERROR;
const SANS    = CE_SANS;

// ── Inject hover styles (same as CreateEvent.tsx) ──────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('cem-trigger-style')) {
  const s = document.createElement('style');
  s.id = 'cem-trigger-style';
  s.textContent = `
    .cem-trigger { transition: border-color 0.2s ease, box-shadow 0.25s ease; }
    .cem-trigger:hover { border-color: #1F4E5B !important; box-shadow: 0px 0px 3.95px rgba(0,0,0,0.25); }
    .cem-trigger.cem-open, .cem-trigger.cem-open:hover { border: 2px solid #1F4E5B !important; box-shadow: 0 0 0 4px #EDE5DA; }
  `;
  document.head.appendChild(s);
}

// ── Constants ────────────────────────────────────────────────────────────────
const TIME_OPTIONS = (() => {
  const opts: string[] = [];
  for (let h = 6; h < 24; h++)
    for (const m of ['00', '30'])
      opts.push(`${String(h).padStart(2, '0')}:${m}`);
  return opts;
})();

const formatTime = (v: string) =>
  new Date(`2000-01-01T${v}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const CE_MONTHS_F = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const INFO_ICONS = [
  { key: 'calendar', Icon: Calendar },
  { key: 'star',     Icon: Star },
  { key: 'circle',   Icon: Circle },
  { key: 'check',    Icon: CheckCircle2 },
  { key: 'note',     Icon: FileText },
  { key: 'car',      Icon: Car },
  { key: 'pin',      Icon: MapPin },
  { key: 'dollar',   Icon: DollarSign },
  { key: 'ticket',   Icon: Ticket },
  { key: 'food',     Icon: Utensils },
];

const CATEGORIES = [
  { id: 'spiritual',  label: 'Spiritual',   Icon: SunMedium },
  { id: 'fhe',        label: 'FHE',         Icon: LandPlot },
  { id: 'service',    label: 'Service',     Icon: HandPlatter },
  { id: 'general',    label: 'General',     Icon: Rainbow },
  { id: 'conference', label: 'Conference',  Icon: Presentation },
];

const FOOD_TILES = [
  { id: 'pizza',    emoji: '🍕', label: 'Pizza' },
  { id: 'tacos',    emoji: '🌮', label: 'Tacos' },
  { id: 'cookies',  emoji: '🍪', label: 'Cookies' },
  { id: 'bbq',      emoji: '🍖', label: 'BBQ' },
  { id: 'burgers',  emoji: '🍔', label: 'Burger' },
  { id: 'drinks',   emoji: '🥤', label: 'Drink' },
  { id: 'icecream', emoji: '🍦', label: 'Ice Cream' },
  { id: 'salad',    emoji: '🥗', label: 'Salad' },
  { id: 'smores',   emoji: '🍫', label: "S'mores" },
];

const GROUP_THEMES = {
  pizza:   { label: 'Pizza',        emoji: '🍕', groups: ['Extra Saucy','Half Baked','Well Done','Burnt Edges','Deep Dish','Thin Crust','Stuffed Crust','Extra Crispy','Double Pepperoni'] },
  weather: { label: 'Weather',      emoji: '⛈️', groups: ['Sunshine','Rainbow','Thunder','Lightning','Drizzle','Blizzard','Fog','Frost','Tornado'] },
  taco:    { label: 'Taco Tuesday', emoji: '🌮', groups: ['Extra Cilantro','No Onions Please','Hot Sauce Enthusiast','Guac Costs Extra','Double Meat','Verde Sauce','Extra Crunchy','Loaded','Taco Supreme'] },
} as const;

type GroupThemeKey = keyof typeof GROUP_THEMES;

// ── CESheet ──────────────────────────────────────────────────────────────────
const CESheet = ({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 360);
      return () => clearTimeout(t);
    }
  }, [open]);
  if (!mounted) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10100 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', opacity: visible ? 1 : 0, transition: 'opacity 0.22s ease' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', maxHeight: '72vh', display: 'flex', flexDirection: 'column', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: DIV }} />
        </div>
        <p style={{ textAlign: 'center', fontFamily: SANS, fontSize: 17, fontWeight: 700, color: DARK, padding: '0 24px 14px', borderBottom: `1px solid ${DIV}` }}>{title}</p>
        <div style={{ overflowY: 'auto', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>{children}</div>
      </div>
    </div>
  );
};

// ── TimePicker (desktop: inline dropdown; mobile: bottom sheet) ─────────────
const TimePicker = ({ value, onChange, placeholder, clearable }: {
  value: string; onChange: (v: string) => void; placeholder: string; clearable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const listRef  = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (open && !isMobile && value && listRef.current) {
      const idx = TIME_OPTIONS.indexOf(value);
      if (idx !== -1) {
        const item = listRef.current.children[idx] as HTMLElement;
        if (item) listRef.current.scrollTop = item.offsetTop - listRef.current.clientHeight / 2 + item.offsetHeight / 2;
      }
    }
  }, [open, isMobile, value]);

  useEffect(() => {
    if (open && isMobile && value && listRef.current) {
      const idx = TIME_OPTIONS.indexOf(value);
      if (idx !== -1) {
        const item = listRef.current.children[idx] as HTMLElement;
        if (item) setTimeout(() => item.scrollIntoView({ block: 'center' }), 50);
      }
    }
  }, [open, isMobile, value]);

  useEffect(() => {
    if (!open || isMobile) return;
    const h = (e: MouseEvent) => { if (outerRef.current && !outerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, isMobile]);

  const inputCls: React.CSSProperties = {
    height: 52, padding: '0 16px',
    border: open ? `2px solid ${TEAL}` : `1.5px solid ${DIV}`,
    borderRadius: 14, background: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', cursor: 'pointer',
  };

  const trigger = (
    <div className={`cem-trigger${open ? ' cem-open' : ''}`} style={inputCls} onClick={() => setOpen(o => !o)}>
      <span style={{ fontSize: 15, fontFamily: SANS, color: value ? DARK : (clearable ? DARK : MID) }}>
        {value ? formatTime(value) : clearable ? '-- : --' : placeholder}
      </span>
      <ChevronDown style={{ width: 16, height: 16, color: MID, transform: open && !isMobile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
    </div>
  );

  const rows = (
    <div ref={listRef}>
      {clearable && (
        <button type="button" onClick={() => { onChange(''); setOpen(false); }}
          style={{ width: '100%', textAlign: 'left', padding: isMobile ? '16px 24px' : '10px 16px', fontFamily: SANS, fontSize: isMobile ? 16 : 14, fontWeight: !value ? 700 : 400, color: !value ? TEAL : MID, background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${DIV}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          -- : -- {!value && <Check style={{ width: 16, height: 16, color: TEAL }} />}
        </button>
      )}
      {TIME_OPTIONS.map(t => (
        <button key={t} type="button" onClick={() => { onChange(t); setOpen(false); }}
          style={{ width: '100%', textAlign: 'left', padding: isMobile ? '16px 24px' : '10px 16px', fontFamily: SANS, fontSize: isMobile ? 16 : 14, fontWeight: value === t ? 700 : 400, color: value === t ? TEAL : DARK, background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${DIV}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {formatTime(t)} {value === t && <Check style={{ width: 16, height: 16, color: TEAL }} />}
        </button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ position: 'relative', flex: 1 }}>
        {trigger}
        <CESheet open={open} onClose={() => setOpen(false)} title={placeholder}>{rows}</CESheet>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', flex: 1 }} ref={outerRef}>
      {trigger}
      {open && (
        <div ref={listRef} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', borderRadius: 14, border: `1.5px solid ${DIV}`, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 10000, maxHeight: 200, overflowY: 'auto' }}>
          {clearable && (
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontFamily: SANS, fontSize: 14, fontWeight: !value ? 700 : 400, color: !value ? TEAL : MID, background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${DIV}` }}>
              -- : --
            </button>
          )}
          {TIME_OPTIONS.map(t => (
            <button key={t} type="button" onClick={() => { onChange(t); setOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontFamily: SANS, fontSize: 14, fontWeight: value === t ? 700 : 400, color: value === t ? TEAL : DARK, background: 'none', border: 'none', cursor: 'pointer' }}>
              {formatTime(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── CERangePicker (dual-month desktop panel + mobile bottom sheet) ───────────
const CERangePicker = ({
  startValue, onStartChange, endValue, onEndChange, startDisabled, endDisabled,
}: {
  startValue: string; onStartChange: (v: string) => void;
  endValue: string;   onEndChange:   (v: string) => void;
  startDisabled?: boolean; endDisabled?: boolean;
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [open, setOpen] = useState(false);
  const [mobileTarget, setMobileTarget] = useState<'start' | 'end'>('start');
  const [pendingStart, setPendingStart] = useState('');
  const [pendingEnd,   setPendingEnd]   = useState('');
  const [hoverDate,    setHoverDate]    = useState<string | null>(null);
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const [mobileSheetMounted,  setMobileSheetMounted]  = useState(false);
  const [mobileSheetVisible,  setMobileSheetVisible]  = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (open) {
      setMobileSheetMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setMobileSheetVisible(true)));
      return () => cancelAnimationFrame(raf);
    } else {
      setMobileSheetVisible(false);
      const t = setTimeout(() => setMobileSheetMounted(false), 360);
      return () => clearTimeout(t);
    }
  }, [open, isMobile]);

  const openDesktop = () => {
    const anchor = startValue || today;
    const [y, m] = anchor.split('-').map(Number);
    setViewYear(y); setViewMonth(m - 1);
    setPendingStart(startValue); setPendingEnd(endValue); setHoverDate(null);
    setOpen(true);
  };

  const openMobile = (target: 'start' | 'end') => {
    const effectiveTarget = (target === 'end' && !startValue) ? 'start' : target;
    const anchor = effectiveTarget === 'start' ? (startValue || today) : (endValue || startValue || today);
    const [y, m] = anchor.split('-').map(Number);
    setViewYear(y); setViewMonth(m - 1);
    setMobileTarget(effectiveTarget);
    setPendingStart(startValue); setPendingEnd(endValue);
    setOpen(true);
  };

  const rightYear  = viewMonth === 11 ? viewYear + 1 : viewYear;
  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const effectiveEnd = pendingEnd
    ? pendingEnd
    : (pendingStart && hoverDate && hoverDate > pendingStart ? hoverDate : null);

  const handleDesktopDayClick = (dateStr: string) => {
    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(dateStr); setPendingEnd('');
    } else if (dateStr >= pendingStart) {
      setPendingEnd(dateStr);
    } else {
      setPendingEnd(pendingStart); setPendingStart(dateStr);
    }
  };

  const handleMobileDayClick = (dateStr: string) => {
    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(dateStr); setPendingEnd(''); setMobileTarget('end');
    } else {
      if (dateStr >= pendingStart) { setPendingEnd(dateStr); }
      else { setPendingStart(dateStr); setPendingEnd(''); }
    }
  };

  const handleApply  = () => { onStartChange(pendingStart); onEndChange(pendingEnd); setOpen(false); };
  const handleCancel = () => { setPendingStart(startValue); setPendingEnd(endValue); setOpen(false); };
  const handleClear  = () => { setPendingStart(''); setPendingEnd(''); };

  const fmtLong  = (v: string) => new Date(v + 'T00:00').toLocaleDateString('en-US', { month: 'long',  day: 'numeric', year: 'numeric' });
  const fmtShort = (v: string) => new Date(v + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getMonthCells = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const CELL = 40;

  const renderMonthGrid = (
    year: number, month: number,
    showPrev: boolean, showNext: boolean,
    onDayClick: (d: string) => void,
    enableHover: boolean,
  ) => {
    const cells = getMonthCells(year, month);
    const R = CELL / 2;
    return (
      <div style={{ width: CELL * 7, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {showPrev
            ? <button type="button" onMouseDown={e => { e.stopPropagation(); prevMonth(); }}
                style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${DIV}`, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: MID, fontSize: 18, lineHeight: 1 }}>‹</span>
              </button>
            : <div style={{ width: 28, flexShrink: 0 }} />}
          <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: DARK, textAlign: 'center' }}>
            {CE_MONTHS_F[month]} {year}
          </span>
          {showNext
            ? <button type="button" onMouseDown={e => { e.stopPropagation(); nextMonth(); }}
                style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${DIV}`, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: MID, fontSize: 18, lineHeight: 1 }}>›</span>
              </button>
            : <div style={{ width: 28, flexShrink: 0 }} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${CELL}px)`, marginBottom: 4 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 11, fontWeight: 500, color: MID }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, row) => (
            <div key={row} style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${CELL}px)` }}>
              {cells.slice(row * 7, row * 7 + 7).map((d, col) => {
                if (!d) return <div key={col} style={{ width: CELL, height: CELL }} />;
                const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isStart = ds === pendingStart;
                const isEnd   = !!pendingEnd && ds === pendingEnd;
                const inRange = !!(pendingStart && effectiveEnd && ds > pendingStart && ds < effectiveEnd);
                const isToday = ds === today;
                const lit = isStart || isEnd || inRange;
                const single = isStart && (!effectiveEnd || isEnd);
                let cr = '0';
                if (lit) {
                  if (single)        cr = `${R}px`;
                  else if (isStart)  cr = `${R}px 0 0 ${R}px`;
                  else if (isEnd)    cr = `0 ${R}px ${R}px 0`;
                  else if (col === 0) cr = `${R}px 0 0 ${R}px`;
                  else if (col === 6) cr = `0 ${R}px ${R}px 0`;
                }
                return (
                  <div key={col}
                    style={{ width: CELL, height: CELL, background: lit ? SURFACE : 'transparent', borderRadius: cr, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onMouseEnter={() => { if (enableHover && pendingStart && !pendingEnd) setHoverDate(ds); }}
                    onMouseLeave={() => { if (enableHover) setHoverDate(null); }}
                    onClick={() => onDayClick(ds)}>
                    <div style={{ width: CELL - 4, height: CELL - 4, borderRadius: '50%', background: (isStart || isEnd) ? TEAL : 'transparent', border: isToday && !isStart && !isEnd ? `1.5px solid ${TEAL}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: (isStart || isEnd || isToday) ? 600 : 400, color: (isStart || isEnd) ? 'white' : DARK, lineHeight: 1 }}>
                        {d}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const triggerField: React.CSSProperties = {
    height: 52, borderRadius: 14, border: `1.5px solid ${DIV}`,
    background: 'white', padding: '0 14px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none',
  };

  const PANEL_W = CELL * 7 * 2 + 32 * 2 + 1 + 72;

  return (
    <>
      <div ref={triggerRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ opacity: startDisabled ? 0.4 : 1, pointerEvents: startDisabled ? 'none' : 'auto' }}>
          <CEFieldLabel required>Start Date</CEFieldLabel>
          <div className={`cem-trigger${open ? ' cem-open' : ''}`} style={triggerField} onClick={() => isMobile ? openMobile('start') : openDesktop()}>
            <span style={{ fontFamily: SANS, fontSize: 14, color: startValue ? DARK : MID }}>
              {startValue ? fmtShort(startValue) : 'Pick a date'}
            </span>
            <Calendar style={{ width: 16, height: 16, color: MID, flexShrink: 0 }} />
          </div>
        </div>
        <div style={{ opacity: endDisabled ? 0.4 : 1, pointerEvents: endDisabled ? 'none' : 'auto' }}>
          <CEFieldLabel>End Date</CEFieldLabel>
          <div className={`cem-trigger${open ? ' cem-open' : ''}`} style={triggerField} onClick={() => isMobile ? openMobile('end') : openDesktop()}>
            <span style={{ fontFamily: SANS, fontSize: 14, color: endValue ? DARK : MID }}>
              {endValue ? fmtShort(endValue) : '– –'}
            </span>
            {endValue
              ? <button type="button" onClick={e => { e.stopPropagation(); onEndChange(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <X style={{ width: 16, height: 16, color: MID }} />
                </button>
              : <Calendar style={{ width: 16, height: 16, color: MID, flexShrink: 0 }} />}
          </div>
        </div>
      </div>

      {/* Desktop: centered modal with backdrop */}
      {open && !isMobile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={() => handleCancel()}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
          <div ref={panelRef}
            style={{ position: 'relative', background: 'white', borderRadius: 24, boxShadow: '0px 16px 40px rgba(15,23,42,0.18)', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 22, width: PANEL_W }}
            onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, color: DARK }}>Select Date Range</span>
                <button type="button" onMouseDown={e => { e.stopPropagation(); handleCancel(); }}
                  style={{ background: SURFACE, border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 15, height: 15, color: MID }} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${TEAL}`, background: 'white', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Start Date</span>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: pendingStart ? DARK : MID }}>
                    {pendingStart ? fmtLong(pendingStart) : '–'}
                  </span>
                </div>
                <div style={{ background: SURFACE, borderRadius: 100, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ArrowRight style={{ width: 15, height: 15, color: DARK }} />
                </div>
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: `1px solid ${DIV}`, background: 'white', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 500, color: MID, textTransform: 'uppercase', letterSpacing: '0.06em' }}>End Date</span>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: pendingEnd ? DARK : MID }}>
                    {pendingEnd ? fmtLong(pendingEnd) : '–'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: DIV }} />
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
              {renderMonthGrid(viewYear, viewMonth, true, false, handleDesktopDayClick, true)}
              <div style={{ width: 1, background: DIV, alignSelf: 'stretch', flexShrink: 0 }} />
              {renderMonthGrid(rightYear, rightMonth, false, true, handleDesktopDayClick, true)}
            </div>
            <div style={{ height: 1, background: DIV }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button type="button" onMouseDown={e => { e.stopPropagation(); handleClear(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <RefreshCw style={{ width: 14, height: 14, color: MID }} />
                <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: MID }}>Clear selection</span>
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onMouseDown={e => { e.stopPropagation(); handleCancel(); }}
                  style={{ padding: '9px 16px', background: 'white', border: `1px solid ${DIV}`, borderRadius: 10, fontFamily: SANS, fontSize: 13, fontWeight: 600, color: MID, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="button" onMouseDown={e => { e.stopPropagation(); if (pendingStart) handleApply(); }}
                  style={{ padding: '9px 20px', background: pendingStart ? TEAL : DIV, border: 'none', borderRadius: 10, fontFamily: SANS, fontSize: 13, fontWeight: 600, color: pendingStart ? 'white' : MID, cursor: pendingStart ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                  Apply Dates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && mobileSheetMounted && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10100 }} onClick={() => setOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', opacity: mobileSheetVisible ? 1 : 0, transition: 'opacity 0.22s ease' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column', transform: mobileSheetVisible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.34s cubic-bezier(0.32,0.72,0,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: DIV }} />
            </div>
            <p style={{ textAlign: 'center', fontFamily: SANS, fontSize: 17, fontWeight: 700, color: DARK, padding: '0 24px 12px', borderBottom: `1px solid ${DIV}` }}>
              {mobileTarget === 'start' ? 'Start Date' : 'End Date'}
            </p>
            <div style={{ overflowY: 'auto', padding: '20px 20px calc(40px + env(safe-area-inset-bottom))' }}>
              {renderMonthGrid(viewYear, viewMonth, true, true, handleMobileDayClick, false)}
            </div>
            <div style={{ borderTop: `1px solid ${DIV}`, padding: '14px 20px', display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${DIV}`, background: 'white', fontFamily: SANS, fontSize: 14, fontWeight: 600, color: MID, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={() => { if (pendingStart) handleApply(); }} style={{ flex: 2, height: 44, borderRadius: 12, border: 'none', background: pendingStart ? TEAL : DIV, fontFamily: SANS, fontSize: 14, fontWeight: 600, color: pendingStart ? 'white' : MID, cursor: pendingStart ? 'pointer' : 'default' }}>Apply Dates</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── CEFieldLabel ─────────────────────────────────────────────────────────────
const CEFieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: MID, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
    {children}{required && <span style={{ color: ERROR, marginLeft: 2 }}>*</span>}
  </p>
);

// ── CEToggle ─────────────────────────────────────────────────────────────────
const CEToggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button type="button" onClick={onToggle}
    style={{ position: 'relative', display: 'inline-flex', height: 28, width: 52, borderRadius: 999, background: on ? TEAL : DIV, border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
    <span style={{ position: 'absolute', top: 3, left: on ? 27 : 3, width: 22, height: 22, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
  </button>
);

// ── ImageUploadBox ────────────────────────────────────────────────────────────
const ImageUploadBox = ({
  preview, onFile, onClear, height = 301, width = 268, borderRadius = 16, label,
}: {
  preview: string | null; onFile: (f: File) => void; onClear?: () => void;
  height?: number; width?: number; borderRadius?: number; label?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div onClick={() => inputRef.current?.click()}
      style={{ position: 'relative', width, height, borderRadius, overflow: 'hidden', cursor: 'pointer', background: BG, border: `1.5px dashed ${DIV}`, flexShrink: 0 }}>
      {preview ? (
        <>
          <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: 100, padding: '6px 14px' }}>
              <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: TEAL }}>Update Photo</span>
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
          <ImagePlus style={{ width: 24, height: 24, color: MID }} />
          <span style={{ fontFamily: SANS, fontSize: 12, color: MID }}>{label || 'Upload photo'}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdditionalInfoItem {
  title: string;
  description: string;
  icon: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function CreateEventModal({
  open, onClose, prefillDate = '', userId, userName = '', userAvatar, session, onCreated,
}: CreateEventModalProps) {

  // ── Post As ─────────────────────────────────────────────────────────────────
  const [communityId,  setCommunityId]  = useState<string | null>(null);
  const [ownedGroups,  setOwnedGroups]  = useState<{id:string;name:string;avatar_url:string|null}[]>([]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title,        setTitle]        = useState('');
  const [wardType,     setWardType]     = useState<string | null>(null);
  const [date,         setDate]         = useState(prefillDate);
  const [endDate,      setEndDate]      = useState('');
  const [startTime,    setStartTime]    = useState('');
  const [endTime,      setEndTime]      = useState('');
  const [timezone,     setTimezone]     = useState('America/Los_Angeles');
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [isRecurring,  setIsRecurring]  = useState(false);
  const [recurringDays,setRecurringDays]= useState<string[]>(['Sunday']);

  // Location
  const [locationSearch,    setLocationSearch]    = useState('');
  const [locationResults,   setLocationResults]   = useState<{display:string;city:string;lat:number;lng:number}[]>([]);
  const [locationOpen,      setLocationOpen]      = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const [savedAddresses,    setSavedAddresses]    = useState<{display:string;city:string;lat:number;lng:number;count:number}[]>(() => {
    try { return JSON.parse(localStorage.getItem('address_history') || '[]'); } catch { return []; }
  });
  const [isVirtual,   setIsVirtual]   = useState(false);
  const [virtualLink, setVirtualLink] = useState('');
  const [address,     setAddress]     = useState('');
  const [location,    setLocation]    = useState('');
  const [lat,         setLat]         = useState<number | null>(null);
  const [lng,         setLng]         = useState<number | null>(null);

  // Step 2
  const [description,       setDescription]       = useState('');
  const [additionalInfo,    setAdditionalInfo]    = useState<AdditionalInfoItem[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const [openSectionMenu,   setOpenSectionMenu]   = useState<number | null>(null);

  // Step 3
  const [socialLinks,            setSocialLinks]            = useState<string[]>(['']);
  const [minAge,                 setMinAge]                 = useState('');
  const [maxAge,                 setMaxAge]                 = useState('');
  const [minAgeOpen,             setMinAgeOpen]             = useState(false);
  const [maxAgeOpen,             setMaxAgeOpen]             = useState(false);
  const [foodProvided,           setFoodProvided]           = useState(false);
  const [selectedFoods,          setSelectedFoods]          = useState<string[]>([]);
  const [groupAssignmentEnabled, setGroupAssignmentEnabled] = useState(false);
  const [groupTheme,             setGroupTheme]             = useState<GroupThemeKey | null>(null);
  const [numGroups,              setNumGroups]              = useState(4);

  // Images
  const [coverFile,     setCoverFile]     = useState<File | null>(null);
  const [coverPreview,  setCoverPreview]  = useState<string | null>(null);
  const [extra1File,    setExtra1File]    = useState<File | null>(null);
  const [extra1Preview, setExtra1Preview] = useState<string | null>(null);
  const [extra2File,    setExtra2File]    = useState<File | null>(null);
  const [extra2Preview, setExtra2Preview] = useState<string | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);

  // Refs
  const locationRef      = useRef<HTMLDivElement>(null);
  const locationDebRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minAgeRef        = useRef<HTMLDivElement>(null);
  const maxAgeRef        = useRef<HTMLDivElement>(null);
  const sectionMenuRef   = useRef<HTMLDivElement>(null);
  const coverInputRef    = useRef<HTMLInputElement>(null);

  // ── inputCls (same as CreateEvent.tsx) ─────────────────────────────────────
  const inputCls: React.CSSProperties = {
    width: '100%', height: 52, borderRadius: 14,
    border: `1.5px solid ${DIV}`, background: 'white',
    padding: '0 16px', fontFamily: SANS, fontSize: 15, color: DARK, outline: 'none',
  };

  // ── Fetch owned groups when modal opens ───────────────────────────────────
  useEffect(() => {
    if (!open || !session?.user?.id) return;
    supabase.from('communities').select('id, name, avatar_url')
      .eq('user_id', session.user.id)
      .then(({ data }) => setOwnedGroups(data ?? []));
  }, [open, session]);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setCommunityId(null);
      setTitle(''); setWardType(null);
      setDate(prefillDate || ''); setEndDate('');
      setStartTime(''); setEndTime('');
      setTimezone('America/Los_Angeles'); setTimezoneOpen(false);
      setIsRecurring(false); setRecurringDays(['Sunday']);
      setLocationSearch(''); setLocationResults([]); setLocationOpen(false);
      setIsVirtual(false); setVirtualLink(''); setAddress(''); setLocation(''); setLat(null); setLng(null);
      setDescription(''); setAdditionalInfo([]); setCollapsedSections(new Set()); setOpenSectionMenu(null);
      setSocialLinks(['']); setMinAge(''); setMaxAge('');
      setMinAgeOpen(false); setMaxAgeOpen(false);
      setFoodProvided(false); setSelectedFoods([]);
      setGroupAssignmentEnabled(false); setGroupTheme(null); setNumGroups(4);
      setCoverFile(null); setCoverPreview(null);
      setExtra1File(null); setExtra1Preview(null);
      setExtra2File(null); setExtra2Preview(null);
      setSaving(false);
    }
  }, [open, prefillDate]);

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  // ── Body scroll lock ───────────────────────────────────────────────────────
  useEffect(() => {
    if (open) { document.body.style.overflow = 'hidden'; }
    else      { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (minAgeRef.current && !minAgeRef.current.contains(e.target as Node)) setMinAgeOpen(false);
      if (maxAgeRef.current && !maxAgeRef.current.contains(e.target as Node)) setMaxAgeOpen(false);
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target as Node)) setOpenSectionMenu(null);
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setLocationOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // ── Location geocoding debounce ────────────────────────────────────────────
  useEffect(() => {
    if (locationDebRef.current) clearTimeout(locationDebRef.current);
    if (!locationSearch.trim() || locationSearch.length < 3) {
      setLocationResults([]); setLocationSearching(false); return;
    }
    setLocationSearching(true);
    locationDebRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&addressdetails=1&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setLocationResults(data.map((r: any) => {
          const a = r.address || {};
          const city = a.city || a.town || a.village || a.county || '';
          const state = a.state ? `, ${a.state}` : '';
          return { display: r.display_name, city: city + state, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
        }));
      } catch { setLocationResults([]); }
      finally { setLocationSearching(false); }
    }, 400);
    return () => { if (locationDebRef.current) clearTimeout(locationDebRef.current); };
  }, [locationSearch]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggleFood = (id: string) => {
    setSelectedFoods(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const toggleSectionCollapsed = (idx: number) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleCoverFile = (f: File) => { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); };
  const handleExtra1File = (f: File) => { setExtra1File(f); setExtra1Preview(URL.createObjectURL(f)); };
  const handleExtra2File = (f: File) => { setExtra2File(f); setExtra2Preview(URL.createObjectURL(f)); };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!title.trim()) { toast.error('Please enter an event name'); return; }
    if (!isRecurring && !date) { toast.error('Please pick a start date'); return; }
    if (!address.trim() && !virtualLink.trim()) { toast.error('Please add a location'); return; }
    if (!session?.user) { toast.error('You must be logged in'); return; }

    setSaving(true);
    try {
      let imageUrl: string | null = null;
      if (coverFile) {
        const fn = `${session.user.id}-${Date.now()}-cover.jpg`;
        const { error } = await supabase.storage.from('event-images').upload(fn, coverFile);
        if (!error) imageUrl = supabase.storage.from('event-images').getPublicUrl(fn).data.publicUrl;
      }

      const extraUrls: (string | null)[] = [null, null];
      for (let i = 0; i < 2; i++) {
        const f = [extra1File, extra2File][i];
        if (f) {
          const fn = `${session.user.id}-${Date.now()}-extra${i}.jpg`;
          const { error } = await supabase.storage.from('event-images').upload(fn, f);
          if (!error) extraUrls[i] = supabase.storage.from('event-images').getPublicUrl(fn).data.publicUrl;
        }
      }

      const allImageUrls = [imageUrl, ...extraUrls].filter(Boolean) as string[];
      const validAdditionalInfo = additionalInfo.filter(i => i.title.trim());

      const eventData: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        category: 'ward',
        ward_type: wardType,
        date: isRecurring ? null : date,
        end_date: endDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        timezone: (startTime || endTime) ? timezone : null,
        location: isVirtual ? null : (location || address || null),
        address: isVirtual ? null : (address || null),
        virtual_link: isVirtual ? virtualLink : null,
        is_virtual: isVirtual,
        lat: lat ?? null,
        lng: lng ?? null,
        image_url: allImageUrls[0] ?? null,
        image_urls: allImageUrls.length > 0 ? allImageUrls : null,
        food: selectedFoods.length > 0 ? selectedFoods : null,
        social_links: socialLinks.filter(Boolean).length > 0 ? socialLinks.filter(Boolean) : null,
        age_min: minAge ? parseInt(minAge) : null,
        age_max: maxAge && maxAge !== '+' ? parseInt(maxAge) : null,
        is_recurring: isRecurring,
        recurring_days: isRecurring ? recurringDays : null,
        additional_info: validAdditionalInfo.length > 0 ? validAdditionalInfo : null,
        group_assignment_enabled: groupAssignmentEnabled,
        group_theme: groupAssignmentEnabled ? groupTheme : null,
        num_groups: groupAssignmentEnabled && groupTheme ? numGroups : null,
        community_id: communityId ?? null,
        status: 'published',
        user_id: session.user.id,
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

  const FieldLabel = CEFieldLabel;
  const Toggle = CEToggle;

  const TZ_OPTIONS = [
    { label: 'Pacific Time (PT)',  value: 'America/Los_Angeles' },
    { label: 'Mountain Time (MT)', value: 'America/Denver' },
    { label: 'Central Time (CT)',  value: 'America/Chicago' },
    { label: 'Eastern Time (ET)',  value: 'America/New_York' },
    { label: 'Alaska Time (AKT)',  value: 'America/Anchorage' },
    { label: 'Hawaii Time (HT)',   value: 'Pacific/Honolulu' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: 'white', borderRadius: 18, border: `1px solid ${DIV}`, boxShadow: '0px 12px 48px rgba(44,37,35,0.18)', width: '100%', maxWidth: 1018, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Close button ── */}
        <button onClick={onClose}
          style={{ position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: '50%', background: SURFACE, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <X style={{ width: 16, height: 16, color: MID }} />
        </button>

        {/* ── Header row: title + Post As ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 56px 0 40px', flexShrink: 0 }}>
          <h1 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, color: TEAL, margin: 0 }}>Create Event</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 270, flexShrink: 0 }}>
            <FieldLabel required>Post As</FieldLabel>
            {(() => {
              const selGroup = ownedGroups.find(g => g.id === communityId);
              const selAvatar = communityId === null ? userAvatar : selGroup?.avatar_url ?? null;
              const selName   = communityId === null ? (userName || 'My Profile') : (selGroup?.name ?? '');
              return (
                <div style={{ position: 'relative' }}>
                  <select
                    value={communityId ?? ''}
                    onChange={e => setCommunityId(e.target.value === '' ? null : e.target.value)}
                    style={{ ...inputCls, paddingLeft: 44, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="">{userName || 'My Profile'}</option>
                    {ownedGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <div style={{ pointerEvents: 'none', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
                    {selAvatar
                      ? <img src={selAvatar} referrerPolicy="no-referrer" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={{ width: 26, height: 26, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: 'white' }}>{selName.charAt(0).toUpperCase()}</span>
                        </div>}
                  </div>
                  <ChevronDown style={{ pointerEvents: 'none', position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: MID }} />
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Two-column body ── */}
        <div style={{ display: 'flex', gap: 24, flex: 1, overflow: 'hidden', padding: '20px 40px 80px' }}>

          {/* Left: scrollable form */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

              {/* ── Section 1: Event Details ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* Event Name */}
                <div>
                  <FieldLabel required>Event Name</FieldLabel>
                  <input
                    autoFocus
                    className="ds-input"
                    style={inputCls}
                    placeholder="e.g. Community Picnic"
                    value={title}
                    maxLength={80}
                    onChange={e => { const v = e.target.value; setTitle(v.charAt(0).toUpperCase() + v.slice(1)); }}
                  />
                  <p style={{ fontFamily: SANS, fontSize: 12, color: MID, textAlign: 'right', marginTop: 4 }}>{title.length}/80</p>
                </div>

                {/* Category */}
                <div>
                  <FieldLabel>Choose a Category</FieldLabel>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CATEGORIES.map(({ id, label, Icon }) => {
                      const active = wardType === id;
                      return (
                        <button key={id} type="button" onClick={() => setWardType(active ? null : id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: SANS, fontSize: 13, fontWeight: active ? 600 : 500,
                            ...(active
                              ? { background: TEAL, color: BG, border: 'none' }
                              : { background: SURFACE, color: MID, border: `1px solid ${DIV}` }) }}>
                          <Icon style={{ width: 14, height: 14 }} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dates */}
                <CERangePicker
                  startValue={date}    onStartChange={setDate}
                  endValue={endDate}   onEndChange={setEndDate}
                  startDisabled={isRecurring} endDisabled={isRecurring}
                />

                {/* Times */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <FieldLabel required>Start Time</FieldLabel>
                    <TimePicker value={startTime} onChange={setStartTime} placeholder="4:30 PM" />
                  </div>
                  <div>
                    <FieldLabel>End Time</FieldLabel>
                    <TimePicker value={endTime} onChange={setEndTime} placeholder="4:30 PM" clearable />
                  </div>
                </div>

                {/* Timezone */}
                {(startTime || endTime) && (
                  <div>
                    <FieldLabel>Timezone</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <div style={{ ...inputCls, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                        onClick={() => setTimezoneOpen(!timezoneOpen)}>
                        <span style={{ fontFamily: SANS, fontSize: 14, color: DARK }}>
                          🌐 {TZ_OPTIONS.find(o => o.value === timezone)?.label ?? timezone}
                        </span>
                        <ChevronDown style={{ width: 16, height: 16, color: MID, transform: timezoneOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </div>
                      {timezoneOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'white', border: `1px solid ${DIV}`, borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10000, overflow: 'hidden' }}>
                          {TZ_OPTIONS.map(o => (
                            <button key={o.value} type="button" onClick={() => { setTimezone(o.value); setTimezoneOpen(false); }}
                              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontFamily: SANS, fontSize: 14, fontWeight: timezone === o.value ? 700 : 400, color: DARK, background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${DIV}` }}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recurring */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: DARK }}>Recurring Event</p>
                  <Toggle on={isRecurring} onToggle={() => setIsRecurring(v => !v)} />
                </div>

                {isRecurring && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, background: 'white', borderRadius: 14, border: `1px solid ${DIV}` }}>
                    <div>
                      <FieldLabel>Day(s)</FieldLabel>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => {
                          const full = { Sun:'Sunday',Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday' }[d]!;
                          const sel = recurringDays.includes(full);
                          return (
                            <button key={d} type="button" onClick={() => setRecurringDays(prev => sel ? (prev.length > 1 ? prev.filter(x => x !== full) : prev) : [...prev, full])}
                              style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${sel ? TEAL : DIV}`, background: sel ? TEAL : 'white', fontFamily: SANS, fontSize: 12, fontWeight: 600, color: sel ? 'white' : DARK, cursor: 'pointer' }}>
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}><FieldLabel>Start</FieldLabel><TimePicker value={startTime} onChange={setStartTime} placeholder="Start time" /></div>
                      <div style={{ flex: 1 }}><FieldLabel>End</FieldLabel><TimePicker value={endTime} onChange={setEndTime} placeholder="End time" clearable /></div>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div>
                  <FieldLabel required>Venue / Location</FieldLabel>
                  <div style={{ position: 'relative' }} ref={locationRef}>
                    <div style={{ position: 'relative' }}>
                      <MapPin style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: MID }} />
                      <input className="ds-input"
                        style={{ ...inputCls, paddingLeft: 40 }}
                        placeholder="Search address or paste virtual link…"
                        value={locationSearch || virtualLink}
                        onChange={e => {
                          const v = e.target.value;
                          const isLink = v.startsWith('http://') || v.startsWith('https://');
                          if (isLink) { setVirtualLink(v); setIsVirtual(true); setLocationSearch(''); setAddress(''); setLat(null); setLng(null); }
                          else { setIsVirtual(false); setVirtualLink(''); setLocationSearch(v); setLocation(v); setAddress(v); setLat(null); setLng(null); }
                        }}
                        onFocus={() => setLocationOpen(true)}
                      />
                    </div>
                    {locationOpen && !isVirtual && (locationSearch.trim() || locationResults.length > 0 || savedAddresses.length > 0) && (
                      <div onMouseDown={e => e.stopPropagation()}
                        style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'white', border: `1px solid ${DIV}`, borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10000, maxHeight: 220, overflowY: 'auto' }}>
                        {locationSearching && (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                            <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', color: MID }} />
                          </div>
                        )}
                        {locationSearch.trim() && (
                          <button type="button"
                            onClick={async () => {
                              setAddress(locationSearch); setLocationSearch(locationSearch); setLocation(locationSearch); setLocationOpen(false);
                              try {
                                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&addressdetails=1&limit=1`, { headers: { 'Accept-Language': 'en' } });
                                const data = await res.json();
                                if (data[0]) { setLat(parseFloat(data[0].lat)); setLng(parseFloat(data[0].lon)); }
                              } catch {}
                            }}
                            style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontFamily: SANS, fontSize: 13, color: TEAL, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${DIV}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MapPin style={{ width: 14, height: 14, flexShrink: 0 }} /> Use: {locationSearch}
                          </button>
                        )}
                        {locationSearch === '' && savedAddresses.slice(0,3).map(r => (
                          <button key={r.display} type="button"
                            onClick={() => { setLocation(r.city); setAddress(r.display); setLocationSearch(r.display); setLat(r.lat); setLng(r.lng); setLocationOpen(false); }}
                            style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontFamily: SANS, fontSize: 13, color: DARK, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MapPin style={{ width: 14, height: 14, color: MID, flexShrink: 0 }} />{r.display}
                          </button>
                        ))}
                        {locationResults.map(r => (
                          <button key={r.display} type="button"
                            onClick={() => {
                              setLocation(r.city); setAddress(r.display); setLocationSearch(r.display); setLat(r.lat); setLng(r.lng); setLocationOpen(false);
                              const h = JSON.parse(localStorage.getItem('address_history') || '[]');
                              const ex = h.find((a: any) => a.display === r.display);
                              if (ex) ex.count++; else h.push({ ...r, count: 1 });
                              h.sort((a: any, b: any) => b.count - a.count);
                              localStorage.setItem('address_history', JSON.stringify(h.slice(0,10)));
                              setSavedAddresses(h.slice(0,3));
                            }}
                            style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontFamily: SANS, fontSize: 13, color: DARK, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MapPin style={{ width: 14, height: 14, color: MID, flexShrink: 0 }} />{r.display}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {isVirtual && virtualLink && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'white', border: `1px solid ${DIV}`, borderRadius: 14, marginTop: 8 }}>
                      <Link style={{ width: 14, height: 14, color: TEAL }} />
                      <a href={virtualLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontFamily: SANS, fontSize: 12, color: TEAL, textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{virtualLink}</a>
                      <button type="button" onClick={() => { setVirtualLink(''); setIsVirtual(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID }}>✕</button>
                    </div>
                  )}
                  {lat && lng && (
                    <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${DIV}`, marginTop: 8 }}>
                      <iframe width="100%" height="160" style={{ border: 0, display: 'block' }} loading="lazy"
                        src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`} />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Section 2: Event Descriptions ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 8, borderTop: `1px solid ${DIV}` }}>
                <p style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 0' }}>Event Descriptions</p>

                {/* Description */}
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    className="ds-input"
                    placeholder="Tell people about your event…"
                    maxLength={2000}
                    style={{ width: '100%', minHeight: 140, borderRadius: 14, border: `1.5px solid ${DIV}`, background: 'white', padding: '14px 16px', fontFamily: SANS, fontSize: 15, color: DARK, outline: 'none', resize: 'vertical', overflowY: 'auto', boxSizing: 'border-box' }}
                    value={description}
                    onChange={e => { const v = e.target.value; setDescription(v.charAt(0).toUpperCase() + v.slice(1)); }}
                  />
                  <p style={{ fontFamily: SANS, fontSize: 12, color: MID, textAlign: 'right', marginTop: 4 }}>{description.length}/2000</p>
                </div>

                {/* Extra Details */}
                <div>
                  <FieldLabel>Extra Details</FieldLabel>
                  {/* Quick-add chips */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {[{title:'What to Bring',icon:'check'},{title:'Parking',icon:'car'},{title:'Schedule',icon:'calendar'},{title:'Cost Details',icon:'dollar'},{title:'Kids Welcome',icon:'balloon'}]
                      .filter(s => !additionalInfo.some(item => item.title === s.title))
                      .map(s => (
                        <button key={s.title} type="button"
                          onClick={() => setAdditionalInfo([...additionalInfo, { title: s.title, description: '', icon: s.icon }])}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, border: `1px solid ${DIV}`, background: SURFACE, fontFamily: SANS, fontSize: 13, fontWeight: 500, color: MID, cursor: 'pointer' }}>
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          {s.title}
                        </button>
                      ))}
                  </div>
                  {/* Extra detail cards */}
                  {additionalInfo.map((item, idx) => {
                    const collapsed = collapsedSections.has(idx);
                    return (
                      <div key={idx} style={{ borderRadius: 14, border: `1.5px solid ${DIV}`, background: 'white', padding: 16, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {item.icon && (() => { const f = INFO_ICONS.find(i => i.key === item.icon); return f ? <f.Icon style={{ width: 16, height: 16, color: MID, flexShrink: 0 }} /> : null; })()}
                          <input type="text" placeholder="e.g. What to Bring" maxLength={60}
                            style={{ flex: 1, fontFamily: SANS, fontSize: 14, fontWeight: 600, color: DARK, background: 'transparent', border: 'none', outline: 'none' }}
                            value={item.title}
                            onChange={e => { const n=[...additionalInfo]; n[idx]={...n[idx],title:e.target.value}; setAdditionalInfo(n); }} />
                          <button type="button" onClick={() => toggleSectionCollapsed(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID, padding: 4 }}>
                            <ChevronDown style={{ width: 16, height: 16, transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button type="button" onClick={() => setOpenSectionMenu(openSectionMenu === idx ? null : idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID, padding: 4 }}>
                              <MoreVertical style={{ width: 16, height: 16 }} />
                            </button>
                            {openSectionMenu === idx && (
                              <div ref={sectionMenuRef} onMouseDown={e => e.stopPropagation()}
                                style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'white', border: `1px solid ${DIV}`, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10000, overflow: 'hidden' }}>
                                <button type="button" onClick={() => { setAdditionalInfo(additionalInfo.filter((_,i) => i !== idx)); setOpenSectionMenu(null); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontFamily: SANS, fontSize: 13, color: ERROR, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  <Trash2 style={{ width: 14, height: 14 }} /> Delete section
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {!collapsed && (
                          <>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                              {INFO_ICONS.map(({ key, Icon }) => (
                                <button key={key} type="button"
                                  onClick={() => { const n=[...additionalInfo]; n[idx]={...n[idx],icon:key}; setAdditionalInfo(n); }}
                                  style={{ padding: 10, borderRadius: 10, border: `1.5px solid ${item.icon===key ? TEAL : DIV}`, background: item.icon===key ? TEAL : 'white', color: item.icon===key ? 'white' : MID, cursor: 'pointer' }}>
                                  <Icon style={{ width: 18, height: 18 }} />
                                </button>
                              ))}
                            </div>
                            <div style={{ borderLeft: `2px solid ${DIV}`, paddingLeft: 12, marginTop: 10 }}>
                              <textarea placeholder="Description…" rows={3} maxLength={500}
                                style={{ width: '100%', fontFamily: SANS, fontSize: 13, color: DARK, background: 'transparent', border: 'none', outline: 'none', resize: 'none', overflowY: 'auto' }}
                                value={item.description}
                                onChange={e => { const n=[...additionalInfo]; n[idx]={...n[idx],description:e.target.value}; setAdditionalInfo(n); }} />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <button type="button"
                    onClick={() => setAdditionalInfo([...additionalInfo, { title: '', description: '', icon: 'check' }])}
                    style={{ width: '100%', height: 44, borderRadius: 12, border: `1.5px dashed ${DIV}`, background: 'transparent', fontFamily: SANS, fontSize: 13, color: MID, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    + Add another section
                  </button>
                </div>
              </div>

              {/* ── Section 3: Preferences & Extras ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 8, paddingBottom: 60, borderTop: `1px solid ${DIV}` }}>
                <p style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 0' }}>Preferences & Extras</p>

                {/* Social Links */}
                <div>
                  <FieldLabel>Social Link</FieldLabel>
                  {socialLinks.map((link, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <input className="ds-input"
                        style={{ ...inputCls, flex: 1 }}
                        type="url"
                        placeholder="https://instagram.com/p/…"
                        value={link}
                        onChange={e => { const n=[...socialLinks]; n[i]=e.target.value; setSocialLinks(n); }} />
                      {socialLinks.length > 1 && (
                        <button type="button" onClick={() => setSocialLinks(socialLinks.filter((_,j)=>j!==i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID, flexShrink: 0 }}>
                          <X style={{ width: 16, height: 16 }} />
                        </button>
                      )}
                    </div>
                  ))}
                  {socialLinks.length < 3
                    ? <button type="button" onClick={() => setSocialLinks([...socialLinks, ''])}
                        style={{ fontFamily: SANS, fontSize: 13, color: TEAL, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                        + Add another link
                      </button>
                    : <p style={{ fontFamily: SANS, fontSize: 12, color: MID, marginTop: 4 }}>Maximum 3 social media links</p>
                  }
                </div>

                {/* Age Group Filter */}
                <div>
                  <FieldLabel>Age Group Filter</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Min age */}
                    <div style={{ flex: 1, position: 'relative' }} ref={minAgeRef}>
                      <div style={{ ...inputCls, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                        onClick={() => { setMinAgeOpen(!minAgeOpen); setMaxAgeOpen(false); }}>
                        <span style={{ fontFamily: SANS, fontSize: 14, color: minAge ? DARK : MID }}>{minAge || 'Min Age'}</span>
                        <ChevronDown style={{ width: 16, height: 16, color: MID, transform: minAgeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </div>
                      {minAgeOpen && (
                        <div onMouseDown={e => e.stopPropagation()}
                          style={{ position: 'absolute', bottom: 'calc(100% + 4px)', top: 'auto', left: 0, right: 0, background: 'white', border: `1px solid ${DIV}`, borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10000, maxHeight: 200, overflowY: 'auto' }}>
                          {[18,25,30,35,40,45,50,55,60].map(a => (
                            <button key={a} type="button" onClick={() => { setMinAge(String(a)); setMinAgeOpen(false); }}
                              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontFamily: SANS, fontSize: 14, fontWeight: minAge===String(a) ? 700 : 400, color: DARK, background: 'none', border: 'none', cursor: 'pointer' }}>{a}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{ fontFamily: SANS, fontSize: 14, color: MID, flexShrink: 0 }}>to</span>
                    {/* Max age */}
                    <div style={{ flex: 1, position: 'relative' }} ref={maxAgeRef}>
                      <div style={{ ...inputCls, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                        onClick={() => { setMaxAgeOpen(!maxAgeOpen); setMinAgeOpen(false); }}>
                        <span style={{ fontFamily: SANS, fontSize: 14, color: maxAge ? DARK : MID }}>{maxAge === '+' ? 'No limit' : (maxAge || 'Max Age')}</span>
                        <ChevronDown style={{ width: 16, height: 16, color: MID, transform: maxAgeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </div>
                      {maxAgeOpen && (
                        <div onMouseDown={e => e.stopPropagation()}
                          style={{ position: 'absolute', bottom: 'calc(100% + 4px)', top: 'auto', left: 0, right: 0, background: 'white', border: `1px solid ${DIV}`, borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10000, maxHeight: 200, overflowY: 'auto' }}>
                          <button type="button" onClick={() => { setMaxAge('+'); setMaxAgeOpen(false); }}
                            style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontFamily: SANS, fontSize: 14, color: DARK, background: 'none', border: 'none', cursor: 'pointer' }}>No limit</button>
                          {[25,30,35,40,45,50,55,60].map(a => (
                            <button key={a} type="button" onClick={() => { setMaxAge(String(a)); setMaxAgeOpen(false); }}
                              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontFamily: SANS, fontSize: 14, fontWeight: maxAge===String(a) ? 700 : 400, color: DARK, background: 'none', border: 'none', cursor: 'pointer' }}>{a}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Food Provided */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: DARK }}>Food Provided</p>
                    <Toggle on={foodProvided} onToggle={() => { setFoodProvided(v => !v); if (foodProvided) setSelectedFoods([]); }} />
                  </div>
                  {foodProvided && (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {FOOD_TILES.map(({ id, emoji, label }) => {
                          const sel = selectedFoods.includes(id);
                          return (
                            <button key={id} type="button" onClick={() => toggleFood(id)}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 72, padding: '10px 0', borderRadius: 14, border: `1.5px solid ${sel ? TEAL : DIV}`, background: sel ? `${TEAL}10` : 'white', cursor: 'pointer' }}>
                              <span style={{ fontSize: 22 }}>{emoji}</span>
                              <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: sel ? TEAL : DARK }}>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontFamily: SANS, fontSize: 12, color: MID, marginTop: 8 }}>Select up to 2 food options</p>
                    </>
                  )}
                </div>

                {/* Group Assignment */}
                <div style={{ paddingBottom: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: DARK }}>Group Assignment</p>
                    <Toggle on={groupAssignmentEnabled} onToggle={() => { setGroupAssignmentEnabled(v => !v); if (groupAssignmentEnabled) { setGroupTheme(null); setNumGroups(4); } }} />
                  </div>
                  {groupAssignmentEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {(Object.entries(GROUP_THEMES) as [GroupThemeKey, typeof GROUP_THEMES[GroupThemeKey]][]).map(([key, theme]) => {
                          const sel = groupTheme === key;
                          return (
                            <button key={key} type="button" onClick={() => setGroupTheme(sel ? null : key)}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', borderRadius: 14, border: `2px solid ${sel ? TEAL : DIV}`, background: sel ? `${TEAL}10` : 'white', cursor: 'pointer' }}>
                              <span style={{ fontSize: 24 }}>{theme.emoji}</span>
                              <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: sel ? TEAL : DARK, textAlign: 'center' }}>{theme.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      {groupTheme && (
                        <div style={{ padding: 14, background: 'white', borderRadius: 12, border: `1px solid ${DIV}` }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                            {[2,3,4,5,6,7,8,9].map(n => (
                              <button key={n} type="button" onClick={() => setNumGroups(n)}
                                style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${numGroups===n ? TEAL : DIV}`, background: numGroups===n ? TEAL : 'white', fontFamily: SANS, fontSize: 13, fontWeight: 600, color: numGroups===n ? 'white' : DARK, cursor: 'pointer' }}>{n}</button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {GROUP_THEMES[groupTheme].groups.slice(0, numGroups).map(g => (
                              <div key={g} style={{ fontFamily: SANS, fontSize: 12, color: MID, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: MID, flexShrink: 0 }} />{g}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p style={{ fontFamily: SANS, fontSize: 12, color: MID }}>Anyone who RSVPs "Going" will be randomly assigned to a group.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Right: sticky image upload column */}
          <div style={{ width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'flex-start', position: 'sticky', top: 0, overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
            {/* Cover photo — matches CreateEvent.tsx layout */}
            <div>
              <div
                style={{ position: 'relative', width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', background: DIV, cursor: 'pointer' }}
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreview
                  ? <img src={coverPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImagePlus style={{ width: 32, height: 32, color: MID }} />
                    </div>}
                <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: 'white', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', padding: '7px 18px', borderRadius: 999 }}>
                    {coverPreview ? 'Update Cover Photo' : 'Add Cover Photo'}
                  </span>
                </div>
                {coverPreview && (
                  <button type="button" onClick={e => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}
                    style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={10} color="white" />
                  </button>
                )}
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = ''; }} />
              </div>
              {/* AI + scan buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <button type="button"
                  style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: '#d946ef', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  ✨ AI-generated image
                </button>
                {coverFile && (
                  <button type="button"
                    style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: '#9333ea', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    ✨ Auto-fill from poster
                  </button>
                )}
              </div>
            </div>
            {/* Additional photos */}
            <div>
              <p style={{ fontFamily: SANS, fontSize: 12, color: MID, marginBottom: 8 }}>Additional photos (optional)</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <ImageUploadBox preview={extra1Preview} onFile={handleExtra1File} onClear={() => { setExtra1File(null); setExtra1Preview(null); }} height={80} width={96} borderRadius={12} label="" />
                <ImageUploadBox preview={extra2Preview} onFile={handleExtra2File} onClear={() => { setExtra2File(null); setExtra2Preview(null); }} height={80} width={96} borderRadius={12} label="" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky footer ── */}
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS, fontSize: 14, fontWeight: 600, color: TEAL }}>
            Preview First
          </button>
          <button type="button" onClick={handlePublish} disabled={saving}
            style={{ padding: '11px 28px', background: saving ? '#a0b8c0' : TEAL, color: BG, border: 'none', borderRadius: 100, cursor: saving ? 'default' : 'pointer', fontFamily: SANS, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}>
            {saving && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
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
