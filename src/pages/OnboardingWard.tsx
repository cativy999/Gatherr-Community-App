import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const OnboardingWard = () => {
  const navigate = useNavigate();
  const [ward, setWard] = useState<string>("");

  const handleNext = () => {
    if (ward) {
      navigate("/onboarding/preferences");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center pt-12">
          <h1 className="text-4xl font-bold tracking-tight">
            What's the current ward you're in?
          </h1>
        </div>

        {/* Ward Input */}
        <div className="pt-8">
          <Input
            type="text"
            placeholder="Enter your ward"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            className="w-full h-14 text-lg text-center"
          />
        </div>
      </div>

      {/* Next Button */}
      <div className="mx-auto w-full max-w-md pt-8">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold"
          onClick={handleNext}
          disabled={!ward}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default OnboardingWard;
