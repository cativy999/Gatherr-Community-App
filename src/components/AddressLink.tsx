import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, Map } from "lucide-react";

const MENU_WIDTH = 210;
const MENU_HEIGHT_ESTIMATE = 96;

/**
 * Renders a detected address as tappable text. Tapping it opens a small menu
 * letting the viewer choose Apple Maps or Google Maps — both accept plain,
 * loosely-formatted address text and geocode it themselves (same as typing
 * it into either app's search bar), so no strict address format is required.
 *
 * The menu is rendered into a portal (document.body) and fixed-positioned
 * from the trigger's on-screen position, rather than nested/absolute inside
 * the normal layout. The Extra Details accordion rows animate open/closed
 * using an `overflow: hidden` wrapper, which was clipping the menu before —
 * a portal escapes that entirely, and a fixed position survives any parent
 * scroll/overflow/transform.
 */
const AddressLink = ({ address }: { address: string }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < MENU_HEIGHT_ESTIMATE + 12;
    let left = rect.left;
    if (left + MENU_WIDTH > window.innerWidth - 8) left = window.innerWidth - MENU_WIDTH - 8;
    if (left < 8) left = 8;
    const top = placeAbove ? rect.top - MENU_HEIGHT_ESTIMATE - 6 : rect.bottom + 6;
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
        setOpen(false);
      }
    };
    const handleReflow = () => updatePosition();
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleReflow, true);
    window.addEventListener("resize", handleReflow);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleReflow, true);
      window.removeEventListener("resize", handleReflow);
    };
  }, [open]);

  const encoded = encodeURIComponent(address);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-primary underline inline-flex items-center gap-1 align-baseline py-1.5 -my-1.5"
      >
        <MapPin className="h-4 w-4 flex-shrink-0 inline" />
        {address}
      </button>
      {open && coords && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: MENU_WIDTH }}
          className="z-[1000] bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden whitespace-nowrap"
        >
          <a
            href={`https://maps.apple.com/?q=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left text-black hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <Map className="h-4 w-4 shrink-0 text-muted-foreground" />
            Open in Apple Maps
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left text-black hover:bg-gray-50 transition-colors"
          >
            <Map className="h-4 w-4 shrink-0 text-muted-foreground" />
            Open in Google Maps
          </a>
        </div>,
        document.body
      )}
    </>
  );
};

export default AddressLink;
