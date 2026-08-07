import { CE_BG,CE_LIGHT } from '../tokens';
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MoreHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ShareMenu from "@/components/ShareMenu";

// ── Design tokens ──────────────────────────────────────────────────────────
const BG      = CE_BG;
const DARK    = "#2C2523";
const MID     = "#635C59";
const ICON_BG = "#E4DCCF";
const DIVIDER = CE_LIGHT;

// ── Location bucketing ─────────────────────────────────────────────────────
const matchesLasVegas = (g: any) => {
  const hay = `${g.name ?? ""} ${g.address ?? ""}`.toLowerCase();
  return hay.includes("las vegas") || hay.includes("nevada") || hay.includes(", nv");
};
const CA_KEYWORDS = [
  "california", ", ca", " ca ", "south bay", "santa monica",
  "los angeles", " la ", ", la", "orange county", "san diego",
  "san francisco", "long beach", "torrance", "gardena", "hawthorne",
  "inglewood", "redondo beach", "hermosa beach", "manhattan beach",
  "culver city", "venice", "pasadena", "burbank", "glendale",
  "anaheim", "irvine", "riverside", "sacramento", "fresno",
];
const matchesCalifornia = (g: any) => {
  const hay = `${g.name ?? ""} ${g.address ?? ""}`.toLowerCase();
  return CA_KEYWORDS.some((kw) => hay.includes(kw));
};

// ── Group card ─────────────────────────────────────────────────────────────
const GroupCard = ({ group, onClick }: { group: any; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col"
    style={{ borderRadius: 20 }}
  >
    <div className="relative flex-shrink-0">
      {group.cover_image_url ? (
        <img src={group.cover_image_url} alt={group.name} className="w-full object-cover" style={{ height: 140 }} />
      ) : (
        <div className="w-full flex items-center justify-center" style={{ height: 140, background: DIVIDER }}>
          <Users className="h-8 w-8" style={{ color: MID }} />
        </div>
      )}
      <div className="absolute -bottom-5 left-3">
        <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden flex items-center justify-center bg-gray-200">
          {group.avatar_url
            ? <img src={group.avatar_url} className="w-full h-full object-cover" alt="" />
            : <Users className="h-5 w-5" style={{ color: MID }} />}
        </div>
      </div>
    </div>
    <div className="pt-7 px-3 pb-4 flex flex-col gap-1">
      <h3 className="font-semibold text-sm leading-snug line-clamp-1" style={{ color: DARK, fontFamily: "'Inter', sans-serif" }}>
        {group.name}
      </h3>
      {group.description && (
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: MID }}>{group.description}</p>
      )}
    </div>
  </div>
);

// ── Section ────────────────────────────────────────────────────────────────
const Section = ({ title, groups, navigate }: { title: string; groups: any[]; navigate: (p: string) => void }) => {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 style={{ fontFamily: "'EB Garamond', Georgia, serif", color: DARK, fontSize: 22, fontWeight: 400 }}>
        {title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 12 }}>
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} onClick={() => navigate(`/group/${g.id}`)} />
        ))}
      </div>
    </div>
  );
};

// ── Component ──────────────────────────────────────────────────────────────
const Community = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setGroups(data ?? []);
        setLoading(false);
      });
  }, []);

  const lasVegasGroups  = groups.filter(matchesLasVegas);
  const californiaGroups = groups.filter((g) => !matchesLasVegas(g) && matchesCalifornia(g));
  const otherGroups     = groups.filter((g) => !matchesLasVegas(g) && !matchesCalifornia(g));
  const hasSections     = lasVegasGroups.length > 0 || californiaGroups.length > 0;

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 96 }}>
      <div className="max-w-5xl mx-auto px-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-8 pb-6">
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: "'EB Garamond', Georgia, serif", color: DARK, fontSize: 32 }}
          >
            Community
          </h1>

          <div className="relative">
            <button
              ref={menuRef}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-70"
              style={{ background: ICON_BG }}
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" style={{ color: DARK }} />
            </button>
            <ShareMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              triggerRef={menuRef}
              items={[
                { label: "Manage Groups", onClick: () => navigate("/my-published-groups") },
              ]}
            />
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-8">
            {[1, 2].map((s) => (
              <div key={s} className="space-y-3">
                <div className="sk h-6 w-36" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 12 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white overflow-hidden" style={{ borderRadius: 20 }}>
                      <div className="sk w-full" style={{ height: 140, borderRadius: 0 }} />
                      <div className="p-3 flex flex-col gap-2 pt-7">
                        <div className="sk h-4 w-4/5" />
                        <div className="sk h-3 w-3/5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-16 pb-8 px-6">
            <img src="/Empty%20state/trees.png?v=3" alt="" style={{ width: 220, height: 220, objectFit: "contain" }} className="mb-1" />
            <p className="font-semibold mb-2" style={{ fontFamily: "'EB Garamond', Georgia, serif", color: DARK, fontSize: 20 }}>
              Find your community
            </p>
            <p className="text-sm leading-relaxed max-w-xs mb-6" style={{ color: MID }}>
              You're not part of any groups yet. Create or join a group to get started.
            </p>
            <button
              onClick={() => navigate("/create-group")}
              className="px-8 py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: "#1F4E5B" }}
            >
              Start New Group
            </button>
          </div>
        ) : hasSections ? (
          <div className="space-y-8">
            <Section title="Las Vegas" groups={lasVegasGroups} navigate={navigate} />
            <Section title="California" groups={californiaGroups} navigate={navigate} />
            {otherGroups.length > 0 && (
              <Section title="More" groups={otherGroups} navigate={navigate} />
            )}
          </div>
        ) : (
          /* No location data — flat grid fallback */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 12 }}>
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} onClick={() => navigate(`/group/${g.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;
