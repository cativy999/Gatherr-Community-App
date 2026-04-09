import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const WARD_LIST = [
  { type: "header", label: "YSA Wards" },
  { type: "ward", label: "Santa Monica YSA" },
  { type: "ward", label: "South Bay YSA" },
  { type: "ward", label: "San Gabriel Valley YSA" },
  { type: "ward", label: "Huntington Beach YSA" },
  { type: "ward", label: "Inland Empire YSA" },
  { type: "header", label: "Single Adult Wards" },
  { type: "ward", label: "Glendale SA Ward" },
  { type: "ward", label: "Huntington Beach SA" },  
  { type: "ward", label: "Inland Empire Mid-Singles" },
  { type: "ward", label: "Heritage Park Mid-Singles" },
  { type: "ward", label: "Corona Single Adult" },
];

const OnboardingWard = () => {
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState("");
  const [customWard, setCustomWard] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const ward = showCustomInput ? customWard : selectedWard;

  const handleSelect = (label: string) => {
    setSelectedWard(label);
    setShowCustomInput(false);
    setCustomWard("");
  };

  const handleNext = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const age = localStorage.getItem("onboarding_age");
      const preferred_age_min = localStorage.getItem("onboarding_age_min");
      const preferred_age_max = localStorage.getItem("onboarding_age_max");
      const name = localStorage.getItem("onboarding_name");

      const { data, error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        name: name || user.user_metadata?.full_name || null,
        age: age ? parseInt(age) : null,
        preferred_age_min: preferred_age_min ? parseInt(preferred_age_min) : null,
        preferred_age_max: preferred_age_max ? parseInt(preferred_age_max) : null,
        ward: ward.trim() || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      }, { onConflict: 'user_id' });

      console.log("Supabase result:", data, error);
      localStorage.removeItem("onboarding_name");
      localStorage.removeItem("onboarding_age");
      localStorage.removeItem("onboarding_age_min");
      localStorage.removeItem("onboarding_age_max");
    }
    setLoading(false);
    navigate("/wards");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md flex-1 space-y-6">

        {/* Header */}
        <div className="space-y-3 text-center pt-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Step 3 of 3</p>
          <h1 className="text-3xl font-bold tracking-tight">What is your LDS ward?</h1>
          <p className="text-muted-foreground text-base">This helps us connect you with your local community</p>
        </div>

        {/* Chips */}
        <div className="pt-2">
          {WARD_LIST.map((item, i) =>
            item.type === "header" ? (
              <p key={i} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-6 pb-2">
  {item.label}
</p>
            ) : (
              <span key={i} className="inline-block mr-2 mb-2">
                <button
                  type="button"
                  onClick={() => handleSelect(item.label)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    selectedWard === item.label
                      ? "bg-black text-white border-black"
                      : "bg-background text-foreground border-gray-300 hover:border-gray-500"
                  }`}
                >
                  {item.label}
                </button>
              </span>
            )
          )}

          {/* Divider + Can't find my ward */}
          <div className="pt-2">
            <hr className="border-gray-200 mb-4" />
            <button
              type="button"
              onClick={() => { setShowCustomInput(true); setSelectedWard(""); }}
              className={`px-4 py-2 rounded-full border border-dashed text-sm font-medium transition-all ${
                showCustomInput
                  ? "bg-black text-white border-black border-solid"
                  : "bg-muted text-muted-foreground border-gray-300 hover:border-gray-500"
              }`}
            >
              Can't find my ward
            </button>

            {showCustomInput && (
              <Input
                type="text"
                placeholder="Type your ward name..."
                value={customWard}
                onChange={(e) => setCustomWard(e.target.value)}
                className="w-full h-12 text-base text-center rounded-full border-2 mt-3"
                autoFocus
              />
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mx-auto w-full max-w-md pt-8 space-y-3">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-2xl"
          onClick={handleNext}
          disabled={!ward.trim() || loading}
        >
          {loading ? "Saving..." : "Get Started"}
        </Button>
        <Button variant="ghost" size="lg" className="w-full h-14 text-base" onClick={handleNext}>
          Skip
        </Button>
      </div>
    </div>
  );
};

export default OnboardingWard;