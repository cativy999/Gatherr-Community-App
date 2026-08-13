// All onboarding logic has been consolidated into OnboardingName.tsx
// This route redirects there to preserve any direct links to /onboarding/age
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OnboardingAge = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/onboarding/name", { replace: true }); }, []);
  return null;
};

export default OnboardingAge;
