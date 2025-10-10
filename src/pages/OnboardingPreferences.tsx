import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const preferences = [
  { label: "Young Adults (18-35)", value: "young" },
  { label: "Adults (35-55)", value: "adults" },
  { label: "Seniors (55+)", value: "seniors" },
  { label: "All Ages", value: "all" },
];

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

        {/* Preference Options */}
        <div className="space-y-4 pt-8">
          {preferences.map((pref) => (
            <button
              key={pref.value}
              onClick={() => setSelected(pref.value)}
              className={`w-full rounded-2xl px-6 py-6 text-xl font-semibold transition-all ${
                selected === pref.value
                  ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                  : "bg-secondary text-foreground hover:bg-accent"
              }`}
            >
              {pref.label}
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
