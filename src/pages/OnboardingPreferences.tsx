import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const ageRanges = ["18-29", "27-37", "30-40", "37-47", "45-55", "48-58"];

const OnboardingPreferences = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>("");

  const handleNext = () => {
    if (selected) {
      navigate("/home");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center pt-12">
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            Who do you want to do activities with?
          </h1>
        </div>

        {/* Age Range Options */}
        <div className="space-y-4 pt-8">
          {ageRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelected(range)}
              className={`w-full rounded-2xl px-6 py-6 text-xl font-semibold transition-all ${
                selected === range
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
          disabled={!selected}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default OnboardingPreferences;
