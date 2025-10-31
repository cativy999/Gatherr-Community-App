import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const OnboardingAge = () => {
  const navigate = useNavigate();
  const [birthday, setBirthday] = useState<string>("");

  const handleNext = () => {
    if (birthday) {
      navigate("/onboarding/ward");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center pt-12">
          <h1 className="text-4xl font-bold tracking-tight">
            What's your birthday?
          </h1>
        </div>

        {/* Birthday Input */}
        <div className="pt-8">
          <Input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
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
          disabled={!birthday}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default OnboardingAge;
