import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const OnboardingAge = () => {
  const navigate = useNavigate();
  const [age, setAge] = useState("");

  const handleNext = () => {
    const num = parseInt(age);
    if (num >= 13 && num <= 120) {
      sessionStorage.setItem("onboarding_age", age);
      navigate("/onboarding/preferences");
    }
  };

  const isValid = (() => {
    const num = parseInt(age);
    return !isNaN(num) && num >= 13 && num <= 120;
  })();

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        <div className="space-y-3 text-center pt-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Step 1 of 3</p>
          <h1 className="text-3xl font-bold tracking-tight">What is your age?</h1>
          <p className="text-muted-foreground text-base">This helps us personalize your experience</p>
        </div>

        <div className="pt-8 flex justify-center">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Enter your age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-40 h-16 text-3xl font-bold text-center rounded-2xl border-2"
            min={13}
            max={120}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-md pt-8 space-y-3">
        <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={handleNext} disabled={!isValid}>
          Next
        </Button>
        <Button variant="ghost" size="lg" className="w-full h-14 text-base" onClick={() => navigate("/onboarding/preferences")}>
          Skip
        </Button>
      </div>
    </div>
  );
};

export default OnboardingAge;