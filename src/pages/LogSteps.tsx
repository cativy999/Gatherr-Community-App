import { CE_BG } from '../tokens';
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, VolumeX, Volume2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DESKTOP_VIDEO = "/pioneer-desktop.mp4";
const MOBILE_VIDEO  = "/pioneer-mobile.mp4";
const MUSIC         = "/pioneer-music.mp3";

const LogSteps = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = session?.user?.id;

  const getLocalToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const day = searchParams.get("day") || getLocalToday();
  const dayName = new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });

  const [inputSteps, setInputSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    // Autoplay music
    if (audioRef.current) {
      audioRef.current.volume = 0.45;
      audioRef.current.play().catch(() => {});
    }
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const toggleMute = () => {
    setMuted(m => {
      if (audioRef.current) audioRef.current.muted = !m;
      return !m;
    });
  };

  const goBack = () => {
    setLeaving(true);
    if (audioRef.current) audioRef.current.pause();
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
      if (audioRef.current) audioRef.current.pause();
      setLeaving(true);
      setTimeout(() => navigate("/challenge"), 300);
    }
  };

  const translateX = leaving ? "100%" : visible ? "0%" : "100%";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        inset: 0,
        transform: `translateX(${translateX})`,
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 50,
        overflowY: "auto",
        background: "#000",
      }}
    >
      {/* ── Cinematic video background ── */}
      <video
        key={isMobile ? "mobile" : "desktop"}
        src={isMobile ? MOBILE_VIDEO : DESKTOP_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          opacity: 0.92,
        }}
      />

      {/* Dark gradient overlay at bottom so UI is readable */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        height: "55%",
        background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.72) 100%)",
        zIndex: 1,
        pointerEvents: "none",
      }} />

      {/* ── Music ── */}
      <audio ref={audioRef} src={MUSIC} loop />

      {/* ── Mute toggle ── */}
      <button
        onClick={toggleMute}
        style={{
          position: "fixed", top: 20, right: 20, zIndex: 10,
          background: "rgba(0,0,0,0.4)", border: "none", cursor: "pointer",
          borderRadius: "50%", width: 40, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {muted
          ? <VolumeX size={18} color="#fff" />
          : <Volume2 size={18} color="#fff" />}
      </button>

      {/* ── Back button ── */}
      <div style={{ position: "relative", zIndex: 10, padding: "52px 24px 0" }}>
        <button
          onClick={goBack}
          style={{
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
            borderRadius: 39, padding: "14px 17px", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center",
          }}
        >
          <ArrowLeft size={20} color="#fff" />
        </button>
      </div>

      {/* ── Bottom content ── */}
      <div style={{
        position: "relative", zIndex: 10,
        marginTop: "auto",
        padding: "0 24px 60px",
        maxWidth: 480,
        width: "100%",
        margin: "auto auto 0",
        boxSizing: "border-box",
      }}>
        {userId ? (
          /* ── Logged-in: step input ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 24, color: "#fff" }}>
                Log Steps for {dayName}
              </div>
            </div>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 8,212"
              value={inputSteps}
              onChange={(e) => setInputSteps(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
              style={{
                height: 64, borderRadius: 80,
                border: "2px solid rgba(255,255,255,0.5)",
                padding: "17px 23px", fontFamily: "'Inter', sans-serif",
                fontWeight: 600, fontSize: 16, letterSpacing: "0.84px",
                color: "#fff", background: "rgba(255,255,255,0.12)",
                outline: "none", width: "100%", boxSizing: "border-box",
              }}
            />
            <button
              onClick={saving || !inputSteps ? undefined : handleSave}
              style={{
                width: "100%", height: 54, background: "#2e0f02",
                color: "#fff", borderRadius: 27, border: "none",
                cursor: saving || !inputSteps ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 500,
                boxShadow: "0 4px 2.4px rgba(0,0,0,0.3)",
                opacity: saving || !inputSteps ? 0.4 : 1,
                marginTop: 8,
              }}
            >
              {saving ? "Saving..." : "Log Your Steps"}
            </button>
          </div>
        ) : (
          /* ── Guest: join CTA ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 26, color: "#fff", lineHeight: 1.2 }}>
              Pioneer Trail Challenge
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.8)", margin: 0, maxWidth: 300 }}>
              Walk with the community from Nauvoo to Salt Lake City. Log your steps every day.
            </p>
            <button
              onClick={() => navigate("/welcome")}
              style={{
                width: "100%", maxWidth: 320, height: 54, background: "#2e0f02",
                color: "#fff", borderRadius: 27, border: "none",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                fontSize: 18, fontWeight: 500,
                boxShadow: "0 4px 2.4px rgba(0,0,0,0.3)",
                marginTop: 8,
              }}
            >
              Join the Challenge
            </button>
            <button
              onClick={() => navigate("/challenge")}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)" }}
            >
              See the leaderboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogSteps;
