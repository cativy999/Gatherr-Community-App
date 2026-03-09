import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const OnboardingWisdom = () => {
  const navigate = useNavigate();
  const [wisdom, setWisdom] = useState("");

  const handleNext = () => {
    navigate("/home");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        <div className="space-y-3 text-center pt-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Step 3 of 3</p>
          <h1 className="text-3xl font-bold tracking-tight">
            What is your wisdom?
          </h1>
          <p className="text-muted-foreground text-base">
            Share something meaningful with your community
          </p>
        </div>

        <div className="pt-8">
          <Textarea
            placeholder="Share your wisdom..."
            value={wisdom}
            onChange={(e) => setWisdom(e.target.value)}
            className="w-full min-h-[140px] text-base rounded-2xl border-2 p-4 resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right mt-2">
            {wisdom.length}/500
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md pt-8 space-y-3">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold"
          onClick={handleNext}
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
