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
  { type: "custom", label: "Custom Address", sublabel: "Friend's flat, custom house, etc.", icon: "📍" },
];

// ─────────────────────────────────────────────
// Sub-component: one category in lodging options
// ─────────────────────────────────────────────
const OptionCategory = ({
  icon, label, sublabel, items, onAdd, onEdit,
}: {
  icon: string;
  label: string;
  sublabel: string;
  items: LodgingOptionRow[];
  onAdd: () => void;
  onEdit: (id: string) => void;
}) => (
  <div className="space-y-2">
    {items.length > 0 && (
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase px-1">
        {label}
      </p>
    )}

    {/* Template row: always shown as "+ Add" */}
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{sublabel}</p>
      </div>
      <button
        onClick={onAdd}
        className="flex-shrink-0 px-4 py-1.5 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors"
      >
        + Add
      </button>
    </div>

    {/* Added items */}
    {items.map((item) => (
      <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt=""
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name || "Unnamed"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[
              item.total_cost ? `$${item.total_cost.toLocaleString()} total` : null,
              item.nights ? `${item.nights} nights` : null,
              item.guests_assigned ? `${item.guests_assigned} guests` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          onClick={() => onEdit(item.id)}
          className="flex-shrink-0 px-4 py-1.5 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors"
        >
          Edit
        </button>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
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

  // Guard — only owner accounts
  if (!isOwnerUserId(session?.user?.id)) return <Navigate to="/wards" replace />;

  // ── Fetch existing group ──────────────────
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

  // ── Save / upsert group ───────────────────
  const saveGroup = async (): Promise<string | null> => {
    setSaving(true);
    try {
      if (groupId) {
        const { error } = await supabase
          .from("lodging_groups")
          .update({ group_name: groupName || "My Lodging Group", people_count: peopleCount, rules })
          .eq("id", groupId);
        if (error) { toast.error("Failed to save"); return null; }
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
        if (error || !data) { toast.error("Failed to save"); return null; }
        setGroupId(data.id);
        return data.id;
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Add option: save group first, then navigate ──
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
    // scroll to bottom
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/event/${eventId}`);
    toast.success("Event link copied!");
  };

  // ── Rules helpers ─────────────────────────
  const toggleRule = (rule: string) =>
    setRules((prev) => (prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule]));
  const removeRule = (rule: string) => setRules((prev) => prev.filter((r) => r !== rule));
  const addCustomRule = () => {
    const r = customRuleInput.trim();
    if (r && !rules.includes(r)) setRules((prev) => [...prev, r]);
    setCustomRuleInput("");
    setShowRulePicker(false);
  };

  // ── Group options by type ─────────────────
  const byType = (t: OptionType) => options.filter((o) => o.type === t);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1
            className="text-xl font-bold flex-1"
            style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
          >
            Lodging
          </h1>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-5 space-y-6 pt-1 pb-6">
        <p className="text-sm text-muted-foreground">Set up custom cohorts and propose stays.</p>

        {/* ── Group Name ── */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. SoCal Conference Crew"
            className="w-full h-12 px-4 rounded-xl border border-border bg-card text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* ── People Stepper ── */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
          <div>
            <p className="text-sm font-semibold">People Planning to Stay</p>
            <p className="text-xs text-muted-foreground mt-0.5">Determines average cost splits</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPeopleCount((c) => Math.max(1, c - 1))}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold w-6 text-center">{peopleCount}</span>
            <button
              onClick={() => setPeopleCount((c) => c + 1)}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Group Rules ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Group Rules & Notes</label>
            <button
              onClick={() => setShowRulePicker((v) => !v)}
              className="text-sm font-medium text-primary"
            >
              + Add Rules
            </button>
          </div>

          {/* Active rules as removable pills */}
          {rules.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rules.map((rule) => (
                <span
                  key={rule}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm border border-border bg-card"
                >
                  {rule}
                  <button
                    onClick={() => removeRule(rule)}
                    className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-accent transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Rule picker dropdown */}
          {showRulePicker && (
            <div className="p-3 rounded-xl border border-border bg-card space-y-3">
              <div className="flex flex-wrap gap-2">
                {PRESET_RULES.filter((r) => !rules.includes(r)).map((rule) => (
                  <button
                    key={rule}
                    onClick={() => setRules((prev) => [...prev, rule])}
                    className="px-3 py-1.5 rounded-full text-sm border border-border hover:bg-accent transition-colors"
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
                  className="flex-1 h-9 px-3 rounded-xl border border-border text-sm outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={addCustomRule}
                  disabled={!customRuleInput.trim()}
                  className="px-4 py-1.5 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Lodging Options ── */}
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold">Lodging Options</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
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
        </div>

        {/* ── Share / Invite section (Screen 4) ── */}
        {showInvite && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="pt-4">
              <h2 className="text-sm font-semibold">Share with Your Group</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Let members choose rooms and input options.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => toast.info("Invite Friends coming soon!")}
                className="flex-1 py-3.5 rounded-2xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Invite Friends
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 py-3.5 rounded-2xl border-2 border-border text-sm font-semibold hover:bg-accent transition-colors"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom button ── */}
      {!showInvite && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
          <button
            onClick={handleContinue}
            disabled={saving}
            className="w-full max-w-lg mx-auto block py-4 rounded-2xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue to Invite"}
          </button>
        </div>
      )}
    </div>
  );
};

export default LodgingSetup;
