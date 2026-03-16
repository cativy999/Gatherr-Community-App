import { MapPin, Search, X, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "@/contexts/LocationContext";

interface LocationSelectorProps {
  value: string;
  onChange: (location: string) => void;
}

const LocationSelector = ({ value, onChange }: LocationSelectorProps) => {
  const { setLocationCoords } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&addressdetails=1&limit=6`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        const locations = data.map((item: any) => {
          const { city, town, village, state, country } = item.address;
          const place = city || town || village || item.display_name.split(",")[0];
          return {
            label: `${place}, ${state || country}`,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        }).filter(Boolean);
        // Deduplicate by label
        const seen = new Set();
        const unique = locations.filter((l: any) => {
          if (seen.has(l.label)) return false;
          seen.add(l.label);
          return true;
        });
        setResults(unique);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 400);
  }, [search]);

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
                placeholder="Search any city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-accent text-sm outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => { setSearch(""); setResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {searching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!searching && search && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">No locations found</div>
            )}
            {!searching && !search && (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">Type to search any city</div>
            )}
            {!searching && results.map((loc) => (
              <button
                key={loc.label}
                onClick={() => {
                  onChange(loc.label);
                  setLocationCoords(loc.lat, loc.lng);
                  setIsOpen(false);
                  setSearch("");
                  setResults([]);
                }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                  value === loc.label ? "text-primary font-semibold" : "text-foreground"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                {loc.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;