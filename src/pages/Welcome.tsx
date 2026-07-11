import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

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
    @media (max-width: 767px) {
      .welcome-marquee-track {
        animation-duration: 50s;
      }
    }
  `;
  document.head.appendChild(s);
}

const MARQUEE_COLOR = "#C8DFFF";

const MarqueeGroup = () => (
  <div className="flex shrink-0">
    {Array.from({ length: 8 }).map((_, i) => (
      <span
        key={i}
        className="pr-8 text-sm font-bold tracking-[0.2em] whitespace-nowrap"
        style={{ color: MARQUEE_COLOR }}
      >
        WELCOME TO
      </span>
    ))}
  </div>
);

const MarqueeBanner = () => {
  return (
    <div className="w-full overflow-hidden py-2 bg-background">
      <div
        className="flex welcome-marquee-track"
        style={{ width: "max-content" }}
      >
        <MarqueeGroup />
        <MarqueeGroup />
      </div>
    </div>
  );
};

const Welcome = () => {
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
    const { error } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: "magiclink" });
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
    <div className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full pt-6">
        <MarqueeBanner />
      </div>
      <div className="flex flex-1 w-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <img src="/BeyondLogin.png" alt="Beyond Sunday" className="w-64 max-w-full h-auto" />
        </div>
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground" style={{ fontSize: 16 }}>Where LDS singles gather, connect and have fun. Find events, create events, join events. All in one place</p>
        </div>
        <div className="space-y-4 pt-8">
          <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={() => setStep("email")}>
            <Mail className="mr-2 h-5 w-5" />
            Continue with Email
          </Button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button variant="outline" size="lg" className="w-full h-14 text-base border-2 bg-card hover:bg-accent" onClick={handleGoogleLogin}>
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground pt-4">
          By continuing, you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
        </p>
      </div>
      </div>
    </div>
  );

  // EMAIL SCREEN
  if (step === "email") return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="w-full max-w-md mx-auto space-y-8">
        <button onClick={() => { setStep("home"); setError(""); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Enter your email</h1>
          <p className="text-muted-foreground">We'll send you a magic link to sign in instantly — no password needed.</p>
        </div>
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMagicLink()}
            className="h-14 text-base"
            autoComplete="email" 
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={handleSendMagicLink} disabled={!email.trim() || loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <Mail className="mr-2 h-5 w-5" />
                Send Magic Link
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // SENT SCREEN
  if (step === "sent") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-accent">
            <Mail className="h-12 w-12 text-primary" strokeWidth={2} />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">We sent a code to</p>
          <p className="font-semibold text-foreground">{email}</p>
        </div>

        {/* OTP code entry — keeps everything inside the app so the
            PWA session is created here, not in Safari */}
        <div className="space-y-3 text-left">
          <Input
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Sign-in code"
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/[-\s]/g, "")); setOtpError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
            className="h-14 text-center text-2xl tracking-widest font-bold"
          />
          {otpError && <p className="text-sm text-destructive">{otpError}</p>}
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold"
            onClick={handleVerifyOtp}
            disabled={verifying || otp.trim().length < 4}
          >
            {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Can't find it? Check your spam folder 📬
        </p>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-sm font-medium text-primary hover:underline transition-colors disabled:opacity-50"
          >
            {loading ? "Sending…" : "Resend code"}
          </button>
          <button
            onClick={() => { setStep("email"); setError(""); setOtp(""); setOtpError(""); }}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
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