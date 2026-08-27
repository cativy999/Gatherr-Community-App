import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const INTER = "'Inter', sans-serif";
const TEAL = "#1F4E5B";
const DARK = "#2C2523";
const BG = "#FAF6F0";

// Scattered photo cards — 1.5× size, spread to edges, none overlaps center text box
// Center no-go zone (approx): x 264–760, y 158–482
const PHOTOS = [
  // top strip — above text box
  { src: "https://www.figma.com/api/mcp/asset/5f38f9f1-c300-4a74-9188-df5c07ad00aa.png", left: 355,  top: -95,  w: 166, h: 148, delay: "0s",   dur: "3.2s" },
  { src: "https://www.figma.com/api/mcp/asset/f2cf0949-90d2-4fd8-b3ce-0102035ae5ba.png", left: 560,  top: -95,  w: 121, h: 144, delay: "1.2s", dur: "4.1s" },
  { src: "https://www.figma.com/api/mcp/asset/59a3bfc2-0318-44f1-8b7e-971f30f79224.png", left: 810,  top: -35,  w: 135, h: 121, delay: "0.8s", dur: "4.4s" },
  // left column — x < 264, clean vertical spacing (no overlaps)
  { src: "https://www.figma.com/api/mcp/asset/9145c8a4-7761-4d22-861b-914d2b1d186d.png", left: 58,   top: 10,   w: 109, h: 143, delay: "0.3s", dur: "3.5s" }, // top=10, bottom=153
  { src: "https://www.figma.com/api/mcp/asset/af92f4de-a4b7-4567-ac85-500277cf0d71.png", left: -22,  top: 26,   w: 117, h: 140, delay: "0.5s", dur: "3.8s" }, // beside, bottom=166
  { src: "https://www.figma.com/api/mcp/asset/d9d8c52b-3e49-4072-8b93-eaac78d23223.png", left: -30,  top: 192,  w: 115, h: 103, delay: "2.0s", dur: "3.1s" }, // gap=26, bottom=295
  { src: "https://www.figma.com/api/mcp/asset/d2e28e04-58df-4977-9c3a-5e514ea19803.png", left: -48,  top: 318,  w: 208, h: 169, delay: "1.3s", dur: "4.5s" }, // gap=23, bottom=487
  // right column — x > 760
  { src: "https://www.figma.com/api/mcp/asset/a238f500-ff86-414d-ba2a-1d8b2e21ce2f.png", left: 808,  top: 245,  w: 153, h: 121, delay: "2.4s", dur: "4.2s" },
  { src: "https://www.figma.com/api/mcp/asset/566d088a-4e88-4292-8431-6d00b74f6cc9.png", left: 928,  top: 145,  w: 134, h: 106, delay: "1.1s", dur: "3.7s" },
  { src: "https://www.figma.com/api/mcp/asset/33a2c555-609d-46db-bf66-daa29877b9c4.png", left: 978,  top: 285,  w: 113, h: 101, delay: "1.7s", dur: "3.4s" },
  // bottom strip — y > 482
  { src: "https://www.figma.com/api/mcp/asset/2885e836-a85f-4eaa-bdb1-e3501116f4e2.png", left: -28,  top: 502,  w: 101, h: 121, delay: "1.8s", dur: "3.9s" },
  { src: "https://www.figma.com/api/mcp/asset/c842d007-6dc3-460e-a19d-6ab07be07041.png", left: 155,  top: 548,  w: 181, h: 122, delay: "0.9s", dur: "4.3s" }, // moved down ~50px
  { src: "https://www.figma.com/api/mcp/asset/a16005cb-c6db-4fed-91e5-83a197206ef2.png", left: 415,  top: 578,  w: 175, h: 138, delay: "0.4s", dur: "3.3s" },
  { src: "https://www.figma.com/api/mcp/asset/730841b3-320f-43a6-ae07-91a769180f31.png", left: 598,  top: 555,  w: 181, h: 102, delay: "1.5s", dur: "4.0s" },
  { src: "https://www.figma.com/api/mcp/asset/d1a18a53-e563-481f-81ea-e9854e994aee.png", left: 878,  top: 462,  w: 131, h: 139, delay: "0.6s", dur: "3.8s" },
];


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
      background: #ffffff;
      border: none;
      overflow: hidden;
      object-fit: cover;
      /* outside stroke via box-shadow ring + drop shadow */
      box-shadow: 0 0 0 5px rgba(255,255,255,1), 0px 1px 3.4px rgba(0,0,0,0.35);
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
        .select("id, title, image_url, date, start_time, end_time, time, end_date, is_free, location, created_at, timezone")
        .eq("status", "published")
        .or(`end_date.gte.${today},and(end_date.is.null,date.gte.${today})`)
        .order("created_at", { ascending: false })
        .limit(8);
      setEvents(data ?? []);
      setEventsLoading(false);
    };
    load();
  }, []);

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: INTER, overflowX: "hidden", position: "relative" }}>

      {/* ── Nav — floats over hero ──────────────────────────────────── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, background: "transparent" }}>
        <img src="/icon-large.png" alt="Beyond Sunday" style={{ height: 52, width: "auto" }} />
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
      <section style={{ position: "relative", height: 700, overflow: "hidden" }}>
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

        {/* Bottom fog — subtle gradient fade, no blur */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 110,
          background: "linear-gradient(to bottom, transparent 0%, rgba(250,246,240,0.6) 50%, #FAF6F0 100%)",
          pointerEvents: "none",
          zIndex: 3,
        }} />

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
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: INTER, fontSize: 20, fontWeight: 700, color: DARK, margin: "0 0 4px" }}>
              What's happening in the community
            </h2>
            <p style={{ fontFamily: INTER, fontSize: 13, color: "#BDBAB5", margin: 0 }}>
              Real events created by people just like you
            </p>
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
              {events.map((ev) => {
                const isNew = ev.created_at
                  ? (Date.now() - new Date(ev.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7
                  : false;
                const TZ_ABBR: Record<string,string> = { "America/Los_Angeles":"PT","America/Denver":"MT","America/Phoenix":"MT","America/Chicago":"CT","America/New_York":"ET" };
                const fmt = (t: string) => new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
                const timePart = ev.start_time ? fmt(ev.start_time) : ev.time ? fmt(ev.time) : "";
                const tzStr = ev.timezone ? (TZ_ABBR[ev.timezone] ?? "") : "";
                const [y, m, d] = ev.date.split("-").map(Number);
                const dateStr = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                const cityLine = ev.location ? ev.location.split(",").slice(0, 2).join(",").trim() : null;
                return (
                  <div
                    key={ev.id}
                    className="landing-event-card"
                    onClick={() => navigate(`/event/${ev.id}`)}
                    style={{ cursor: "pointer", background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
                  >
                    {/* Image */}
                    <div style={{ height: 140, overflow: "hidden", background: "#F0EAE2" }}>
                      {ev.image_url
                        ? <img src={ev.image_url} alt={ev.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", background: "#F0EAE2" }} />}
                    </div>
                    {/* Info — matches Wards card style */}
                    <div style={{ padding: "10px 12px 12px" }}>
                      {/* Date/time in teal above title */}
                      <p style={{ fontFamily: INTER, fontSize: 10, fontWeight: 600, color: TEAL, margin: "0 0 3px", letterSpacing: "0.01em" }}>
                        {dateStr}{timePart ? ` · ${timePart}${tzStr ? ` ${tzStr}` : ""}` : ""}
                      </p>
                      {/* Bold title */}
                      <p style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: DARK, margin: "0 0 3px", lineHeight: 1.25 }}>{ev.title}</p>
                      {/* Location */}
                      {cityLine && <p style={{ fontFamily: INTER, fontSize: 11, color: "#8C8884", margin: 0 }}>{cityLine}</p>}
                      {isNew && <span style={{ fontFamily: INTER, fontSize: 10, fontWeight: 700, color: "#FF3FA5", marginTop: 4, display: "block" }}>✦ New</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA below grid */}
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button
              onClick={goToWelcome}
              style={{
                background: TEAL, color: "#FAF6F0", border: "none", cursor: "pointer",
                padding: "14px 36px", borderRadius: 999,
                fontFamily: INTER, fontSize: 15, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              Events near you →
            </button>
            <p style={{ fontFamily: INTER, fontSize: 12, color: "#BDBAB5", marginTop: 10 }}>
              Sign in to see what's happening in your area
            </p>
          </div>
        </div>
      </section>

      {/* ── Interactive Features ────────────────────────────────────── */}
      <section style={{ background: BG, padding: "0 40px 64px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: INTER, fontSize: 20, fontWeight: 700, color: DARK, marginBottom: 24 }}>Interactive Features</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <img
              src="/pioneertrailstepchallenge.png"
              alt="Step Challenge"
              style={{ width: "100%", borderRadius: 16, objectFit: "cover" }}
            />
            <img
              src="/OOTD/OOTD component 2.png"
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
