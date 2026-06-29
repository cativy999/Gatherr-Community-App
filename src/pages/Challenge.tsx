import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Trophy, MapPin, Check, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

// Inject digit animation keyframes once
if (typeof document !== "undefined" && !document.getElementById("digit-roll-style")) {
  const s = document.createElement("style");
  s.id = "digit-roll-style";
  s.textContent = `
    @keyframes digitRoll {
      0%   { transform: translateY(120%); opacity: 0; }
      60%  { transform: translateY(-18%); opacity: 1; }
      100% { transform: translateY(0);    opacity: 1; }
    }
    @keyframes cardRise {
      0%   { transform: translateY(16px); opacity: 0; }
      100% { transform: translateY(0);    opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}

const AnimatedSteps = ({ value }: { value: number }) => {
  const [key, setKey] = useState(0);
  const prev = useRef(value);

  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setKey(k => k + 1);
    }
  }, [value]);

  const str = value.toLocaleString();
  // Build list of chars with their digit-index (right to left, skipping commas)
  let digitPos = 0;
  const chars = str.split("").map((ch) => {
    if (ch === ",") return { ch, delay: 0, isComma: true };
    const d = digitPos++;
    return { ch, delay: d * 60, isComma: false };
  }).reverse().map(c => c); // already built with right-to-left delay

  return (
    <span style={{ display: "inline-flex", alignItems: "baseline" }}>
      {str.split("").map((ch, i) => {
        if (ch === ",") return (
          <span key={`${key}-${i}`} style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 27, color: "#000" }}>{ch}</span>
        );
        // digit index from right (skip commas)
        const rightIdx = str.slice(i + 1).replace(/,/g, "").length;
        const delay = rightIdx * 40;
        return (
          <span
            key={`${key}-${i}`}
            style={{
              display: "inline-block",
              overflow: "hidden",
              fontFamily: "'Holtwood One SC', serif",
              fontSize: 27,
              color: "#000",
              animation: key > 0 ? `digitRoll 0.3s ${delay}ms cubic-bezier(0.22,1,0.36,1) both` : "none",
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};

const TRAIL_STEPS = 2_600_000;
const STEPS_PER_MILE = 2000;

const TRAIL_WAYPOINTS = [
  { pct: 0,  name: "Nauvoo, IL" },
  { pct: 12, name: "Sugar Creek" },
  { pct: 26, name: "Winter Quarters" },
  { pct: 40, name: "Chimney Rock" },
  { pct: 54, name: "Fort Laramie" },
  { pct: 67, name: "South Pass" },
  { pct: 81, name: "Fort Bridger" },
  { pct: 93, name: "Salt Lake City, UT" },
];

const MILESTONES = [
  { label: "Nauvoo, IL",           miles: 0,    subtitle: "" },
  { label: "Winter Quarters, NE",  miles: 265,  subtitle: "" },
  { label: "Fort Laramie, WY",     miles: 520,  subtitle: "" },
  { label: "Independence Rock, WY",miles: 800,  subtitle: "" },
  { label: "Fort Bridger, WY",     miles: 1028, subtitle: "" },
  { label: "Salt Lake City, UT",   miles: 1300, subtitle: "(Final Destination)" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const toDateStr = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface LeaderEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_steps: number;
}

const TrophyBadge = ({ rank }: { rank: number }) => {
  const color = "#6B553F";
  const sz = rank === 1 ? 46 : rank === 2 ? 40 : 36;
  const fontSize = rank === 1 ? 13 : 11;
  return (
    <svg width={sz} height={Math.round(sz * 1.15)} viewBox="0 0 44 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cup body — flat top opening, curved bottom */}
      <path d="M8 6H36V24C36 32.8 29.7 38 22 38C14.3 38 8 32.8 8 24V6Z" stroke={color} strokeWidth="2.2" fill="none" strokeLinejoin="round"/>
      {/* Left handle */}
      <path d="M8 10C4.5 10 3 13.5 3 17C3 20.5 4.5 22 8 22" stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      {/* Right handle */}
      <path d="M36 10C39.5 10 41 13.5 41 17C41 20.5 39.5 22 36 22" stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      {/* Stem */}
      <line x1="22" y1="38" x2="22" y2="44" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      {/* Base */}
      <rect x="14" y="44" width="16" height="4" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      {/* Rank number — sits at top of cup opening */}
      <text x="22" y="18" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter,sans-serif" fontWeight="900" fontSize={fontSize} fill={color}>{rank}</text>
    </svg>
  );
};

const Challenge = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [myName, setMyName] = useState("");
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [mySteps, setMySteps] = useState(0);
  const [communitySteps, setCommunitySteps] = useState(0);
  const [weeklySteps, setWeeklySteps] = useState<Record<string, number>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [participantsFlipped, setParticipantsFlipped] = useState(false);
  const [journeyDays, setJourneyDays] = useState(0);

  const todayStr = toDateStr(new Date());
  const weekStart = getWeekStart();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return toDateStr(d);
  });

  const communityPct = Math.min(100, (communitySteps / TRAIL_STEPS) * 100);
  const pioneerPct = Math.max(5, Math.min(90, communityPct));
  const currentCity = [...TRAIL_WAYPOINTS].reverse().find(w => communityPct >= w.pct)?.name || "Nauvoo, IL";

  const myPct = Math.min(100, (mySteps / TRAIL_STEPS) * 100);
  const myCity = [...TRAIL_WAYPOINTS].reverse().find(w => myPct >= w.pct)?.name || "Nauvoo, IL";
  const communityMiles = Math.floor(communitySteps / STEPS_PER_MILE);

  const fetchData = async () => {
    if (!userId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("user_id", userId)
      .single();
    if (profile) {
      setMyName(profile.name || "");
      setMyAvatar(profile.avatar_url || null);
    }

    const { data: myEntries } = await supabase
      .from("step_entries")
      .select("steps, logged_date, created_at")
      .eq("user_id", userId);

    const totalMySteps = (myEntries ?? []).reduce((s, e) => s + e.steps, 0);
    setMySteps(totalMySteps);

    const weekly: Record<string, number> = {};
    (myEntries ?? []).forEach((e) => {
      // Use `logged_date` column if set, fall back to created_at for old entries
      const entryDate = e.logged_date ?? e.created_at?.slice(0, 10);
      if (entryDate && entryDate >= toDateStr(weekStart)) {
        weekly[entryDate] = (weekly[entryDate] || 0) + e.steps;
      }
    });
    setWeeklySteps(weekly);

    const { data: allEntries } = await supabase
      .from("step_entries")
      .select("user_id, steps, created_at");

    // Calculate journey days from first ever log
    if (allEntries && allEntries.length > 0) {
      const earliest = allEntries.reduce((min, e) =>
        e.created_at < min ? e.created_at : min, allEntries[0].created_at);
      const days = Math.floor((Date.now() - new Date(earliest).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setJourneyDays(days);
    }

    if (allEntries) {
      const communityTotal = allEntries.reduce((s, e) => s + e.steps, 0);
      setCommunitySteps(communityTotal);

      const totals: Record<string, number> = {};
      allEntries.forEach((e) => {
        totals[e.user_id] = (totals[e.user_id] || 0) + e.steps;
      });

      const userIds = Object.keys(totals);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);

        const entries: LeaderEntry[] = userIds.map((uid) => {
          const p = profiles?.find((x) => x.user_id === uid);
          return {
            user_id: uid,
            name: p?.name || "Anonymous",
            avatar_url: p?.avatar_url || null,
            total_steps: totals[uid],
          };
        });
        entries.sort((a, b) => b.total_steps - a.total_steps);
        setLeaderboard(entries);
      }
    }
  };

  useEffect(() => { fetchData(); }, [userId]);

  useEffect(() => {
    document.body.style.background = "#f4f0e6";
    return () => { document.body.style.background = ""; };
  }, []);

  const firstName = myName.split(" ")[0] || "Friend";

  return (
    <div style={{ background: "#f4f0e6", minHeight: "100vh", paddingBottom: 100 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 24px" }}>

        {/* ── User greeting row ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 52, marginBottom: 29 }}>
          {/* Back arrow */}
          <button
            onClick={() => navigate("/wards")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            <ArrowLeft size={22} color="#000" />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 15, flex: 1, minWidth: 0 }}>
            {/* Avatar with cowboy hat */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar style={{ width: 60, height: 60 }}>
                <AvatarImage src={myAvatar ?? undefined} referrerPolicy="no-referrer" />
                <AvatarFallback style={{ fontSize: 18 }}>
                  {myName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
              <img
                src="/cowboyhat.png"
                alt=""
                style={{ position: "absolute", top: -22, left: 2, width: 96, height: 52, objectFit: "contain", pointerEvents: "none" }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 20, color: "#000", lineHeight: 1 }}>
                Hi, {firstName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 5 }}>
                <MapPin size={13} color="#6e4731" />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#000" }}>{myCity}</span>
              </div>
            </div>

            {/* Scattered avatar cluster — clickable to flip */}
            <div
              onClick={() => setParticipantsFlipped(f => !f)}
              style={{ cursor: "pointer", position: "relative", width: 68, height: 58, flexShrink: 0 }}
            >
              {leaderboard.filter(e => e.user_id !== userId).slice(0, 4).map((e, i) => {
                // Scatter positions matching Figma layout
                const positions = [
                  { left: 8,  top: 12 },
                  { left: 28, top: 6  },
                  { left: 12, top: 33 },
                  { left: 46, top: 16 },
                ];
                const pos = positions[i] || { left: i * 14, top: 10 };
                return (
                  <div key={e.user_id} style={{ position: "absolute", left: pos.left, top: pos.top, zIndex: 4 - i }}>
                    <Avatar style={{ width: 22, height: 22, border: "2px solid #f4f0e6" }}>
                      <AvatarImage src={e.avatar_url ?? undefined} referrerPolicy="no-referrer" />
                      <AvatarFallback style={{ fontSize: 7 }}>
                        {e.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                );
              })}
              {leaderboard.length > 4 && (
                <div style={{ position: "absolute", left: 35, top: 37, width: 22, height: 22, background: "#2d2d2d", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                  <span style={{ color: "#fff", fontSize: 7, fontWeight: 800 }}>+{leaderboard.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Participants popup ── */}
        {participantsFlipped && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)" }}
              onClick={() => setParticipantsFlipped(false)}
            />
            <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", pointerEvents: "none" }}>
              <div style={{ background: "#f4f0e6", borderRadius: 24, padding: "24px 20px", width: "100%", maxWidth: 400, pointerEvents: "auto", maxHeight: "80vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 18, color: "#000" }}>Who's Walking</div>
                  <button onClick={() => setParticipantsFlipped(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#aaa" }}>Close</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {leaderboard.map((e, i) => (
                    <div key={e.user_id} style={{
                      background: "#fff", borderRadius: 20, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12,
                      animation: `cardRise 0.6s ${i * 90}ms cubic-bezier(0.16,1,0.3,1) both`,
                    }}>
                      <Avatar style={{ width: 36, height: 36, flexShrink: 0 }}>
                        <AvatarImage src={e.avatar_url ?? undefined} referrerPolicy="no-referrer" />
                        <AvatarFallback style={{ fontSize: 12 }}>{e.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "#000", flex: 1 }}>{e.name}{e.user_id === userId ? " (you)" : ""}</span>
                      <span style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 14, color: "#6b553f" }}>{e.total_steps.toLocaleString()}</span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#aaa" }}>steps</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Main content ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* Log Steps CTA + Share */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => navigate(`/log-steps?day=${todayStr}`)}
                style={{ flex: 1, background: "#2e0f02", color: "#fff", borderRadius: 27, height: 52, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 500, boxShadow: "0 4px 2.4px rgba(0,0,0,0.12)" }}
              >
                <Plus size={20} />
                Log Your Steps Today
              </button>
              <button
                onClick={() => {
                  const text = `I've walked ${mySteps.toLocaleString()} steps on the Pioneer Trail Challenge! 🥾 Join me on Gatherr and let's walk to Salt Lake City together.`;
                  const url = "https://gatherr-one.vercel.app/challenge";
                  if (navigator.share) {
                    navigator.share({ title: "Pioneer Trail Challenge", text, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(`${text} ${url}`);
                    toast.success("Copied to clipboard!");
                  }
                }}
                style={{ width: 52, height: 52, background: "#e8e1d0", borderRadius: 26, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                </svg>
              </button>
            </div>

            {/* Pioneer Trail card — flips to Trail Milestones */}
            <div
              onClick={() => setCardFlipped(f => !f)}
              style={{ perspective: 1000, cursor: "pointer" }}
            >
              <div style={{
                position: "relative",
                transformStyle: "preserve-3d",
                transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
                transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}>
                {/* ── FRONT: progress card ── */}
                <div style={{ background: "#f6f4ee", border: "2px dashed #202020", borderRadius: 24, padding: "25px 19px 20px", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                  <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 18, color: "#000", marginBottom: 20, textAlign: "center" }}>
                    Pioneer Trail Challenge
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 11, marginBottom: 24 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontWeight: 600, color: "#888", fontSize: 14 }}>Total</span>
                    <AnimatedSteps value={communitySteps} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontWeight: 600, color: "#888", fontSize: 14 }}>
                      / {TRAIL_STEPS.toLocaleString()} steps
                    </span>
                  </div>
                  <div style={{ position: "relative", height: 52 }}>
                    <div style={{ position: "absolute", left: 1, top: 45, right: 1, height: 7, background: "#fff", borderRadius: 7 }}>
                      <div style={{ height: 7, background: "#98340a", borderRadius: 7, width: `${communityPct}%`, transition: "width 0.7s" }} />
                    </div>
                    <div style={{ position: "absolute", left: `${pioneerPct}%`, top: 8, transform: "translateX(-50%)", pointerEvents: "none" }}>
                      <img src="/Pioneerwalking.png" alt="" style={{ width: 40, height: 23, objectFit: "contain", transform: "rotate(-3deg)" }} />
                    </div>
                    <div style={{ position: "absolute", right: -4, top: 32 }}>
                      <Star size={22} color="#c2410c" fill="#c2410c" />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#6e4731" }}>Nauvoo, IL</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#6e4731" }}>Salt Lake City, UT</span>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 14, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#aaa" }}>
                    Tap to see Trail Milestones
                  </div>
                </div>

                {/* ── BACK: Trail Milestones ── */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  background: "#f6f4ee", border: "2px dashed #202020", borderRadius: 24, padding: "25px 19px 20px",
                  backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 18, color: "#000" }}>
                      Trail Milestones
                    </div>
                    {journeyDays > 0 && (
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#888", marginTop: 4 }}>
                        Day {journeyDays} of our journey together
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {MILESTONES.map((m) => {
                      const reached = communityMiles >= m.miles;
                      return (
                        <div key={m.label} style={{ background: "#fff", borderRadius: 25, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, background: reached ? "#857769" : "#f7f2e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {reached && <Check size={13} color="#fff" strokeWidth={3} />}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                            <MapPin size={14} color="#6b553f" style={{ flexShrink: 0 }} />
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "#6b553f", whiteSpace: "nowrap" }}>
                              {m.label}
                            </span>
                            {m.subtitle && (
                              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, color: "rgba(107,85,63,0.45)", whiteSpace: "nowrap" }}>
                                {m.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 14, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#aaa" }}>
                    Tap to go back
                  </div>
                </div>
              </div>
            </div>

            {/* This Week */}
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, color: "#000", marginBottom: 20 }}>
                This Week
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {weekDays.slice(0, 6).map((dateStr, i) => {
                  const steps = weeklySteps[dateStr] || 0;
                  const isToday = dateStr === todayStr;
                  const isFuture = dateStr > todayStr;
                  const isPast = dateStr < todayStr;
                  return (
                    <div
                      key={dateStr}
                      onClick={() => !isFuture && navigate(`/log-steps?day=${dateStr}`)}
                      style={{ opacity: isFuture ? 0.36 : 1, cursor: isFuture ? "default" : "pointer" }}
                    >
                      <div style={{
                        background: "transparent",
                        border: isToday ? "2px solid #2e0f02" : "1px solid #D0D0D0",
                        borderRadius: 25,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 18px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                          <div style={{ width: 43, height: 43, background: isToday ? "#2e0f02" : "transparent", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, color: isToday ? "#fff" : isPast ? "rgba(46, 16, 1, 0.37)" : "#2e0f02" }}>
                              {DAY_LETTERS[i]}
                            </span>
                          </div>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: isToday ? 700 : isPast ? 400 : 600, color: isPast ? "rgba(46, 16, 1, 0.37)" : "#000" }}>
                            {DAYS[i]}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          {!isFuture && (
                            <span style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 24, color: "#000" }}>
                              {steps.toLocaleString()}
                            </span>
                          )}
                          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: "#7c7c7c", fontSize: 13 }}>Steps</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ── Leaderboard ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, color: "#000" }}>
              Leaderboard
            </div>
            <div>
              {leaderboard.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: "32px 0", fontSize: 14 }}>No steps logged yet. Be the first!</p>
              ) : (
                leaderboard.slice(0, 5).map((entry, i) => {
                  const isMe = entry.user_id === userId;
                  const maxSteps = leaderboard[0]?.total_steps || 1;
                  const barPct = Math.max(2, (entry.total_steps / maxSteps) * 100);
                  const initials = entry.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

                  return (
                    <div key={entry.user_id} style={{ display: "flex", alignItems: "center", paddingTop: 10, paddingBottom: 10 }}>
                      {/* Rank badge */}
                      <div style={{ width: 50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {i < 3 ? (
                          <TrophyBadge rank={i + 1} />
                        ) : (
                          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: "#6b553f", fontSize: 17, letterSpacing: -0.5 }}>
                            #{i + 1}
                          </span>
                        )}
                      </div>

                      {/* Name + bar + steps */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 20, minWidth: 0, paddingLeft: 12 }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <Avatar style={{ width: 36, height: 36, flexShrink: 0 }}>
                            <AvatarImage src={entry.avatar_url ?? undefined} referrerPolicy="no-referrer" />
                            <AvatarFallback style={{ fontSize: 12 }}>{initials}</AvatarFallback>
                          </Avatar>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: 16, color: isMe ? "#6b553f" : "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {entry.name}{isMe ? " (you)" : ""}
                            </div>
                            <div style={{ marginTop: 6, position: "relative", height: 5, borderRadius: 9, background: "rgba(107,85,63,0.15)", overflow: "hidden" }}>
                              <div style={{ position: "absolute", top: 0, left: 0, height: 5, borderRadius: 9, width: `${barPct}%`, background: "#6b553f" }} />
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "center", flexShrink: 0, minWidth: 56 }}>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: i === 0 ? 20 : 16, color: "#000" }}>
                            {entry.total_steps.toLocaleString()}
                          </div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 12, color: "#737373" }}>Steps</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Reset link */}
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
            <button
              onClick={async () => {
                if (!userId) return;
                if (!confirm("Reset all your steps? This can't be undone.")) return;
                await supabase.from("step_entries").delete().eq("user_id", userId);
                toast.success("Steps reset!");
                fetchData();
              }}
              style={{ fontSize: 12, color: "#aaa", background: "none", border: "none", cursor: "pointer" }}
            >
              Reset my steps
            </button>
          </div>
        </div>
      </div>

      {/* ── Trail Milestones Modal ── */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="w-full max-w-[420px] rounded-2xl p-0 overflow-hidden" style={{ background: "#f4f0e6", border: "none" }}>
          <div style={{ padding: "40px 24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Title */}
            <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 20, color: "#000", textAlign: "center" }}>
              Trail Milestones
            </div>

            {/* Milestone rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MILESTONES.map((m) => {
                const reached = communityMiles >= m.miles;
                return (
                  <div
                    key={m.label}
                    style={{ background: "#fff", borderRadius: 25, padding: "11px 16px", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    {/* Check badge */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                      background: reached ? "#857769" : "#f7f2e5",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {reached && <Check size={14} color="#fff" strokeWidth={3} />}
                    </div>

                    {/* Location */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "nowrap", minWidth: 0 }}>
                      <MapPin size={15} color="#6b553f" style={{ flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 16, color: "#6b553f", whiteSpace: "nowrap" }}>
                        {m.label}
                      </span>
                      {m.subtitle && (
                        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(107,85,63,0.45)", whiteSpace: "nowrap" }}>
                          {m.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Decorative cactus + boots illustration */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
              <img src="/Cactusandboot.png" alt="" style={{ width: 200, height: "auto", opacity: 0.9 }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Challenge;
