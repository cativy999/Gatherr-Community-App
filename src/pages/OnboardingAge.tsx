import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";

const OnboardingAge = () => {
  const navigate = useNavigate();
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 35]);

  const handleNext = () => {
    navigate("/onboarding/ward");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center pt-12">
          <h1 className="text-3xl font-bold tracking-tight">
            Who do you want to do activity with?
          </h1>
          <p className="text-muted-foreground text-base">
            Select the age range of people you'd like to meet
          </p>
        </div>

        {/* Age Range Display */}
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

          {/* Range Slider */}
          <div className="px-2 space-y-3">
            <Slider
              min={13}
              max={80}
              step={1}
              value={ageRange}
              onValueChange={(val) => setAgeRange(val as [number, number])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>13</span>
              <span>80</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mx-auto w-full max-w-md pt-8 space-y-3">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold"
          onClick={handleNext}
        >
          Next
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full h-14 text-base"
          onClick={() => navigate("/onboarding/ward")}
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

export default OnboardingAge;
