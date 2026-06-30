import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Users, CalendarCheck, MessageSquare, MessageCircle, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAIL, isOwnerUserId } from "@/lib/admin";

type Tab = "signups" | "events" | "engagement" | "feedback";
type OwnerFilter = "all" | "real" | "owner";
type AgeBucket = "all" | "under20" | "20s" | "30s" | "40s" | "50plus" | "unknown";

interface ProfileRow {
  user_id: string;
  name: string | null;
  ward: string | null;
  location: string | null;
  age: number | null;
  created_at: string | null;
}

interface EventRow {
  id: string;
  title: string | null;
  created_at: string | null;
  user_id: string | null;
}

interface RsvpRow {
  event_id: string;
  user_id: string | null;
  status: string | null;
}

interface FeedbackRow {
  id: string;
  message: string;
  page_name: string | null;
  page_url: string | null;
  user_id: string | null;
  created_at: string | null;
}

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Unknown date";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "signups", label: "Signups", icon: Users },
  { key: "events", label: "Events & RSVPs", icon: CalendarCheck },
  { key: "engagement", label: "Engagement", icon: MessageCircle },
  { key: "feedback", label: "Feedback", icon: MessageSquare },
];

const AGE_BUCKET_LABELS: Record<AgeBucket, string> = {
  all: "All ages",
  under20: "Under 20",
  "20s": "20–29",
  "30s": "30–39",
  "40s": "40–49",
  "50plus": "50+",
  unknown: "Unknown",
};

const getAgeBucket = (age: number | null | undefined): AgeBucket => {
  if (age == null) return "unknown";
  if (age < 20) return "under20";
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  return "50plus";
};

const Admin = () => {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const [tab, setTab] = useState<Tab>("signups");
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);

  const [commentCount, setCommentCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [stepEntries, setStepEntries] = useState<{ user_id: string; steps: number }[]>([]);

  // Drill-down list views (Total Signups / Total Events / Step Challenge stat cards open these)
  const [drill, setDrill] = useState<null | "signups" | "events" | "steps">(null);
  const [signupOwnerFilter, setSignupOwnerFilter] = useState<OwnerFilter>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<AgeBucket>("all");
  const [signupSort, setSignupSort] = useState<"newest" | "oldest">("newest");
  const [eventOwnerFilter, setEventOwnerFilter] = useState<OwnerFilter>("all");
  const [eventTimeFilter, setEventTimeFilter] = useState<"all" | "week">("all");
  const [stepOwnerFilter, setStepOwnerFilter] = useState<OwnerFilter>("all");

  useEffect(() => {
    if (!isAdmin) return;

    const fetchAll = async () => {
      setLoading(true);

      // Profiles (signups). created_at may or may not exist on this table —
      // fall back gracefully if the column isn't there.
      let profileRows: ProfileRow[] = [];
      const { data: profilesWithDate, error: profilesErr } = await supabase
        .from("profiles")
        .select("user_id, name, ward, location, age, created_at")
        .order("created_at", { ascending: false });
      if (!profilesErr && profilesWithDate) {
        profileRows = profilesWithDate as ProfileRow[];
      } else {
        const { data: profilesNoDate } = await supabase
          .from("profiles")
          .select("user_id, name, ward, location, age");
        profileRows = (profilesNoDate ?? []).map((p: any) => ({ ...p, created_at: null }));
      }
      setProfiles(profileRows);

      const { data: eventRows } = await supabase
        .from("events")
        .select("id, title, created_at, user_id")
        .order("created_at", { ascending: false });
      setEvents(eventRows ?? []);

      const { data: rsvpRows } = await supabase
        .from("rsvps")
        .select("event_id, user_id, status");
      setRsvps(rsvpRows ?? []);

      const { data: feedbackRows } = await supabase
        .from("feedback")
        .select("id, message, page_name, page_url, user_id, created_at")
        .order("created_at", { ascending: false });
      setFeedback(feedbackRows ?? []);

      const { count: cCount } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true });
      setCommentCount(cCount ?? 0);

      const { count: gCount } = await supabase
        .from("groups")
        .select("id", { count: "exact", head: true });
      setGroupCount(gCount ?? 0);

      const { count: sCount } = await supabase
        .from("saved_events")
        .select("id", { count: "exact", head: true });
      setSavedCount(sCount ?? 0);

      const { count: lCount } = await supabase
        .from("liked_events")
        .select("id", { count: "exact", head: true });
      setLikedCount(lCount ?? 0);

      const { data: stepRows } = await supabase
        .from("step_entries")
        .select("user_id, steps");
      setStepEntries(
        (stepRows ?? [])
          .filter((r: any) => r.user_id)
          .map((r: any) => ({ user_id: r.user_id, steps: r.steps ?? 0 }))
      );

      setLoading(false);
    };

    fetchAll();
  }, [isAdmin]);

  const nameById = useMemo(() => new Map(profiles.map((p) => [p.user_id, p.name])), [profiles]);
  const resolveName = (userId: string | null) => {
    if (!userId) return "Anonymous";
    if (isOwnerUserId(userId)) return `${nameById.get(userId) || "You"} (your testing)`;
    return nameById.get(userId) || "Unknown user";
  };

  const totalSignups = profiles.length;
  const ownerSignups = profiles.filter((p) => isOwnerUserId(p.user_id)).length;
  const realSignups = totalSignups - ownerSignups;

  const hasSignupDates = profiles.some((p) => p.created_at);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const signupsThisMonth = profiles.filter((p) => p.created_at && new Date(p.created_at) >= monthStart).length;

  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const eventsThisWeek = events.filter((e) => e.created_at && new Date(e.created_at) >= weekStart).length;

  const totalEvents = events.length;
  const ownerEvents = events.filter((e) => isOwnerUserId(e.user_id)).length;
  const realEvents = totalEvents - ownerEvents;

  const totalRsvps = rsvps.length;
  const goingRsvps = rsvps.filter((r) => r.status === "going").length;
  const realRsvps = rsvps.filter((r) => !isOwnerUserId(r.user_id)).length;

  const stepTotalsByUser = useMemo(() => {
    const map = new Map<string, number>();
    stepEntries.forEach((r) => map.set(r.user_id, (map.get(r.user_id) ?? 0) + (r.steps || 0)));
    return map;
  }, [stepEntries]);
  const stepParticipants = useMemo(
    () =>
      Array.from(stepTotalsByUser.entries())
        .map(([user_id, steps]) => ({ user_id, steps }))
        .sort((a, b) => b.steps - a.steps),
    [stepTotalsByUser]
  );
  const rsvpCountByEvent = new Map<string, number>();
  rsvps.forEach((r) => {
    if (r.status === "going") rsvpCountByEvent.set(r.event_id, (rsvpCountByEvent.get(r.event_id) ?? 0) + 1);
  });

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => p.location && set.add(p.location));
    return Array.from(set).sort();
  }, [profiles]);

  const filteredSignups = profiles
    .filter((p) => {
      if (signupOwnerFilter === "real" && isOwnerUserId(p.user_id)) return false;
      if (signupOwnerFilter === "owner" && !isOwnerUserId(p.user_id)) return false;
      if (locationFilter !== "all" && p.location !== locationFilter) return false;
      if (ageFilter !== "all" && getAgeBucket(p.age) !== ageFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return signupSort === "newest" ? tb - ta : ta - tb;
    });

  const filteredEvents = events.filter((e) => {
    if (eventOwnerFilter === "real" && isOwnerUserId(e.user_id)) return false;
    if (eventOwnerFilter === "owner" && !isOwnerUserId(e.user_id)) return false;
    if (eventTimeFilter === "week" && !(e.created_at && new Date(e.created_at) >= weekStart)) return false;
    return true;
  });

  const filteredStepParticipants = stepParticipants.filter((p) => {
    if (stepOwnerFilter === "real" && isOwnerUserId(p.user_id)) return false;
    if (stepOwnerFilter === "owner" && !isOwnerUserId(p.user_id)) return false;
    return true;
  });

  // Redirect anyone who isn't the admin.
  if (!authLoading && !isAdmin) {
    navigate("/profile", { replace: true });
    return null;
  }

  if (authLoading || (isAdmin && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }

  const headerTitle =
    drill === "signups" ? "All Signups" : drill === "events" ? "All Events" : drill === "steps" ? "Step Challenge" : "Admin Dashboard";
  const handleBack = () => {
    if (drill) setDrill(null);
    else navigate("/profile");
  };

  return (
    <div className="relative flex min-h-screen flex-col pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-border px-4 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={handleBack} className="p-1 -ml-1 rounded-full hover:bg-accent transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            {headerTitle}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* ----- Drill-down: All Signups ----- */}
          {drill === "signups" && (
            <div key="signups-drill" className="flex flex-col gap-4 animate-in slide-in-from-right-full duration-300 ease-out">
              <div className="flex flex-wrap gap-2">
                <FilterPills
                  value={signupOwnerFilter}
                  onChange={setSignupOwnerFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "real", label: "Real users" },
                    { value: "owner", label: "Your testing" },
                  ]}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="flex-1 h-9 rounded-lg border text-sm px-2.5"
                  style={{ borderColor: "#eaeaea" }}
                >
                  <option value="all">All locations</option>
                  {locationOptions.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <select
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value as AgeBucket)}
                  className="flex-1 h-9 rounded-lg border text-sm px-2.5"
                  style={{ borderColor: "#eaeaea" }}
                >
                  {(Object.keys(AGE_BUCKET_LABELS) as AgeBucket[]).map((b) => (
                    <option key={b} value={b}>{AGE_BUCKET_LABELS[b]}</option>
                  ))}
                </select>
                <select
                  value={signupSort}
                  onChange={(e) => setSignupSort(e.target.value as "newest" | "oldest")}
                  className="flex-1 h-9 rounded-lg border text-sm px-2.5"
                  style={{ borderColor: "#eaeaea" }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredSignups.length} of {profiles.length}
              </p>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
                {filteredSignups.length === 0 && <EmptyRow text="No matching signups." />}
                {filteredSignups.map((p) => (
                  <div key={p.user_id} className="flex items-center justify-between px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.name || "Unnamed user"}
                        {isOwnerUserId(p.user_id) && (
                          <span className="ml-2 text-[11px] font-normal text-muted-foreground">(your testing)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[p.location, p.ward, p.age ? `Age ${p.age}` : null].filter(Boolean).join(" · ") || "No details"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0 ml-3">{fmtDate(p.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----- Drill-down: All Events ----- */}
          {drill === "events" && (
            <div key="events-drill" className="flex flex-col gap-4 animate-in slide-in-from-right-full duration-300 ease-out">
              <FilterPills
                value={eventOwnerFilter}
                onChange={setEventOwnerFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "real", label: "Real users" },
                  { value: "owner", label: "Your testing" },
                ]}
              />
              <div className="flex gap-2">
                {(["all", "week"] as const).map((opt) => {
                  const active = eventTimeFilter === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setEventTimeFilter(opt)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: active ? "#111" : "#f4f4f4",
                        color: active ? "#fff" : "#444",
                      }}
                    >
                      {opt === "all" ? "All time" : "This week"}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredEvents.length} of {events.length}
              </p>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
                {filteredEvents.length === 0 && <EmptyRow text="No matching events." />}
                {filteredEvents.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.title || "Untitled event"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        by {resolveName(e.user_id)} &middot; {rsvpCountByEvent.get(e.id) ?? 0} going
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0 ml-3">{fmtDate(e.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----- Drill-down: Step Challenge participants ----- */}
          {drill === "steps" && (
            <div key="steps-drill" className="flex flex-col gap-4 animate-in slide-in-from-right-full duration-300 ease-out">
              <FilterPills
                value={stepOwnerFilter}
                onChange={setStepOwnerFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "real", label: "Real users" },
                  { value: "owner", label: "Your testing" },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Showing {filteredStepParticipants.length} of {stepParticipants.length}
              </p>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
                {filteredStepParticipants.length === 0 && <EmptyRow text="No one has logged steps yet." />}
                {filteredStepParticipants.map((p) => (
                  <div key={p.user_id} className="flex items-center justify-between px-3.5 py-3">
                    <p className="text-sm font-medium truncate">
                      {nameById.get(p.user_id) || "Unknown user"}
                      {isOwnerUserId(p.user_id) && (
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">(your testing)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex-shrink-0 ml-3">{p.steps.toLocaleString()} steps</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----- Main dashboard (hidden while drilled in) ----- */}
          {!drill && (
            <>
              {/* Tab bar */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: active ? "#111" : "#f4f4f4",
                        color: active ? "#fff" : "#444",
                        fontFamily: "'Hanken Grotesk', sans-serif",
                      }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Signups */}
              {tab === "signups" && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard
                      label="Total signups"
                      value={totalSignups}
                      onClick={() => {
                        setSignupOwnerFilter("all");
                        setLocationFilter("all");
                        setAgeFilter("all");
                        setDrill("signups");
                      }}
                    />
                    <StatCard label="Real users" value={realSignups} highlight onClick={() => { setSignupOwnerFilter("real"); setLocationFilter("all"); setAgeFilter("all"); setDrill("signups"); }} />
                    <StatCard label="Your testing" value={ownerSignups} muted onClick={() => { setSignupOwnerFilter("owner"); setLocationFilter("all"); setAgeFilter("all"); setDrill("signups"); }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <StatCard
                      label="New signups this month"
                      value={hasSignupDates ? signupsThisMonth : 0}
                      wide
                    />
                    {!hasSignupDates && (
                      <p className="text-[11px] text-muted-foreground px-1">
                        No signup dates on record yet — this will start counting once that's available.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Events & RSVPs */}
              {tab === "events" && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      label="Total events"
                      value={totalEvents}
                      onClick={() => { setEventOwnerFilter("all"); setEventTimeFilter("all"); setDrill("events"); }}
                    />
                    <StatCard
                      label="Real-user events"
                      value={realEvents}
                      highlight
                      onClick={() => { setEventOwnerFilter("real"); setEventTimeFilter("all"); setDrill("events"); }}
                    />
                    <StatCard label="Total RSVPs" value={totalRsvps} />
                    <StatCard label="Real-user RSVPs" value={realRsvps} highlight />
                  </div>
                  <StatCard
                    label="New events this week"
                    value={eventsThisWeek}
                    wide
                    onClick={() => { setEventOwnerFilter("all"); setEventTimeFilter("week"); setDrill("events"); }}
                  />
                  <p className="text-xs text-muted-foreground -mt-2">
                    {goingRsvps} of {totalRsvps} RSVPs are "Going". {ownerEvents} events were created from your testing accounts.
                  </p>
                </div>
              )}

              {/* Engagement & Community */}
              {tab === "engagement" && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Comments" value={commentCount} />
                    <StatCard label="Groups created" value={groupCount} />
                    <StatCard label="Saved events" value={savedCount} />
                    <StatCard label="Liked events" value={likedCount} />
                  </div>
                  <StatCard
                    label="Step Challenge participants"
                    value={stepParticipants.length}
                    wide
                    onClick={() => { setStepOwnerFilter("all"); setDrill("steps"); }}
                  />
                </div>
              )}

              {/* Feedback */}
              {tab === "feedback" && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    Feedback ({feedback.length})
                  </p>
                  <div className="flex flex-col gap-3">
                    {feedback.length === 0 && <EmptyRow text="No feedback submitted yet." />}
                    {feedback.map((f) => (
                      <div key={f.id} className="rounded-xl border border-border px-4 py-3 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold truncate">{resolveName(f.user_id)}</p>
                          <p className="text-xs text-muted-foreground flex-shrink-0">{fmtDate(f.created_at)}</p>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{f.message}</p>
                        <p className="text-[11px] text-muted-foreground">
                          From: <span className="font-medium">{f.page_name || f.page_url || "Unknown page"}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  highlight,
  muted,
  wide,
  onClick,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  muted?: boolean;
  wide?: boolean;
  onClick?: () => void;
}) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left transition-opacity ${onClick ? "hover:opacity-80" : ""} ${wide ? "w-full" : ""}`}
      style={{ borderColor: "#eaeaea", backgroundColor: highlight ? "#f0fdf4" : "#fff" }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold" style={{ color: muted ? "#999" : "#111", fontFamily: "'Hanken Grotesk', sans-serif" }}>
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      </div>
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
    </Tag>
  );
};

const FilterPills = ({
  value,
  onChange,
  options,
}: {
  value: OwnerFilter;
  onChange: (v: OwnerFilter) => void;
  options: { value: OwnerFilter; label: string }[];
}) => (
  <div className="flex gap-2">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          style={{
            backgroundColor: active ? "#111" : "#f4f4f4",
            color: active ? "#fff" : "#444",
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const EmptyRow = ({ text }: { text: string }) => (
  <div className="px-3.5 py-6 text-center text-sm text-muted-foreground">{text}</div>
);

export default Admin;
