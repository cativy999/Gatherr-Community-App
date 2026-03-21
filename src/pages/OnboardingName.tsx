import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const OnboardingName = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleNext = () => {
    if (firstName.trim()) {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      sessionStorage.setItem("onboarding_name", fullName);
      navigate("/onboarding/age");
    }
  };

  const capitalize = (val: string) => val.charAt(0).toUpperCase() + val.slice(1);

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-8">
        <div className="space-y-3 text-center pt-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Step 1 of 4</p>
          <h1 className="text-3xl font-bold tracking-tight">What should we call you?</h1>
          <p className="text-muted-foreground text-base">This is how others will see you</p>
        </div>

        <div className="pt-8 space-y-4">
          <Input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(capitalize(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && firstName.trim() && handleNext()}
            className="h-14 text-lg text-center rounded-2xl border-2"
          />
          <Input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(capitalize(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && firstName.trim() && handleNext()}
            className="h-14 text-lg text-center rounded-2xl border-2"
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-md pt-8 space-y-3">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold"
          onClick={handleNext}
          disabled={!firstName.trim()}
        >
          Continue
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full h-14 text-base"
          onClick={() => navigate("/onboarding/age")}
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

export default OnboardingName;