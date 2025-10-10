import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const ageRanges = ["18-24", "25-34", "35-44", "45+"];

const OnboardingAge = () => {
  const navigate = useNavigate();
  const [selectedAge, setSelectedAge] = useState<string>("");

  const handleNext = () => {
    if (selectedAge) {
      navigate("/onboarding/preferences");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center pt-12">
          <h1 className="text-4xl font-bold tracking-tight">
            How old are you?
          </h1>
          <p className="text-lg text-muted-foreground">
            This helps us find the best activities for you.
          </p>
        </div>

        {/* Age Options */}
        <div className="space-y-4 pt-8">
          {ageRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedAge(range)}
              className={`w-full rounded-2xl px-6 py-6 text-xl font-semibold transition-all ${
                selectedAge === range
                  ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                  : "bg-secondary text-foreground hover:bg-accent"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Next Button */}
      <div className="mx-auto w-full max-w-md pt-8">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold"
          onClick={handleNext}
          disabled={!selectedAge}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default OnboardingAge;
