import { useNavigate } from "react-router-dom";
import { CalendarPlus, Users, LayoutList, X } from "lucide-react";

interface CreateActionModalProps {
  open: boolean;
  onClose: () => void;
}

const actions = [
  {
    id: "create-event",
    icon: CalendarPlus,
    title: "Create Event",
    description: "Plan a meetup, activity or gathering",
    path: "/create-event",
  },
  {
    id: "create-group",
    icon: Users,
    title: "Create Group",
    description: "Build a community around shared interests",
    path: "/create-group",
  },
  {
    id: "manage-events",
    icon: LayoutList,
    title: "Manage Events",
    description: "View and edit your published events",
    path: "/my-published-events",
  },
];

const CreateActionModal = ({ open, onClose }: CreateActionModalProps) => {
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            What would you like to do?
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Action items */}
        <div className="px-4 space-y-2 pb-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleSelect(action.path)}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-accent transition-colors text-left group"
              >
                <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default CreateActionModal;
