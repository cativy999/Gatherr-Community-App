import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";

// ── Design tokens ──────────────────────────────────────────────────────────
const BG    = "#FAF6F0";
const DARK  = "#2C2523";
const MID   = "#635C59";
const TEAL  = "#1F4E5B";
const DIV   = "#E4DCCF";
const INTER = "'Inter', sans-serif";
const CORM  = "'Cormorant Garamond', Georgia, serif";

const IMG1 = "/onboarding image/First one.png";   // woman in flower field
const IMG2 = "/onboarding image/second one.png";  // jumping people

const MIN_AGE = 18;
const MAX_AGE = 65;
const MAX_SPAN = 15;

type Step = "name" | "age" | "hangout";

// ── Mobile photo collages ──────────────────────────────────────────────────
// Step 1: IMG1 front-left, IMG2 tilted behind-right
const MobilePhotosName = () => (
  <div style={{ position: "relative", width: "100%", height: 220, marginBottom: 8 }}>
    <div style={{
      position: "absolute", left: 0, top: 20,
      width: 172, height: 170,
      borderRadius: 14, overflow: "hidden",
      transform: "rotate(2deg)",
      boxShadow: "0 4px 18px rgba(0,0,0,0.14)",
      zIndex: 2,
    }}>
      <img src={IMG1} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{
      position: "absolute", right: 0, top: 0,
      width: 162, height: 192,
      borderRadius: 14, overflow: "hidden",
      transform: "rotate(-6deg)",
      boxShadow: "0 4px 18px rgba(0,0,0,0.12)",
      zIndex: 1,
    }}>
      <img src={IMG2} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  </div>
);

// Step 2 & 3: IMG2 front-left, IMG1 peeking behind-right
const MobilePhotosAge = () => (
  <div style={{ position: "relative", width: "100%", height: 220, marginBottom: 8 }}>
    <div style={{
      position: "absolute", left: 0, top: 10,
      width: 175, height: 178,
      borderRadius: 14, overflow: "hidden",
      transform: "rotate(-4deg)",
      boxShadow: "0 4px 18px rgba(0,0,0,0.14)",
      zIndex: 2,
    }}>
      <img src={IMG2} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{
      position: "absolute", right: 0, top: 0,
      width: 155, height: 188,
      borderRadius: 14, overflow: "hidden",
      transform: "rotate(5deg)",
      boxShadow: "0 4px 18px rgba(0,0,0,0.12)",
      zIndex: 1,
    }}>
      <img src={IMG1} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  </div>
);

// ── Main component ──────────────────────────────────────────────────────────
const OnboardingName = () => {
  const navigate = useNavigate();

  const [step, setStep]       = useState<Step>("name");
  const [animKey, setAnimKey] = useState(0);

  // name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");

  // age
  const [age, setAge] = useState("");

  // hangout
  const [ageRange, setAgeRange] = useState<[number, number]>([25, 35]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    let el = document.getElementById("ob-style");
    if (el) el.remove();
    const s = document.createElement("style");
    s.id = "ob-style";
    s.textContent = `
      @keyframes ob-fade-up {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .ob-step-enter { animation: ob-fade-up 0.35s ease both; }

      .ob-input { transition: border-color 0.2s ease, box-shadow 0.25s ease; }
      .ob-input::placeholder { font-family: 'Inter', sans-serif; font-weight: 400; color: #B0A89E; font-size: 15px; }
      .ob-input:hover { border-color: #1F4E5B !important; box-shadow: 0px 0px 3.95px rgba(0,0,0,0.25); }
      .ob-input:focus { border: 2px solid #1F4E5B !important; box-shadow: 0 0 0 4px #EDE5DA !important; outline: none; }

      @keyframes ob-photo-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes ob-ken-burns {
        0%   { transform: scale(1)    translate(0%,    0%);   filter: saturate(1)   hue-rotate(0deg)   brightness(1);   }
        33%  { transform: scale(1.12) translate(-2.5%, 1.5%); filter: saturate(1.3) hue-rotate(18deg)  brightness(1.05); }
        66%  { transform: scale(1.08) translate(2%,   -1.5%); filter: saturate(0.9) hue-rotate(-12deg) brightness(0.95); }
        100% { transform: scale(1)    translate(0%,    0%);   filter: saturate(1)   hue-rotate(0deg)   brightness(1);   }
      }
      .ob-photo-enter { animation: ob-photo-fade 0.5s ease both; }
      .ob-photo-live  { animation: ob-ken-burns 12s ease-in-out infinite; transform-origin: center center; }

      /* Slider — force visible thumbs */
      .ob-slider { position: relative; }
      .ob-slider [data-orientation="horizontal"].relative {
        height: 4px !important; background: #D9D2C8 !important;
        border-radius: 99px !important; overflow: visible !important;
      }
      .ob-slider [data-orientation="horizontal"] .absolute { background: #2C2523 !important; }
      .ob-slider [role="slider"] {
        display: block !important; width: 26px !important; height: 26px !important;
        border-radius: 50% !important; background: white !important;
        border: 2.5px solid #2C2523 !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.22) !important;
        cursor: grab !important; flex-shrink: 0 !important;
      }
      .ob-slider [role="slider"]:active { cursor: grabbing !important; }

      /* Responsive layout */
      .ob-layout { display: flex; min-height: 100vh; background: ${BG}; }
      .ob-form-panel {
        flex: 0 0 48%; display: flex; align-items: center;
        justify-content: center; padding: 48px 72px; box-sizing: border-box;
      }
      .ob-mobile-photos { display: none; }
      .ob-desktop-photo { flex: 0 0 52%; position: sticky; top: 0; height: 100vh; overflow: hidden; }

      @media (max-width: 767px) {
        .ob-layout { flex-direction: column; }
        .ob-form-panel {
          flex: unset !important; width: 100% !important;
          padding: 24px 24px 40px !important;
          align-items: stretch !important; justify-content: flex-start !important;
        }
        .ob-desktop-photo { display: none !important; }
        .ob-mobile-photos { display: block !important; }
      }
    `;
    document.head.appendChild(s);
    return () => { document.getElementById("ob-style")?.remove(); };
  }, []);

  const isAgeValid = (() => { const n = parseInt(age); return !isNaN(n) && n >= 13 && n <= 120; })();
  const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

  const goToStep = (next: Step) => {
    setStep(next);
    setAnimKey(k => k + 1);
  };

  useEffect(() => {
    if (step !== "hangout") return;
    const n = parseInt(age);
    if (!isNaN(n)) {
      const low  = Math.max(MIN_AGE, n - 7);
      const high = Math.min(MAX_AGE, low + MAX_SPAN);
      setAgeRange([low, high]);
    }
  }, [step]);

  const handleSliderChange = useCallback((val: number[]) => {
    let [low, high] = val as [number, number];
    if (high - low > MAX_SPAN) {
      if (low !== ageRange[0]) high = Math.min(low + MAX_SPAN, MAX_AGE);
      else low = Math.max(high - MAX_SPAN, MIN_AGE);
    }
    setAgeRange([low, high]);
  }, [ageRange]);

  const handleFinish = async () => {
    localStorage.setItem("onboarding_age_min", String(ageRange[0]));
    localStorage.setItem("onboarding_age_max", String(ageRange[1]));
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const savedAge = localStorage.getItem("onboarding_age");
      const name = localStorage.getItem("onboarding_name");
      await supabase.from("profiles").upsert({
        user_id: user.id,
        name: name || user.user_metadata?.full_name || null,
        age: savedAge ? parseInt(savedAge) : null,
        preferred_age_min: ageRange[0],
        preferred_age_max: ageRange[1],
        avatar_url: user.user_metadata?.avatar_url || null,
      }, { onConflict: "user_id" });
      localStorage.removeItem("onboarding_name");
      localStorage.removeItem("onboarding_age");
      localStorage.removeItem("onboarding_age_min");
      localStorage.removeItem("onboarding_age_max");
    }
    setLoading(false);
    const pending = localStorage.getItem("postAuthRedirect");
    if (pending) { localStorage.removeItem("postAuthRedirect"); navigate(pending); }
    else navigate("/wards");
  };

  const isDisabled =
    (step === "name"    && !firstName.trim()) ||
    (step === "age"     && !isAgeValid) ||
    (step === "hangout" && loading);

  return (
    <div className="ob-layout">

      {/* ── Form panel (desktop left, mobile full) ── */}
      <div className="ob-form-panel">
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 32 }}>

          {/* Mobile photo collage */}
          <div className="ob-mobile-photos" key={`photos-${step}`}>
            {step === "name" ? <MobilePhotosName /> : <MobilePhotosAge />}
          </div>

          {/* Animated form content */}
          <div key={animKey} className="ob-step-enter" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Step label + heading */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: MID, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Step {step === "name" ? "1" : "2"} of 2
              </p>
              <h1 style={{ fontFamily: CORM, fontSize: 36, fontWeight: 700, color: DARK, lineHeight: 1.05, margin: 0 }}>
                {step === "name"    ? "What should we call you?"
                : step === "age"   ? "What is your age?"
                :                    "About you"}
              </h1>
              {(step === "name" || step === "age") && (
                <p style={{ fontFamily: INTER, fontSize: 15, color: MID, margin: 0, lineHeight: 1.55 }}>
                  {step === "name"
                    ? "This is how others will see you"
                    : "This helps us personalize your experience"}
                </p>
              )}
            </div>

            {/* NAME fields */}
            {step === "name" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="text" placeholder="First name" value={firstName}
                  onChange={(e) => setFirstName(capitalize(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && firstName.trim() && goToStep("age")}
                  autoFocus className="ob-input"
                  style={{ width: "100%", boxSizing: "border-box", height: 52, padding: "0 20px", borderRadius: 14, border: `1.5px solid ${DIV}`, background: "white", fontFamily: INTER, fontSize: 15, color: DARK, textAlign: "center" }}
                />
                <input
                  type="text" placeholder="Last name" value={lastName}
                  onChange={(e) => setLastName(capitalize(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && firstName.trim() && goToStep("age")}
                  className="ob-input"
                  style={{ width: "100%", boxSizing: "border-box", height: 52, padding: "0 20px", borderRadius: 14, border: `1.5px solid ${DIV}`, background: "white", fontFamily: INTER, fontSize: 15, color: DARK, textAlign: "center" }}
                />
              </div>
            )}

            {/* AGE field */}
            {step === "age" && (
              <input
                type="number" inputMode="numeric" placeholder="Enter your age" value={age}
                onChange={(e) => setAge(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && isAgeValid && goToStep("hangout")}
                autoFocus min={13} max={120} className="ob-input"
                style={{ width: "100%", boxSizing: "border-box", height: 52, padding: "0 20px", borderRadius: 14, border: `1.5px solid ${DIV}`, background: "white", fontFamily: INTER, fontSize: 15, color: DARK, textAlign: "center" }}
              />
            )}

            {/* HANGOUT preferences */}
            {step === "hangout" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <p style={{ fontFamily: INTER, fontSize: 56, fontWeight: 700, color: DARK, textAlign: "center", margin: 0, lineHeight: 1 }}>
                  {age}
                </p>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: INTER, fontSize: 15, fontWeight: 700, color: DARK, margin: "0 0 4px" }}>
                    Who do you want to do activities with?
                  </p>
                  <p style={{ fontFamily: INTER, fontSize: 13, color: MID, margin: 0 }}>
                    Select an age range (max 15 year span)
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                  <div style={{ background: DIV, borderRadius: 14, padding: "10px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: MID, textTransform: "uppercase", letterSpacing: "0.06em" }}>FROM</span>
                    <span style={{ fontFamily: INTER, fontSize: 24, fontWeight: 700, color: DARK }}>{ageRange[0]}</span>
                  </div>
                  <div style={{ width: 14, height: 1.5, background: DIV, borderRadius: 2 }} />
                  <div style={{ background: DIV, borderRadius: 14, padding: "10px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: MID, textTransform: "uppercase", letterSpacing: "0.06em" }}>TO</span>
                    <span style={{ fontFamily: INTER, fontSize: 24, fontWeight: 700, color: DARK }}>{ageRange[1]}</span>
                  </div>
                </div>
                <div>
                  <div className="ob-slider">
                    <Slider min={MIN_AGE} max={MAX_AGE} step={1} value={ageRange} onValueChange={handleSliderChange} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: INTER, fontSize: 11, color: MID, marginTop: 8 }}>
                    <span>{MIN_AGE}</span>
                    <span>{MAX_AGE}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              onClick={() => {
                if (step === "name") {
                  localStorage.setItem("onboarding_name", `${firstName.trim()} ${lastName.trim()}`.trim());
                  goToStep("age");
                } else if (step === "age") {
                  if (!isAgeValid) return;
                  localStorage.setItem("onboarding_age", age);
                  goToStep("hangout");
                } else {
                  handleFinish();
                }
              }}
              disabled={isDisabled}
              style={{
                width: "100%", height: 54, borderRadius: 999,
                background: isDisabled ? "#C8BFB8" : TEAL,
                border: "none", cursor: isDisabled ? "not-allowed" : "pointer",
                fontFamily: INTER, fontSize: 16, fontWeight: 600, color: "#FAF6F0",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.2s",
              }}
            >
              {loading
                ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                : step === "hangout" ? "Get Started" : "Continue"}
            </button>

            <button
              onClick={async () => {
                if (step === "name")     goToStep("age");
                else if (step === "age") goToStep("hangout");
                else                     await handleFinish();
              }}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: INTER, fontSize: 15, fontWeight: 500, color: TEAL, textDecoration: "underline", padding: "12px 0" }}
            >
              Skip
            </button>

            {step === "name" && (
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: INTER, fontSize: 12, color: MID, textDecoration: "underline", padding: "4px 0" }}
              >
                Sign out and use a different account
              </button>
            )}

            <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
              <div style={{ width: 134, height: 5, background: DARK, opacity: 0.18, borderRadius: 100 }} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Desktop right photo ── */}
      <div className="ob-desktop-photo">
        <img
          key={step === "name" ? "photo1" : "photo2"}
          src={step === "name" ? IMG1 : IMG2}
          alt=""
          className="ob-photo-enter ob-photo-live"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

    </div>
  );
};

export default OnboardingName;
