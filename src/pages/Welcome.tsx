import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Step = "home" | "email" | "sent" | "verified";

if (typeof document !== "undefined" && !document.getElementById("welcome-marquee-style")) {
  const s = document.createElement("style");
  s.id = "welcome-marquee-style";
  s.textContent = `
    @keyframes welcome-marquee-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    .welcome-marquee-track {
      animation: welcome-marquee-scroll 30s linear infinite;
    }
    .welcome-input {
      transition: border-color 0.2s ease, box-shadow 0.25s ease;
    }
    .welcome-input::placeholder {
      font-family: 'Inter', sans-serif;
      font-weight: 400;
      letter-spacing: 0;
      font-size: 16px;
      color: #B0A89E;
    }
    .welcome-input:hover {
      border-color: #1F4E5B !important;
      box-shadow: 0px 0px 3.95px rgba(0, 0, 0, 0.25);
    }
    .welcome-input:focus {
      border: 2px solid #1F4E5B !important;
      box-shadow: 0 0 0 4px #EDE5DA !important;
      outline: none;
    }
  `;
  document.head.appendChild(s);
}

const MARQUEE_COLOR = "#D9D4CC";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";

const MarqueeGroup = () => (
  <div className="flex shrink-0">
    {Array.from({ length: 8 }).map((_, i) => (
      <span
        key={i}
        style={{
          color: MARQUEE_COLOR,
          fontFamily: CORMORANT,
          fontSize: 24,
          fontWeight: 700,
          whiteSpace: "nowrap",
          paddingRight: 32,
          letterSpacing: "0.05em",
        }}
      >
        WELCOME TO
      </span>
    ))}
  </div>
);

const MarqueeBanner = () => (
  <div style={{ width: "100%", overflow: "hidden", paddingTop: 8, paddingBottom: 8 }}>
    <div className="flex welcome-marquee-track" style={{ width: "max-content" }}>
      <MarqueeGroup />
      <MarqueeGroup />
    </div>
  </div>
);

const Welcome = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("home");
  const [email, setEmail] = useState(localStorage.getItem("last_used_email") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) console.error("Google login error:", error.message);
  };

  const handleSendMagicLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
    } else {
      localStorage.setItem("last_used_email", email);
      setStep("sent");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length < 4) { setOtpError("Enter the code from your email."); return; }
    setVerifying(true);
    setOtpError("");
    const { error } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: "email" });
    setVerifying(false);
    if (error) {
      setOtpError("Code didn't work — it may have expired or been used. Try resending.");
    }
    // On success the AuthContext session listener fires automatically and
    // App.tsx handles the redirect — no manual navigate needed here.
  };

  const handleResend = async () => {
    setLoading(true);
    setOtpError("");
    setOtp("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      setOtpError(error.message);
    }
  };

  // HOME SCREEN
  if (step === "home") return (
    <div style={{ minHeight: "100svh", background: "#FAF6F0", display: "flex", flexDirection: "column" }}>
      {/* Marquee banner */}
      <div style={{ paddingTop: 12 }}>
        <MarqueeBanner />
      </div>

      {/* All content centered as one group — logo + tagline + buttons */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px 40px" }}>
        {/* Logo */}
        <img
          src="/icon-large.png"
          alt="Beyond Sunday"
          style={{ width: 135, height: "auto", marginBottom: 56 }}
        />

      {/* Tagline + buttons */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%", maxWidth: 307 }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 400,
          color: "#635C59",
          textAlign: "center",
          lineHeight: 1.5,
          marginBottom: 24,
          maxWidth: 312,
        }}>
          Find and create local activities with your community with Beyond Sunday app.
        </p>

        {/* Continue with Google */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            maxWidth: 307,
            padding: "16px",
            borderRadius: 999,
            background: "#1F4E5B",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: "#FAF6F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#FAF6F0" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#FAF6F0" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FAF6F0" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#FAF6F0" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        {/* OR divider */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          color: "#635C59",
          margin: "6px 0",
          textAlign: "center",
          width: "100%",
          maxWidth: 312,
        }}>
          OR
        </p>

        {/* Continue with Email */}
        <button
          onClick={() => setStep("email")}
          style={{
            width: "100%",
            maxWidth: 307,
            padding: "14px 16px",
            borderRadius: 999,
            background: "transparent",
            border: "1.5px solid #1F4E5B",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: "#1F4E5B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Continue with Email
        </button>

        {/* Skip */}
        <button
          onClick={() => navigate("/wards")}
          style={{
            marginTop: 20,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: "#635C59",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Skip for now
        </button>
      </div>
      </div>
    </div>
  );

  // EMAIL SCREEN
  if (step === "email") return (
    <div style={{ minHeight: "100svh", background: "#FAF6F0", display: "flex", flexDirection: "column", padding: "48px 24px" }}>
      <div style={{ width: "100%", maxWidth: 400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Back */}
        <button
          onClick={() => { setStep("home"); setError(""); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#635C59", width: "fit-content" }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back
        </button>

        {/* Heading */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 40, fontWeight: 700, color: "#2C2523", lineHeight: 1.1, margin: 0 }}>
            Enter your email
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#635C59", lineHeight: 1.55, margin: 0 }}>
            We'll send you a magic link to sign in instantly — no password needed.
          </p>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMagicLink()}
            autoComplete="email"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              height: 54, padding: "0 18px",
              borderRadius: 14, border: "1.5px solid #E4DCCF",
              background: "white", outline: "none",
              fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#2C2523",
            }}
            className="welcome-input"
          />
          {error && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#C0392B", margin: 0 }}>{error}</p>}
          <button
            onClick={handleSendMagicLink}
            disabled={!email.trim() || loading}
            style={{
              width: "100%", height: 54, borderRadius: 999,
              background: !email.trim() || loading ? "#C8BFB8" : "#1F4E5B",
              border: "none", cursor: !email.trim() || loading ? "not-allowed" : "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
              color: "#FAF6F0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 0.2s",
            }}
          >
            {loading
              ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
              : <><Mail style={{ width: 18, height: 18 }} /> Send Magic Link</>
            }
          </button>
        </div>
      </div>
    </div>
  );

  // SENT SCREEN
  if (step === "sent") return (
    <div style={{ minHeight: "100svh", background: "#FAF6F0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>

        {/* Icon */}
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "#E8F0EE", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mail style={{ width: 36, height: 36, color: "#1F4E5B" }} strokeWidth={1.8} />
        </div>

        {/* Heading */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 40, fontWeight: 700, color: "#2C2523", lineHeight: 1.1, margin: 0 }}>
            Check your email
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#635C59", margin: 0 }}>
            We sent a sign-in code to
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "#2C2523", margin: 0 }}>
            {email}
          </p>
        </div>

        {/* OTP entry */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Sign-in code"
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/[-\s]/g, "")); setOtpError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
            style={{
              width: "100%", boxSizing: "border-box",
              height: 54, padding: "0 18px",
              borderRadius: 14, border: "1.5px solid #E4DCCF",
              background: "white", outline: "none",
              fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700,
              color: "#2C2523", textAlign: "center", letterSpacing: "0.2em",
            }}
            className="welcome-input"
          />
          {otpError && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#C0392B", margin: 0 }}>{otpError}</p>}
          <button
            onClick={handleVerifyOtp}
            disabled={verifying || otp.trim().length < 4}
            style={{
              width: "100%", height: 54, borderRadius: 999,
              background: verifying || otp.trim().length < 4 ? "#C8BFB8" : "#1F4E5B",
              border: "none", cursor: verifying || otp.trim().length < 4 ? "not-allowed" : "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
              color: "#FAF6F0", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
            }}
          >
            {verifying ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} /> : "Continue"}
          </button>
        </div>

        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#635C59", margin: 0 }}>
          Can't find it? Check your spam folder 📬
        </p>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleResend}
            disabled={loading}
            style={{ background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#1F4E5B", textDecoration: "underline", opacity: loading ? 0.5 : 1 }}
          >
            {loading ? "Sending…" : "Resend code"}
          </button>
          <button
            onClick={() => { setStep("email"); setError(""); setOtp(""); setOtpError(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#635C59", textDecoration: "underline" }}
          >
            Use a different email
          </button>
        </div>
      </div>
    </div>
  );

  return null;
};

export default Welcome;