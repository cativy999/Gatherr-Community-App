import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const TRAIL_STEPS = 2_600_000;
const STEPS_PER_MILE = 2000;

const ChallengeCard = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [totalSteps, setTotalSteps] = useState<number | null>(null);

  useEffect(() => {
    // Show EVERYONE's combined steps on the home card
    supabase
      .from("step_entries")
      .select("steps")
      .then(({ data }) => {
        const total = (data ?? []).reduce((s, e) => s + e.steps, 0);
        setTotalSteps(total);
      });
  }, [userId]);

  const pct = totalSteps !== null ? Math.min(100, (totalSteps / TRAIL_STEPS) * 100) : 0;
  const miles = totalSteps !== null ? Math.floor(totalSteps / STEPS_PER_MILE) : 0;

  return (
    <button
      onClick={() => navigate("/challenge")}
      className="w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover:bg-accent/30 active:scale-[0.99] transition-all text-left"
    >
      <div className="text-3xl flex-shrink-0">🚶</div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Pioneer Trail Challenge
          </p>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {totalSteps === null
            ? "Loading..."
            : totalSteps === 0
            ? "Be the first to start walking! Nauvoo → Salt Lake City 🏔️"
            : `Community: ${miles.toLocaleString()} miles · ${pct.toFixed(1)}% of trail complete`}
        </p>
      </div>
    </button>
  );
};

export default ChallengeCard;
