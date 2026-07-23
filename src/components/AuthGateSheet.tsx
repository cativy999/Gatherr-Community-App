import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "home" | "email" | "sent";

interface AuthGateSheetProps {
  onClose: () => void;
}

const AuthGateSheet = ({ onClose }: AuthGateSheetProps) => {
  const [step, setStep] = useState<Step>("home");
  const [email, setEmail] = useState(localStorage.getItem("last_used_email") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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

  const handleSendOtp = async () => {
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
      setOtpError("Code didn't work — it may have expired. Try resending.");
    }
    // On success the AuthContext session listener fires and the app re-renders automatically
  };

  const handleResend = async () => {
    setLoading(true);
    setOtp(""); setOtpError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) setOtpError(error.message);
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl px-6 pt-5 pb-10 max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* HOME step */}
        {step === "home" && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                Sign in to continue
              </p>
              <p className="text-sm text-muted-foreground">Join the Beyond Sunday community</p>
            </div>

            <div className="space-y-3 pt-2">
              <Button size="lg" className="w-full h-13 text-base font-semibold" onClick={() => setStep("email")}>
                <Mail className="mr-2 h-5 w-5" />
                Continue with Email
              </Button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button variant="outline" size="lg" className="w-full h-13 text-base border-2 bg-card hover:bg-accent" onClick={handleGoogleLogin}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="#" className="underline">Terms</a> and{" "}
              <a href="#" className="underline">Privacy Policy</a>.
            </p>
          </div>
        )}

        {/* EMAIL step */}
        {step === "email" && (
          <div className="space-y-5">
            <button onClick={() => { setStep("home"); setError(""); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="space-y-1">
              <p className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Enter your email</p>
              <p className="text-sm text-muted-foreground">We'll send you a sign-in code — no password needed.</p>
            </div>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                className="h-13 text-base"
                autoComplete="email"
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button size="lg" className="w-full h-13 text-base font-semibold" onClick={handleSendOtp} disabled={!email.trim() || loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Mail className="mr-2 h-5 w-5" />Send Code</>}
              </Button>
            </div>
          </div>
        )}

        {/* SENT / OTP step */}
        {step === "sent" && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Check your email</p>
              <p className="text-sm text-muted-foreground">We sent a code to <span className="font-medium text-foreground">{email}</span></p>
            </div>
            <div className="space-y-3">
              <Input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Sign-in code"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/[-\s]/g, "")); setOtpError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                className="h-13 text-center text-2xl tracking-widest font-bold"
                autoFocus
              />
              {otpError && <p className="text-sm text-destructive">{otpError}</p>}
              <Button size="lg" className="w-full h-13 text-base font-semibold" onClick={handleVerifyOtp} disabled={verifying || otp.trim().length < 4}>
                {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
              </Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button onClick={handleResend} disabled={loading} className="text-sm font-medium text-primary hover:underline disabled:opacity-50">
                {loading ? "Sending…" : "Resend code"}
              </button>
              <button onClick={() => { setStep("email"); setOtp(""); setOtpError(""); }} className="text-sm text-muted-foreground hover:text-foreground underline">
                Use a different email
              </button>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

export default AuthGateSheet;
