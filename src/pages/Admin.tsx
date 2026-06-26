import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Users, CalendarCheck, MessageSquare, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAIL, isOwnerUserId } from "@/lib/admin";

type Tab = "signups" | "events" | "engagement" | "feedback";

interface ProfileRow {
  user_id: string;
  name: string | null;
  ward: string | null;
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
  const [stepEntryUserIds, setStepEntryUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchAll = async () => {
      setLoading(true);

      // Profiles (signups). created_at may or may not exist on this table —
      // fall back gracefully if the column isn't there.
      let profileRows: ProfileRow[] = [];
      const { data: profilesWithDate, error: profilesErr } = await supabase
        .from("profiles")
        .select("user_id, name, ward, created_at")
        .order("created_at", { ascending: false });
      if (!profilesErr && profilesWithDate) {
        profileRows = profilesWithDate as ProfileRow[];
      } else {
        const { data: profilesNoDate } = await supabase
          .from("profiles")
          .select("user_id, name, ward");
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
        .select("user_id");
      setStepEntryUserIds((stepRows ?? []).map((r: any) => r.user_id).filter(Boolean));

      setLoading(false);
    };

    fetchAll();
  }, [isAdmin]);

  // Redirect anyone who isn't the admin.
  if (!authLoading && !isAdmin) {
    navigate("/profile", { replace: true });
    return null;
  }

  const nameById = new Map(profiles.map((p) => [p.user_id, p.name]));
  const resolveName = (userId: string | null) => {
    if (!userId) return "Anonymous";
    if (isOwnerUserId(userId)) return `${nameById.get(userId) || "You"} (your testing)`;
    return nameById.get(userId) || "Unknown user";
  };

  const totalSignups = profiles.length;
  const ownerSignups = profiles.filter((p) => isOwnerUserId(p.user_id)).length;
  const realSignups = totalSignups - ownerSignups;

  const totalEvents = events.length;
  const ownerEvents = events.filter((e) => isOwnerUserId(e.user_id)).length;
  const realEvents = totalEvents - ownerEvents;

  const totalRsvps = rsvps.length;
  const goingRsvps = rsvps.filter((r) => r.status === "going").length;
  const realRsvps = rsvps.filter((r) => !isOwnerUserId(r.user_id)).length;

  const realStepUsers = new Set(stepEntryUserIds.filter((id) => !isOwnerUserId(id))).size;
  const ownerStepUsers = new Set(stepEntryUserIds.filter((id) => isOwnerUserId(id))).size;

  const rsvpCountByEvent = new Map<string, number>();
  rsvps.forEach((r) => {
    if (r.status === "going") rsvpCountByEvent.set(r.event_id, (rsvpCountByEvent.get(r.event_id) ?? 0) + 1);
  });

  if (authLoading || (isAdmin && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-border px-4 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate("/profile")} className="p-1 -ml-1 rounded-full hover:bg-accent transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Admin Dashboard
          </h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-2xl mx-auto space-y-5">
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
                <StatCard label="Total signups" value={totalSignups} />
                <StatCard label="Real users" value={realSignups} highlight />
                <StatCard label="Your testing" value={ownerSignups} muted />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  All profiles ({profiles.length})
                </p>
                <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {profiles.length === 0 && <EmptyRow text="No signups yet." />}
                  {profiles.map((p) => (
                    <div key={p.user_id} className="flex items-center justify-between px-3.5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.name || "Unnamed user"}
                          {isOwnerUserId(p.user_id) && (
                            <span className="ml-2 text-[11px] font-normal text-muted-foreground">(your testing)</span>
                          )}
                        </p>
                        {p.ward && <p className="text-xs text-muted-foreground truncate">{p.ward}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground flex-shrink-0 ml-3">{fmtDate(p.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Events & RSVPs */}
          {tab === "events" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total events" value={totalEvents} />
                <StatCard label="Real-user events" value={realEvents} highlight />
                <StatCard label="Total RSVPs" value={totalRsvps} />
                <StatCard label="Real-user RSVPs" value={realRsvps} highlight />
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                {goingRsvps} of {totalRsvps} RSVPs are "Going". {ownerEvents} events were created from your testing accounts.
              </p>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  Recent events
                </p>
                <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {events.length === 0 && <EmptyRow text="No events yet." />}
                  {events.slice(0, 30).map((e) => (
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
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  Step Challenge participation
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Real participants" value={realStepUsers} highlight />
                  <StatCard label="Your testing" value={ownerStepUsers} muted />
                </div>
              </div>
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
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, highlight, muted }: { label: string; value: number; highlight?: boolean; muted?: boolean }) => (
  <div
    className="flex flex-col gap-1 rounded-xl border px-3.5 py-3"
    style={{ borderColor: "#eaeaea", backgroundColor: highlight ? "#f0fdf4" : "#fff" }}
  >
    <p className="text-2xl font-bold" style={{ color: muted ? "#999" : "#111", fontFamily: "'Hanken Grotesk', sans-serif" }}>
      {value}
    </p>
    <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
  </div>
);

const EmptyRow = ({ text }: { text: string }) => (
  <div className="px-3.5 py-6 text-center text-sm text-muted-foreground">{text}</div>
);

export default Admin;
