import { CE_BG } from '../tokens';
import { Search as SearchIcon, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ── Design tokens ──────────────────────────────────────────────────────────
const BG       = CE_BG;
const DARK     = "#2C2523";
const MID      = "#635C59";
const TEAL     = "#1F4E5B";
const ICON_BG  = "#E4DCCF";
const DIVIDER  = "#E4DCCF";
const INTER    = "'Inter', sans-serif";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const GREEN    = "rgb(91, 138, 122)";

// ── Static data ────────────────────────────────────────────────────────────
const WARDS = [
  { id: "6ce56e22-5eea-4c53-ade0-069c5cf67f67", name: "YSA Santa Monica Ward", address: "3400 Sawtelle Blvd, Los Angeles, CA" },
  { id: "9f294607-b74a-4ca2-8935-895cf23c6d37", name: "YSA South Bay Ward",    address: "2615 Marine Ave, Gardena, CA" },
  { id: "9c0a1145-e9a2-48d4-b31b-4ac6df608f15", name: "Glendale SA Ward",      address: "1130 E Chevy Chase Dr, Glendale, CA" },
];
const GROUPS = [
  { id: "hiking",     name: "Hiking Group",     description: "Weekend hikes around LA" },
  { id: "pickleball", name: "Pickleball Group", description: "Weekly pickleball games" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
};

// ── Sub-components ─────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{
    fontFamily: INTER, fontSize: 11, fontWeight: 600,
    color: MID, letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: 8,
  }}>
    {children}
  </p>
);

const RowCard = ({ onClick, left, title, sub1, sub2 }: {
  onClick: () => void;
  left: React.ReactNode;
  title: string;
  sub1?: React.ReactNode;
  sub2?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className="w-full text-left flex items-center gap-3 bg-white hover:opacity-80 transition-opacity"
    style={{ borderRadius: 16, border: `1px solid ${DIVIDER}`, padding: "12px 14px" }}
  >
    {left}
    <div className="min-w-0 flex-1">
      <p style={{ fontFamily: INTER, fontSize: 15, fontWeight: 600, color: DARK, lineHeight: 1.3 }}
        className="line-clamp-2">
        {title}
      </p>
      {sub1 && <div className="mt-0.5">{sub1}</div>}
      {sub2 && <div className="mt-0.5">{sub2}</div>}
    </div>
  </button>
);

const AvatarCircle = ({ src, icon }: { src?: string | null; icon?: React.ReactNode }) => (
  <div
    className="flex-shrink-0 flex items-center justify-center overflow-hidden"
    style={{ width: 42, height: 42, borderRadius: "50%", background: ICON_BG }}
  >
    {src
      ? <img src={src} alt="" className="w-full h-full object-cover" />
      : icon}
  </div>
);

const MetaText = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontFamily: INTER, fontSize: 12, color: MID }}>{children}</p>
);

const MetaRow = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-1">
    {icon}
    <span style={{ fontFamily: INTER, fontSize: 12, color: MID }} className="truncate">{text}</span>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────
const Search = () => {
  const navigate   = useNavigate();
  const inputRef   = useRef<HTMLInputElement>(null);
  const [query, setQuery]           = useState("");
  const [activeChip, setActiveChip] = useState<"wards" | "groups">("wards");
  const [eventResults, setEventResults] = useState<any[]>([]);
  const [searching, setSearching]   = useState(false);
  const [wardAvatars, setWardAvatars] = useState<Record<string, string | null>>({});

  // Auto-focus
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fetch ward avatars
  useEffect(() => {
    supabase
      .from("groups")
      .select("id, avatar_url")
      .in("id", WARDS.map((w) => w.id))
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string | null> = {};
        data.forEach((g: any) => { map[g.id] = g.avatar_url ?? null; });
        setWardAvatars(map);
      });
  }, []);

  // Debounced event search
  useEffect(() => {
    if (!query.trim()) { setEventResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const now   = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { data } = await supabase
        .from("events")
        .select("id, title, image_url, date, time, start_time, location, attendees, age_min, age_max")
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

  const filteredWards  = WARDS.filter((w) => w.name.toLowerCase().includes(query.toLowerCase()));
  const filteredGroups = GROUPS.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));
  const isSearching    = query.trim().length > 0;

  // ── Chip button ──────────────────────────────────────────────────────────
  const Chip = ({ id, label }: { id: "wards" | "groups"; label: string }) => {
    const active = activeChip === id;
    return (
      <button
        onClick={() => setActiveChip(id)}
        style={{
          fontFamily: INTER, fontSize: 13, fontWeight: 500,
          padding: "7px 16px", borderRadius: 999,
          background: active ? TEAL : "white",
          color: active ? "white" : DARK,
          border: `1px solid ${active ? TEAL : DIVIDER}`,
          transition: "all 0.15s",
          flexShrink: 0,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 96 }}>
      <div className="max-w-2xl mx-auto px-5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ paddingTop: 32, paddingBottom: 20 }}>
          <h1 style={{ fontFamily: CORMORANT, color: DARK, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
            Search
          </h1>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-2"
          style={{
            background: "white", borderRadius: 14,
            border: `1px solid ${DIVIDER}`,
            padding: "10px 14px", marginBottom: 14,
          }}
        >
          <SearchIcon style={{ width: 16, height: 16, color: MID, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wards, groups, events…"
            className="flex-1 bg-transparent outline-none"
            style={{ fontFamily: INTER, fontSize: 14, color: DARK }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ color: MID, fontSize: 16, lineHeight: 1, flexShrink: 0 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Browse chips (no query) ──────────────────────────────────── */}
        {!isSearching && (
          <div className="flex gap-2" style={{ marginBottom: 20 }}>
            <Chip id="wards"  label="Wards" />
            <Chip id="groups" label="Popular Groups" />
          </div>
        )}

        {/* ── Browse: Wards ────────────────────────────────────────────── */}
        {!isSearching && activeChip === "wards" && (
          <div className="flex flex-col gap-2">
            {WARDS.map((ward) => (
              <RowCard
                key={ward.id}
                onClick={() => navigate(`/group/${ward.id}`)}
                left={<AvatarCircle src={wardAvatars[ward.id]} icon={<Users style={{ width: 18, height: 18, color: MID }} />} />}
                title={ward.name}
                sub1={
                  <MetaRow
                    icon={<MapPin style={{ width: 12, height: 12, color: MID, flexShrink: 0 }} />}
                    text={ward.address}
                  />
                }
              />
            ))}
          </div>
        )}

        {/* ── Browse: Groups ───────────────────────────────────────────── */}
        {!isSearching && activeChip === "groups" && (
          <div className="flex flex-col gap-2">
            {GROUPS.map((group) => (
              <RowCard
                key={group.id}
                onClick={() => {}}
                left={<AvatarCircle icon={<Users style={{ width: 18, height: 18, color: MID }} />} />}
                title={group.name}
                sub1={<MetaText>{group.description}</MetaText>}
              />
            ))}
          </div>
        )}

        {/* ── Search results ───────────────────────────────────────────── */}
        {isSearching && (
          <div className="flex flex-col gap-6">

            {/* Wards */}
            {filteredWards.length > 0 && (
              <div>
                <SectionLabel>Wards</SectionLabel>
                <div className="flex flex-col gap-2">
                  {filteredWards.map((ward) => (
                    <RowCard
                      key={ward.id}
                      onClick={() => navigate(`/group/${ward.id}`)}
                      left={<AvatarCircle src={wardAvatars[ward.id]} icon={<Users style={{ width: 18, height: 18, color: MID }} />} />}
                      title={ward.name}
                      sub1={
                        <MetaRow
                          icon={<MapPin style={{ width: 12, height: 12, color: MID, flexShrink: 0 }} />}
                          text={ward.address}
                        />
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Groups */}
            {filteredGroups.length > 0 && (
              <div>
                <SectionLabel>Groups</SectionLabel>
                <div className="flex flex-col gap-2">
                  {filteredGroups.map((group) => (
                    <RowCard
                      key={group.id}
                      onClick={() => {}}
                      left={<AvatarCircle icon={<Users style={{ width: 18, height: 18, color: MID }} />} />}
                      title={group.name}
                      sub1={<MetaText>{group.description}</MetaText>}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Events */}
            {searching ? (
              <p style={{ fontFamily: INTER, fontSize: 14, color: MID, textAlign: "center", paddingTop: 16 }}>
                Searching…
              </p>
            ) : eventResults.length > 0 ? (
              <div>
                <SectionLabel>Events</SectionLabel>
                <div className="flex flex-col gap-2">
                  {eventResults.map((event) => (
                    <RowCard
                      key={event.id}
                      onClick={() => navigate(`/event/${event.id}`)}
                      left={
                        event.image_url
                          ? <img src={event.image_url} alt={event.title}
                              style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                          : <div style={{ width: 56, height: 56, borderRadius: 10, background: ICON_BG, flexShrink: 0 }} />
                      }
                      title={event.title}
                      sub1={
                        <p style={{ fontFamily: INTER, fontSize: 12, color: GREEN, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {formatDate(event.date)}
                        </p>
                      }
                      sub2={event.location
                        ? <MetaRow
                            icon={<MapPin style={{ width: 12, height: 12, color: MID, flexShrink: 0 }} />}
                            text={event.location}
                          />
                        : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {/* No results */}
            {!searching && filteredWards.length === 0 && filteredGroups.length === 0 && eventResults.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 64 }}>
                <p style={{ fontFamily: CORMORANT, fontSize: 22, color: DARK, fontWeight: 600, marginBottom: 6 }}>
                  No results for "{query}"
                </p>
                <p style={{ fontFamily: INTER, fontSize: 14, color: MID }}>Try a different keyword</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Search;
