import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const INTER = "'Inter', sans-serif";
const TEAL = "#1F4E5B";
const DARK = "#2C2523";
const BG = "#FAF6F0";

// Scattered photo cards — sized for 100vh hero (~900px tall)
// Center no-go zone (approx): x 240–784, y 270–630
// Side columns (x < 240 or x > 784) are safe at any y
const PHOTOS = [
  // top strip — peek in from above
  { src: "https://www.figma.com/api/mcp/asset/5f38f9f1-c300-4a74-9188-df5c07ad00aa.png", left: 340,  top: -85,  w: 215, h: 192, delay: "0s",   dur: "3.2s" },
  { src: "https://www.figma.com/api/mcp/asset/f2cf0949-90d2-4fd8-b3ce-0102035ae5ba.png", left: 545,  top: -80,  w: 158, h: 187, delay: "1.2s", dur: "4.1s" },
  { src: "https://www.figma.com/api/mcp/asset/59a3bfc2-0318-44f1-8b7e-971f30f79224.png", left: 800,  top: -30,  w: 176, h: 158, delay: "0.8s", dur: "4.4s" },
  // left column — all left of x=240, safe at any y
  { src: "https://www.figma.com/api/mcp/asset/9145c8a4-7761-4d22-861b-914d2b1d186d.png", left: -95,  top: 25,   w: 142, h: 186, delay: "0.3s", dur: "3.5s" },
  { src: "https://www.figma.com/api/mcp/asset/af92f4de-a4b7-4567-ac85-500277cf0d71.png", left: -10,  top: 55,   w: 152, h: 182, delay: "0.5s", dur: "3.8s" },
  // left column (mid) — moved back to left side
  { src: "https://www.figma.com/api/mcp/asset/d9d8c52b-3e49-4072-8b93-eaac78d23223.png", left: -55,  top: 280,  w: 150, h: 134, delay: "2.0s", dur: "3.1s" },
  { src: "https://www.figma.com/api/mcp/asset/d2e28e04-58df-4977-9c3a-5e514ea19803.png", left: -130, top: 460,  w: 272, h: 220, delay: "1.3s", dur: "4.5s" },
  // right column — all right of x=784, safe at any y
  { src: "https://www.figma.com/api/mcp/asset/a238f500-ff86-414d-ba2a-1d8b2e21ce2f.png", left: 815,  top: 330,  w: 200, h: 158, delay: "2.4s", dur: "4.2s" },
  { src: "https://www.figma.com/api/mcp/asset/566d088a-4e88-4292-8431-6d00b74f6cc9.png", left: 932,  top: 165,  w: 174, h: 138, delay: "1.1s", dur: "3.7s" },
  { src: "https://www.figma.com/api/mcp/asset/33a2c555-609d-46db-bf66-daa29877b9c4.png", left: 1002, top: 390,  w: 148, h: 132, delay: "1.7s", dur: "3.4s" },
  // bottom strip — peek in from below
  { src: "https://www.figma.com/api/mcp/asset/2885e836-a85f-4eaa-bdb1-e3501116f4e2.png", left: -45,  top: 645,  w: 132, h: 158, delay: "1.8s", dur: "3.9s" },
  { src: "https://www.figma.com/api/mcp/asset/c842d007-6dc3-460e-a19d-6ab07be07041.png", left: 130,  top: 710,  w: 236, h: 158, delay: "0.9s", dur: "4.3s" },
  { src: "https://www.figma.com/api/mcp/asset/a16005cb-c6db-4fed-91e5-83a197206ef2.png", left: 392,  top: 745,  w: 228, h: 180, delay: "0.4s", dur: "3.3s" },
  { src: "https://www.figma.com/api/mcp/asset/730841b3-320f-43a6-ae07-91a769180f31.png", left: 582,  top: 725,  w: 236, h: 134, delay: "1.5s", dur: "4.0s" },
  { src: "https://www.figma.com/api/mcp/asset/d1a18a53-e563-481f-81ea-e9854e994aee.png", left: 872,  top: 615,  w: 171, h: 181, delay: "0.6s", dur: "3.8s" },
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
      display: block;
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
    @media (max-width: 767px) {
      .hero-hide-mobile { display: none !important; }
      .hero-mobile-bottom { display: block !important; }
      .events-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
      .event-card-image { height: 90px !important; }
      .event-card-title { font-size: 12px !important; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .event-card-body { padding: 8px 9px 9px !important; }
    }
    .landing-title-line {
      transition: text-shadow 0.5s ease;
    }
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
  const heroRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);


  const handleHeroMouseMove = (e: React.MouseEvent) => {
    if (window.innerWidth < 768 || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const canvasLeft = rect.left + (rect.width - 1024) / 2;
    const mx = e.clientX;
    const my = e.clientY;

    PHOTOS.forEach((p, i) => {
      const el = cardRefs.current[i];
      if (!el) return;
      const cardCx = canvasLeft + p.left + p.w / 2;
      // For cards mostly above the fold, use their visible bottom edge as interaction point
      // so repulsion pushes them sideways (visible) rather than further up (invisible)
      const isTopCard = p.top < -20;
      const rawCy = rect.top + p.top + p.h / 2;
      const cardCy = isTopCard ? rect.top + Math.max(0, p.top + p.h) * 0.5 : rawCy;
      const dx = mx - cardCx;
      const dy = my - cardCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = 200;
      const forceMult = isTopCard ? 95 : 65;
      if (dist < radius && dist > 0) {
        const force = (1 - dist / radius) * forceMult;
        // For top cards, suppress vertical component so they move sideways
        const fx = -(dx / dist) * force;
        const fy = isTopCard ? -(dy / dist) * force * 0.2 : -(dy / dist) * force;
        el.style.transform = `translate(${fx}px, ${fy}px)`;
        el.style.transition = "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      } else {
        el.style.transform = "translate(0,0)";
        el.style.transition = "transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      }
    });
  };

  const handleHeroMouseLeave = () => {
    cardRefs.current.forEach(el => {
      if (el) {
        el.style.transform = "translate(0,0)";
        el.style.transition = "transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      }
    });
  };

  const handleHeroClick = (e: React.MouseEvent) => {
    if (window.innerWidth < 768 || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const canvasLeft = rect.left + (rect.width - 1024) / 2;
    const mx = e.clientX;
    const my = e.clientY;

    PHOTOS.forEach((p, i) => {
      const el = cardRefs.current[i];
      if (!el) return;
      const cardCx = canvasLeft + p.left + p.w / 2;
      const isTopCard = p.top < -20;
      const rawCy = rect.top + p.top + p.h / 2;
      const cardCy = isTopCard ? rect.top + Math.max(0, p.top + p.h) * 0.5 : rawCy;
      const dx = mx - cardCx;
      const dy = my - cardCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = 350;
      const forceMult = isTopCard ? 180 : 130;
      if (dist < radius && dist > 0) {
        const force = (1 - dist / radius) * forceMult;
        const fx = -(dx / dist) * force;
        const fy = isTopCard ? -(dy / dist) * force * 0.2 : -(dy / dist) * force;
        el.style.transform = `translate(${fx}px, ${fy}px)`;
        el.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        // spring back after burst
        setTimeout(() => {
          el.style.transform = "translate(0,0)";
          el.style.transition = "transform 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        }, 350);
      }
    });
  };

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
      <section ref={heroRef} style={{ position: "relative", height: "100vh", minHeight: 700, overflow: "hidden" }} onMouseMove={handleHeroMouseMove} onMouseLeave={handleHeroMouseLeave} onClick={handleHeroClick}>
        {/* 1024px canvas centered — all cards sit at exact Figma px coords */}
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 1024, top: 0, bottom: 0, pointerEvents: "none" }}>
          {PHOTOS.map((p, i) => (
            // Outer div: handles repulsion translate via JS
            <div
              key={i}
              ref={el => { cardRefs.current[i] = el; }}
              className={i < 2 ? "hero-hide-mobile" : undefined}
              style={{ position: "absolute", left: p.left, top: p.top, width: p.w, height: p.h }}
            >
              {/* Inner img: handles float animation independently */}
              <img
                src={p.src}
                alt=""
                className="landing-photo-card"
                style={{
                  position: "static",
                  width: "100%",
                  height: "100%",
                  "--float-delay": p.delay,
                  "--float-dur": p.dur,
                } as React.CSSProperties}
              />
            </div>
          ))}
        </div>

        {/* Mobile-only bottom photos */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 130,
          pointerEvents: "none", zIndex: 2,
          display: "none",
        }} className="hero-mobile-bottom">
          {/* Left */}
          <img src={PHOTOS[12].src} alt="" style={{
            position: "absolute", left: -16, bottom: -10, width: 150, height: 115,
            borderRadius: 10, objectFit: "cover",
            boxShadow: "0 0 0 4px rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.2)",
          }} />
          {/* Center */}
          <img src={PHOTOS[13].src} alt="" style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -18, width: 145, height: 110,
            borderRadius: 10, objectFit: "cover",
            boxShadow: "0 0 0 4px rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.2)",
          }} />
          {/* Right */}
          <img src={PHOTOS[14].src} alt="" style={{
            position: "absolute", right: -16, bottom: -5, width: 155, height: 108,
            borderRadius: 10, objectFit: "cover",
            boxShadow: "0 0 0 4px rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.2)",
          }} />
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
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 24 }}>
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "0 24px" }}>
          {/* Blur backdrop */}
          <div style={{ position: "absolute", inset: "-32px -48px", background: "rgba(250,246,240,0.7)", backdropFilter: "blur(12px)", borderRadius: 24, zIndex: -1 }} />

          <div style={{ fontFamily: INTER, fontSize: 52.6, fontWeight: 300, letterSpacing: "-0.53px", lineHeight: 1.1, textAlign: "center", cursor: "default" }}>
            <div style={{ color: "#131313", padding: "2px 0" }}>BEYOND</div>
            <div style={{ color: "#131313", padding: "2px 0", marginBottom: 4 }}>SUNDAY</div>
            <div className="landing-gradient-text" style={{ fontWeight: 600 }}>start here</div>
          </div>

          <p style={{ fontFamily: INTER, fontSize: 17, color: "#aba7a0", maxWidth: 420, lineHeight: 1.6, margin: 0 }}>
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
                padding: "16px 48px", borderRadius: 999,
                fontFamily: INTER, fontSize: 17, fontWeight: 600,
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
            <div className="events-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
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
            <div className="events-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
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
                    <div className="event-card-image" style={{ height: 140, overflow: "hidden", background: "#F0EAE2" }}>
                      {ev.image_url
                        ? <img src={ev.image_url} alt={ev.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", background: "#F0EAE2" }} />}
                    </div>
                    {/* Info — matches Wards card style */}
                    <div className="event-card-body" style={{ padding: "10px 12px 12px" }}>
                      {/* Date/time in teal above title */}
                      <p style={{ fontFamily: INTER, fontSize: 10, fontWeight: 600, color: TEAL, margin: "0 0 3px", letterSpacing: "0.01em" }}>
                        {dateStr}{timePart ? ` · ${timePart}${tzStr ? ` ${tzStr}` : ""}` : ""}
                      </p>
                      {/* Bold title */}
                      <p className="event-card-title" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: DARK, margin: "0 0 3px", lineHeight: 1.25 }}>{ev.title}</p>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            <img
              src="/landing page/step.png"
              alt="Step Challenge"
              style={{ width: "100%", borderRadius: 16, objectFit: "cover" }}
            />
            <img
              src="/landing page/OOTD.png"
              alt="OOTD"
              style={{ width: "100%", borderRadius: 16, objectFit: "cover" }}
            />
          </div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────────── */}
      <section style={{ background: TEAL, padding: "80px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <h2
          className="landing-footer-text"
          style={{ fontFamily: INTER, fontSize: 32, fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.1, maxWidth: 700, margin: 0 }}
        >
          Your next favorite moment is one event away
        </h2>
        <button
          onClick={goToWelcome}
          style={{
            background: "white", border: "none", cursor: "pointer",
            padding: "12px 28px", borderRadius: 999,
            fontFamily: INTER, fontSize: 14, fontWeight: 600, color: TEAL,
          }}
        >
          Discover Events
        </button>

        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {/* Instagram */}
          <a href="https://www.instagram.com/beyondsunday.app/" target="_blank" rel="noopener noreferrer"
            style={{ color: "rgba(255,255,255,0.7)", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          {/* LinkedIn */}
          <a href="https://www.linkedin.com/company/beyond-sunday-app/?viewAsMember=true" target="_blank" rel="noopener noreferrer"
            style={{ color: "rgba(255,255,255,0.7)", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2"/>
              <line x1="8" y1="11" x2="8" y2="16"/>
              <line x1="8" y1="8" x2="8" y2="8.5"/>
              <line x1="12" y1="16" x2="12" y2="11"/>
              <path d="M12 13a3 3 0 0 1 6 0v3"/>
            </svg>
          </a>
        </div>
      </section>

    </div>
  );
};

export default Landing;
