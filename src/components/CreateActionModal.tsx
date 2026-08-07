import { useNavigate } from "react-router-dom";
import { CalendarPlus, Users, LayoutList, X } from "lucide-react";

// ── Design tokens ──────────────────────────────────────────────────────────
const DARK    = "#2C2523";
const MID     = "#635C59";
const TEAL    = "#1F4E5B";
const ICON_BG = "#E4DCCF";
const DIVIDER = "#E8E2DA";
const GARAMOND = "'EB Garamond', Georgia, serif";
const INTER    = "'Inter', sans-serif";

// ── Actions ────────────────────────────────────────────────────────────────
const ACTIONS = [
  {
    id: "create-event",
    Icon: CalendarPlus,
    title: "Create Event",
    description: "Plan a meetup, activity or gathering",
    path: "/create-event",
  },
  {
    id: "create-group",
    Icon: Users,
    title: "Create Group",
    description: "Build a community around shared interests",
    path: "/create-group",
  },
  {
    id: "manage-events",
    Icon: LayoutList,
    title: "Manage Events",
    description: "View and edit your published events",
    path: "/my-published-events",
  },
];

interface CreateActionModalProps {
  open: boolean;
  onClose: () => void;
  isDesktop?: boolean;
}

const CreateActionModal = ({ open, onClose, isDesktop }: CreateActionModalProps) => {
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  // ── Shared content ───────────────────────────────────────────────────────
  const sheetContent = (
    <>
      {/* Drag handle (mobile only) */}
      {!isDesktop && (
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 36, height: 4, borderRadius: 100, background: "#C8C0B8" }} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <h2
          style={{
            fontFamily: GARAMOND,
            color: DARK,
            fontSize: 22,
            fontWeight: 400,
            lineHeight: 1.2,
          }}
        >
          What would you like to do?
        </h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-60"
          aria-label="Close"
        >
          <X className="h-5 w-5" style={{ color: MID }} />
        </button>
      </div>

      {/* Action rows */}
      <div className="px-4 pt-2 pb-4">
        {ACTIONS.map(({ id, Icon, title, description, path, highlight }, i) => (
          <div key={id}>
            <button
              onClick={() => handleSelect(path)}
              className="w-full flex items-center gap-4 px-2 py-3.5 rounded-2xl text-left transition-opacity hover:opacity-75 active:opacity-60"
            >
              {/* Icon circle */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: ICON_BG,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon style={{ width: 20, height: 20, color: TEAL }} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: DARK, fontFamily: INTER }}
                >
                  {title}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: MID, fontFamily: INTER }}
                >
                  {description}
                </p>
              </div>
            </button>

            {/* Divider between rows */}
            {i < ACTIONS.length - 1 && (
              <div style={{ height: 1, background: DIVIDER, marginLeft: 60, marginRight: 8 }} />
            )}
          </div>
        ))}
      </div>
    </>
  );

  // ── Desktop: centered popup ──────────────────────────────────────────────
  if (isDesktop) {
    if (!open) return null;
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className="pointer-events-auto w-full"
            style={{ maxWidth: 380 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
            >
              {sheetContent}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Mobile: bottom sheet ─────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
        }}
      >
        {sheetContent}
      </div>
    </>
  );
};

export default CreateActionModal;
