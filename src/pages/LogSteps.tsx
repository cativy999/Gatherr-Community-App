import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const LogSteps = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = session?.user?.id;

  const getLocalToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  };
  const day = searchParams.get("day") || getLocalToday();
  const dayName = new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });

  const [inputSteps, setInputSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

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
