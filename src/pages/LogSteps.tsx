import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const LogSteps = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = session?.user?.id;

  const day = searchParams.get("day") || new Date().toISOString().slice(0, 10);
  const dayName = new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });

  const [inputSteps, setInputSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(false);

  // Community data
  const [communitySteps, setCommunitySteps] = useState(0);
  const [participants, setParticipants] = useState<{ user_id: string; name: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: allEntries } = await supabase.from("step_entries").select("user_id, steps");
      if (!allEntries) return;
      const total = allEntries.reduce((s, e) => s + e.steps, 0);
      setCommunitySteps(total);

      const userIds = [...new Set(allEntries.map(e => e.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
        setParticipants((profiles ?? []).map(p => ({ user_id: p.user_id, name: p.name || "?", avatar_url: p.avatar_url })));
      }
    };
    load();
  }, []);

  const communityPct = Math.min(100, (communitySteps / TRAIL_STEPS) * 100);
  const pioneerPct = Math.max(5, Math.min(88, communityPct));
  const communityMiles = Math.floor(communitySteps / STEPS_PER_MILE);
  const currentCity = [...TRAIL_WAYPOINTS].reverse().find(w => communityPct >= w.pct)?.name || "Nauvoo, IL";

  const goBack = () => {
    setLeaving(true);
    setTimeout(() => navigate("/challenge"), 300);
  };

  const handleSave = async () => {
    const steps = parseInt(inputSteps.replace(/,/g, ""));
    if (!steps || steps <= 0 || !userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("step_entries")
      .insert({ user_id: userId, steps, logged_date: day });
    if (error) {
      toast.error("Failed to log steps");
      setSaving(false);
    } else {
      toast.success(`+${steps.toLocaleString()} steps logged! 🚶`);
      setLeaving(true);
      setTimeout(() => navigate("/challenge"), 300);
    }
  };

  const translateX = leaving ? "100%" : visible ? "0%" : "100%";

  return (
    <div
      style={{
        background: "#f4f0e6",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        inset: 0,
        transform: `translateX(${translateX})`,
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "0 24px", display: "flex", flexDirection: "column", flex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", paddingTop: 52, paddingBottom: 24 }}>
          <button
            onClick={goBack}
            style={{ background: "#e8e1d0", borderRadius: 39, padding: "14px 17px", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Community progress banner */}
        <div style={{
          background: "#f1e6c6",
          border: "2px dashed #202020",
          borderRadius: 16,
          padding: "18px 16px 14px",
          marginBottom: 28,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Title + button row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 22, color: "#000", lineHeight: 1.1 }}>Step</div>
              <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 18, color: "#000", lineHeight: 1.1 }}>Challenge</div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !inputSteps}
              style={{
                background: "#2e0f02", color: "#fff", borderRadius: 27,
                padding: "10px 16px", border: "none",
                cursor: saving || !inputSteps ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
                opacity: saving || !inputSteps ? 0.5 : 1,
              }}
            >
              {saving ? "Saving..." : "Log Your Steps"}
            </button>
          </div>

          {/* Progress bar + pioneer + avatars */}
          <div style={{ position: "relative", height: 50, marginBottom: 10 }}>
            {/* Nauvoo label */}
            <div style={{ position: "absolute", left: 0, top: 0, display: "flex", alignItems: "center", gap: 2 }}>
              <MapPin size={11} color="#6e4731" />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: "#6e4731" }}>Nauvoo</span>
            </div>

            {/* Track */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 42, height: 7, background: "#fff", borderRadius: 7 }}>
              <div style={{ height: 7, background: "#98340a", borderRadius: 7, width: `${communityPct}%`, transition: "width 0.7s" }} />
            </div>

            {/* Pioneer walker */}
            <div style={{ position: "absolute", left: `${pioneerPct}%`, top: 18, transform: "translateX(-50%)" }}>
              <img src="/Pioneerwalking.png" alt="" style={{ width: 36, height: 21, objectFit: "contain", transform: "rotate(-3deg)" }} />
            </div>

            {/* Avatars next to pioneer */}
            <div style={{
              position: "absolute",
              left: `calc(${pioneerPct}% + 28px)`,
              top: 20,
              display: "flex",
              alignItems: "center",
            }}>
              {participants.slice(0, 3).map((p, i) => (
                <div key={p.user_id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i, position: "relative" }}>
                  <Avatar style={{ width: 24, height: 24, border: "2px solid #f1e6c6" }}>
                    <AvatarImage src={p.avatar_url ?? undefined} referrerPolicy="no-referrer" />
                    <AvatarFallback style={{ fontSize: 7 }}>{p.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              ))}
              {participants.length > 3 && (
                <div style={{ marginLeft: -8, width: 24, height: 24, background: "#2d2d2d", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #f1e6c6", position: "relative", zIndex: 0 }}>
                  <span style={{ color: "#fff", fontSize: 7, fontWeight: 800 }}>+{participants.length - 3}</span>
                </div>
              )}
            </div>

            {/* Star at end */}
            <div style={{ position: "absolute", right: -2, top: 29 }}>
              <Star size={18} color="#c2410c" fill="#c2410c" />
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: "#000" }}>
              Community: {communityMiles.toLocaleString()} miles · {communityPct.toFixed(1)}% of trail
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <MapPin size={11} color="#6e4731" />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: "#000" }}>
                {currentCity.split(",")[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 24, color: "#000" }}>
              Log Steps for {dayName}
            </div>
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
            <label style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: "#000", letterSpacing: "0.84px" }}>
              Steps
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 8,212"
              value={inputSteps}
              onChange={(e) => setInputSteps(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
              style={{
                height: 64, borderRadius: 80, border: "2px solid #54715c",
                padding: "17px 23px", fontFamily: "'Inter', sans-serif",
                fontWeight: 600, fontSize: 16, letterSpacing: "0.84px",
                color: "#333", background: "transparent", outline: "none",
                width: "100%", boxSizing: "border-box"
              }}
            />
            <button
              onClick={saving || !inputSteps ? undefined : handleSave}
              style={{
                width: "100%", height: 54, background: "#2e0f02",
                color: "#fff", borderRadius: 27, border: "none",
                cursor: saving || !inputSteps ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 500,
                boxShadow: "0 4px 2.4px rgba(0,0,0,0.12)",
                opacity: saving || !inputSteps ? 0.4 : 1,
                marginTop: 8,
                WebkitAppearance: "none",
                appearance: "none",
              }}
            >
              {saving ? "Saving..." : "Save Steps"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogSteps;
