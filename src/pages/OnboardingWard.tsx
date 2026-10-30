import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { WARD_DATA, WardEntry } from "@/data/wards";

const buildWardList = (wards: WardEntry[]) => {
  const ysa = wards.filter(w => w.type === "YSA" || w.type === "Branch").map(w => w.name);
  const msa = wards.filter(w => w.type === "MSA").map(w => w.name);
  const sa  = wards.filter(w => w.type === "SA").map(w => w.name);
  return [
    { type: "header", label: "YSA Wards" },
    ...ysa.map(label => ({ type: "ward", label })),
    { type: "header", label: "Mid-Singles Wards" },
    ...msa.map(label => ({ type: "ward", label })),
    { type: "header", label: "Single Adult Wards" },
    ...sa.map(label => ({ type: "ward", label })),
  ];
};

const OnboardingWard = () => {
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState("");
  const [customWard, setCustomWard] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wardList, setWardList] = useState(() => buildWardList(WARD_DATA));

  // Merge in any admin-approved custom wards from Supabase
  useEffect(() => {
    supabase.from("custom_wards").select("name, state, region, type, city").then(({ data }) => {
      if (data?.length) {
        const custom: WardEntry[] = data.map(r => ({
          name: r.name, state: r.state, region: r.region,
          type: r.type as WardEntry["type"], city: r.city ?? undefined,
        }));
        const names = new Set(WARD_DATA.map(w => w.name));
        const merged = [...WARD_DATA, ...custom.filter(w => !names.has(w.name))];
        setWardList(buildWardList(merged));
      }
    });
  }, []);

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
    // If the user came here via a co-host invite (or any other post-auth
    // redirect), send them there now instead of the home page.
    const pending = localStorage.getItem("postAuthRedirect");
    if (pending) {
      localStorage.removeItem("postAuthRedirect");
      navigate(pending);
    } else {
      navigate("/wards");
    }
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
          {wardList.map((item, i) =>
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