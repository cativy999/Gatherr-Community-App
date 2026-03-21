import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const OnboardingWard = () => {
  const navigate = useNavigate();
  const [ward, setWard] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const age = sessionStorage.getItem("onboarding_age");
      const preferred_age_min = sessionStorage.getItem("onboarding_age_min");
      const preferred_age_max = sessionStorage.getItem("onboarding_age_max");
      const name = sessionStorage.getItem("onboarding_name");

      const { data, error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        name: name || user.user_metadata?.full_name || null,
        age: age ? parseInt(age) : null,
        preferred_age_min: preferred_age_min ? parseInt(preferred_age_min) : null,
        preferred_age_max: preferred_age_max ? parseInt(preferred_age_max) : null,
        ward: ward.trim() || null,
      }, { onConflict: 'user_id' });

      console.log("Supabase result:", data, error);
      sessionStorage.clear();
    }

    setLoading(false);
    navigate("/home");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        <div className="space-y-3 text-center pt-12">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Step 3 of 3</p>
          <h1 className="text-3xl font-bold tracking-tight">What is your LDS ward?</h1>
          <p className="text-muted-foreground text-base">This helps us connect you with your local community</p>
        </div>

        <div className="pt-8 flex justify-center">
          <Input
            type="text"
            placeholder="e.g. Arcadia Ward"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            className="w-full h-14 text-lg text-center rounded-2xl border-2"
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-md pt-8 space-y-3">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold"
          onClick={handleNext}
          disabled={!ward.trim() || loading}
        >
          {loading ? "Saving..." : "Get Started"}
        </Button>
        <Button variant="ghost" size="lg" className="w-full h-14 text-base" onClick={() => navigate("/home")}>
          Skip
        </Button>
      </div>
    </div>
  );
};

export default OnboardingWard;