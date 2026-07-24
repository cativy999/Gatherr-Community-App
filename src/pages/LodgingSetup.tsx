import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { isOwnerUserId } from "@/lib/admin";
import { toast } from "sonner";

type OptionType = "airbnb" | "hotel" | "custom";

interface LodgingOptionRow {
  id: string;
  type: OptionType;
  name: string | null;
  url: string | null;
  image_url: string | null;
  total_cost: number | null;
  nights: number | null;
  guests_assigned: number;
}

const PRESET_RULES = [
  "Cost splits",
  "Check-in by 3pm",
  "No smoking",
  "Quiet hours after 10pm",
  "No pets",
  "Bring your own linens",
];

const OPTION_TYPES: { type: OptionType; label: string; sublabel: string; icon: string }[] = [
  { type: "airbnb", label: "Airbnb / Vacation Rental", sublabel: "Ideal for larger teams and houses", icon: "🏡" },
  { type: "hotel", label: "Hotel / Shared Room Block", sublabel: "Perfect for standard accommodations", icon: "🏨" },
  { type: "custom", label: "Custom Address", sublabel: "Sarah's flat, custom house, etc.", icon: "📍" },
];

// ──────────────────────────────────────────────────────────
// OptionCategory — one lodging type section
// ──────────────────────────────────────────────────────────
const OptionCategory = ({
  icon, label, sublabel, items, onAdd, onEdit,
}: {
  icon: string;
  label: string;
  sublabel: string;
  items: LodgingOptionRow[];
  onAdd: () => void;
  onEdit: (id: string) => void;
}) => {
  const perNight = (item: LodgingOptionRow) => {
    if (!item.total_cost || !item.nights) return null;
    return `$${Math.round(item.total_cost / item.nights).toLocaleString()}/night`;
  };

  return (
    <div className="space-y-2">
      {/* Section label when items exist */}
      {items.length > 0 && (
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            {label}
          </p>
          <button
            onClick={onAdd}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add another
          </button>
        </div>
      )}

      {/* Card containing template row + items */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Template / Add row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-2xl flex-shrink-0 w-7 text-center">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{sublabel}</p>
          </div>
          {items.length === 0 && (
            <button
              onClick={onAdd}
              className="flex-shrink-0 px-4 py-1.5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              + Add
            </button>
          )}
        </div>

        {/* Added items */}
        {items.map((item, i) => (
          <div key={item.id}>
            <div className="h-px bg-border mx-4" />
            <div className="flex items-center gap-3 px-4 py-3">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">
                  {item.name || "Unnamed"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[
                    item.guests_assigned ? `${item.guests_assigned} guests` : null,
                    perNight(item),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                onClick={() => onEdit(item.id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────
const LodgingSetup = () => {
  const { eventId, groupId: groupIdParam } = useParams<{ eventId: string; groupId: string }>();
  const isNew = groupIdParam === "new";
  const navigate = useNavigate();
  const { session } = useAuth();

  const [groupId, setGroupId] = useState<string | null>(isNew ? null : (groupIdParam ?? null));
  const [groupName, setGroupName] = useState("");
  const [peopleCount, setPeopleCount] = useState(5);
  const [rules, setRules] = useState<string[]>([]);
  const [showRulePicker, setShowRulePicker] = useState(false);
  const [customRuleInput, setCustomRuleInput] = useState("");
  const [options, setOptions] = useState<LodgingOptionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  if (!isOwnerUserId(session?.user?.id)) return <Navigate to="/wards" replace />;

  // ── Fetch existing group ───────────────────
  useEffect(() => {
    if (isNew || !groupId) return;
    const load = async () => {
      const { data: group } = await supabase
        .from("lodging_groups")
        .select("*")
        .eq("id", groupId)
        .single();
      if (group) {
        setGroupName(group.group_name ?? "");
        setPeopleCount(group.people_count ?? 5);
        setRules(group.rules ?? []);
      }
      const { data: opts } = await supabase
        .from("lodging_options")
        .select("*")
        .eq("lodging_group_id", groupId)
        .order("created_at");
      if (opts) setOptions(opts);
    };
    load();
  }, [groupId, isNew]);

  // ── Save / upsert group ────────────────────
  const saveGroup = async (): Promise<string | null> => {
    setSaving(true);
    try {
      if (groupId) {
        const { error } = await supabase
          .from("lodging_groups")
          .update({ group_name: groupName || "My Lodging Group", people_count: peopleCount, rules })
          .eq("id", groupId);
        if (error) {
          console.error("lodging_groups update error:", error);
          toast.error(error.message || "Failed to save");
          return null;
        }
        return groupId;
      } else {
        const { data, error } = await supabase
          .from("lodging_groups")
          .insert({
            event_id: eventId,
            host_user_id: session!.user.id,
            group_name: groupName || "My Lodging Group",
            people_count: peopleCount,
            rules,
          })
          .select("id")
          .single();
        if (error || !data) {
          console.error("lodging_groups insert error:", error);
          toast.error(error?.message || "Failed to save — did you run the SQL in Supabase?");
          return null;
        }
        setGroupId(data.id);
        return data.id;
      }
    } catch (e: any) {
      console.error("saveGroup exception:", e);
      toast.error(e?.message || "Unexpected error");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = async (type: OptionType) => {
    let id = groupId;
    if (!id) {
      id = await saveGroup();
      if (!id) return;
    } else {
      await saveGroup();
    }
    navigate(`/event/${eventId}/lodging/${id}/option/new/${type}`);
  };

  const handleEditOption = (optionId: string) => {
    navigate(`/event/${eventId}/lodging/${groupId}/option/${optionId}/edit`);
  };

  const handleContinue = async () => {
    const id = await saveGroup();
    if (!id) return;
    setShowInvite(true);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/event/${eventId}`);
    toast.success("Event link copied!");
  };

  const removeRule = (rule: string) => setRules((prev) => prev.filter((r) => r !== rule));
  const addCustomRule = () => {
    const r = customRuleInput.trim();
    if (r && !rules.includes(r)) setRules((prev) => [...prev, r]);
    setCustomRuleInput("");
    setShowRulePicker(false);
  };
  const byType = (t: OptionType) => options.filter((o) => o.type === t);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ── Back button ── */}
      <div className="px-5 pt-6 max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* ── Title ── */}
        <h1
          className="text-4xl md:text-5xl font-bold leading-tight tracking-tight"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          Lodging
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Set up custom cohorts and propose stays.
        </p>
      </div>

      {/* ── Desktop two-column layout ── */}
      <div className="max-w-5xl mx-auto px-5 mt-8 md:grid md:grid-cols-2 md:gap-12">

        {/* ── LEFT: Group details ── */}
        <div className="space-y-6">

          {/* Group Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. SoCal Conference Crew"
              className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-1 focus:ring-foreground transition-all"
            />
          </div>

          {/* People Planning to Stay */}
          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-border bg-card">
            <div>
              <p className="text-sm font-semibold">People Planning to Stay</p>
              <p className="text-xs text-muted-foreground mt-0.5">Determines average cost splits</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPeopleCount((c) => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-light"
              >
                −
              </button>
              <span className="text-base font-semibold w-5 text-center tabular-nums">{peopleCount}</span>
              <button
                onClick={() => setPeopleCount((c) => c + 1)}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-light"
              >
                +
              </button>
            </div>
          </div>

          {/* Group Rules & Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Group Rules &amp; Notes</label>
              <button
                onClick={() => setShowRulePicker((v) => !v)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                + Add Rules
              </button>
            </div>

            {/* Chips inside a bordered box */}
            <div className="min-h-[88px] rounded-xl border border-border bg-card p-3">
              {rules.length === 0 && !showRulePicker ? (
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Tap + Add Rules to set house rules…
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {rules.map((rule) => (
                    <span
                      key={rule}
                      className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm border border-border bg-background"
                    >
                      {rule}
                      <button
                        onClick={() => removeRule(rule)}
                        className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-muted transition-colors"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Rule picker */}
            {showRulePicker && (
              <div className="p-3 rounded-xl border border-border bg-card space-y-3">
                <div className="flex flex-wrap gap-2">
                  {PRESET_RULES.filter((r) => !rules.includes(r)).map((rule) => (
                    <button
                      key={rule}
                      onClick={() => setRules((prev) => [...prev, rule])}
                      className="px-3 py-1.5 rounded-full text-sm border border-border hover:bg-muted transition-colors"
                    >
                      {rule}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customRuleInput}
                    onChange={(e) => setCustomRuleInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomRule()}
                    placeholder="Add a custom rule…"
                    autoFocus
                    className="flex-1 h-9 px-3 rounded-xl border border-border text-sm outline-none focus:ring-1 focus:ring-foreground transition-all"
                  />
                  <button
                    onClick={addCustomRule}
                    disabled={!customRuleInput.trim()}
                    className="px-4 h-9 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-40 hover:opacity-85 transition-opacity"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop-only Continue / Share button */}
          <div className="hidden md:block space-y-3">
            {!showInvite ? (
              <button
                onClick={handleContinue}
                disabled={saving}
                className="w-full py-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-85 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving…" : "Continue to Invite"}
              </button>
            ) : (
              <div className="space-y-3 pt-4 border-t border-border">
                <div>
                  <h3 className="text-sm font-semibold">Share with Your Group</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Let members choose rooms and input options.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => toast.info("Invite Friends coming soon!")}
                    className="flex-1 py-3.5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-85 transition-opacity"
                  >
                    Invite Friends
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-3.5 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-colors"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Lodging Options ── */}
        <div className="space-y-5 mt-8 md:mt-0">
          <div>
            <h2
              className="text-xl font-bold"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              Lodging Options
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {options.length > 0
                ? "Places currently proposed for your group."
                : "Add one or more places for your group to consider."}
            </p>
          </div>

          {OPTION_TYPES.map(({ type, label, sublabel, icon }) => (
            <OptionCategory
              key={type}
              icon={icon}
              label={label}
              sublabel={sublabel}
              items={byType(type)}
              onAdd={() => handleAddOption(type)}
              onEdit={handleEditOption}
            />
          ))}

          {/* Share section (desktop inline, mobile sticky) */}
          {showInvite && (
            <div className="space-y-3 pt-4 border-t border-border md:hidden">
              <div>
                <h3 className="text-sm font-semibold">Share with Your Group</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Let members choose rooms and input options.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => toast.info("Invite Friends coming soon!")}
                  className="flex-1 py-3.5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-85 transition-opacity"
                >
                  Invite Friends
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex-1 py-3.5 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile sticky footer ── */}
      {!showInvite && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-sm border-t border-border md:hidden">
          <button
            onClick={handleContinue}
            disabled={saving}
            className="w-full py-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-85 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue to Invite"}
          </button>
        </div>
      )}
    </div>
  );
};

export default LodgingSetup;
