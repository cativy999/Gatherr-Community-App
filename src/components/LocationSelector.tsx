import { MapPin, Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const popularLocations = [
  "San Diego, CA",
  "Arcadia, CA",
  "Pasadena, CA",
  "Monrovia, CA",
  "Duarte, CA",
  "Los Angeles, CA",
  "San Francisco, CA",
  "Phoenix, AZ",
];

interface LocationSelectorProps {
  value: string;
  onChange: (location: string) => void;
}

const LocationSelector = ({ value, onChange }: LocationSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = popularLocations.filter((loc) =>
    loc.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="truncate max-w-[120px]">{value}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-lg z-30 overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-accent text-sm outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  onChange(loc);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                  value === loc ? "text-primary font-semibold" : "text-foreground"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                {loc}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                No locations found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
