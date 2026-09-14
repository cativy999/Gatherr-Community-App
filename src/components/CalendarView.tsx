import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, MapPin, Clock, AlignJustify, Check, Star, Bookmark, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ── Design tokens ──────────────────────────────────────────────────────────
const DARK    = "#2C2523";
const MID     = "#635C59";
const TEAL    = "#1F4E5B";
const DIV     = "#E4DCCF";
const SURFACE = "#EFECE6";
const BG      = "#FAF6F0";
const RED     = "#DC2626";
const INTER   = "'Inter', sans-serif";

const MONTHS      = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_HEADERS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

type CalEvent = {
  id: string; title: string; image_url: string | null;
  date: string; time?: string | null; start_time?: string | null;
  location?: string | null; ward_type?: string | null;
  description?: string | null; user_id?: string;
};

type HoverState = { evt: CalEvent; top: number; left: number; side: 'left'|'right' };
type QuickCreate = { date: string; top: number; left: number; side: 'left'|'right' };

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

const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
};
const fmtDisplay = (dk: string) => {
  const [y,m,d] = dk.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
};
const fmtDateTimeLabel = (dk: string) => {
  const [y,m,d] = dk.split('-').map(Number);
  const dt = new Date(y,m-1,d);
  return dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
};

const todayRaw = new Date();
const todayKey = `${todayRaw.getFullYear()}-${String(todayRaw.getMonth()+1).padStart(2,'0')}-${String(todayRaw.getDate()).padStart(2,'0')}`;

const POPUP_W = 320;
const POPUP_H = 380; // approx preview popup height

export default function CalendarView({
  events, navigate, isLoggedIn, userId, userName, userAvatar,
  savedEventIds = new Set(), goingEventIds = new Set(), interestedEventIds = new Set(),
}: Props) {
  const [calDate,   setCalDate]   = useState(new Date(todayRaw.getFullYear(), todayRaw.getMonth(), 1));
  const [viewMode,  setViewMode]  = useState<'year'|'month'|'week'>('month');
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [filter,    setFilter]    = useState<'all'|'going'|'interested'|'saved'>('all');
  const [hover,     setHover]     = useState<HoverState | null>(null);
  const [qc,        setQc]        = useState<QuickCreate | null>(null);
  const [qcTitle,   setQcTitle]   = useState('');
  const [qcType,    setQcType]    = useState<'event'|'task'|'appointment'>('event');
  const [saving,    setSaving]    = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calRef = useRef<HTMLDivElement>(null);

  const year        = calDate.getFullYear();
  const month       = calDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  const allEventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
    return map;
  }, [events]);

  // Apply "My Events" filter
  const eventsByDate = useMemo(() => {
    if (filter === 'all') return allEventsByDate;
    const map: Record<string, CalEvent[]> = {};
    events.forEach(e => {
      const show =
        (filter === 'going'      && goingEventIds.has(e.id)) ||
        (filter === 'interested' && interestedEventIds.has(e.id)) ||
        (filter === 'saved'      && savedEventIds.has(e.id));
      if (!show) return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events, filter, allEventsByDate, goingEventIds, interestedEventIds, savedEventIds]);

  const fmtKey = (y: number, m: number, d: number) =>
    `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const goToday   = () => setCalDate(new Date(todayRaw.getFullYear(), todayRaw.getMonth(), 1));
  const prevMonth = () => setCalDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalDate(new Date(year, month + 1, 1));

  const goCreate = (dk: string) => {
    if (!isLoggedIn) { navigate('/welcome'); return; }
    navigate('/create-event', { state: { prefillDate: dk, prefillTitle: qcTitle } });
  };

  // Close popups on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest('.cal-menu-btn') && !t.closest('.cal-menu-dropdown')) setMenuOpen(false);
      if (!t.closest('.cal-qc-popup') && !t.closest('.cal2-cell')) setQc(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Hover preview helpers ─────────────────────────────────────────────
  const showHover = useCallback((evt: CalEvent, el: HTMLElement) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const rect = el.getBoundingClientRect();
    const calRect = calRef.current?.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    // Determine side: prefer right, fall back to left
    const side: 'left'|'right' = rect.right + POPUP_W + 12 < vpW ? 'right' : 'left';
    const rawLeft = side === 'right' ? rect.right + 8 : rect.left - POPUP_W - 8;
    const rawTop  = Math.min(rect.top, vpH - POPUP_H - 20);
    setHover({ evt, top: rawTop, left: rawLeft, side });
  }, []);

  const hideHover = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setHover(null), 150);
  }, []);

  const stayHover = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }, []);

  // ── Quick create popup position ───────────────────────────────────────
  const openQC = (dk: string, el: HTMLElement) => {
    if (!isLoggedIn) { navigate('/welcome'); return; }
    const rect = el.getBoundingClientRect();
    const vpW  = window.innerWidth;
    const vpH  = window.innerHeight;
    const side: 'left'|'right' = rect.right + POPUP_W + 12 < vpW ? 'right' : 'left';
    const rawLeft = side === 'right' ? rect.right + 8 : rect.left - POPUP_W - 8;
    const rawTop  = Math.min(rect.top, vpH - 420);
    setQcTitle('');
    setQcType('event');
    setQc({ date: dk, top: rawTop, left: Math.max(8, rawLeft), side });
  };

  // ── Quick save ────────────────────────────────────────────────────────
  const handleQuickSave = async () => {
    if (!qcTitle.trim() || !qc) return;
    if (!isLoggedIn) { navigate('/welcome'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('events').insert({
        title: qcTitle.trim(),
        date: qc.date,
        user_id: userId,
        ward_type: 'general',
      });
      if (error) throw error;
      toast.success('Event created!');
      setQc(null);
    } catch {
      toast.error('Could not save — try More options');
    } finally {
      setSaving(false);
    }
  };

  // ── Build grid cells ──────────────────────────────────────────────────
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDay + 1;
    if (day < 1) {
      const d = new Date(year, month, day);
      return { day: d.getDate(), key: fmtKey(d.getFullYear(), d.getMonth(), d.getDate()), overflow: true };
    }
    if (day > daysInMonth) {
      const d = new Date(year, month + 1, day - daysInMonth);
      return { day: d.getDate(), key: fmtKey(d.getFullYear(), d.getMonth(), d.getDate()), overflow: true };
    }
    return { day, key: fmtKey(year, month, day), overflow: false };
  });

  // Filter counts for "My Events" badge
  const goingCount      = events.filter(e => goingEventIds.has(e.id)).length;
  const interestedCount = events.filter(e => interestedEventIds.has(e.id)).length;
  const savedCount      = events.filter(e => savedEventIds.has(e.id)).length;

  return (
    <>
      <style>{`
        .cal2-cell { transition: background 0.1s; }
        .cal2-cell:hover { background: rgba(44,37,35,0.025) !important; }
        .cal2-cell:hover .cal2-plus { opacity:1 !important; }
        .cal2-card { transition: transform 0.12s, box-shadow 0.12s; cursor:pointer; }
        .cal2-card:hover { transform: scale(1.03); box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important; }
        @media(max-width:860px){
          .cal2-plus { opacity:1 !important; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>

        {/* Left */}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <button onClick={prevMonth} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, display:'flex', color:DARK }}>
            <ChevronLeft size={20}/>
          </button>
          <button onClick={nextMonth} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, display:'flex', color:DARK }}>
            <ChevronRight size={20}/>
          </button>
          <span style={{ fontFamily:INTER, fontSize:22, fontWeight:700, color:DARK, marginLeft:6 }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={goToday}
            style={{ marginLeft:10, padding:'6px 16px', borderRadius:100, border:`1.5px solid ${DIV}`, background:'white', fontFamily:INTER, fontSize:13, fontWeight:600, color:DARK, cursor:'pointer' }}>
            Today
          </button>
        </div>

        {/* Right: avatar + hamburger + view toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative' }}>

          {/* User avatar */}
          <button className="cal-menu-btn" onClick={() => setMenuOpen(v=>!v)}
            style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex' }}>
            {userAvatar
              ? <img src={userAvatar} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:`2.5px solid ${TEAL}` }}/>
              : <div style={{ width:36, height:36, borderRadius:'50%', background:TEAL, display:'flex', alignItems:'center', justifyContent:'center', border:`2.5px solid ${TEAL}` }}>
                  <span style={{ fontSize:14, color:'white', fontFamily:INTER, fontWeight:700 }}>{(userName||'M')[0].toUpperCase()}</span>
                </div>
            }
          </button>

          {/* Hamburger */}
          <button className="cal-menu-btn" onClick={() => setMenuOpen(v=>!v)}
            style={{ background:'none', border:'none', cursor:'pointer', padding:6, display:'flex', color:DARK }}>
            <AlignJustify size={20}/>
          </button>

          {/* Year/Month/Week toggle */}
          <div style={{ display:'flex', background:SURFACE, borderRadius:100, padding:3, gap:1 }}>
            {(['year','month','week'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ padding:'6px 14px', borderRadius:100, border:'none', cursor:'pointer', fontFamily:INTER, fontSize:13, fontWeight:viewMode===v?700:500, background:viewMode===v?'white':'transparent', color:viewMode===v?DARK:MID, boxShadow:viewMode===v?'0 1px 4px rgba(0,0,0,0.10)':'none', transition:'all 0.15s', textTransform:'capitalize' }}>
                {v}
              </button>
            ))}
          </div>

          {/* "My Events" dropdown */}
          {menuOpen && (
            <div className="cal-menu-dropdown" style={{
              position:'absolute', top:'calc(100% + 10px)', right:0, zIndex:400,
              background:'white', borderRadius:18, boxShadow:'0 8px 32px rgba(0,0,0,0.16)',
              border:`1px solid ${DIV}`, width:280, overflow:'hidden',
            }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px', borderBottom:`1px solid ${DIV}` }}>
                {userAvatar
                  ? <img src={userAvatar} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>
                  : <div style={{ width:38, height:38, borderRadius:'50%', background:TEAL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:15, color:'white', fontFamily:INTER, fontWeight:700 }}>{(userName||'M')[0].toUpperCase()}</span>
                    </div>
                }
                <div>
                  <p style={{ fontFamily:INTER, fontSize:15, fontWeight:700, color:DARK, margin:0 }}>My Events</p>
                  <p style={{ fontFamily:INTER, fontSize:12, color:MID, margin:0 }}>Filter by status</p>
                </div>
              </div>

              {/* Filter rows */}
              {([
                { key:'going',      label:'Going',      icon:<Check size={16} color="white"/>, iconBg:TEAL, count:goingCount },
                { key:'interested', label:'Interested',  icon:<Star size={16} color="#C8973A" fill="#C8973A"/>, iconBg:'#FEF3C7', count:interestedCount },
                { key:'saved',      label:'Saved',       icon:<Bookmark size={16} color={TEAL}/>, iconBg:SURFACE, count:savedCount },
              ] as const).map(row => (
                <button key={row.key} onClick={() => { setFilter(filter === row.key ? 'all' : row.key); setMenuOpen(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 18px', border:'none', cursor:'pointer', background: filter===row.key ? SURFACE : 'white', transition:'background 0.1s', borderBottom:`1px solid ${DIV}` }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:row.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {row.icon}
                  </div>
                  <span style={{ fontFamily:INTER, fontSize:15, fontWeight:500, color:DARK, flex:1, textAlign:'left' }}>{row.label}</span>
                  <div style={{ background:SURFACE, borderRadius:100, padding:'2px 10px', minWidth:28, textAlign:'center' }}>
                    <span style={{ fontFamily:INTER, fontSize:13, fontWeight:600, color:DARK }}>{row.count}</span>
                  </div>
                </button>
              ))}

              {/* Show all */}
              <button onClick={() => { setFilter('all'); setMenuOpen(false); }}
                style={{ width:'100%', padding:'14px 18px', border:'none', cursor:'pointer', background:'white', fontFamily:INTER, fontSize:14, color:MID, textAlign:'center' }}>
                Show all events
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <div ref={calRef} style={{ background:'white', border:`1px solid ${DIV}`, borderRadius:20, overflow:'hidden' }}>

        {/* Weekday header */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:SURFACE }}>
          {DAY_HEADERS.map(d => (
            <div key={d} style={{ padding:'10px 0', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:INTER, fontSize:11, fontWeight:700, color:MID, letterSpacing:'0.05em' }}>{d}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {cells.map((cell, i) => {
            const col       = i % 7;
            const isWeekend = col === 0 || col === 6;
            const isToday   = cell.key === todayKey;
            const isPast    = cell.key < todayKey;
            const dayEvts   = cell.overflow ? [] : (eventsByDate[cell.key] ?? []);
            const visible   = dayEvts.slice(0, 2);
            const more      = dayEvts.length - 2;

            const numColor = cell.overflow ? '#C8C3BC' : isWeekend ? RED : DARK;

            return (
              <div
                key={`${cell.key}-${i}`}
                className={cell.overflow ? '' : 'cal2-cell'}
                onClick={e => {
                  if (cell.overflow) return;
                  if (dayEvts.length === 0) openQC(cell.key, e.currentTarget as HTMLElement);
                }}
                style={{
                  borderTop:`1px solid ${DIV}`, borderRight:`1px solid ${DIV}`,
                  padding:'8px 6px 24px',
                  background: isToday ? 'rgba(31,78,91,0.03)' : 'white',
                  outline: isToday ? `2px solid ${TEAL}` : 'none',
                  outlineOffset:-2,
                  cursor: cell.overflow ? 'default' : 'pointer',
                  position:'relative', minHeight:110, boxSizing:'border-box',
                }}
              >
                {/* Day number */}
                <span style={{ fontFamily:INTER, fontSize:13, fontWeight:isToday?700:500, color:numColor, display:'block', marginBottom:6 }}>
                  {cell.day}
                </span>

                {/* Event cards */}
                {visible.map(evt => {
                  const timeStr = evt.start_time || evt.time;
                  return (
                    <div
                      key={evt.id}
                      className="cal2-card"
                      onMouseEnter={e => showHover(evt, e.currentTarget as HTMLElement)}
                      onMouseLeave={hideHover}
                      onClick={e => { e.stopPropagation(); showHover(evt, e.currentTarget as HTMLElement); }}
                      style={{
                        position:'relative', width:'100%', height:64,
                        borderRadius:8, overflow:'hidden', marginBottom:4,
                        background: evt.image_url ? '#111' : TEAL,
                        flexShrink:0, opacity: isPast ? 0.55 : 1,
                        boxShadow:'0 2px 8px rgba(0,0,0,0.12)',
                      }}
                    >
                      {evt.image_url && <img src={evt.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>}
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:28, background:'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}/>
                      {timeStr && (
                        <div style={{ position:'absolute', bottom:5, left:6 }}>
                          <span style={{ fontFamily:INTER, fontSize:9, fontWeight:700, color:'white', background:'rgba(0,0,0,0.5)', borderRadius:4, padding:'2px 5px' }}>
                            {fmtTime(timeStr)}
                          </span>
                        </div>
                      )}
                      {!evt.image_url && (
                        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontSize:20, color:'rgba(255,255,255,0.5)' }}>✦</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {more > 0 && (
                  <span style={{ fontFamily:INTER, fontSize:10, fontWeight:600, color:TEAL, display:'block', paddingLeft:2 }}>
                    +{more} more
                  </span>
                )}

                {/* Creator dot */}
                {dayEvts.length > 0 && !cell.overflow && (
                  <div style={{ position:'absolute', bottom:6, right:6, width:20, height:20, borderRadius:'50%', background:TEAL, border:'2px solid white', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {userAvatar
                      ? <img src={userAvatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <Users size={9} color="white"/>
                    }
                  </div>
                )}

                {/* "+" on hover – empty future dates */}
                {!cell.overflow && !isPast && dayEvts.length === 0 && isLoggedIn && (
                  <button
                    className="cal2-plus"
                    onClick={e => { e.stopPropagation(); openQC(cell.key, e.currentTarget.parentElement as HTMLElement); }}
                    style={{ position:'absolute', bottom:5, right:5, width:22, height:22, borderRadius:'50%', background:TEAL, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.15s', boxShadow:'0 1px 6px rgba(0,0,0,0.15)' }}
                  >
                    <span style={{ color:'white', fontSize:16, lineHeight:1 }}>+</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hover preview popup ────────────────────────────────────────── */}
      {hover && (
        <div
          onMouseEnter={stayHover}
          onMouseLeave={hideHover}
          style={{
            position:'fixed', top:hover.top, left:hover.left, zIndex:500,
            width:POPUP_W, background:'white', borderRadius:18,
            boxShadow:'0 12px 40px rgba(0,0,0,0.20)', border:`1px solid ${DIV}`,
            overflow:'hidden', pointerEvents:'auto',
          }}
        >
          {/* Event image */}
          {hover.evt.image_url && (
            <div style={{ height:180, overflow:'hidden' }}>
              <img src={hover.evt.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
            </div>
          )}
          <div style={{ padding:'14px 16px' }}>
            {/* Time */}
            {(hover.evt.start_time || hover.evt.time) && (
              <p style={{ fontFamily:INTER, fontSize:13, fontWeight:700, color:TEAL, margin:'0 0 4px' }}>
                {fmtTime(hover.evt.start_time || hover.evt.time || '')}
              </p>
            )}
            {/* Title */}
            <p style={{ fontFamily:INTER, fontSize:16, fontWeight:700, color:DARK, margin:'0 0 4px', lineHeight:1.3 }}>
              {hover.evt.title}
            </p>
            {/* Location */}
            {hover.evt.location && (
              <p style={{ fontFamily:INTER, fontSize:13, color:MID, margin:'0 0 6px' }}>{hover.evt.location}</p>
            )}
            {/* Description */}
            {hover.evt.description && (
              <p style={{ fontFamily:INTER, fontSize:13, color:MID, margin:'0 0 14px', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {hover.evt.description}
              </p>
            )}
            {/* Action buttons */}
            <div style={{ display:'flex', gap:10, marginTop: hover.evt.description ? 0 : 10 }}>
              <button
                onClick={() => { navigate(`/event/${hover.evt.id}`); setHover(null); }}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 0', background:TEAL, border:'none', borderRadius:100, cursor:'pointer', fontFamily:INTER, fontSize:14, fontWeight:600, color:'white' }}
              >
                {userAvatar && <img src={userAvatar} alt="" style={{ width:22, height:22, borderRadius:'50%', objectFit:'cover' }}/>}
                {goingEventIds.has(hover.evt.id) ? 'Going ✓' : 'Going'}
              </button>
              <button
                onClick={() => { navigate(`/event/${hover.evt.id}`); setHover(null); }}
                style={{ flex:1, padding:'10px 0', background:SURFACE, border:'none', borderRadius:100, cursor:'pointer', fontFamily:INTER, fontSize:14, fontWeight:600, color:DARK }}
              >
                Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick-create popup ─────────────────────────────────────────── */}
      {qc && (
        <div
          className="cal-qc-popup"
          style={{
            position:'fixed', top:qc.top, left:qc.left, zIndex:500,
            width:POPUP_W, background:'white', borderRadius:18,
            boxShadow:'0 12px 40px rgba(0,0,0,0.18)', border:`1px solid ${DIV}`,
            padding:'20px 22px 18px',
          }}
        >
          {/* Top bar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <AlignJustify size={18} color={MID}/>
            <button onClick={() => setQc(null)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', color:MID }}>
              <X size={18}/>
            </button>
          </div>

          {/* Title input */}
          <input
            autoFocus
            value={qcTitle}
            onChange={e => setQcTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleQuickSave(); if (e.key === 'Escape') setQc(null); }}
            placeholder="Add title"
            style={{ width:'100%', border:'none', borderBottom:`2px solid ${TEAL}`, outline:'none', fontFamily:INTER, fontSize:22, fontWeight:500, color:DARK, padding:'0 0 8px', background:'transparent', boxSizing:'border-box', marginBottom:16 }}
          />

          {/* Event / Task / Appointment */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {(['event','task','appointment'] as const).map(t => (
              <button key={t} onClick={() => setQcType(t)}
                style={{ padding:'6px 14px', borderRadius:100, border:'none', cursor:'pointer', fontFamily:INTER, fontSize:13, fontWeight:600, background:qcType===t ? SURFACE : 'transparent', color:qcType===t ? TEAL : MID, transition:'all 0.15s', textTransform:'capitalize' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Date / time */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, padding:'10px 12px', borderRadius:10, background:BG }}>
            <Clock size={16} color={MID}/>
            <div>
              <p style={{ fontFamily:INTER, fontSize:14, fontWeight:600, color:DARK, margin:0 }}>
                {fmtDateTimeLabel(qc.date)}
              </p>
              <p style={{ fontFamily:INTER, fontSize:12, color:MID, margin:0 }}>Time zone · Does not repeat</p>
            </div>
          </div>

          {/* Add guests */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:`1px solid ${DIV}` }}>
            <Users size={16} color={MID}/>
            <span style={{ fontFamily:INTER, fontSize:14, color:MID }}>Add guests</span>
          </div>

          {/* Add location */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:`1px solid ${DIV}` }}>
            <MapPin size={16} color={MID}/>
            <span style={{ fontFamily:INTER, fontSize:14, color:MID }}>Add location</span>
          </div>

          {/* Add description */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', marginBottom:16 }}>
            <AlignJustify size={16} color={MID}/>
            <span style={{ fontFamily:INTER, fontSize:14, color:MID }}>Add description</span>
          </div>

          {/* Footer */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={() => { setQc(null); goCreate(qc.date); }}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:INTER, fontSize:14, fontWeight:600, color:MID }}>
              More options
            </button>
            <button
              onClick={handleQuickSave}
              disabled={!qcTitle.trim() || saving}
              style={{ padding:'10px 24px', background:qcTitle.trim() ? TEAL : DIV, color:qcTitle.trim() ? 'white' : MID, border:'none', borderRadius:100, cursor:qcTitle.trim() ? 'pointer' : 'default', fontFamily:INTER, fontSize:14, fontWeight:700, transition:'background 0.15s' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
