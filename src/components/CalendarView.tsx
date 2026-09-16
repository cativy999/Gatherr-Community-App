import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, MapPin, Clock, AlignJustify, Check, Star, Bookmark, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ── Design tokens ──────────────────────────────────────────────────────────
const DARK    = "#2C2523";
const MID     = "#635C59";
const TEAL    = "#1F4E5B";
const GOLD    = "#C8973A";
const DIV     = "#E4DCCF";
const SURFACE = "#EFECE6";
const BG      = "#FAF6F0";
const RED     = "#DC2626";
const INTER   = "'Inter', sans-serif";

const MONTHS      = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_HEADERS  = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const DAY_SINGLE   = ["S","M","T","W","T","F","S"];

// Week-view time grid: 7 AM → 9 PM
const HOUR_H   = 60; // px per hour
const DAY_START = 7;  // 7 AM
const DAY_END   = 22; // 10 PM
const HOURS     = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

type CalEvent = {
  id: string; title: string; image_url: string | null;
  date: string; time?: string | null; start_time?: string | null;
  location?: string | null; ward_type?: string | null;
  description?: string | null; user_id?: string;
  timezone?: string | null;
  attendees?: number | null;
};
type HoverState  = { evt: CalEvent; top: number; left: number };
type QuickCreate = { date: string; top: number; left: number };

interface Props {
  events: CalEvent[];
  navigate: (path: string, opts?: any) => void;
  isLoggedIn: boolean;
  userId?: string;
  userName?: string;
  userAvatar?: string | null;
  savedEventIds?: Set<string>;
  goingEventIds?: Set<string>;
  interestedEventIds?: Set<string>;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
};
const fmtHour = (h: number) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12} ${ampm}`;
};
const fmtDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fmtKey = (y: number, m: number, d: number) =>
  `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const fmtDateTimeLabel = (dk: string) => {
  const [y,m,d] = dk.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
};

const todayRaw = new Date();
const todayKey = fmtDateKey(todayRaw);
const POPUP_W = 300;
const POPUP_H = 320;

// ── US Holidays ────────────────────────────────────────────────────────────
type HolidayType = 'dayoff' | 'some' | 'observance';
type Holiday = { name: string; type: HolidayType };

const getNthWeekday = (year: number, month: number, weekday: number, n: number): Date => {
  if (n > 0) {
    const first = new Date(year, month, 1);
    const diff = ((weekday - first.getDay()) + 7) % 7;
    return new Date(year, month, 1 + diff + (n - 1) * 7);
  }
  // n === -1 → last occurrence
  const last = new Date(year, month + 1, 0);
  const diff = ((last.getDay() - weekday) + 7) % 7;
  return new Date(year, month, last.getDate() - diff);
};

const getEaster = (year: number): Date => {
  const ea = year % 19;
  const eb = Math.floor(year / 100);
  const ec = year % 100;
  const ed = Math.floor(eb / 4);
  const ee = eb % 4;
  const ef = Math.floor((eb + 8) / 25);
  const eg = Math.floor((eb - ef + 1) / 3);
  const eh = (19 * ea + eb - ed - eg + 15) % 30;
  const ei = Math.floor(ec / 4);
  const ek = ec % 4;
  const el = (32 + 2 * ee + 2 * ei - eh - ek) % 7;
  const em = Math.floor((ea + 11 * eh + 22 * el) / 451);
  const emo = Math.floor((eh + el - 7 * em + 114) / 31) - 1;
  const edy = ((eh + el - 7 * em + 114) % 31) + 1;
  return new Date(year, emo, edy);
};

const buildHolidays = (year: number): Map<string, Holiday> => {
  const map = new Map<string, Holiday>();
  const add = (d: Date, name: string, type: HolidayType) => map.set(fmtDateKey(d), { name, type });
  // Fixed
  add(new Date(year, 0,  1),  "New Year's Day",    'dayoff');
  add(new Date(year, 1,  14), "Valentine's Day",   'observance');
  add(new Date(year, 2,  17), "St. Patrick's Day", 'observance');
  add(new Date(year, 3,  22), "Earth Day",         'observance');
  add(new Date(year, 5,  19), "Juneteenth",        'dayoff');
  add(new Date(year, 6,  4),  "Independence Day",  'dayoff');
  add(new Date(year, 9,  31), "Halloween",         'observance');
  add(new Date(year, 10, 11), "Veterans Day",      'some');
  add(new Date(year, 11, 25), "Christmas Day",     'dayoff');
  add(new Date(year, 11, 31), "New Year's Eve",    'some');
  // Nth weekday
  add(getNthWeekday(year, 0, 1, 3),  "MLK Day",        'dayoff');
  add(getNthWeekday(year, 1, 1, 3),  "Presidents' Day",'some');
  add(getNthWeekday(year, 4, 0, 2),  "Mother's Day",   'observance');
  add(getNthWeekday(year, 4, 1, -1), "Memorial Day",   'dayoff');
  add(getNthWeekday(year, 5, 0, 3),  "Father's Day",   'observance');
  add(getNthWeekday(year, 8, 1, 1),  "Labor Day",      'dayoff');
  add(getNthWeekday(year, 9, 1, 2),  "Columbus Day",   'some');
  // Easter
  add(getEaster(year), "Easter", 'some');
  // Thanksgiving + Black Friday
  const tg = getNthWeekday(year, 10, 4, 4);
  add(tg, "Thanksgiving", 'dayoff');
  const bf = new Date(tg); bf.setDate(bf.getDate() + 1);
  add(bf, "Black Friday", 'some');
  return map;
};

// Sunday of the week containing `date`
const getWeekStart = (date: Date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

export default function CalendarView({
  events, navigate, isLoggedIn, userId, userName, userAvatar,
  savedEventIds = new Set(), goingEventIds = new Set(), interestedEventIds = new Set(),
}: Props) {
  const [calDate,  setCalDate]  = useState(() => new Date(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate()));
  const [viewMode, setViewMode] = useState<'year'|'month'|'week'>('month');
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter,   setFilter]   = useState<'all'|'going'|'interested'|'saved'>('all');
  const [hover,    setHover]    = useState<HoverState | null>(null);
  const [qc,       setQc]       = useState<QuickCreate | null>(null);
  const [qcTitle,  setQcTitle]  = useState('');
  const [qcType,   setQcType]   = useState<'event'|'task'|'appointment'>('event');
  const [saving,   setSaving]   = useState(false);
  const [now,      setNow]      = useState(new Date());
  const [calGridH, setCalGridH] = useState(520);

  const hoverTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);

  // Update "now" every minute for the time-indicator
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fit the month grid to the visible viewport — always show all rows
  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      // viewport height minus: distance of wrapper from top, component header (~80px),
      // weekday label row (~40px), and 16px breathing room
      const h = Math.max(360, window.innerHeight - rect.top - 136);
      setCalGridH(h);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest('.cal-menu-btn') && !t.closest('.cal-menu-dd')) setMenuOpen(false);
      if (!t.closest('.cal-qc-popup') && !t.closest('.cal2-cell') && !t.closest('.cal-week-cell') && !t.closest('.cal-year-day')) setQc(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────
  const prevPeriod = () => {
    if (viewMode === 'month') setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1));
    else if (viewMode === 'week') setCalDate(d => { const n=new Date(d); n.setDate(n.getDate()-7); return n; });
    else setCalDate(d => new Date(d.getFullYear()-1, d.getMonth(), 1));
  };
  const nextPeriod = () => {
    if (viewMode === 'month') setCalDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1));
    else if (viewMode === 'week') setCalDate(d => { const n=new Date(d); n.setDate(n.getDate()+7); return n; });
    else setCalDate(d => new Date(d.getFullYear()+1, d.getMonth(), 1));
  };
  const goToday = () => setCalDate(new Date(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate()));

  // ── Event maps ────────────────────────────────────────────────────────
  const allByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach(e => { (map[e.date] ??= []).push(e); });
    return map;
  }, [events]);

  const eventsByDate = useMemo(() => {
    if (filter === 'all') return allByDate;
    const map: Record<string, CalEvent[]> = {};
    events.forEach(e => {
      const ok = (filter==='going' && goingEventIds.has(e.id))
               || (filter==='interested' && interestedEventIds.has(e.id))
               || (filter==='saved' && savedEventIds.has(e.id));
      if (ok) (map[e.date] ??= []).push(e);
    });
    return map;
  }, [events, filter, allByDate, goingEventIds, interestedEventIds, savedEventIds]);

  // ── Popup positioning (relative to wrapRef) ───────────────────────────
  const calcPos = (el: HTMLElement) => {
    const wrap = wrapRef.current;
    if (!wrap) return { top: 0, left: 0 };
    const wR = wrap.getBoundingClientRect();
    const eR = el.getBoundingClientRect();
    // Center horizontally on the hovered element, clamped within wrapper
    let left = eR.left - wR.left + eR.width / 2 - POPUP_W / 2;
    left = Math.max(4, Math.min(left, wR.width - POPUP_W - 4));
    // Above if there's room; below if it would cover the chips
    let top = eR.top - wR.top - POPUP_H - 8;
    if (top < 0) top = eR.bottom - wR.top + 8;
    // Clamp so popup never goes below the visible viewport
    const maxTop = window.innerHeight - wR.top - POPUP_H - 8;
    if (top > maxTop) top = Math.max(4, eR.top - wR.top - POPUP_H - 8);
    return { top, left };
  };

  const showHover = useCallback((evt: CalEvent, el: HTMLElement) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    const { top, left } = calcPos(el);
    setHover({ evt, top, left });
  }, []);
  const hideHover = useCallback(() => { hoverTimer.current = setTimeout(() => setHover(null), 150); }, []);
  const stayHover = useCallback(() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  const openQC = (dk: string, el: HTMLElement) => {
    if (dk < todayKey) return; // no creating on past dates
    if (!isLoggedIn) { navigate('/welcome'); return; }
    const { top, left } = calcPos(el);
    setQcTitle(''); setQcType('event');
    setQc({ date: dk, top, left });
  };

  // ── Quick save ────────────────────────────────────────────────────────
  const handleQuickSave = async () => {
    if (!qcTitle.trim() || !qc) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('events').insert({ title: qcTitle.trim(), date: qc.date, user_id: userId, ward_type: 'general' });
      if (error) throw error;
      toast.success('Event created!');
      setQc(null);
    } catch { toast.error('Could not save — try More options'); }
    finally { setSaving(false); }
  };

  // ── My Events counts ──────────────────────────────────────────────────
  const goingCount      = events.filter(e => goingEventIds.has(e.id)).length;
  const interestedCount = events.filter(e => interestedEventIds.has(e.id)).length;
  const savedCount      = events.filter(e => savedEventIds.has(e.id)).length;

  // ── Month view helpers ────────────────────────────────────────────────
  const year        = calDate.getFullYear();

  // Holidays for displayed year + next (covers Dec→Jan overflow cells)
  // NOTE: must be after `year` is declared to avoid TDZ (minifier renames year → single letter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const holidays = useMemo(() => {
    const hmap = buildHolidays(year);
    buildHolidays(year + 1).forEach((v, k) => hmap.set(k, v));
    return hmap;
  }, [year]);

  const month       = calDate.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const totalCells  = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const monthCells  = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDay + 1;
    if (day < 1) { const d=new Date(year,month,day); return { day:d.getDate(), key:fmtDateKey(d), overflow:true }; }
    if (day > daysInMonth) { const d=new Date(year,month+1,day-daysInMonth); return { day:d.getDate(), key:fmtDateKey(d), overflow:true }; }
    return { day, key: fmtKey(year,month,day), overflow:false };
  });

  // ── Week view helpers ────────────────────────────────────────────────
  const weekStart = getWeekStart(calDate);
  const weekDays  = Array.from({ length: 7 }, (_, i) => { const d=new Date(weekStart); d.setDate(d.getDate()+i); return d; });
  const weekLabel = (() => {
    const s = weekDays[0], e = weekDays[6];
    if (s.getMonth() === e.getMonth())
      return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`;
    return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}`;
  })();

  // Current time position in week grid
  const nowH = now.getHours() + now.getMinutes()/60;
  const nowTop = (nowH - DAY_START) * HOUR_H;
  const nowInRange = nowH >= DAY_START && nowH < DAY_END;

  // Time label for header
  const headerLabel = viewMode === 'week'
    ? weekLabel
    : viewMode === 'year'
      ? `${year}`
      : `${MONTHS[month]} ${year}`;

  // ── Shared header ─────────────────────────────────────────────────────
  const Header = (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <button onClick={prevPeriod} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, display:'flex', color:DARK }}><ChevronLeft size={20}/></button>
        <button onClick={nextPeriod} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, display:'flex', color:DARK }}><ChevronRight size={20}/></button>
        <span style={{ fontFamily:INTER, fontSize:22, fontWeight:700, color:DARK, marginLeft:6 }}>{headerLabel}</span>
        <button onClick={goToday} style={{ marginLeft:10, padding:'6px 16px', borderRadius:100, border:`1.5px solid ${DIV}`, background:'white', fontFamily:INTER, fontSize:13, fontWeight:600, color:DARK, cursor:'pointer' }}>Today</button>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative' }}>
        {/* Avatar */}
        <button className="cal-menu-btn" onClick={() => setMenuOpen(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex' }}>
          {userAvatar
            ? <img src={userAvatar} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:`2.5px solid ${TEAL}` }}/>
            : <div style={{ width:36, height:36, borderRadius:'50%', background:TEAL, display:'flex', alignItems:'center', justifyContent:'center', border:`2.5px solid ${TEAL}` }}>
                <span style={{ fontSize:14, color:'white', fontFamily:INTER, fontWeight:700 }}>{(userName||'M')[0].toUpperCase()}</span>
              </div>}
        </button>
        <button className="cal-menu-btn cal-menu-hamburger" onClick={() => setMenuOpen(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', padding:6, display:'flex', color:DARK }}><AlignJustify size={20}/></button>
        {/* View toggle */}
        <div style={{ display:'flex', background:SURFACE, borderRadius:100, padding:3, gap:1 }}>
          {(['year','month','week'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding:'6px 12px', borderRadius:100, border: viewMode===v ? `1.5px solid ${GOLD}` : '1.5px solid transparent', cursor:'pointer', fontFamily:INTER, fontSize:13, fontWeight:viewMode===v?700:500, background:viewMode===v?'white':'transparent', color:viewMode===v?DARK:MID, transition:'all 0.15s' }}>
              {v[0].toUpperCase()}
            </button>
          ))}
        </div>
        {/* My Events dropdown */}
        {menuOpen && (
          <div className="cal-menu-dd" style={{ position:'absolute', top:'calc(100% + 10px)', right:0, zIndex:400, background:'white', borderRadius:18, boxShadow:'0 8px 32px rgba(0,0,0,0.16)', border:`1px solid ${DIV}`, width:280, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px', borderBottom:`1px solid ${DIV}` }}>
              {userAvatar ? <img src={userAvatar} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/> : <div style={{ width:38, height:38, borderRadius:'50%', background:TEAL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><span style={{ fontSize:15, color:'white', fontFamily:INTER, fontWeight:700 }}>{(userName||'M')[0].toUpperCase()}</span></div>}
              <div><p style={{ fontFamily:INTER, fontSize:15, fontWeight:700, color:DARK, margin:0 }}>My Events</p><p style={{ fontFamily:INTER, fontSize:12, color:MID, margin:0 }}>Filter by status</p></div>
            </div>
            {([
              { key:'going' as const,      label:'Going',      icon:<Check size={16} color="white"/>, bg:TEAL,      count:goingCount },
              { key:'interested' as const, label:'Interested',  icon:<Star size={16} color="#C8973A" fill="#C8973A"/>, bg:'#FEF3C7', count:interestedCount },
              { key:'saved' as const,      label:'Saved',       icon:<Bookmark size={16} color={TEAL}/>, bg:SURFACE, count:savedCount },
            ]).map(row => (
              <button key={row.key} onClick={() => { setFilter(filter===row.key?'all':row.key); setMenuOpen(false); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 18px', border:'none', cursor:'pointer', background:filter===row.key?SURFACE:'white', borderBottom:`1px solid ${DIV}` }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:row.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{row.icon}</div>
                <span style={{ fontFamily:INTER, fontSize:15, fontWeight:500, color:DARK, flex:1, textAlign:'left' }}>{row.label}</span>
                <div style={{ background:SURFACE, borderRadius:100, padding:'2px 10px' }}><span style={{ fontFamily:INTER, fontSize:13, fontWeight:600, color:DARK }}>{row.count}</span></div>
              </button>
            ))}
            <button onClick={() => { setFilter('all'); setMenuOpen(false); }} style={{ width:'100%', padding:'14px 18px', border:'none', cursor:'pointer', background:'white', fontFamily:INTER, fontSize:14, color:MID, textAlign:'center' }}>Show all events</button>
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── MONTH VIEW ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const MonthGrid = (
    <div style={{ background:'white', border:`1px solid ${DIV}`, borderRadius:20, overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:SURFACE }}>
        {DAY_HEADERS.map(d => (
          <div key={d} style={{ padding:'10px 0', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:INTER, fontSize:11, fontWeight:700, color:MID, letterSpacing:'0.05em' }}>{d}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gridTemplateRows:`repeat(${Math.ceil(totalCells/7)},1fr)`, height:calGridH }}>
        {monthCells.map((cell, i) => {
          const col      = i % 7;
          const isWeek   = col===0 || col===6;
          const isToday  = cell.key === todayKey;
          const isPast   = cell.key < todayKey;
          const dayEvts          = cell.overflow ? [] : (eventsByDate[cell.key] ?? []);
          const hasQCPlaceholder = !cell.overflow && qc?.date === cell.key;
          const count            = dayEvts.length + (hasQCPlaceholder ? 1 : 0);
          const gridCols         = count <= 1 ? 1 : count <= 3 ? count : 3;
          const gridRows         = count <= 3 ? 1 : count <= 6 ? 2 : 3;
          const visible          = dayEvts;
          const showTimeBadge    = count <= 2;
          const numColor = cell.overflow ? '#C8C3BC' : isPast ? '#B0A9A3' : isWeek ? RED : DARK;
          return (
            <div key={`${cell.key}-${i}`} className={cell.overflow?'':'cal2-cell'}
              onClick={e => { if(cell.overflow) return; openQC(cell.key, e.currentTarget as HTMLElement); }}
              style={{ borderTop:`1px solid ${DIV}`, borderRight:`1px solid ${DIV}`, padding:'8px 6px 8px', background:isToday?'rgba(31,78,91,0.03)':'white', outline:isToday?`2px solid ${TEAL}`:'none', outlineOffset:-2, cursor:cell.overflow?'default':'pointer', position:'relative', boxSizing:'border-box', overflow:'hidden' }}>
              <span style={{ fontFamily:INTER, fontSize:13, fontWeight:isToday?700:500, color:numColor, display:'block', marginBottom:3 }}>{cell.day}</span>
              {!cell.overflow && holidays.has(cell.key) && (() => {
                const h = holidays.get(cell.key)!;
                return (
                  <div style={{ marginBottom:4, display:'flex' }}>
                    <span style={{
                      fontFamily:INTER, fontSize:8, fontWeight:700, letterSpacing:'0.03em',
                      padding:'2px 5px', borderRadius:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%',
                      background: h.type==='dayoff' ? TEAL : h.type==='some' ? SURFACE : 'transparent',
                      color: h.type==='dayoff' ? 'white' : MID,
                      border: h.type==='observance' ? `1px solid ${DIV}` : 'none',
                      opacity: isPast ? 0.5 : 1,
                    }}>
                      {h.type==='dayoff' ? '★ ' : ''}{h.name}
                    </span>
                  </div>
                );
              })()}
              {(visible.length > 0 || hasQCPlaceholder) && (
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${gridCols},1fr)`, gridTemplateRows:`repeat(${gridRows},1fr)`, gap:3, height:'calc(100% - 28px)' }}>
                  {visible.map(evt => {
                    const t = evt.start_time || evt.time;
                    return (
                      <div key={evt.id} className="cal2-card"
                        onMouseEnter={e => { e.stopPropagation(); showHover(evt, e.currentTarget as HTMLElement); }}
                        onMouseLeave={hideHover}
                        onClick={e => { e.stopPropagation(); showHover(evt, e.currentTarget as HTMLElement); }}
                        style={{ position:'relative', borderRadius:6, overflow:'hidden', background:evt.image_url?'#111':TEAL, opacity:isPast?0.5:1, boxShadow:'0 2px 6px rgba(0,0,0,0.10)' }}>
                        {evt.image_url && <img src={evt.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>}
                        {showTimeBadge && <div style={{ position:'absolute', bottom:0, left:0, right:0, height:22, background:'linear-gradient(to top,rgba(0,0,0,0.65),transparent)' }}/>}
                        {showTimeBadge && t && <div style={{ position:'absolute', bottom:4, left:5 }}><span style={{ fontFamily:INTER, fontSize:8, fontWeight:700, color:'white', background:'rgba(0,0,0,0.45)', borderRadius:3, padding:'1px 4px' }}>{fmtTime(t)}</span></div>}
                        {!evt.image_url && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:gridCols===1?20:12, color:'rgba(255,255,255,0.5)' }}>✦</span></div>}
                      </div>
                    );
                  })}
                  {hasQCPlaceholder && (
                    <div style={{ borderRadius:6, border:`2px dashed ${TEAL}`, background:'rgba(31,78,91,0.05)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:16, color:TEAL, opacity:0.5 }}>+</span>
                    </div>
                  )}
                </div>
              )}
              {dayEvts.length > 0 && !cell.overflow && (
                <div style={{ position:'absolute', bottom:4, right:4, width:18, height:18, borderRadius:'50%', background:TEAL, border:'2px solid white', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 }}>
                  {userAvatar ? <img src={userAvatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <Users size={8} color="white"/>}
                </div>
              )}
              {!cell.overflow && !isPast && !dayEvts.length && isLoggedIn && (
                <button className="cal2-plus" onClick={e => { e.stopPropagation(); openQC(cell.key, e.currentTarget.parentElement as HTMLElement); }}
                  style={{ position:'absolute', bottom:5, right:5, width:22, height:22, borderRadius:'50%', background:TEAL, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.15s', boxShadow:'0 1px 6px rgba(0,0,0,0.15)' }}>
                  <span style={{ color:'white', fontSize:16, lineHeight:1 }}>+</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── WEEK VIEW ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const TIME_COL_W = 56;

  const WeekGrid = (
    <div style={{ background:'white', border:`1px solid ${DIV}`, borderRadius:20, overflow:'hidden' }}>
      {/* Day header row */}
      <div style={{ display:'grid', gridTemplateColumns:`${TIME_COL_W}px repeat(7,1fr)`, background:SURFACE, borderBottom:`1px solid ${DIV}` }}>
        <div/> {/* spacer for time column */}
        {weekDays.map((d, i) => {
          const isToday  = fmtDateKey(d) === todayKey;
          const isWknd   = d.getDay() === 0 || d.getDay() === 6;
          const numColor = isWknd ? RED : DARK;
          return (
            <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'10px 0', gap:4 }}>
              <span style={{ fontFamily:INTER, fontSize:11, fontWeight:600, color:MID, letterSpacing:'0.05em' }}>{DAY_HEADERS[i]}</span>
              {isToday
                ? <div style={{ width:30, height:30, borderRadius:'50%', background:TEAL, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontFamily:INTER, fontSize:14, fontWeight:700, color:'white' }}>{d.getDate()}</span>
                  </div>
                : <span style={{ fontFamily:INTER, fontSize:14, fontWeight:500, color:numColor }}>{d.getDate()}</span>
              }
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div style={{ overflowY:'auto', maxHeight:'60vh', position:'relative' }}>
        <div style={{ display:'grid', gridTemplateColumns:`${TIME_COL_W}px repeat(7,1fr)`, position:'relative' }}>
          {/* Time labels column */}
          <div>
            {HOURS.map(h => (
              <div key={h} style={{ height:HOUR_H, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:10, paddingTop:2, borderTop:`1px solid ${DIV}` }}>
                <span style={{ fontFamily:INTER, fontSize:11, color:MID, fontWeight:500 }}>{fmtHour(h)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((d, di) => {
            const dk      = fmtDateKey(d);
            const isToday = dk === todayKey;
            const dayEvts = eventsByDate[dk] ?? [];
            return (
              <div key={di} className="cal-week-cell"
                style={{ position:'relative', background:isToday?'rgba(31,78,91,0.02)':'transparent', borderLeft:`1px solid ${DIV}` }}
                onClick={e => openQC(dk, e.currentTarget as HTMLElement)}
              >
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} style={{ position:'absolute', top:(h-DAY_START)*HOUR_H, left:0, right:0, borderTop:`1px solid ${DIV}`, height:HOUR_H }} />
                ))}

                {/* Events */}
                {dayEvts.map(evt => {
                  const t = evt.start_time || evt.time;
                  if (!t) return null;
                  const [h,m] = t.split(':').map(Number);
                  const top = (h + m/60 - DAY_START) * HOUR_H;
                  if (top < 0 || top > HOURS.length * HOUR_H) return null;
                  return (
                    <div key={evt.id}
                      onMouseEnter={e => { e.stopPropagation(); showHover(evt, e.currentTarget as HTMLElement); }}
                      onMouseLeave={hideHover}
                      onClick={e => { e.stopPropagation(); showHover(evt, e.currentTarget as HTMLElement); }}
                      style={{ position:'absolute', top, left:3, right:3, height:54, borderRadius:8, overflow:'hidden', background:evt.image_url?'#111':TEAL, cursor:'pointer', zIndex:2, boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
                      {evt.image_url && <img src={evt.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.85 }}/>}
                      <div style={{ position:'absolute', inset:0, padding:'4px 6px', display:'flex', flexDirection:'column', justifyContent:'flex-end', background:'linear-gradient(to top,rgba(0,0,0,0.65),rgba(0,0,0,0.1))' }}>
                        <span style={{ fontFamily:INTER, fontSize:9, fontWeight:700, color:'white' }}>{fmtTime(t)}</span>
                        <span style={{ fontFamily:INTER, fontSize:10, fontWeight:600, color:'white', lineHeight:1.2, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>{evt.title}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Current time indicator (today column only) */}
                {isToday && nowInRange && (
                  <div style={{ position:'absolute', top:nowTop, left:0, right:0, zIndex:3, display:'flex', alignItems:'center', pointerEvents:'none' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:TEAL, flexShrink:0, marginLeft:-5 }}/>
                    <div style={{ flex:1, height:2, background:TEAL }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── YEAR VIEW ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const thisMonthNum = todayRaw.getMonth();
  const thisYear     = todayRaw.getFullYear();

  const YearGrid = (
    <div style={{ background:'white', border:`1px solid ${DIV}`, borderRadius:20, padding:'28px 24px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'36px 24px' }}>
        {Array.from({ length: 12 }, (_, mi) => {
          const isPastMonth    = year < thisYear || (year === thisYear && mi < thisMonthNum);
          const isCurrentMonth = year === thisYear && mi === thisMonthNum;
          const isFutureMonth  = year > thisYear || (year === thisYear && mi > thisMonthNum);
          const monthLabel     = MONTHS[mi];
          // Generate mini month cells
          const fd    = new Date(year, mi, 1).getDay();
          const dim   = new Date(year, mi+1, 0).getDate();
          const total = Math.ceil((fd + dim) / 7) * 7;
          const mCells = Array.from({ length: total }, (_, i) => {
            const day = i - fd + 1;
            if (day < 1 || day > dim) return null;
            return day;
          });
          // Events: show dots
          const monthEvtDays = new Set(
            (eventsByDate ? Object.entries(eventsByDate) : [])
              .filter(([k]) => k.startsWith(`${year}-${String(mi+1).padStart(2,'0')}`))
              .map(([k]) => parseInt(k.split('-')[2]))
          );

          return (
            <div key={mi} className="cal-year-month" style={{ borderRadius:12, padding:'10px', background:isCurrentMonth ? SURFACE : 'transparent', cursor:'pointer' }}
              onClick={() => { setCalDate(new Date(year, mi, 1)); setViewMode('month'); }}>
              {/* Month name */}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <span style={{ fontFamily:INTER, fontSize:13, fontWeight:700, color: isPastMonth ? '#B0A9A3' : isCurrentMonth ? TEAL : DARK }}>
                  {monthLabel}
                </span>
                {isCurrentMonth && <div style={{ width:6, height:6, borderRadius:'50%', background:TEAL }}/>}
              </div>
              {/* Day headers */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:2 }}>
                {DAY_SINGLE.map((d,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'center', height:16 }}>
                    <span style={{ fontFamily:INTER, fontSize:8, fontWeight:600, color: (i===0||i===6) ? (isPastMonth?'#D9B4B4':RED) : (isPastMonth?'#C8C3BC':MID) }}>{d}</span>
                  </div>
                ))}
              </div>
              {/* Days */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                {mCells.map((day, ci) => {
                  if (!day) return <div key={ci} style={{ height:18 }}/>;
                  const dk      = fmtKey(year, mi, day);
                  const isToday = dk === todayKey;
                  const isPastD = dk < todayKey;
                  const col     = ci % 7;
                  const isWknd  = col===0 || col===6;
                  const hasEvt  = monthEvtDays.has(day);
                  const txtColor = isPastMonth ? '#C8C3BC'
                    : isPastD ? '#B0A9A3'
                    : isWknd ? RED
                    : isCurrentMonth ? DARK
                    : DARK;
                  return (
                    <div key={ci} className="cal-year-day"
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:18, position:'relative' }}>
                      {isToday
                        ? <div style={{ width:18, height:18, borderRadius:'50%', background:TEAL, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <span style={{ fontFamily:INTER, fontSize:8, fontWeight:700, color:'white' }}>{day}</span>
                          </div>
                        : <span style={{ fontFamily:INTER, fontSize:9, color:txtColor, fontWeight:hasEvt?700:400 }}>{day}</span>
                      }
                      {hasEvt && !isToday && (
                        <div style={{ width:3, height:3, borderRadius:'50%', background: isPastMonth?'#C8C3BC':TEAL, position:'absolute', bottom:0 }}/>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDER ─────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <style>{`
        .cal2-cell { transition:background 0.1s; }
        .cal2-cell:hover { background:rgba(44,37,35,0.025) !important; }
        .cal2-cell:hover .cal2-plus { opacity:1 !important; }
        .cal2-card { transition:transform 0.12s,box-shadow 0.12s; cursor:pointer; }
        .cal2-card:hover { transform:scale(1.03); box-shadow:0 4px 16px rgba(0,0,0,0.18) !important; }
        .cal-week-cell:hover { background:rgba(31,78,91,0.03) !important; }
        .cal-year-day:hover span { opacity:0.7; }
        .cal-year-month { transition: background 0.15s, box-shadow 0.15s; }
        .cal-year-month:hover { background: rgba(31,78,91,0.07) !important; box-shadow: 0 2px 12px rgba(31,78,91,0.10); cursor:pointer; }
        @media(max-width:860px){ .cal2-plus { display:none !important; } .cal-menu-hamburger { display:none !important; } }
      `}</style>

      {Header}

      {viewMode === 'month' && MonthGrid}
      {viewMode === 'week'  && WeekGrid}
      {viewMode === 'year'  && YearGrid}

      {/* ── Hover preview ── */}
      {hover && (
        <div onMouseEnter={stayHover} onMouseLeave={hideHover}
          style={{ position:'absolute', top:hover.top, left:hover.left, zIndex:500, width:POPUP_W, background:'white', borderRadius:18, boxShadow:'0 12px 40px rgba(0,0,0,0.20)', border:`1px solid ${DIV}`, overflow:'hidden', pointerEvents:'auto' }}>
          <div style={{ position:'relative', height:140, overflow:'hidden', cursor:'pointer' }}
            onClick={() => { navigate(`/event/${hover.evt.id}`); setHover(null); }}>
            {hover.evt.image_url
              ? <img src={hover.evt.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : <div style={{ width:'100%', height:'100%', background:TEAL, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:40, color:'rgba(255,255,255,0.3)' }}>✦</span></div>}
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 50%)' }}/>
            {/* Going avatars bottom-right — show if anyone is going */}
            {((hover.evt.attendees ?? 0) > 0 || goingEventIds.has(hover.evt.id)) && (
              <div style={{ position:'absolute', bottom:10, right:10, display:'flex', alignItems:'center', gap:5 }}>
                {userAvatar && goingEventIds.has(hover.evt.id) && (
                  <img src={userAvatar} alt="" style={{ width:26, height:26, borderRadius:'50%', objectFit:'cover', border:'2px solid white' }}/>
                )}
                {(hover.evt.attendees ?? 0) > 0 && (
                  <div style={{ background:'rgba(0,0,0,0.55)', borderRadius:100, padding:'3px 8px', display:'flex', alignItems:'center', gap:4 }}>
                    <Users size={11} color="white"/>
                    <span style={{ fontFamily:INTER, fontSize:11, fontWeight:700, color:'white' }}>{hover.evt.attendees}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ padding:'14px 16px' }}>
            {(() => {
            const t = hover.evt.start_time || hover.evt.time;
            const dk = hover.evt.date;
            const dateStr = dk ? new Date(dk + 'T00:00:00').toLocaleDateString('en-US',{ weekday:'long', month:'long', day:'numeric' }) : '';
            const timeStr = t ? fmtTime(t) : '';
            const evtTz = hover.evt.timezone;
            const tzAbbr = evtTz
              ? (Intl.DateTimeFormat('en-US',{ timeZoneName:'short', timeZone: evtTz }).formatToParts(new Date()).find(p => p.type==='timeZoneName')?.value ?? '')
              : (Intl.DateTimeFormat('en-US',{ timeZoneName:'short' }).formatToParts(new Date()).find(p => p.type==='timeZoneName')?.value ?? '');
            return (dateStr || timeStr) ? (
              <p style={{ fontFamily:INTER, fontSize:13, fontWeight:700, color:TEAL, margin:'0 0 4px' }}>
                {dateStr}{dateStr && timeStr ? ' · ' : ''}{timeStr}{tzAbbr ? ` ${tzAbbr}` : ''}
              </p>
            ) : null;
          })()}
            <p style={{ fontFamily:INTER, fontSize:15, fontWeight:700, color:DARK, margin:'0 0 4px', lineHeight:1.3 }}>{hover.evt.title}</p>
            {hover.evt.location && <p style={{ fontFamily:INTER, fontSize:13, color:MID, margin:'0 0 6px' }}>{hover.evt.location}</p>}
            {hover.evt.description && <p style={{ fontFamily:INTER, fontSize:13, color:MID, margin:0, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{hover.evt.description}</p>}
          </div>
        </div>
      )}

      {/* ── Quick-create popup ── */}
      {qc && (
        <div className="cal-qc-popup" style={{ position:'absolute', top:qc.top, left:qc.left, zIndex:500, width:POPUP_W, background:'white', borderRadius:18, boxShadow:'0 12px 40px rgba(0,0,0,0.18)', border:`1px solid ${DIV}`, padding:'20px 22px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <AlignJustify size={18} color={MID}/>
            <button onClick={() => setQc(null)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', color:MID }}><X size={18}/></button>
          </div>
          <input autoFocus value={qcTitle} onChange={e => setQcTitle(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter') handleQuickSave(); if(e.key==='Escape') setQc(null); }}
            placeholder="Add title"
            style={{ width:'100%', border:'none', borderBottom:`2px solid ${TEAL}`, outline:'none', fontFamily:INTER, fontSize:22, fontWeight:500, color:DARK, padding:'0 0 8px', background:'transparent', boxSizing:'border-box', marginBottom:16 }}/>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {(['event','task','appointment'] as const).map(t => (
              <button key={t} onClick={() => setQcType(t)}
                style={{ padding:'6px 14px', borderRadius:100, border:'none', cursor:'pointer', fontFamily:INTER, fontSize:13, fontWeight:600, background:qcType===t?SURFACE:'transparent', color:qcType===t?TEAL:MID, textTransform:'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, padding:'10px 12px', borderRadius:10, background:BG }}>
            <Clock size={16} color={MID}/>
            <div>
              <p style={{ fontFamily:INTER, fontSize:14, fontWeight:600, color:DARK, margin:0 }}>{fmtDateTimeLabel(qc.date)}</p>
              <p style={{ fontFamily:INTER, fontSize:12, color:MID, margin:0 }}>Time zone · Does not repeat</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:`1px solid ${DIV}` }}>
            <Users size={16} color={MID}/><span style={{ fontFamily:INTER, fontSize:14, color:MID }}>Add guests</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:`1px solid ${DIV}` }}>
            <MapPin size={16} color={MID}/><span style={{ fontFamily:INTER, fontSize:14, color:MID }}>Add location</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', marginBottom:16 }}>
            <AlignJustify size={16} color={MID}/><span style={{ fontFamily:INTER, fontSize:14, color:MID }}>Add description</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={() => { setQc(null); navigate('/create-event', { state: { prefillDate: qc.date, prefillTitle: qcTitle } }); }}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:INTER, fontSize:14, fontWeight:600, color:MID }}>More options</button>
            <button onClick={handleQuickSave} disabled={!qcTitle.trim()||saving}
              style={{ padding:'10px 24px', background:qcTitle.trim()?TEAL:DIV, color:qcTitle.trim()?'white':MID, border:'none', borderRadius:100, cursor:qcTitle.trim()?'pointer':'default', fontFamily:INTER, fontSize:14, fontWeight:700 }}>
              {saving?'Saving…':'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
