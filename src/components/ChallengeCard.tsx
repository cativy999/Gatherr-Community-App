import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, X, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const TRAIL_STEPS = 2_600_000;
const STEPS_PER_MILE = 2000;

const TRAIL_WAYPOINTS = [
  { pct: 0,  name: "Nauvoo" },
  { pct: 12, name: "Sugar Creek" },
  { pct: 26, name: "Winter Quarters" },
  { pct: 40, name: "Chimney Rock" },
  { pct: 54, name: "Fort Laramie" },
  { pct: 67, name: "South Pass" },
  { pct: 81, name: "Fort Bridger" },
  { pct: 93, name: "Salt Lake City" },
];

const getCurrentCity = (pct: number): string => {
  let city = TRAIL_WAYPOINTS[0].name;
  for (const wp of TRAIL_WAYPOINTS) {
    if (pct >= wp.pct) city = wp.name;
    else break;
  }
  return city;
};

const getInitialColor = (name: string) => {
  const l = (name || "?").charAt(0).toUpperCase();
  if ("ABCD".includes(l)) return "#F97066";
  if ("EFGH".includes(l)) return "#38BDF8";
  if ("IJKL".includes(l)) return "#A78BFA";
  if ("MNOP".includes(l)) return "#4ADE80";
  if ("QRST".includes(l)) return "#FB923C";
  if ("UVWX".includes(l)) return "#F472B6";
  if ("YZ".includes(l)) return "#2DD4BF";
  return "#94A3B8";
};

interface Participant {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

interface ChallengeCardProps {
  onHasJoinedChange?: (joined: boolean) => void;
}

const VIDEO_SRC = "/Step%20Challenge/Mobile%20Firefly%20A%20cinematic%20wide%20shot%20of%20a%20group%20of%20pioneers%20walking%20forward%20together%20across%20an%20open%20landsca.mp4";

const ChallengeCard = ({ onHasJoinedChange }: ChallengeCardProps = {}) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [totalSteps, setTotalSteps] = useState<number | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    onHasJoinedChange?.(hasJoined);
  }, [hasJoined, onHasJoinedChange]);

  useEffect(() => {
    supabase
      .from("step_entries")
      .select("steps, user_id")
      .then(async ({ data }) => {
        if (!data) return;
        const total = data.reduce((s, e) => s + e.steps, 0);
        setTotalSteps(total);
        if (userId) setHasJoined(data.some((e) => e.user_id === userId));
        const uniqueIds = [...new Set(data.map((e) => e.user_id))];
        setParticipantCount(uniqueIds.length);
        if (uniqueIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, name, avatar_url")
            .in("user_id", uniqueIds.slice(0, 3));
          if (profiles) setParticipants(profiles);
        }
      });
  }, [userId]);

  // Lock body scroll while video overlay is open; sync audio with video
  useEffect(() => {
    if (showVideo) {
      document.body.style.overflow = "hidden";
      videoRef.current?.play().catch(() => {});
      audioRef.current?.play().catch(() => {});
    } else {
      document.body.style.overflow = "";
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
    return () => { document.body.style.overflow = ""; };
  }, [showVideo]);

  const pct = totalSteps !== null ? Math.min(100, (totalSteps / TRAIL_STEPS) * 100) : 0;
  const miles = totalSteps !== null ? Math.floor(totalSteps / STEPS_PER_MILE) : 0;
  const currentCity = getCurrentCity(pct);
  const pioneerPct = Math.max(5, Math.min(88, pct));

  const isMobile = window.innerWidth < 768;

  const handleClick = () => {
    if (isMobile) setShowVideo(true);
    else navigate("/challenge");
  };

  const handleBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) setShowVideo(true);
    else navigate("/challenge");
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  };

  const closeOverlay = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setShowVideo(false);
    setIsExiting(false);
  };

  const handleLogSteps = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsExiting(true);
    setTimeout(() => {
      setShowVideo(false);
      setIsExiting(false);
      navigate("/challenge");
    }, 650);
  };

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          background: "#F1E6C6",
          border: "2px dashed #000",
          borderRadius: 13,
          position: "relative",
          width: "100%",
          height: hasJoined ? 182 : 124,
          overflow: "hidden",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* ── Title ── */}
        <div style={{ position: "absolute", left: 21, top: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 32, lineHeight: 1, color: "#000" }}>
              Step
            </span>
            <img
              src="/Pioneerwalking.png"
              alt=""
              className={hasJoined ? "hidden" : "block"}
              style={{ width: 52, height: 30, objectFit: "contain", transform: "rotate(-3deg)", marginTop: -4 }}
            />
          </div>
          <span
            className="sm:ml-[19px]"
            style={{ fontFamily: "'Holtwood One SC', serif", fontSize: 24, lineHeight: 1, color: "#000", display: "block" }}
          >
            Challenge
          </span>
        </div>

        {/* ── Button ── */}
        <button
          onClick={handleBtn}
          style={{
            position: "absolute", right: 16, top: 36,
            background: "#2E0F02", borderRadius: 27, padding: "14px 18px",
            color: "#fff", fontSize: 15, fontWeight: 500,
            fontFamily: "'Hanken Grotesk', sans-serif",
            border: "none", whiteSpace: "nowrap", cursor: "pointer", lineHeight: 1,
          }}
        >
          {hasJoined ? (
            <>
              <span className="hidden sm:inline">Log Your Steps</span>
              <span className="sm:hidden">Enter Steps</span>
            </>
          ) : "Start Challenge"}
        </button>

        {!hasJoined ? (
          <div style={{ position: "absolute", left: 22, top: 87, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontFamily: "'Hanken Grotesk', sans-serif", color: "#000" }}>
              Join today with {participantCount} others
            </span>
            <div style={{ display: "flex", alignItems: "center" }}>
              {participants.length > 0
                ? participants.slice(0, 3).map((p, i) =>
                    p.avatar_url ? (
                      <img key={p.user_id} src={p.avatar_url} referrerPolicy="no-referrer"
                        style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: "2px solid #F1E6C6", marginLeft: i > 0 ? -9 : 0 }} />
                    ) : (
                      <div key={p.user_id}
                        style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: getInitialColor(p.name), border: "2px solid #F1E6C6", marginLeft: i > 0 ? -9 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                        {p.name?.charAt(0).toUpperCase()}
                      </div>
                    )
                  )
                : [0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: "#a8a29e", border: "2px solid #F1E6C6", marginLeft: i > 0 ? -9 : 0 }} />
                  ))}
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 88, width: "calc(100% - 50px)" }}>
            <div style={{ position: "relative", height: 52 }}>
              <div style={{ position: "absolute", left: 1, top: 45, right: 1, height: 7, background: "#fff", borderRadius: 7 }}>
                <div style={{ height: 7, background: "#98340a", borderRadius: 7, width: `${pioneerPct}%`, transition: "width 0.7s" }} />
              </div>
              <div style={{ position: "absolute", left: `${pioneerPct}%`, top: 0, transform: "translateX(-50%)", pointerEvents: "none", display: "flex", alignItems: "center", gap: 2, background: "rgba(241,230,198,0.9)", borderRadius: 8, padding: "1px 6px", whiteSpace: "nowrap" }}>
                <MapPin size={9} color="#2E0F02" strokeWidth={2.5} />
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#2E0F02" }}>{currentCity}</span>
              </div>
              <div style={{ position: "absolute", left: `${pioneerPct}%`, top: 18, transform: "translateX(-20px)", pointerEvents: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <img src="/Pioneerwalking.png" alt="" style={{ width: 40, height: 23, objectFit: "contain", transform: "rotate(-3deg)", flexShrink: 0 }} />
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {participants.slice(0, 2).map((p, i) =>
                      p.avatar_url ? (
                        <img key={p.user_id} src={p.avatar_url} referrerPolicy="no-referrer"
                          style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", border: "2px solid #F1E6C6", marginLeft: i > 0 ? -7 : 0 }} />
                      ) : (
                        <div key={p.user_id}
                          style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: getInitialColor(p.name), border: "2px solid #F1E6C6", marginLeft: i > 0 ? -7 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff" }}>
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                      )
                    )}
                    {participantCount > 0 && (
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#2d2d2d", border: "2px solid #F1E6C6", marginLeft: -7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 7, fontWeight: 800 }}>+{participantCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ position: "absolute", right: -4, top: 32 }}>
                <Star size={22} color="#c2410c" fill="#c2410c" />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, fontFamily: "'Hanken Grotesk', sans-serif", color: "#000" }}>
                {totalSteps === null ? "Loading..." : `Community: ${miles.toLocaleString()} miles · ${pct.toFixed(1)}% complete`}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0, marginLeft: 8 }}>
                <MapPin size={13} color="#000" strokeWidth={2} />
                <span style={{ fontSize: 13, fontFamily: "'Hanken Grotesk', sans-serif", color: "#000", fontWeight: 500 }}>SLC</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Full-screen video overlay (mobile only) ── */}
      {showVideo && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000" }}>
          <style>{`
            @keyframes circleReveal {
              from { clip-path: circle(0% at 50% 88%); }
              to   { clip-path: circle(150% at 50% 88%); }
            }
          `}</style>

          {/* Circle reveal that bursts open when tapping Log Your Steps */}
          {isExiting && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10,
              background: "#F1E6C6",
              animation: "circleReveal 0.65s cubic-bezier(0.4, 0, 0.6, 1) forwards",
              pointerEvents: "none",
            }} />
          )}

          <audio
            ref={audioRef}
            src="/Step%20Challenge/luis_humanoide-the-heroic-cowboy-cinematic-western-music-509976.mp3"
            loop
            muted={muted}
          />
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            autoPlay
            loop
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* Bottom gradient for button readability */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)", pointerEvents: "none" }} />

          {/* Close (top right) */}
          <button onClick={closeOverlay}
            style={{ position: "absolute", top: 52, right: 20, width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={20} color="#fff" />
          </button>

          {/* Mute toggle (top left) */}
          <button onClick={toggleMute}
            style={{ position: "absolute", top: 52, left: 20, width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {muted ? <VolumeX size={20} color="#fff" /> : <Volume2 size={20} color="#fff" />}
          </button>

          {/* Log Your Steps button */}
          <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <button
              onClick={handleLogSteps}
              style={{ background: "#2E0F02", color: "#fff", fontSize: 17, fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", border: "none", borderRadius: 50, padding: "18px 48px", cursor: "pointer" }}
            >
              Log Your Steps
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ChallengeCard;
