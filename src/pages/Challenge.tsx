import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Map, ArrowLeft, Pencil, Trophy, MapPin, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

interface LeaderEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_steps: number;
}

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
  const [logOpen, setLogOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [logDay, setLogDay] = useState("");
  const [inputSteps, setInputSteps] = useState("");
  const [saving, setSaving] = useState(false);

  const todayStr = toDateStr(new Date());
  const weekStart = getWeekStart();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return toDateStr(d);
  });

  const communityPct = Math.min(100, (communitySteps / TRAIL_STEPS) * 100);
  const pioneerPct = Math.max(3, Math.min(92, communityPct));
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
      .select("steps, created_at")
      .eq("user_id", userId);

    const totalMySteps = (myEntries ?? []).reduce((s, e) => s + e.steps, 0);
    setMySteps(totalMySteps);

    const weekly: Record<string, number> = {};
    (myEntries ?? []).forEach((e) => {
      const entryDate = e.created_at?.slice(0, 10);
      if (entryDate && entryDate >= toDateStr(weekStart)) {
        weekly[entryDate] = (weekly[entryDate] || 0) + e.steps;
      }
    });
    setWeeklySteps(weekly);

    const { data: allEntries } = await supabase
      .from("step_entries")
      .select("user_id, steps");

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

  const openLog = (dateStr: string) => {
    setLogDay(dateStr);
    setInputSteps("");
    setLogOpen(true);
  };

  const handleLog = async () => {
    const steps = parseInt(inputSteps.replace(/,/g, ""));
    if (!steps || steps <= 0 || !userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("step_entries")
      .insert({ user_id: userId, steps });
    if (error) {
      toast.error("Failed to log steps");
    } else {
      toast.success(`+${steps.toLocaleString()} steps logged! 🚶`);
      setLogOpen(false);
      setInputSteps("");
      fetchData();
    }
    setSaving(false);
  };

  const firstName = myName.split(" ")[0] || "Friend";
  const logDayName = logDay
    ? new Date(logDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })
    : "Today";

  return (
    <div style={{ background: "#f4f0e6", minHeight: "100vh", paddingBottom: 100 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Header: back + map ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 29, position: "sticky", top: 0, zIndex: 50, paddingTop: 12, paddingBottom: 8, background: "transparent" }}>
          <button
            onClick={() => navigate("/wards")}
            style={{ background: "#e8e1d0", borderRadius: 39, padding: "14px 17px", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => setMapOpen(true)}
            style={{ background: "#e8e1d0", borderRadius: 39, padding: "14px 17px", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <Map size={20} />
          </button>
        </div>

        {/* ── User greeting row ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 29 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            {/* Avatar with cowboy hat */}
            <div style={{ position: "relative" }}>
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

            <div>
              <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 20, color: "#000", lineHeight: 1 }}>
                Hi, {firstName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 5 }}>
                <MapPin size={13} color="#6e4731" />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#000" }}>{myCity}</span>
              </div>
            </div>

            <span style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 20, marginLeft: 4 }}>+</span>
          </div>

          {/* Overlapping participant avatars */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {leaderboard.filter(e => e.user_id !== userId).slice(0, 4).map((e, i) => (
              <div key={e.user_id} style={{ marginRight: -12, zIndex: 10 - i, position: "relative" }}>
                <Avatar style={{ width: 26, height: 26, border: "2px solid #f4f0e6" }}>
                  <AvatarImage src={e.avatar_url ?? undefined} referrerPolicy="no-referrer" />
                  <AvatarFallback style={{ fontSize: 8 }}>
                    {e.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}
            {leaderboard.length > 5 && (
              <div style={{ width: 27, height: 27, background: "#2d2d2d", borderRadius: 13.5, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 12, flexShrink: 0 }}>
                <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>+{leaderboard.length - 5}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* Log Steps CTA */}
            <button
              onClick={() => openLog(todayStr)}
              style={{ width: "100%", background: "#2e0f02", color: "#fff", borderRadius: 27, height: 52, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 500, boxShadow: "0 4px 2.4px rgba(0,0,0,0.12)" }}
            >
              <Plus size={20} />
              Log Your Steps Today
            </button>

            {/* Pioneer Trail card */}
            <div style={{ background: "#f6f4ee", border: "2px dashed #202020", borderRadius: 24, padding: "25px 19px 20px" }}>

              {/* Title — centered */}
              <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 24, color: "#000", marginBottom: 20, textAlign: "center" }}>
                Pioneer Trail Challenge
              </div>

              {/* Total steps — centered */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 11, marginBottom: 24 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontWeight: 600, color: "#888", fontSize: 14 }}>Total</span>
                <span style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 27, color: "#000" }}>
                  {communitySteps.toLocaleString()}
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontWeight: 600, color: "#888", fontSize: 14 }}>
                  / {TRAIL_STEPS.toLocaleString()} steps
                </span>
              </div>

              {/* Progress bar area */}
              <div style={{ position: "relative", height: 92 }}>
                {/* Pioneer + city label */}
                <div style={{ position: "absolute", left: `${pioneerPct}%`, top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: "#6e4731", whiteSpace: "nowrap", marginBottom: 2 }}>
                    {currentCity}
                  </span>
                  <img src="/Pioneerwalking.png" alt="" style={{ width: 44, height: 25, objectFit: "contain", transform: "rotate(-3deg)" }} />
                </div>

                {/* Bar */}
                <div style={{ position: "absolute", bottom: 40, left: 1, right: 8, height: 7 }}>
                  <div style={{ background: "#fff", borderRadius: 7, height: 7, width: "100%", position: "relative" }}>
                    <div style={{ background: "#98340a", borderRadius: 7, height: 7, width: `${communityPct}%`, position: "absolute", top: 0, left: 0, minWidth: communityPct > 0 ? 6 : 0 }} />
                  </div>
                  <div style={{ position: "absolute", right: -10, top: -9 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#c8441a">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                </div>

                {/* Labels */}
                <div style={{ position: "absolute", bottom: 0, left: 1, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "#6e4731" }}>Nauvoo, IL</div>
                <div style={{ position: "absolute", bottom: 0, right: 0, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "#6e4731" }}>Salt Lake City, UT</div>
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
                  return (
                    <div key={dateStr} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isFuture ? 0.36 : 1 }}>
                      <div style={{ background: "#fff", border: "1px solid #d0d0d0", borderRadius: 25, flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 19px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                          <div style={{ width: 43, height: 43, background: isToday ? "#756a5e" : "#f7f2e5", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, color: isToday ? "#fff" : "#857769" }}>
                              {DAY_LETTERS[i]}
                            </span>
                          </div>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: isToday ? 700 : 500, color: isToday ? "#756a5e" : "#857769" }}>
                            {DAYS[i]}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          {steps > 0 && (
                            <span style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 24, color: "#000" }}>
                              {steps.toLocaleString()}
                            </span>
                          )}
                          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: "#7c7c7c", fontSize: 13 }}>Steps</span>
                        </div>
                      </div>
                      {!isFuture && (
                        <button onClick={() => openLog(dateStr)} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}>
                          <Pencil size={18} color="#555" />
                        </button>
                      )}
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
                leaderboard.map((entry, i) => {
                  const isMe = entry.user_id === userId;
                  const maxSteps = leaderboard[0]?.total_steps || 1;
                  const barPct = Math.max(2, (entry.total_steps / maxSteps) * 100);
                  const initials = entry.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

                  return (
                    <div key={entry.user_id} style={{ display: "flex", alignItems: "center", paddingTop: 10, paddingBottom: 10 }}>
                      {/* Rank badge */}
                      <div style={{ width: 56, height: 56, position: "relative", flexShrink: 0 }}>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "radial-gradient(circle, #e8dfd0 0%, #d4c8b5 100%)", position: "absolute" }} />
                        {i < 3 ? (
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                            <Trophy size={17} color="#6b553f" />
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, color: "#6b553f", fontSize: 14, lineHeight: 1 }}>
                              {i + 1}
                            </span>
                          </div>
                        ) : (
                          <span style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", fontFamily: "'Inter', sans-serif", fontWeight: 800, color: "#6b553f", fontSize: 16, textAlign: "center", letterSpacing: -0.96 }}>
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

      {/* ── Log Steps Dialog ── */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="w-[calc(100%-40px)] max-w-[380px] rounded-[18px] p-0 overflow-y-auto" style={{ background: "#f4f0e6", border: "none", maxHeight: "90dvh" }}>
          <div style={{ padding: "32px 24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" }}>

            {/* Title */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 20, color: "#000" }}>
                Log Steps for {logDayName}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontWeight: 600, color: "#888", fontSize: 14, marginTop: 6 }}>
                Enter your steps manually
              </div>
            </div>

            {/* Cowboy boots illustration — hidden on small screens */}
            <img
              src="/cowboyboots.png"
              alt=""
              className="hidden sm:block"
              style={{ width: 110, height: 90, objectFit: "contain", transform: "scaleX(-1)" }}
            />

            {/* Input section */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24, paddingTop: 4 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: "#000", letterSpacing: "0.84px" }}>
                  Steps
                </label>
                <input
                  type="number"
                  placeholder="e.g. 8,212"
                  value={inputSteps}
                  onChange={(e) => setInputSteps(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLog()}
                  autoFocus
                  style={{
                    height: 64, borderRadius: 80, border: "2px solid #54715c",
                    padding: "17px 23px", fontFamily: "'Inter', sans-serif",
                    fontWeight: 600, fontSize: 14, letterSpacing: "0.84px",
                    color: "#555", background: "transparent", outline: "none",
                    width: "100%", boxSizing: "border-box"
                  }}
                />
              </div>

              <button
                onClick={handleLog}
                disabled={saving || !inputSteps}
                style={{
                  width: "100%", height: 52, background: "#2e0f02",
                  color: "#fff", borderRadius: 27, border: "none", cursor: saving || !inputSteps ? "not-allowed" : "pointer",
                  fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 500,
                  boxShadow: "0 4px 2.4px rgba(0,0,0,0.12)", opacity: saving || !inputSteps ? 0.6 : 1
                }}
              >
                {saving ? "Saving..." : "Save Steps"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Challenge;
