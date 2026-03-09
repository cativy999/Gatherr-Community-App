import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";

const MIN_AGE = 18;
const MAX_AGE = 80;
const MAX_SPAN = 10;

const OnboardingPreferences = () => {
  const navigate = useNavigate();
  const [ageRange, setAgeRange] = useState<[number, number]>([25, 35]);

  const handleSliderChange = useCallback((val: number[]) => {
    let [low, high] = val as [number, number];
    if (high - low > MAX_SPAN) {
      if (low !== ageRange[0]) {
        high = Math.min(low + MAX_SPAN, MAX_AGE);
      } else {
        low = Math.max(high - MAX_SPAN, MIN_AGE);
      }
    }
    setAgeRange([low, high]);
  }, [ageRange]);

  const handleNext = () => {
    sessionStorage.setItem("onboarding_age_min", String(ageRange[0]));
    sessionStorage.setItem("onboarding_age_max", String(ageRange[1]));
    navigate("/onboarding/ward");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        <div className="space-y-3 text-center pt-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Step 2 of 3</p>
          <h1 className="text-3xl font-bold tracking-tight leading-tight">Who do you want to do activities with?</h1>
          <p className="text-muted-foreground text-base">Select an age range (max 10 year span)</p>
        </div>

        <div className="pt-8 space-y-8">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1 px-6 py-4 rounded-2xl bg-accent min-w-[90px]">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From</span>
              <span className="text-3xl font-bold text-primary">{ageRange[0]}</span>
            </div>
            <div className="h-0.5 w-8 bg-border rounded-full" />
            <div className="flex flex-col items-center gap-1 px-6 py-4 rounded-2xl bg-accent min-w-[90px]">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To</span>
              <span className="text-3xl font-bold text-primary">{ageRange[1]}</span>
            </div>
          </div>

          <div className="px-2 space-y-3">
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
      </div>

      <div className="mx-auto w-full max-w-md pt-8 space-y-3">
        <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={handleNext}>
          Next
        </Button>
        <Button variant="ghost" size="lg" className="w-full h-14 text-base" onClick={() => navigate("/onboarding/ward")}>
          Skip
        </Button>
      </div>
    </div>
  );
};

export default OnboardingPreferences;