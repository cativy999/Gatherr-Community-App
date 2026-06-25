import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const TRAIL_STEPS = 2_600_000;
const STEPS_PER_MILE = 2000;

// Pioneer trail waypoints Nauvoo → SLC
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

const ChallengeCard = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [totalSteps, setTotalSteps] = useState<number | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    supabase
      .from("step_entries")
      .select("steps, user_id")
      .then(async ({ data }) => {
        if (!data) return;
        const total = data.reduce((s, e) => s + e.steps, 0);
        setTotalSteps(total);

        if (userId) {
          setHasJoined(data.some((e) => e.user_id === userId));
        }

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

  const pct = totalSteps !== null ? Math.min(100, (totalSteps / TRAIL_STEPS) * 100) : 0;
  const miles = totalSteps !== null ? Math.floor(totalSteps / STEPS_PER_MILE) : 0;
  const currentCity = getCurrentCity(pct);

  // Clamp so pioneer + label don't overflow edges
  const pioneerPct = Math.max(5, Math.min(88, pct));

  const handleClick = () => navigate("/challenge");
  const handleBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate("/challenge");
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: "#F1E6C6",
        border: "2px dashed #000",
        borderRadius: 13,
        position: "relative",
        width: "100%",
        height: hasJoined ? 210 : 124,
        overflow: "hidden",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {/* ── Title: "Step" + pioneer inline ── */}
      <div style={{ position: "absolute", left: 21, top: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: "'Holtwood One SC', serif",
              fontSize: 32,
              lineHeight: 1,
              color: "#000",
            }}
          >
            Step
          </span>
          {/* Hide illustration when in-challenge */}
          <img
            src="/Pioneerwalking.png"
            alt=""
            className={hasJoined ? "hidden" : "block"}
            style={{
              width: 52,
              height: 30,
              objectFit: "contain",
              transform: "rotate(-3deg)",
              marginTop: -4,
            }}
          />
        </div>
        <span
          className="sm:ml-[19px]"
          style={{
            fontFamily: "'Holtwood One SC', serif",
            fontSize: 24,
            lineHeight: 1,
            color: "#000",
            display: "block",
          }}
        >
          Challenge
        </span>
      </div>

      {/* ── Button ── */}
      <button
        onClick={handleBtn}
        style={{
          position: "absolute",
          right: 16,
          top: 36,
          background: "#2E0F02",
          borderRadius: 27,
          padding: "14px 18px",
          color: "#fff",
          fontSize: 15,
          fontWeight: 500,
          fontFamily: "'Hanken Grotesk', sans-serif",
          border: "none",
          whiteSpace: "nowrap",
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        {hasJoined ? (
          <>
            <span className="hidden sm:inline">Log Your Steps</span>
            <span className="sm:hidden">Enter Steps</span>
          </>
        ) : (
          "Start Challenge"
        )}
      </button>

      {!hasJoined ? (
        /* ── State 1: "Join today with X others" + avatars ── */
        <div
          style={{
            position: "absolute",
            left: 22,
            top: 87,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: "#000",
            }}
          >
            Join today with {participantCount} others
          </span>

          <div style={{ display: "flex", alignItems: "center" }}>
            {participants.length > 0
              ? participants.slice(0, 3).map((p, i) =>
                  p.avatar_url ? (
                    <img
                      key={p.user_id}
                      src={p.avatar_url}
                      referrerPolicy="no-referrer"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #F1E6C6",
                        marginLeft: i > 0 ? -9 : 0,
                      }}
                    />
                  ) : (
                    <div
                      key={p.user_id}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        backgroundColor: getInitialColor(p.name),
                        border: "2px solid #F1E6C6",
                        marginLeft: i > 0 ? -9 : 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {p.name?.charAt(0).toUpperCase()}
                    </div>
                  )
                )
              : [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      backgroundColor: "#a8a29e",
                      border: "2px solid #F1E6C6",
                      marginLeft: i > 0 ? -9 : 0,
                    }}
                  />
                ))}
          </div>
        </div>
      ) : (
        /* ── State 2: Progress bar + floating city label ── */
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: 100,
            width: "calc(100% - 50px)",
          }}
        >
          {/* Bar row — taller to give city label + pioneer room above track */}
          <div style={{ position: "relative", height: 52 }}>

            {/* Track at the bottom of the row */}
            <div
              style={{
                position: "absolute",
                left: 1,
                top: 45,
                right: 1,
                height: 7,
                background: "#fff",
                borderRadius: 7,
              }}
            >
              {/* Fill */}
              <div
                style={{
                  height: 7,
                  background: "#98340a",
                  borderRadius: 7,
                  width: `${pioneerPct}%`,
                  transition: "width 0.7s",
                }}
              />
            </div>

            {/* Label floating directly above pioneer center */}
            <div style={{
              position: "absolute",
              left: `${pioneerPct}%`,
              top: 0,
              transform: "translateX(-50%)",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "rgba(241,230,198,0.9)",
              borderRadius: 8,
              padding: "1px 6px",
              whiteSpace: "nowrap",
            }}>
              <MapPin size={9} color="#2E0F02" strokeWidth={2.5} />
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#2E0F02" }}>
                {currentCity}
              </span>
            </div>

            {/* Pioneer + avatars — left edge anchored to fill end */}
            <div style={{
              position: "absolute",
              left: `${pioneerPct}%`,
              top: 18,
              transform: "translateX(-20px)",
              pointerEvents: "none",
            }}>
              {/* Pioneer + avatars row */}
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <img
                  src="/Pioneerwalking.png"
                  alt=""
                  style={{ width: 40, height: 23, objectFit: "contain", transform: "rotate(-3deg)", flexShrink: 0 }}
                />
                {/* Overlapping avatars next to pioneer */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  {participants.slice(0, 2).map((p, i) =>
                    p.avatar_url ? (
                      <img
                        key={p.user_id}
                        src={p.avatar_url}
                        referrerPolicy="no-referrer"
                        style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", border: "2px solid #F1E6C6", marginLeft: i > 0 ? -7 : 0 }}
                      />
                    ) : (
                      <div
                        key={p.user_id}
                        style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: getInitialColor(p.name), border: "2px solid #F1E6C6", marginLeft: i > 0 ? -7 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff" }}
                      >
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

            {/* Star at right end */}
            <div style={{ position: "absolute", right: -4, top: 32 }}>
              <Star size={22} color="#c2410c" fill="#c2410c" />
            </div>
          </div>

          {/* Community stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "#000",
              }}
            >
              {totalSteps === null
                ? "Loading..."
                : `Community: ${miles.toLocaleString()} miles · ${pct.toFixed(1)}% complete`}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                flexShrink: 0,
                marginLeft: 8,
              }}
            >
              <MapPin size={13} color="#000" strokeWidth={2} />
              <span
                style={{
                  fontSize: 13,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  color: "#000",
                  fontWeight: 500,
                }}
              >
                SLC
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengeCard;
