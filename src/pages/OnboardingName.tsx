import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";

// ── Inject styles ──────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("ob-style")) {
  const s = document.createElement("style");
  s.id = "ob-style";
  s.textContent = `
    @keyframes ob-flip-out {
      from { transform: perspective(800px) rotateY(0deg); opacity: 1; }
      to   { transform: perspective(800px) rotateY(90deg); opacity: 0; }
    }
    @keyframes ob-flip-in {
      from { transform: perspective(800px) rotateY(-90deg); opacity: 0; }
      to   { transform: perspective(800px) rotateY(0deg);  opacity: 1; }
    }
    .ob-flip-out { animation: ob-flip-out 0.28s ease-in  forwards; }
    .ob-flip-in  { animation: ob-flip-in  0.28s ease-out forwards; }

    .ob-input {
      transition: border-color 0.2s ease, box-shadow 0.25s ease;
    }
    .ob-input:hover {
      border-color: #1F4E5B !important;
      box-shadow: 0px 0px 3.95px rgba(0,0,0,0.25);
    }
    .ob-input:focus {
      border: 2px solid #1F4E5B !important;
      box-shadow: 0 0 0 4px #EDE5DA !important;
      outline: none;
    }

    /* Slider overrides */
    .ob-slider [role="slider"] {
      width: 24px !important; height: 24px !important;
      background: white !important;
      border: 2px solid #2c2523 !important;
      box-shadow: 0 1px 6px rgba(0,0,0,0.18) !important;
    }
    .ob-slider [data-orientation="horizontal"] {
      height: 4px !important;
      background: #d1d6e0 !important;
    }
    .ob-slider [data-orientation="horizontal"] > span:first-child {
      background: #2c2523 !important;
    }
  `;
  document.head.appendChild(s);
}

// ── Design tokens ──────────────────────────────────────────────────────────
const BG    = "#FAF6F0";
const DARK  = "#2C2523";
const MID   = "#635C59";
const TEAL  = "#1F4E5B";
const DIV   = "#E4DCCF";
const INTER = "'Inter', sans-serif";
const CORM  = "'Cormorant Garamond', Georgia, serif";

const IMG1 = "/onboarding/image1.png"; // woman in field
const IMG2 = "/onboarding/image2.png"; // group jumping
const IMG3 = "/onboarding/image3.png"; // couple — add as public/onboarding/image3.png

const MIN_AGE = 18;
const MAX_AGE = 65;
const MAX_SPAN = 15;

type Step = "name" | "age" | "hangout";

// ── Photo collages ──────────────────────────────────────────────────────────
const NamePhotos = () => (
  <div style={{ position: "relative", height: 188, width: "100%" }}>
    {/* Left: tall portrait (Image 1) */}
    <div style={{
      position: "absolute", left: 0, top: 0,
      width: 122, height: 175,
      borderRadius: 8, overflow: "hidden",
      background: "#e0d9d0",
      boxShadow: "0 3px 16px rgba(0,0,0,0.10)",
    }}>
      <img src={IMG1} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    {/* Center: tilted (Image 2) */}
    <div style={{
      position: "absolute", left: "50%", top: 8,
      transform: "translateX(-50%) rotate(5.22deg)",
      width: 170, height: 156,
      borderRadius: 8, overflow: "hidden",
      background: "white",
      border: "1px solid white",
      boxShadow: "0 3px 16px rgba(0,0,0,0.12)",
    }}>
      <img src={IMG2} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    {/* Right: small (Image 3) */}
    <div style={{
      position: "absolute", right: 0, top: 48,
      width: 148, height: 105,
      borderRadius: 8, overflow: "hidden",
      background: "#e0d9d0",
      border: "1px solid white",
      boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
    }}>
      <img src={IMG3} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  </div>
);

const AgePhotos = () => (
  <div style={{ position: "relative", height: 192, width: "100%" }}>
    {/* Left big: Image 2 tilted */}
    <div style={{
      position: "absolute", left: 0, top: 8,
      transform: "rotate(5.22deg)",
      width: 188, height: 172,
      borderRadius: 8, overflow: "hidden",
      background: "white",
      border: "1px solid white",
      boxShadow: "0 3px 16px rgba(0,0,0,0.12)",
    }}>
      <img src={IMG2} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    {/* Right: Image 3 */}
    <div style={{
      position: "absolute", right: 0, top: 44,
      width: 168, height: 128,
      borderRadius: 10, overflow: "hidden",
      background: "#e0d9d0",
      border: "1px solid white",
      boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
    }}>
      <img src={IMG3} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  </div>
);

const HangoutPhotos = () => (
  <div style={{ position: "relative", height: 100, width: 184, margin: "0 auto" }}>
    {/* Left small tilted: Image 2 */}
    <div style={{
      position: "absolute", left: 0, top: 12,
      transform: "rotate(5.22deg)",
      width: 95, height: 87,
      borderRadius: 6, overflow: "hidden",
      background: "white",
      border: "1px solid white",
      boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
    }}>
      <img src={IMG2} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    {/* Right tiny: Image 3 */}
    <div style={{
      position: "absolute", right: 0, top: 22,
      width: 88, height: 66,
      borderRadius: 6, overflow: "hidden",
      background: "#e0d9d0",
      border: "1px solid white",
      boxShadow: "0 1px 8px rgba(0,0,0,0.10)",
    }}>
      <img src={IMG3} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  </div>
);

// ── Main component ──────────────────────────────────────────────────────────
const OnboardingName = () => {
  const navigate = useNavigate();

  const [step, setStep]             = useState<Step>("name");
  const [flipPhase, setFlipPhase]   = useState<"idle" | "out" | "in">("idle");

  // name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");

  // age
  const [age, setAge] = useState("");

  // hangout
  const [ageRange, setAgeRange] = useState<[number, number]>([25, 35]);
  const [loading, setLoading]   = useState(false);

  const isAgeValid = (() => { const n = parseInt(age); return !isNaN(n) && n >= 13 && n <= 120; })();

  const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

  const goToStep = (next: Step) => {
    setFlipPhase("out");
    setTimeout(() => {
      setStep(next);
      setFlipPhase("in");
      setTimeout(() => setFlipPhase("idle"), 300);
    }, 280);
  };

  // Auto-set ageRange when entering hangout step
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

  const flipClass = flipPhase === "out" ? "ob-flip-out" : flipPhase === "in" ? "ob-flip-in" : "";

  // ── Shared layout ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100svh", background: BG, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "24px 32px 16px", boxSizing: "border-box" }}>

      {/* ── Photo collage (animates on step change) ── */}
      <div className={flipClass} style={{ transformOrigin: "center center" }}>
        {step === "name"    && <NamePhotos />}
        {step === "age"     && <AgePhotos />}
        {step === "hangout" && <HangoutPhotos />}
      </div>

      {/* ── Content ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1, paddingTop: 32 }}>

        {/* Step label + heading */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "center" }}>
          <p style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: MID, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {step === "name" ? "Step 1 of 2" : "Step 2 of 2"}
          </p>
          <h1 style={{ fontFamily: CORM, fontSize: 32, fontWeight: 700, color: DARK, lineHeight: 1.05, margin: 0 }}>
            {step === "name"    ? "What should we call you?"  :
             step === "age"     ? "What is your age?"         :
                                  "About you"}
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 14, color: MID, lineHeight: 1.55, margin: 0 }}>
            {step === "name" ? "This is how others will see you" :
             step === "age"  ? "This helps us personalize your experience" : ""}
          </p>
        </div>

        {/* ── NAME fields ── */}
        {step === "name" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(capitalize(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && firstName.trim() && goToStep("age")}
              autoFocus
              className="ob-input"
              style={{
                width: "100%", boxSizing: "border-box", height: 50,
                padding: "0 20px", borderRadius: 14,
                border: `1.5px solid ${DIV}`, background: "white",
                fontFamily: INTER, fontSize: 15, color: DARK, textAlign: "center",
              }}
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(capitalize(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && firstName.trim() && goToStep("age")}
              className="ob-input"
              style={{
                width: "100%", boxSizing: "border-box", height: 50,
                padding: "0 20px", borderRadius: 14,
                border: `1.5px solid ${DIV}`, background: "white",
                fontFamily: INTER, fontSize: 15, color: DARK, textAlign: "center",
              }}
            />
          </div>
        )}

        {/* ── AGE field ── */}
        {step === "age" && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Enter your age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isAgeValid && goToStep("hangout")}
              autoFocus
              min={13}
              max={120}
              className="ob-input"
              style={{
                width: "100%", boxSizing: "border-box", height: 50,
                padding: "0 20px", borderRadius: 14,
                border: `1.5px solid ${DIV}`, background: "white",
                fontFamily: INTER, fontSize: 15, color: DARK, textAlign: "center",
              }}
            />
          </div>
        )}

        {/* ── HANGOUT preferences ── */}
        {step === "hangout" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Big age display */}
            <p style={{ fontFamily: INTER, fontSize: 48, fontWeight: 700, color: DARK, textAlign: "center", margin: 0 }}>
              {age}
            </p>

            {/* Range question */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: INTER, fontSize: 15, fontWeight: 700, color: DARK, margin: "0 0 4px" }}>
                Who do you want to do activities with?
              </p>
              <p style={{ fontFamily: INTER, fontSize: 13, color: MID, margin: 0 }}>
                Select an age range (max 15 year span)
              </p>
            </div>

            {/* FROM / TO chips */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{
                background: DIV, borderRadius: 16, padding: "12px 24px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: 0.85,
              }}>
                <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: MID, textTransform: "uppercase", letterSpacing: "0.06em" }}>FROM</span>
                <span style={{ fontFamily: INTER, fontSize: 22, fontWeight: 700, color: DARK }}>{ageRange[0]}</span>
              </div>
              <div style={{ width: 16, height: 1.5, background: DIV, borderRadius: 2 }} />
              <div style={{
                background: DIV, borderRadius: 16, padding: "12px 24px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: 0.85,
              }}>
                <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: MID, textTransform: "uppercase", letterSpacing: "0.06em" }}>TO</span>
                <span style={{ fontFamily: INTER, fontSize: 22, fontWeight: 700, color: DARK }}>{ageRange[1]}</span>
              </div>
            </div>

            {/* Slider */}
            <div style={{ paddingTop: 8 }}>
              <div className="ob-slider">
                <Slider
                  min={MIN_AGE}
                  max={MAX_AGE}
                  step={1}
                  value={ageRange}
                  onValueChange={handleSliderChange}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: INTER, fontSize: 11, color: MID, marginTop: 6 }}>
                <span>{MIN_AGE}</span>
                <span>{MAX_AGE}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom buttons ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 24 }}>

        {/* Primary button */}
        <button
          onClick={() => {
            if (step === "name") {
              const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
              localStorage.setItem("onboarding_name", fullName);
              goToStep("age");
            } else if (step === "age") {
              if (!isAgeValid) return;
              localStorage.setItem("onboarding_age", age);
              goToStep("hangout");
            } else {
              handleFinish();
            }
          }}
          disabled={
            (step === "name" && !firstName.trim()) ||
            (step === "age"  && !isAgeValid) ||
            (step === "hangout" && loading)
          }
          style={{
            width: "100%", height: 54, borderRadius: 999,
            background: (
              (step === "name" && !firstName.trim()) ||
              (step === "age"  && !isAgeValid) ||
              (step === "hangout" && loading)
            ) ? "#C8BFB8" : TEAL,
            border: "none",
            cursor: (
              (step === "name" && !firstName.trim()) ||
              (step === "age"  && !isAgeValid) ||
              (step === "hangout" && loading)
            ) ? "not-allowed" : "pointer",
            fontFamily: INTER, fontSize: 16, fontWeight: 600,
            color: "#FAF6F0",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 0.2s",
          }}
        >
          {loading
            ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
            : step === "name"    ? "Continue"
            : step === "age"     ? "Next"
            : "Get Started"
          }
        </button>

        {/* Skip */}
        <button
          onClick={async () => {
            if (step === "name") {
              goToStep("age");
            } else if (step === "age") {
              goToStep("hangout");
            } else {
              await handleFinish();
            }
          }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: INTER, fontSize: 15, fontWeight: 500,
            color: TEAL, textDecoration: "underline",
            padding: "12px 0",
          }}
        >
          Skip
        </button>

        {/* Sign out (name step only) */}
        {step === "name" && (
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: INTER, fontSize: 12, color: MID,
              textDecoration: "underline", padding: "4px 0",
            }}
          >
            Sign out and use a different account
          </button>
        )}

        {/* Home indicator */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <div style={{ width: 134, height: 5, background: DARK, opacity: 0.3, borderRadius: 100 }} />
        </div>
      </div>

      </div>
    </div>
  );
};

export default OnboardingName;
