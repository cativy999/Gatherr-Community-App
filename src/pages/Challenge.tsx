import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Footprints, Trophy, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TRAIL_STEPS = 2_600_000; // ~1,300 miles × 2,000 steps/mile
const STEPS_PER_MILE = 2000;

const MILESTONES = [
  { label: "Nauvoo, IL", miles: 0 },
  { label: "Winter Quarters, NE", miles: 265 },
  { label: "Fort Laramie, WY", miles: 520 },
  { label: "Independence Rock, WY", miles: 800 },
  { label: "Fort Bridger, WY", miles: 1028 },
  { label: "Salt Lake City, UT", miles: 1300 },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString();

interface LeaderEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_steps: number;
}

const Challenge = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [mySteps, setMySteps] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [inputSteps, setInputSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const myMiles = Math.floor(mySteps / STEPS_PER_MILE);
  const myPct = Math.min(100, (mySteps / TRAIL_STEPS) * 100);

  // Current milestone
  const currentMilestone = [...MILESTONES].reverse().find(
    (m) => myMiles >= m.miles
  ) || MILESTONES[0];

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);

    // My total steps
    const { data: myEntries } = await supabase
      .from("step_entries")
      .select("steps")
      .eq("user_id", userId);
    const total = (myEntries ?? []).reduce((s, e) => s + e.steps, 0);
    setMySteps(total);

    // All entries for leaderboard
    const { data: allEntries } = await supabase
      .from("step_entries")
      .select("user_id, steps");

    if (allEntries) {
      const totals: Record<string, number> = {};
      allEntries.forEach((e) => {
        totals[e.user_id] = (totals[e.user_id] || 0) + e.steps;
      });

      const userIds = Object.keys(totals);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);

        const entries: LeaderEntry[] = userIds.map((uid) => {
          const p = profiles?.find((x) => x.user_id === uid);
          return {
            user_id: uid,
            name: p?.name || "Anonymous",
            avatar_url: p?.avatar_url || null,
            total_steps: totals[uid],
          };
        });
        entries.sort((a, b) => b.total_steps - a.total_steps);
        setLeaderboard(entries);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [userId]);

  const handleLog = async () => {
    const steps = parseInt(inputSteps.replace(/,/g, ""));
    if (!steps || steps <= 0 || !userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("step_entries")
      .insert({ user_id: userId, steps });
    if (error) {
      toast.error("Failed to log steps");
    } else {
      toast.success(`+${steps.toLocaleString()} steps logged! 🚶`);
      setLogOpen(false);
      setInputSteps("");
      fetchData();
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!userId) return;
    await supabase.from("step_entries").delete().eq("user_id", userId);
    toast.success("Steps reset!");
    setResetOpen(false);
    fetchData();
  };

  const myRank = leaderboard.findIndex((e) => e.user_id === userId) + 1;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/wards")} className="p-1 -ml-1 rounded-full hover:bg-accent transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Pioneer Trail Challenge 🚶
          </h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-4 max-w-4xl mx-auto w-full space-y-6">

        {/* My Progress Card */}
        <div className="rounded-2xl border border-border p-5 space-y-4 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Your Progress</p>
              <p className="text-3xl font-bold mt-0.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                {fmt(mySteps)} <span className="text-lg font-normal text-muted-foreground">steps</span>
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {myMiles.toLocaleString()} miles · {myPct.toFixed(1)}% of trail
              </p>
            </div>
            {myRank > 0 && (
              <div className="flex flex-col items-center bg-primary/10 rounded-xl px-4 py-3">
                <Trophy className="h-4 w-4 text-primary mb-1" />
                <p className="text-xl font-bold text-primary">#{myRank}</p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700"
                style={{ width: `${myPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
              <span>Nauvoo, IL</span>
              <span>Salt Lake City, UT</span>
            </div>
          </div>

          {/* Current location on trail */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Currently near <span className="font-medium text-foreground">{currentMilestone.label}</span></span>
          </div>

          {/* Log Steps Button */}
          <button
            onClick={() => setLogOpen(true)}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Log Steps
          </button>
        </div>

        {/* Milestones */}
        <div className="rounded-2xl border border-border p-5 space-y-3">
          <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Trail Milestones</p>
          <div className="space-y-2">
            {MILESTONES.map((m, i) => {
              const reached = myMiles >= m.miles;
              const isCurrent = currentMilestone.label === m.label;
              return (
                <div key={m.label} className={`flex items-center gap-3 py-1.5 ${isCurrent ? "opacity-100" : reached ? "opacity-60" : "opacity-30"}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${reached ? "bg-primary" : "bg-muted-foreground"} ${isCurrent ? "ring-2 ring-primary/30 scale-125" : ""}`} />
                  <span className={`text-sm ${isCurrent ? "font-semibold" : ""}`}>{m.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{m.miles.toLocaleString()} mi</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Leaderboard</p>
          </div>
          {loading ? (
            <p className="text-center text-muted-foreground text-sm py-8">Loading...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No steps logged yet. Be the first!</p>
          ) : (
            leaderboard.map((entry, i) => {
              const isMe = entry.user_id === userId;
              const pct = Math.min(100, (entry.total_steps / TRAIL_STEPS) * 100);
              const initials = entry.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 ${isMe ? "bg-primary/5" : ""}`}
                >
                  <span className={`text-sm font-bold w-6 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={entry.avatar_url ?? undefined} referrerPolicy="no-referrer" />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isMe ? "text-primary" : ""}`}>
                      {entry.name}{isMe ? " (you)" : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">{fmt(entry.total_steps)}</p>
                    <p className="text-[10px] text-muted-foreground">steps</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reset */}
        <div className="flex justify-center pb-2">
          <button
            onClick={() => setResetOpen(true)}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Reset my steps
          </button>
        </div>

      </main>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reset your steps?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will delete all your logged steps and start you back at zero. This can't be undone.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleReset}>Yes, reset</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Steps Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Footprints className="h-5 w-5" />
              Log Your Steps
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              type="number"
              placeholder="e.g. 8500"
              value={inputSteps}
              onChange={(e) => setInputSteps(e.target.value)}
              className="h-12 text-lg text-center"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleLog()}
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter your total steps for today or any period you want to add
            </p>
            <Button onClick={handleLog} disabled={saving || !inputSteps} className="w-full h-11">
              {saving ? "Saving..." : "Add Steps"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Challenge;
