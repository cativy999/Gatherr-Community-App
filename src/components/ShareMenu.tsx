import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Share2, MonitorPlay } from "lucide-react";

const MENU_WIDTH = 176; // matches w-44

export interface ShareMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  hidden?: boolean;
}

interface ShareMenuProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  items: ShareMenuItem[];
}

const DEFAULT_ICONS: Record<string, React.ReactNode> = {
  "Copy Link":     <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />,
  "Share Link":    <Share2 className="h-4 w-4 shrink-0 text-muted-foreground" />,
  "Share to Story":<MonitorPlay className="h-4 w-4 shrink-0 text-muted-foreground" />,
};

/**
 * Portal-based share menu — visual style matches the Add-to-Calendar picker.
 */
const ShareMenu = ({ open, onClose, triggerRef, items }: ShareMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const visibleItems = items.filter((i) => !i.hidden);
  const MENU_HEIGHT_ESTIMATE = visibleItems.length * 48;

  const updatePosition = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < MENU_HEIGHT_ESTIMATE + 12;
    let left = rect.right - MENU_WIDTH;
    if (left < 8) left = 8;
    if (left + MENU_WIDTH > window.innerWidth - 8) left = window.innerWidth - MENU_WIDTH - 8;
    const top = placeAbove ? rect.top - MENU_HEIGHT_ESTIMATE - 6 : rect.bottom + 8;
    setCoords({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  if (!open || !coords) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: coords.top, left: coords.left, width: MENU_WIDTH }}
      className="z-[1000] bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
    >
      {visibleItems.map((item, i) => (
        <button
          key={item.label}
          onClick={() => { onClose(); item.onClick(); }}
          className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left hover:bg-gray-50 transition-colors ${i < visibleItems.length - 1 ? "border-b border-gray-100" : ""}`}
        >
          {item.icon ?? DEFAULT_ICONS[item.label]}
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
};

export default ShareMenu;
