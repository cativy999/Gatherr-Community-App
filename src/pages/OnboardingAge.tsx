import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const MIN_AGE = 18;
const MAX_AGE = 65;
const MAX_SPAN = 15;

const OnboardingAge = () => {
  const navigate = useNavigate();
  const [age, setAge] = useState("");
  const [showPreferences, setShowPreferences] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([25, 35]);
  const [loading, setLoading] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);

  const isAgeValid = (() => {
    const num = parseInt(age);
    return !isNaN(num) && num >= 13 && num <= 120;
  })();

  const handleAgeNext = () => {
    if (!isAgeValid) return;
    localStorage.setItem("onboarding_age", age);
    console.log("Saved age:", localStorage.getItem("onboarding_age"));
    setShowPreferences(true); // ageRange will be set by the useEffect below
  };

  useEffect(() => {
    if (!showPreferences) return;
    const num = parseInt(age);
    if (!isNaN(num)) {
      const low = Math.max(MIN_AGE, num - 7);
      const high = Math.min(MAX_AGE, low + 15);
      setAgeRange([low, high]);
    }
  }, [showPreferences]);

  useEffect(() => {
    if (showPreferences) {
      setTimeout(() => prefsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [showPreferences]);

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
      const preferred_age_min = localStorage.getItem("onboarding_age_min");
      const preferred_age_max = localStorage.getItem("onboarding_age_max");
      const name = localStorage.getItem("onboarding_name");

      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        name: name || user.user_metadata?.full_name || null,
        age: savedAge ? parseInt(savedAge) : null,
        preferred_age_min: preferred_age_min ? parseInt(preferred_age_min) : null,
        preferred_age_max: preferred_age_max ? parseInt(preferred_age_max) : null,
        avatar_url: user.user_metadata?.avatar_url || null,
      }, { onConflict: "user_id" });

      if (error) console.error("Supabase upsert error:", error);

      localStorage.removeItem("onboarding_name");
      localStorage.removeItem("onboarding_age");
      localStorage.removeItem("onboarding_age_min");
      localStorage.removeItem("onboarding_age_max");
    }
    setLoading(false);
    navigate("/wards");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">

        {/* Header */}
        <div className="space-y-3 text-center pt-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Step 2 of 2</p>
          <h1 className="text-3xl font-bold tracking-tight">
            {showPreferences ? "About you" : "What is your age?"}
          </h1>
          {!showPreferences && (
            <p className="text-muted-foreground text-base">This helps us personalize your experience</p>
          )}
        </div>

        {/* Age input */}
        <div className={`flex justify-center ${showPreferences ? "pt-2" : "pt-8"}`}>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Enter your age"
            value={age}
            onChange={(e) => { if (!showPreferences) setAge(e.target.value); }}
            onKeyDown={(e) => e.key === "Enter" && isAgeValid && !showPreferences && handleAgeNext()}
            className={`w-40 h-14 text-lg text-center rounded-2xl border-2 transition-all ${
              showPreferences ? "opacity-60 pointer-events-none" : ""
            }`}
            min={13}
            max={120}
            readOnly={showPreferences}
          />
        </div>

        {/* Preferences — revealed after age is set */}
        {showPreferences && (
          <div ref={prefsRef} className="pt-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1 text-center">
              <p className="text-base font-semibold">Who do you want to do activities with?</p>
              <p className="text-sm text-muted-foreground">Select an age range (max 15 year span)</p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-2xl bg-accent min-w-[80px]">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From</span>
                <span className="text-2xl font-bold text-primary">{ageRange[0]}</span>
              </div>
              <div className="h-0.5 w-6 bg-border rounded-full" />
              <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-2xl bg-accent min-w-[80px]">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To</span>
                <span className="text-2xl font-bold text-primary">{ageRange[1]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Slider
                min={MIN_AGE}
                max={MAX_AGE}
                step={1}
                value={ageRange}
                onValueChange={handleSliderChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>{MIN_AGE}</span>
                <span>{MAX_AGE}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="mx-auto w-full max-w-md pt-8 space-y-3">
        {!showPreferences ? (
          <>
            <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={handleAgeNext} disabled={!isAgeValid}>
              Next
            </Button>
            <Button variant="ghost" size="lg" className="w-full h-14 text-base" onClick={() => { setShowPreferences(true); }}>
              Skip
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={handleFinish} disabled={loading}>
              {loading ? "Saving..." : "Get Started"}
            </Button>
            <Button variant="ghost" size="lg" className="w-full h-14 text-base" onClick={handleFinish} disabled={loading}>
              Skip
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingAge;