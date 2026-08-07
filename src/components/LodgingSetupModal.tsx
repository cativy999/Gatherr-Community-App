import { CE_BG,CE_LIGHT } from '../tokens';
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG      = CE_BG;
const ICON_BG = "#E4DCCF";
const DARK    = "#2C2523";
const MID     = "#635C59";
const TEAL    = "#1F4E5B";
const DIVIDER = CE_LIGHT;
const SERIF   = "'EB Garamond', Georgia, serif";
const INTER   = "'Inter', sans-serif";

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
  { type: "hotel",  label: "Hotel / Shared Room Block", sublabel: "Perfect for standard accommodations", icon: "🏨" },
  { type: "custom", label: "Custom Address",            sublabel: "Sarah's flat, custom house, etc.", icon: "📍" },
];

const SHEET_STYLES = `
  @keyframes ldg-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes ldg-fade-scale { from { opacity: 0; transform: scale(0.97) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes ldg-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .ldg-panel { animation: ldg-slide-up 0.32s cubic-bezier(0.32,0.72,0,1); }
  .ldg-backdrop { animation: ldg-fade-in 0.2s ease-out; }
  @media (min-width: 768px) { .ldg-panel { animation: ldg-fade-scale 0.2s ease-out; } }
  html.ldg-modal-open header { z-index: 0 !important; }
  html.ldg-modal-open header button { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
`;

// ── OptionCategory ─────────────────────────────────────────────────────────────
const OptionCategory = ({
  icon, label, sublabel, items, onAdd, onEdit,
}: {
  icon: string; label: string; sublabel: string;
  items: LodgingOptionRow[]; onAdd: () => void; onEdit: (id: string) => void;
}) => {
  const perNight = (item: LodgingOptionRow) => {
    if (!item.total_cost || !item.nights) return null;
    return `$${Math.round(item.total_cost / item.nights).toLocaleString()}/night`;
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: MID }}>{label}</p>
          <button onClick={onAdd} className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: TEAL }}>
            + Add another
          </button>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DIVIDER}`, background: "#fff" }}>
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
        {items.map((item) => (
          <div key={item.id}>
            <div style={{ height: 1, background: DIVIDER, marginLeft: 16, marginRight: 16 }} />
            <div className="flex items-center gap-3 px-4 py-3">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: ICON_BG }}>{icon}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight" style={{ color: DARK }}>{item.name || "Unnamed"}</p>
                <p className="text-xs mt-0.5" style={{ color: MID }}>
                  {[item.guests_assigned ? `${item.guests_assigned} guests` : null, perNight(item)].filter(Boolean).join(" · ")}
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

// ── Main modal ─────────────────────────────────────────────────────────────────
interface Props {
  eventId: string;
  initialGroupId: string | null;
  onClose: () => void;
}

const LodgingSetupModal = ({ eventId, initialGroupId, onClose }: Props) => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [groupId, setGroupId] = useState<string | null>(initialGroupId);
  const [groupName, setGroupName] = useState("");
  const [peopleCount, setPeopleCount] = useState(5);
  const [rules, setRules] = useState<string[]>([]);
  const [showRulePicker, setShowRulePicker] = useState(false);
  const [customRuleInput, setCustomRuleInput] = useState("");
  const [options, setOptions] = useState<LodgingOptionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Lock body scroll and suppress header compositing
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("ldg-modal-open");
    return () => {
      document.body.style.overflow = "";
      document.documentElement.classList.remove("ldg-modal-open");
    };
  }, []);

  // Load existing group
  useEffect(() => {
    if (!groupId) return;
    const load = async () => {
      const { data: group } = await supabase.from("lodging_groups").select("*").eq("id", groupId).single();
      if (group) {
        setGroupName(group.group_name ?? "");
        setPeopleCount(group.people_count ?? 5);
        setRules(group.rules ?? []);
      }
      const { data: opts } = await supabase.from("lodging_options").select("*").eq("lodging_group_id", groupId).order("created_at");
      if (opts) setOptions(opts);
    };
    load();
  }, [groupId]);

  const saveGroup = async (): Promise<string | null> => {
    setSaving(true);
    try {
      if (groupId) {
        const { error } = await supabase.from("lodging_groups")
          .update({ group_name: groupName || "My Lodging Group", people_count: peopleCount, rules })
          .eq("id", groupId);
        if (error) { toast.error(error.message || "Failed to save"); return null; }
        return groupId;
      } else {
        const { data, error } = await supabase.from("lodging_groups")
          .insert({ event_id: eventId, host_user_id: session!.user.id, group_name: groupName || "My Lodging Group", people_count: peopleCount, rules })
          .select("id").single();
        if (error || !data) { toast.error(error?.message || "Failed to save"); return null; }
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
    onClose();
    navigate(`/event/${eventId}/lodging/${id}/option/new/${type}`);
  };

  const handleEditOption = async (optionId: string) => {
    onClose();
    navigate(`/event/${eventId}/lodging/${groupId}/option/${optionId}/edit`);
  };

  const handleContinue = async () => {
    const id = await saveGroup();
    if (!id) return;
    setShowInvite(true);
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

  return createPortal(
    <>
      <style>{SHEET_STYLES}</style>
      <div
        className="ldg-backdrop fixed inset-0 flex items-end md:items-center justify-center"
        style={{ zIndex: 9999 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="ldg-panel relative w-full max-w-2xl rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden"
          style={{ maxHeight: "92vh", background: BG, border: `1px solid ${DIVIDER}` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <div style={{ width: 40 }} />
            <h2 style={{ fontFamily: SERIF, color: DARK, fontSize: 26, fontWeight: 700 }}>Lodging</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
              style={{ width: 40, height: 40, background: ICON_BG }}
            >
              <X className="h-4 w-4" style={{ color: DARK }} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 pb-10">

            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: MID, fontFamily: INTER }}>
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. SoCal Conference Crew"
                className="w-full h-11 px-4 rounded-xl text-sm outline-none"
                style={{ border: `1.5px solid ${DIVIDER}`, background: "#fff", color: DARK, fontFamily: INTER }}
              />
            </div>

            {/* People Count */}
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-xl"
              style={{ border: `1px solid ${DIVIDER}`, background: "#fff" }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: DARK, fontFamily: INTER }}>People Planning to Stay</p>
                <p className="text-xs mt-0.5" style={{ color: MID, fontFamily: INTER }}>Determines average cost splits</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPeopleCount((c) => Math.max(1, c - 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 text-lg"
                  style={{ border: `1px solid ${DIVIDER}`, color: DARK }}
                >−</button>
                <span className="text-base font-semibold w-5 text-center tabular-nums" style={{ color: DARK, fontFamily: INTER }}>
                  {peopleCount}
                </span>
                <button
                  onClick={() => setPeopleCount((c) => c + 1)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 text-lg"
                  style={{ border: `1px solid ${DIVIDER}`, color: DARK }}
                >+</button>
              </div>
            </div>

            {/* Group Rules */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: MID, fontFamily: INTER }}>
                  Group Rules &amp; Notes
                </label>
                <button
                  onClick={() => setShowRulePicker((v) => !v)}
                  className="text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: TEAL, fontFamily: INTER }}
                >
                  + Add Rules
                </button>
              </div>
              <div className="min-h-[72px] rounded-xl p-3" style={{ border: `1px solid ${DIVIDER}`, background: "#fff" }}>
                {rules.length === 0 && !showRulePicker ? (
                  <p className="text-sm mt-1" style={{ color: MID, opacity: 0.6, fontFamily: INTER }}>
                    Tap + Add Rules to set house rules…
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {rules.map((rule) => (
                      <span
                        key={rule}
                        className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm"
                        style={{ background: ICON_BG, border: `1px solid ${DIVIDER}`, color: DARK, fontFamily: INTER }}
                      >
                        {rule}
                        <button onClick={() => removeRule(rule)} className="flex items-center justify-center w-4 h-4 rounded-full transition-opacity hover:opacity-70">
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
                        style={{ background: ICON_BG, border: `1px solid ${DIVIDER}`, color: DARK, fontFamily: INTER }}
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
                      className="flex-1 h-9 px-3 rounded-xl text-sm outline-none"
                      style={{ border: `1px solid ${DIVIDER}`, color: DARK, background: "#fff", fontFamily: INTER }}
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

            {/* Divider */}
            <div style={{ height: 1, background: DIVIDER }} />

            {/* Lodging Options */}
            <div>
              <h3 style={{ fontFamily: SERIF, color: DARK, fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
                Lodging Options
              </h3>
              <p className="text-sm mb-4" style={{ color: MID, fontFamily: INTER }}>
                {options.length > 0
                  ? "Places currently proposed for your group."
                  : "Add one or more places for your group to consider."}
              </p>
              <div className="space-y-4">
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
            </div>

            {/* Share section (shown after Continue) */}
            {showInvite && (
              <div className="space-y-3 pt-1" style={{ borderTop: `1px solid ${DIVIDER}` }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: DARK, fontFamily: INTER }}>Share with Your Group</p>
                  <p className="text-xs mt-0.5" style={{ color: MID, fontFamily: INTER }}>Let members choose rooms and input options.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => toast.info("Invite Friends coming soon!")}
                    className="flex-1 py-3.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-85"
                    style={{ background: TEAL, fontFamily: INTER }}
                  >
                    Invite Friends
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-3.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-70"
                    style={{ border: `1px solid ${DIVIDER}`, color: DARK, fontFamily: INTER }}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          {!showInvite && (
            <div className="shrink-0 px-6 py-4" style={{ borderTop: `1px solid ${DIVIDER}`, background: BG }}>
              <button
                onClick={handleContinue}
                disabled={saving}
                className="w-full py-4 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: TEAL, fontFamily: INTER }}
              >
                {saving ? "Saving…" : "Continue to Invite"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default LodgingSetupModal;
