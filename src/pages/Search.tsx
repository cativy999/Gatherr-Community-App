import { ArrowLeft, Search as SearchIcon, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const WARDS = [
  { id: "santa-monica", name: "YSA Santa Monica Ward", address: "3400 Sawtelle Blvd, Los Angeles, CA" },
  { id: "south-bay", name: "YSA South Bay Ward", address: "2615 Marine Ave, Gardena, CA" },
  { id: "glendale", name: "SA Glendale Ward", address: "1130 E Chevy Chase Dr, Glendale, CA" },
];

const GROUPS = [
  { id: "hiking", name: "Hiking Group", description: "Weekend hikes around LA" },
  { id: "pickleball", name: "Pickleball Group", description: "Weekly pickleball games" },
];

const Search = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState<"wards" | "groups">("wards");
  const [eventResults, setEventResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Auto focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search events from Supabase when query changes
  useEffect(() => {
    if (!query.trim()) { setEventResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { data } = await supabase
        .from("events")
        .select("id, title, image_url, date, time, location, attendees, age_min, age_max")
        .eq("status", "published")
        .gte("date", today)
        .ilike("title", `%${query}%`)
        .order("date", { ascending: true })
        .limit(10);
      setEventResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredWards = WARDS.filter((w) =>
    w.name.toLowerCase().includes(query.toLowerCase())
  );
  const filteredGroups = GROUPS.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase())
  );

  const isSearching = query.trim().length > 0;

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-5 pt-4 pb-3 space-y-3">
        {/* Back + Search bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-accent/50 rounded-2xl px-3 py-2.5">
            <SearchIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wards, groups, events..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground text-xs">✕</button>
            )}
          </div>
        </div>

        {/* Chips — only show when not searching */}
        {!isSearching && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveChip("wards")}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeChip === "wards"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-foreground border-[#BBBBBB]"
              }`}
            >
              Wards
            </button>
            <button
              onClick={() => setActiveChip("groups")}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeChip === "groups"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-foreground border-[#BBBBBB]"
              }`}
            >
              Popular Groups
            </button>
          </div>
        )}
      </div>

      <main className="flex-1 px-5 py-4 space-y-6">

        {/* ── Browse mode (no query) ── */}
        {!isSearching && activeChip === "wards" && (
          <div className="space-y-2">
            {WARDS.map((ward) => (
              <button
                key={ward.id}
                onClick={() => navigate(`/ward/${ward.id}`)}
                className="w-full flex items-center gap-3 bg-card rounded-2xl p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{ward.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{ward.address}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!isSearching && activeChip === "groups" && (
          <div className="space-y-2">
            {GROUPS.map((group) => (
              <div
                key={group.id}
                className="flex items-center gap-3 bg-card rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{group.name}</p>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Search results mode ── */}
        {isSearching && (
          <div className="space-y-6">

            {/* Wards results */}
            {filteredWards.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wards</p>
                {filteredWards.map((ward) => (
                  <button
                    key={ward.id}
                    onClick={() => navigate(`/ward/${ward.id}`)}
                    className="w-full flex items-center gap-3 bg-card rounded-2xl p-4 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{ward.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{ward.address}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Groups results */}
            {filteredGroups.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groups</p>
                {filteredGroups.map((group) => (
                  <div key={group.id} className="flex items-center gap-3 bg-card rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Events results */}
            {searching ? (
              <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
            ) : eventResults.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Events</p>
                {eventResults.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => navigate(`/event/${event.id}`)}
                    className="w-full flex items-center gap-3 bg-card rounded-2xl p-3 hover:shadow-md transition-shadow text-left"
                  >
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight line-clamp-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(event.date)}</p>
                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {/* No results at all */}
            {!searching && filteredWards.length === 0 && filteredGroups.length === 0 && eventResults.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <p className="text-base font-medium">No results for "{query}"</p>
                <p className="text-sm text-muted-foreground">Try a different keyword</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
