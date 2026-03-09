import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const OnboardingWisdom = () => {
  const navigate = useNavigate();
  const [ward, setWard] = useState("");

  const handleNext = () => {
    navigate("/home");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        <div className="space-y-3 text-center pt-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Step 3 of 3</p>
          <h1 className="text-3xl font-bold tracking-tight">
            What is your LDS ward?
          </h1>
          <p className="text-muted-foreground text-base">
            This helps us connect you with your local community
          </p>
        </div>

        <div className="pt-8 flex justify-center">
          <Input
            type="text"
            placeholder="Enter your ward name"
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
          disabled={!ward.trim()}
        >
          Get Started
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full h-14 text-base"
          onClick={() => navigate("/home")}
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

export default OnboardingWisdom;
