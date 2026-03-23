import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setEmail(session?.user?.email ?? "");
      } else if (!session) {
        setError("Link expired. Please request a new password reset.");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  if (done) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Password updated!</h1>
        <p className="text-muted-foreground">Taking you to login...</p>
      </div>
    </div>
  );

  if (!ready) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      {error ? (
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="link" onClick={() => navigate("/login")}>
            Back to Login
          </Button>
        </div>
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="w-full max-w-md mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Set new password</h1>
          <p className="text-muted-foreground">Enter your new password below.</p>
        </div>

        <div className="space-y-4">
          {/* Email display (read-only) */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              readOnly
              className="h-14 text-base bg-muted text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* New password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">New Password</label>
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 text-base"
              autoFocus
            />
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Confirm Password</label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && password && confirmPassword && handleReset()}
              className="h-14 text-base"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold"
            onClick={handleReset}
            disabled={!password || !confirmPassword || loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Password"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;