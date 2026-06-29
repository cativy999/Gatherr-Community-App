import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

/**
 * Renders a detected address as tappable text. Tapping it opens a small menu
 * letting the viewer choose Apple Maps or Google Maps — both accept plain,
 * loosely-formatted address text and geocode it themselves (same as typing
 * it into either app's search bar), so no strict address format is required.
 */
const AddressLink = ({ address }: { address: string }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const encoded = encodeURIComponent(address);

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-primary underline inline-flex items-center gap-1 align-baseline"
      >
        <MapPin className="h-3.5 w-3.5 flex-shrink-0 inline" />
        {address}
      </button>
      {open && (
        <span className="absolute left-0 top-full mt-1 z-30 flex flex-col min-w-[170px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <a
            href={`https://maps.apple.com/?q=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-sm text-left text-black hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Open in Apple Maps
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-sm text-left text-black hover:bg-gray-50 transition-colors whitespace-nowrap border-t border-gray-100"
          >
            Open in Google Maps
          </a>
        </span>
      )}
    </span>
  );
};

export default AddressLink;
