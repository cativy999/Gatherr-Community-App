import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, MapPin, Clock } from 'lucide-react';
import { CE_BG, CE_SURFACE } from '../tokens';

const DARK     = "#2C2523";
const MID      = "#635C59";
const TEAL     = "#1F4E5B";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const INTER     = "'Inter', sans-serif";
const DIV       = "#E4DCCF";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

type CalEvent = {
  id: string;
  title: string;
  image_url: string | null;
  date: string;
  time?: string | null;
  start_time?: string | null;
  location?: string | null;
  ward_type?: string | null;
};

interface Props {
  events: CalEvent[];
  navigate: (path: string, opts?: any) => void;
  isLoggedIn: boolean;
  userId?: string;
}

const formatTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

const CalendarView = ({ events, navigate, isLoggedIn, userId }: Props) => {
  const todayRaw = new Date();
  const todayKey = `${todayRaw.getFullYear()}-${String(todayRaw.getMonth()+1).padStart(2,'0')}-${String(todayRaw.getDate()).padStart(2,'0')}`;

  const [calDate, setCalDate] = useState(new Date(todayRaw.getFullYear(), todayRaw.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [panel, setPanel] = useState<'preview' | 'create' | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerStage, setPickerStage] = useState<'year' | 'month'>('year');
  const [pickerYear, setPickerYear] = useState(todayRaw.getFullYear());

  // Quick create form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('fhe');

  const year  = calDate.getFullYear();
  const month = calDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay(); // 0=Sun

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const fmtDateKey = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const formatDisplayDate = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const prevMonth = () => setCalDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalDate(new Date(year, month + 1, 1));

  const handleDateClick = (dateKey: string) => {
    const dayEvents = eventsByDate[dateKey] ?? [];
    setSelectedDate(dateKey);
    if (dayEvents.length > 0) setPanel('preview');
    else setPanel(null);
  };

  const handlePlusClick = (e: React.MouseEvent, dateKey: string) => {
    e.stopPropagation();
    setSelectedDate(dateKey);
    setEventTitle('');
    setEventCategory('fhe');
    setPanel('create');
  };

  const handleCreateContinue = () => {
    if (!isLoggedIn) { navigate('/welcome'); return; }
    navigate('/create-event', { state: { prefillDate: selectedDate, prefillCategory: eventCategory, prefillTitle: eventTitle } });
  };

  // Build total cells for the grid
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDay + 1;
    return (day < 1 || day > daysInMonth) ? null : day;
  });

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <style>{`
        .cal-cell:hover .cal-plus-btn { opacity: 1 !important; }
        .cal-cell { transition: background 0.12s; }
        .cal-cell:hover { background: rgba(31,78,91,0.04) !important; }
        @media (max-width: 767px) {
          .cal-plus-btn { opacity: 1 !important; }
          .cal-layout { flex-direction: column !important; }
          .cal-panel { width: 100% !important; }
        }
      `}</style>

      <div className="cal-layout" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Left: Calendar grid ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Month / Year navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
            <button
              onClick={prevMonth}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={22} color={DARK} />
            </button>

            {/* Month/Year label — click to open picker */}
            <button
              onClick={() => { setPickerYear(year); setPickerStage('year'); setShowPicker(v => !v); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span style={{ fontFamily: CORMORANT, fontSize: 34, fontWeight: 700, color: DARK, lineHeight: 1 }}>
                {MONTHS[month]} {year}
              </span>
            </button>

            <button
              onClick={nextMonth}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={22} color={DARK} />
            </button>

            {/* Month/Year picker */}
            {showPicker && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                padding: '20px 16px', zIndex: 200, minWidth: 280,
                border: `1px solid ${DIV}`,
              }}>
                <button
                  onClick={() => setShowPicker(false)}
                  style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: MID, display: 'flex' }}
                >
                  <X size={16} />
                </button>

                {pickerStage === 'year' ? (
                  <>
                    <p style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: MID, textAlign: 'center', margin: '0 0 12px' }}>Select Year</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {Array.from({ length: 10 }, (_, i) => todayRaw.getFullYear() - 1 + i).map(y => (
                        <button key={y} onClick={() => { setPickerYear(y); setPickerStage('month'); }}
                          style={{
                            padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontFamily: INTER, fontSize: 13,
                            fontWeight: y === year ? 700 : 400,
                            background: y === year ? TEAL : 'transparent',
                            color: y === year ? 'white' : DARK,
                          }}>
                          {y}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setPickerStage('year')}
                      style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, display: 'block' }}
                    >
                      ← {pickerYear}
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {MONTHS.map((mn, i) => {
                        const isActive = i === month && pickerYear === year;
                        return (
                          <button key={mn} onClick={() => { setCalDate(new Date(pickerYear, i, 1)); setShowPicker(false); }}
                            style={{
                              padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              fontFamily: INTER, fontSize: 13,
                              fontWeight: isActive ? 700 : 400,
                              background: isActive ? TEAL : 'transparent',
                              color: isActive ? 'white' : DARK,
                            }}>
                            {mn.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAY_HEADERS.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontFamily: INTER, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em',
                color: i === 0 || i === 6 ? '#C0392B' : MID,
                padding: '4px 0',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} style={{ minHeight: 72 }} />;

              const col       = i % 7;
              const isWeekend = col === 0 || col === 6;
              const dateKey   = fmtDateKey(year, month, day);
              const dayEvts   = eventsByDate[dateKey] ?? [];
              const isToday   = dateKey === todayKey;
              const isSel     = dateKey === selectedDate;

              return (
                <div
                  key={dateKey}
                  className="cal-cell"
                  onClick={() => handleDateClick(dateKey)}
                  style={{
                    minHeight: 72, borderRadius: 8, padding: '5px 4px',
                    border: isSel ? `2px solid ${TEAL}` : '2px solid transparent',
                    background: isToday ? `${TEAL}14` : 'transparent',
                    cursor: 'pointer',
                    position: 'relative',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    fontFamily: INTER, fontSize: 12, fontWeight: isToday ? 700 : 400,
                    color: isWeekend ? '#C0392B' : isToday ? TEAL : DARK,
                    lineHeight: 1.2, marginBottom: 4,
                  }}>
                    {day}
                  </div>

                  {/* Event thumbnails */}
                  {dayEvts.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 2 }}>
                      {dayEvts.slice(0, 2).map(evt => (
                        <div key={evt.id} style={{
                          width: 22, height: 22, borderRadius: 5, overflow: 'hidden',
                          background: evt.image_url ? 'transparent' : TEAL, flexShrink: 0,
                          border: `1px solid ${DIV}`,
                        }}>
                          {evt.image_url
                            ? <img src={evt.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 9, color: 'white', lineHeight: 1 }}>✦</span>
                              </div>
                          }
                        </div>
                      ))}
                      {dayEvts.length > 2 && (
                        <div style={{
                          width: 22, height: 22, borderRadius: 5, background: CE_SURFACE, flexShrink: 0,
                          border: `1px solid ${DIV}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontFamily: INTER, fontSize: 8, color: MID, fontWeight: 700 }}>+{dayEvts.length - 2}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* + button */}
                  {isLoggedIn && (
                    <button
                      className="cal-plus-btn"
                      onClick={(e) => handlePlusClick(e, dateKey)}
                      style={{
                        position: 'absolute', bottom: 4, right: 4,
                        width: 18, height: 18, borderRadius: '50%',
                        background: TEAL, border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                        zIndex: 2,
                      }}
                    >
                      <span style={{ color: 'white', fontSize: 14, lineHeight: 1, marginTop: -1 }}>+</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Event preview or Quick create panel ── */}
        {panel && selectedDate && (
          <div
            className="cal-panel"
            style={{
              width: 300, flexShrink: 0,
              background: 'white', borderRadius: 20,
              border: `1px solid ${DIV}`,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
            }}
          >
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid #F0EBE3` }}>
              <span style={{ fontFamily: INTER, fontSize: 13, fontWeight: 600, color: DARK, lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                {formatDisplayDate(selectedDate)}
              </span>
              <button onClick={() => { setPanel(null); setSelectedDate(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID, display: 'flex', flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>

            {/* Preview: list of events on that date */}
            {panel === 'preview' && (
              <div style={{ overflowY: 'auto', maxHeight: 520 }}>
                {selectedEvents.map((evt, idx) => (
                  <div key={evt.id} style={{ borderBottom: idx < selectedEvents.length - 1 ? `1px solid #F0EBE3` : 'none' }}>
                    {evt.image_url && (
                      <div style={{ height: 120, overflow: 'hidden' }}>
                        <img src={evt.image_url} alt={evt.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ padding: '12px 16px' }}>
                      {evt.ward_type && (
                        <div style={{ display: 'inline-block', background: CE_SURFACE, borderRadius: 100, padding: '3px 10px', marginBottom: 8 }}>
                          <span style={{ fontFamily: INTER, fontSize: 10, fontWeight: 700, color: TEAL, textTransform: 'capitalize', letterSpacing: '0.04em' }}>
                            {evt.ward_type}
                          </span>
                        </div>
                      )}
                      <h3 style={{ fontFamily: INTER, fontSize: 15, fontWeight: 700, color: DARK, margin: '0 0 8px', lineHeight: 1.3 }}>
                        {evt.title}
                      </h3>
                      {evt.location && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 5 }}>
                          <MapPin size={12} color={MID} style={{ marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontFamily: INTER, fontSize: 12, color: MID, lineHeight: 1.4 }}>{evt.location}</span>
                        </div>
                      )}
                      {(evt.start_time || evt.time) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                          <Clock size={12} color={MID} style={{ flexShrink: 0 }} />
                          <span style={{ fontFamily: INTER, fontSize: 12, color: MID }}>{formatTime(evt.start_time || evt.time || '')}</span>
                        </div>
                      )}
                      <button
                        onClick={() => navigate(`/event/${evt.id}`)}
                        style={{
                          width: '100%', padding: '10px 0', background: TEAL, color: 'white',
                          border: 'none', borderRadius: 100, cursor: 'pointer',
                          fontFamily: INTER, fontSize: 13, fontWeight: 600,
                        }}
                      >
                        View event details →
                      </button>
                    </div>
                  </div>
                ))}

                {/* If event selected + logged in, offer quick add */}
                {isLoggedIn && (
                  <div style={{ padding: '10px 16px', borderTop: `1px solid #F0EBE3` }}>
                    <button
                      onClick={(e) => handlePlusClick(e, selectedDate)}
                      style={{
                        width: '100%', padding: '9px 0',
                        background: 'transparent', color: TEAL,
                        border: `1.5px solid ${TEAL}`, borderRadius: 100, cursor: 'pointer',
                        fontFamily: INTER, fontSize: 13, fontWeight: 600,
                      }}
                    >
                      + Add event on this day
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Create: quick event form */}
            {panel === 'create' && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontFamily: INTER, fontSize: 12, color: MID, margin: 0 }}>
                  Creating event for {formatDisplayDate(selectedDate)}
                </p>

                <input
                  type="text"
                  placeholder="Event name *"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: `1.5px solid ${DIV}`, fontFamily: INTER, fontSize: 14, color: DARK,
                    outline: 'none', boxSizing: 'border-box', background: CE_BG,
                  }}
                  onFocus={e => (e.target.style.borderColor = TEAL)}
                  onBlur={e => (e.target.style.borderColor = DIV)}
                />

                <div>
                  <label style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: MID, display: 'block', marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    value={eventCategory}
                    onChange={e => setEventCategory(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: `1.5px solid ${DIV}`, fontFamily: INTER, fontSize: 14, color: DARK,
                      outline: 'none', background: CE_BG, boxSizing: 'border-box', cursor: 'pointer',
                      appearance: 'none',
                    }}
                  >
                    <option value="fhe">FHE</option>
                    <option value="spiritual">Spiritual</option>
                    <option value="service">Service</option>
                    <option value="conference">Conference</option>
                    <option value="social">Social</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateContinue}
                  disabled={!eventTitle.trim()}
                  style={{
                    width: '100%', padding: '12px 0', background: eventTitle.trim() ? TEAL : '#ccc',
                    color: 'white', border: 'none', borderRadius: 100,
                    cursor: eventTitle.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: INTER, fontSize: 14, fontWeight: 600,
                    transition: 'background 0.2s',
                  }}
                >
                  Continue in full editor →
                </button>

                <p style={{ fontFamily: INTER, fontSize: 11, color: MID, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                  Add photo, location, time, and more details on the next page.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CalendarView;
