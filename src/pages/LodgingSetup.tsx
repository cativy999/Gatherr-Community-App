import { CE_BG,CE_LIGHT } from '../tokens';
import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { isOwnerUserId } from "@/lib/admin";
import { toast } from "sonner";

type OptionType = "airbnb" | "hotel" | "custom";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG      = CE_BG;
const ICON_BG = "#E4DCCF";
const DARK    = "#2C2523";
const MID     = "#635C59";
const TEAL    = "#1F4E5B";
const DIVIDER = CE_LIGHT;
const SERIF   = "'EB Garamond', Georgia, serif";

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
  { type: "hotel",  label: "Hotel / Shared Room Block", sublabel: "Perfect for standard accommodations", icon: "🏨" },
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
      {items.length > 0 && (
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: MID }}>
            {label}
          </p>
          <button
            onClick={onAdd}
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: TEAL }}
          >
            + Add another
          </button>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DIVIDER}`, background: "#fff" }}>
        {/* Template / Add row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-2xl flex-shrink-0 w-7 text-center">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight" style={{ color: DARK }}>{label}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: MID }}>{sublabel}</p>
          </div>
          {items.length === 0 && (
            <button
              onClick={onAdd}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-opacity hover:opacity-70"
              style={{ border: `1px solid ${DIVIDER}`, color: DARK, background: "#fff" }}
            >
              + Add
            </button>
          )}
        </div>

        {/* Added items */}
        {items.map((item) => (
          <div key={item.id}>
            <div style={{ height: 1, background: DIVIDER, marginLeft: 16, marginRight: 16 }} />
            <div className="flex items-center gap-3 px-4 py-3">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: ICON_BG }}>
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight" style={{ color: DARK }}>
                  {item.name || "Unnamed"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: MID }}>
                  {[
                    item.guests_assigned ? `${item.guests_assigned} guests` : null,
                    perNight(item),
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                onClick={() => onEdit(item.id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-opacity hover:opacity-70"
                style={{ border: `1px solid ${DIVIDER}`, color: DARK, background: "#fff" }}
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
        if (error) { toast.error(error.message || "Failed to save"); return null; }
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
        if (error || !data) { toast.error(error?.message || "Failed to save — did you run the SQL in Supabase?"); return null; }
        setGroupId(data.id);
        return data.id;
      }
    } catch (e: any) {
      toast.error(e?.message || "Unexpected error");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = async (type: OptionType) => {
    let id = groupId;
    if (!id) { id = await saveGroup(); if (!id) return; }
    else { await saveGroup(); }
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

  const ShareSection = () => (
    <div className="space-y-3 pt-5" style={{ borderTop: `1px solid ${DIVIDER}` }}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: DARK }}>Share with Your Group</h3>
        <p className="text-xs mt-0.5" style={{ color: MID }}>Let members choose rooms and input options.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => toast.info("Invite Friends coming soon!")}
          className="flex-1 py-3.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-85"
          style={{ background: TEAL }}
        >
          Invite Friends
        </button>
        <button
          onClick={handleCopyLink}
          className="flex-1 py-3.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ border: `1px solid ${DIVIDER}`, color: DARK }}
        >
          Copy Link
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 128 }}>
      <div className="max-w-5xl mx-auto px-5">
        {/* ── Header ── */}
        <div className="flex items-center gap-4 pt-8 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-70"
            style={{ background: ICON_BG }}
          >
            <ChevronLeft className="h-5 w-5" style={{ color: DARK }} />
          </button>
          <h1 style={{ fontFamily: SERIF, color: DARK, fontSize: 32, fontWeight: 600, lineHeight: 1.2 }}>
            Lodging
          </h1>
        </div>
        <p className="text-sm mb-8 ml-[52px]" style={{ color: MID }}>
          Set up cohorts and propose stays for your group.
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="max-w-5xl mx-auto px-5 md:grid md:grid-cols-2 md:gap-12">

        {/* LEFT: Group details */}
        <div className="space-y-5">

          {/* Group Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: MID }}>
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. SoCal Conference Crew"
              className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all"
              style={{ border: `1.5px solid ${DIVIDER}`, background: "#fff", color: DARK }}
            />
          </div>

          {/* People Planning to Stay */}
          <div
            className="flex items-center justify-between px-4 py-3.5 rounded-xl"
            style={{ border: `1px solid ${DIVIDER}`, background: "#fff" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: DARK }}>People Planning to Stay</p>
              <p className="text-xs mt-0.5" style={{ color: MID }}>Determines average cost splits</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPeopleCount((c) => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 text-lg"
                style={{ border: `1px solid ${DIVIDER}`, color: DARK }}
              >
                −
              </button>
              <span className="text-base font-semibold w-5 text-center tabular-nums" style={{ color: DARK }}>
                {peopleCount}
              </span>
              <button
                onClick={() => setPeopleCount((c) => c + 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 text-lg"
                style={{ border: `1px solid ${DIVIDER}`, color: DARK }}
              >
                +
              </button>
            </div>
          </div>

          {/* Group Rules & Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: MID }}>
                Group Rules &amp; Notes
              </label>
              <button
                onClick={() => setShowRulePicker((v) => !v)}
                className="text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: TEAL }}
              >
                + Add Rules
              </button>
            </div>

            <div
              className="min-h-[88px] rounded-xl p-3"
              style={{ border: `1px solid ${DIVIDER}`, background: "#fff" }}
            >
              {rules.length === 0 && !showRulePicker ? (
                <p className="text-sm mt-1" style={{ color: MID, opacity: 0.6 }}>
                  Tap + Add Rules to set house rules…
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {rules.map((rule) => (
                    <span
                      key={rule}
                      className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm"
                      style={{ background: ICON_BG, border: `1px solid ${DIVIDER}`, color: DARK }}
                    >
                      {rule}
                      <button
                        onClick={() => removeRule(rule)}
                        className="flex items-center justify-center w-4 h-4 rounded-full transition-opacity hover:opacity-70"
                      >
                        <X className="h-3 w-3" style={{ color: MID }} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {showRulePicker && (
              <div className="p-3 rounded-xl space-y-3" style={{ border: `1px solid ${DIVIDER}`, background: "#fff" }}>
                <div className="flex flex-wrap gap-2">
                  {PRESET_RULES.filter((r) => !rules.includes(r)).map((rule) => (
                    <button
                      key={rule}
                      onClick={() => setRules((prev) => [...prev, rule])}
                      className="px-3 py-1.5 rounded-full text-sm transition-opacity hover:opacity-80"
                      style={{ background: ICON_BG, border: `1px solid ${DIVIDER}`, color: DARK }}
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
                    className="flex-1 h-9 px-3 rounded-xl text-sm outline-none transition-all"
                    style={{ border: `1px solid ${DIVIDER}`, color: DARK, background: "#fff" }}
                  />
                  <button
                    onClick={addCustomRule}
                    disabled={!customRuleInput.trim()}
                    className="px-4 h-9 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-85"
                    style={{ background: TEAL }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop-only Continue / Share */}
          <div className="hidden md:block">
            {!showInvite ? (
              <button
                onClick={handleContinue}
                disabled={saving}
                className="w-full py-4 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: TEAL }}
              >
                {saving ? "Saving…" : "Continue to Invite"}
              </button>
            ) : (
              <ShareSection />
            )}
          </div>
        </div>

        {/* RIGHT: Lodging Options */}
        <div className="space-y-5 mt-8 md:mt-0">
          <div>
            <h2 style={{ fontFamily: SERIF, color: DARK, fontSize: 24, fontWeight: 600 }}>
              Lodging Options
            </h2>
            <p className="text-sm mt-0.5" style={{ color: MID }}>
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

          {showInvite && (
            <div className="md:hidden">
              <ShareSection />
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky footer */}
      {!showInvite && (
        <div
          className="fixed bottom-0 left-0 right-0 p-5 md:hidden"
          style={{ background: BG, borderTop: `1px solid ${DIVIDER}` }}
        >
          <button
            onClick={handleContinue}
            disabled={saving}
            className="w-full py-4 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: TEAL }}
          >
            {saving ? "Saving…" : "Continue to Invite"}
          </button>
        </div>
      )}
    </div>
  );
};

export default LodgingSetup;
