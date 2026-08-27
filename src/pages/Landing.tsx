import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const INTER = "'Inter', sans-serif";
const TEAL = "#1F4E5B";
const DARK = "#2C2523";
const BG = "#FAF6F0";

// Scattered photo cards — exact Figma positions (1024px canvas)
// delay/dur are staggered so each card floats independently
const PHOTOS = [
  { src: "https://www.figma.com/api/mcp/asset/5f38f9f1-c300-4a74-9188-df5c07ad00aa.png", left: 434.09, top: -6.23,  w: 110.4, h: 98.3,  delay: "0s",    dur: "3.2s" },
  { src: "https://www.figma.com/api/mcp/asset/d1a18a53-e563-481f-81ea-e9854e994aee.png", left: 790.04, top: 449.23, w: 87.1,  h: 92.6,  delay: "0.6s",  dur: "3.8s" },
  { src: "https://www.figma.com/api/mcp/asset/f2cf0949-90d2-4fd8-b3ce-0102035ae5ba.png", left: 577.16, top: -11.18, w: 80.4,  h: 95.7,  delay: "1.2s",  dur: "4.1s" },
  { src: "https://www.figma.com/api/mcp/asset/9145c8a4-7761-4d22-861b-914d2b1d186d.png", left: 171.7,  top: 51.69,  w: 72.8,  h: 95.5,  delay: "0.3s",  dur: "3.5s" },
  { src: "https://www.figma.com/api/mcp/asset/2885e836-a85f-4eaa-bdb1-e3501116f4e2.png", left: 47.44,  top: 486.36, w: 67.5,  h: 80.4,  delay: "1.8s",  dur: "3.9s" },
  { src: "https://www.figma.com/api/mcp/asset/c842d007-6dc3-460e-a19d-6ab07be07041.png", left: 261.8,  top: 504.67, w: 120.3, h: 81.2,  delay: "0.9s",  dur: "4.3s" },
  { src: "https://www.figma.com/api/mcp/asset/004b30dc-8f56-4830-9ea7-3d5fd37b75bf.png", left: 155.86, top: 571.51, w: 100.5, h: 67.8,  delay: "2.1s",  dur: "3.6s" },
  { src: "https://www.figma.com/api/mcp/asset/730841b3-320f-43a6-ae07-91a769180f31.png", left: 577.16, top: 531.9,  w: 120.3, h: 67.8,  delay: "1.5s",  dur: "4.0s" },
  { src: "https://www.figma.com/api/mcp/asset/a16005cb-c6db-4fed-91e5-83a197206ef2.png", left: 438.05, top: 552.69, w: 116.9, h: 92.1,  delay: "0.4s",  dur: "3.3s" },
  { src: "https://www.figma.com/api/mcp/asset/a238f500-ff86-414d-ba2a-1d8b2e21ce2f.png", left: 676.17, top: 292.29, w: 102.0, h: 80.4,  delay: "2.4s",  dur: "4.2s" },
  { src: "https://www.figma.com/api/mcp/asset/566d088a-4e88-4292-8431-6d00b74f6cc9.png", left: 846.47, top: 187.34, w: 89.2,  h: 70.3,  delay: "1.1s",  dur: "3.7s" },
  { src: "https://www.figma.com/api/mcp/asset/33a2c555-609d-46db-bf66-daa29877b9c4.png", left: 891.03, top: 310.61, w: 75.2,  h: 67.0,  delay: "1.7s",  dur: "3.4s" },
  { src: "https://www.figma.com/api/mcp/asset/59a3bfc2-0318-44f1-8b7e-971f30f79224.png", left: 710.82, top: 38.59,  w: 90.2,  h: 80.4,  delay: "0.8s",  dur: "4.4s" },
  { src: "https://www.figma.com/api/mcp/asset/d9d8c52b-3e49-4072-8b93-eaac78d23223.png", left: 83.59,  top: 167.54, w: 76.9,  h: 68.5,  delay: "2.0s",  dur: "3.1s" },
  { src: "https://www.figma.com/api/mcp/asset/d2e28e04-58df-4977-9c3a-5e514ea19803.png", left: 122.22, top: 271.0,  w: 138.6, h: 112.4, delay: "1.3s",  dur: "4.5s" },
  { src: "https://www.figma.com/api/mcp/asset/af92f4de-a4b7-4567-ac85-500277cf0d71.png", left: 267.75, top: 91.3,   w: 78.2,  h: 93.1,  delay: "0.5s",  dur: "3.8s" },
];

// LA bounding box roughly: lat 33.7–34.3, lng -118.7 to -117.9
const LA_LAT_MIN = 33.7, LA_LAT_MAX = 34.3;
const LA_LNG_MIN = -118.7, LA_LNG_MAX = -117.9;

// Inject gradient text style
if (typeof document !== "undefined" && !document.getElementById("landing-style")) {
  const s = document.createElement("style");
  s.id = "landing-style";
  s.textContent = `
    .landing-gradient-text {
      background: linear-gradient(90deg, #AB46DD 0%, #CF30AD 18%, #F31A7C 36%, #F43068 40%, #F64654 44%, #F75B3F 47%, #F8712B 51%, #EAAB26 77%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .landing-footer-text {
      background: linear-gradient(to right, #FAF6F0, #D19C4D 33%, #FAF6F0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    @keyframes hero-float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-7px); }
    }
    .landing-photo-card {
      position: absolute;
      border-radius: 8px;
      border: 3px solid rgba(207,207,207,0.32);
      overflow: hidden;
      object-fit: cover;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      animation: hero-float var(--float-dur, 3.5s) ease-in-out infinite;
      animation-delay: var(--float-delay, 0s);
    }
    .landing-event-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .landing-event-card { transition: all 0.2s ease; }
  `;
  document.head.appendChild(s);
}

const fmtEventDate = (ev: any) => {
  if (!ev.date) return "";
  const [y, m, d] = ev.date.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayStr = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (!ev.start_time && !ev.time) return dayStr;
  const t = ev.start_time ?? ev.time;
  const timeStr = new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${dayStr} · ${timeStr}`;
};

const Landing = () => {
  const navigate = useNavigate();
  const goToWelcome = () => navigate("/welcome");
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { data } = await supabase
        .from("events")
        .select("id, title, image_url, date, start_time, time, is_free, lat, lng, location")
        .eq("status", "published")
        .or(`end_date.gte.${today},and(end_date.is.null,date.gte.${today})`)
        .gte("lat", LA_LAT_MIN)
        .lte("lat", LA_LAT_MAX)
        .gte("lng", LA_LNG_MIN)
        .lte("lng", LA_LNG_MAX)
        .order("date", { ascending: true })
        .limit(8);
      setEvents(data ?? []);
      setEventsLoading(false);
    };
    load();
  }, []);

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: INTER, overflowX: "hidden" }}>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", position: "relative", zIndex: 10 }}>
        <img src="/icon-large.png" alt="Beyond Sunday" style={{ height: 36, width: "auto" }} />
        <button
          onClick={goToWelcome}
          style={{
            background: "rgba(21,21,21,0.06)", border: "none", cursor: "pointer",
            padding: "6px 16px", borderRadius: 999,
            fontFamily: INTER, fontSize: 13, fontWeight: 500, color: DARK,
          }}
        >
          Sign In
        </button>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{ position: "relative", height: 640, overflow: "hidden" }}>
        {/* 1024px canvas centered — all cards sit at exact Figma px coords */}
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 1024, top: 0, bottom: 0, pointerEvents: "none" }}>
          {PHOTOS.map((p, i) => (
            <img
              key={i}
              src={p.src}
              alt=""
              className="landing-photo-card"
              style={{
                left: p.left,
                top: p.top,
                width: p.w,
                height: p.h,
                "--float-delay": p.delay,
                "--float-dur": p.dur,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Center content — viewport-centered, sits above the cards */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "0 24px" }}>
          {/* Blur backdrop */}
          <div style={{ position: "absolute", inset: "-32px -48px", background: "rgba(250,246,240,0.7)", backdropFilter: "blur(12px)", borderRadius: 24, zIndex: -1 }} />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <span style={{ fontFamily: INTER, fontSize: 42, fontWeight: 400, color: DARK, letterSpacing: "-0.5px" }}>BEYOND SUNDAY</span>
            <span className="landing-gradient-text" style={{ fontFamily: INTER, fontSize: 42, fontWeight: 600 }}>start here</span>
          </div>

          <p style={{ fontFamily: INTER, fontSize: 14, color: "#BDBAB5", maxWidth: 300, lineHeight: 1.6, margin: 0 }}>
            Whatever you want to plan — a{" "}
            <span style={{ textDecoration: "underline" }}>Monday dance party</span>,{" "}
            a <span style={{ textDecoration: "underline" }}>service project</span>,{" "}
            <span style={{ textDecoration: "underline" }}>a ward campout</span>{" "}
            — Beyond Sunday makes it effortless to create and share.
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <button
              onClick={goToWelcome}
              style={{
                background: TEAL, color: BG, border: "none", cursor: "pointer",
                padding: "14px 40px", borderRadius: 999,
                fontFamily: INTER, fontSize: 15, fontWeight: 600,
              }}
            >
              Create Your First Event
            </button>
            <button
              onClick={goToWelcome}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: INTER, fontSize: 13, color: "rgba(21,21,21,0.45)",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              Discover Events Near You →
            </button>
          </div>
        </div>
        </div>
      </section>

      {/* ── Events Grid ────────────────────────────────────────────── */}
      <section style={{ background: BG, padding: "64px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <h2 style={{ fontFamily: INTER, fontSize: 20, fontWeight: 700, color: DARK, margin: 0 }}>
              Upcoming events near <span style={{ color: TEAL }}>Los Angeles, CA</span>
            </h2>
            <button
              onClick={goToWelcome}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: INTER, fontSize: 13, fontWeight: 500, color: TEAL }}
            >
              See all events
            </button>
          </div>
          {eventsLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "white" }}>
                  <div className="sk" style={{ height: 110, borderRadius: 0 }} />
                  <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="sk h-4 w-4/5" />
                    <div className="sk h-3 w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <p style={{ fontFamily: INTER, fontSize: 14, color: "#BDBAB5", textAlign: "center", padding: "40px 0" }}>
              No upcoming events near LA yet — check back soon!
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
              {events.map((ev) => (
                <div key={ev.id} className="landing-event-card" onClick={() => navigate(`/event/${ev.id}`)} style={{ cursor: "pointer", borderRadius: 16, overflow: "hidden", background: "white" }}>
                  <div style={{ height: 110, overflow: "hidden", background: "#F0EAE2" }}>
                    {ev.image_url && <img src={ev.image_url} alt={ev.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ padding: "10px 12px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontFamily: INTER, fontSize: 10, fontWeight: 500, color: DARK, background: "white", border: "1px solid #eee", borderRadius: 999, padding: "2px 8px" }}>
                        {ev.is_free === false ? "Paid" : "Free"}
                      </span>
                    </div>
                    <p style={{ fontFamily: INTER, fontSize: 13, fontWeight: 500, color: DARK, margin: "0 0 4px", lineHeight: 1.3 }}>{ev.title}</p>
                    <p style={{ fontFamily: INTER, fontSize: 11, color: "#69696C", margin: 0 }}>{fmtEventDate(ev)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Interactive Features ────────────────────────────────────── */}
      <section style={{ background: BG, padding: "0 40px 64px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: INTER, fontSize: 20, fontWeight: 700, color: DARK, marginBottom: 24 }}>Interactive Features</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <img
              src="https://www.figma.com/api/mcp/asset/c16e57a4-a4ac-495a-82cb-20bac094b172.png"
              alt="Step Challenge"
              style={{ width: "100%", borderRadius: 16, objectFit: "cover" }}
            />
            <img
              src="https://www.figma.com/api/mcp/asset/f2923618-7d27-4d41-a089-bd9b7a1ba01a.png"
              alt="OOTD"
              style={{ width: "100%", borderRadius: 16, objectFit: "cover" }}
            />
          </div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────────── */}
      <section style={{ background: "#1A1A1A", padding: "80px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <h2
          className="landing-footer-text"
          style={{ fontFamily: INTER, fontSize: 48, fontWeight: 700, letterSpacing: "-2px", lineHeight: 1.1, maxWidth: 700, margin: 0 }}
        >
          Your next favorite moment is one event away
        </h2>
        <button
          onClick={goToWelcome}
          style={{
            background: "transparent", border: `1.5px solid ${TEAL}`, cursor: "pointer",
            padding: "10px 24px", borderRadius: 999,
            fontFamily: INTER, fontSize: 14, fontWeight: 500, color: TEAL,
          }}
        >
          Discover Events
        </button>
      </section>

    </div>
  );
};

export default Landing;
