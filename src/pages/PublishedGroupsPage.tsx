import { CE_BG } from '../tokens';

// Hover-zoom (reuse the same CSS injected by Community.tsx — no-op if already there)
if (typeof document !== "undefined" && !document.getElementById("gc-zoom-style")) {
  const s = document.createElement("style");
  s.id = "gc-zoom-style";
  s.textContent = `
    .gc-img { transition: transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
    @media (min-width: 768px) {
      .gc-img-wrap:hover .gc-img { transform: scale(1.08); }
    }
  `;
  document.head.appendChild(s);
}
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, MoreHorizontal, Trash2, Pencil, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Group = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  role: "admin" | "coadmin";
};

const BG   = CE_BG;
const DARK = "#2C2523";
const MID  = "#635C59";
const TEAL = "#1F4E5B";

const PublishedGroupsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!session?.user) { setLoading(false); return; }
    const userId = session.user.id;

    const loadGroups = async () => {
      const { data: owned } = await supabase
        .from("groups")
        .select("id, name, description, avatar_url, cover_image_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const { data: adminRows } = await supabase
        .from("group_admins")
        .select("group_id")
        .eq("user_id", userId)
        .eq("status", "accepted");

      let coAdminGroups: Group[] = [];
      if (adminRows && adminRows.length > 0) {
        const groupIds = adminRows.map((r: any) => r.group_id);
        const { data: coOwned } = await supabase
          .from("groups")
          .select("id, name, description, avatar_url, cover_image_url")
          .in("id", groupIds)
          .order("created_at", { ascending: false });
        coAdminGroups = (coOwned ?? []).map((g: any) => ({ ...g, role: "coadmin" as const }));
      }

      const ownedWithRole: Group[] = (owned ?? []).map((g: any) => ({ ...g, role: "admin" as const }));

      const seen = new Set<string>();
      const merged = [...ownedWithRole, ...coAdminGroups].filter((g) => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      });

      setGroups(merged);
      setLoading(false);
    };

    loadGroups();
  }, [session]);

  const deleteGroup = async (id: string) => {
    setOpenMenuId(null);
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) { toast.error("Failed to delete group"); return; }
    setGroups((prev) => prev.filter((g) => g.id !== id));
    toast.success("Group deleted");
  };

  const GroupCard = ({ group }: { group: Group }) => (
    <div
      onClick={() => navigate(`/group/${group.id}`)}
      className="bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderRadius: 24 }}
    >
      {/* Cover image */}
      <div className="relative">
        <div className="gc-img-wrap overflow-hidden" style={{ height: 140 }}>
          {group.cover_image_url ? (
            <img
              src={group.cover_image_url}
              alt={group.name}
              className="gc-img w-full object-cover"
              style={{ height: 140 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Role badge */}
        <div className="absolute top-3 left-3">
          <span
            className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full text-white"
            style={{ background: group.role === "admin" ? TEAL : "#7C3AED" }}
          >
            {group.role === "admin" ? "Admin" : "Co-admin"}
          </span>
        </div>

        {/* ··· menu */}
        <div
          className="absolute top-2.5 right-2.5"
          ref={openMenuId === group.id ? menuRef : null}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === group.id ? null : group.id); }}
            className="p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-700" />
          </button>
          {openMenuId === group.id && (
            <div
              className="absolute right-0 top-9 bg-white border border-gray-100 rounded-2xl shadow-lg z-20 min-w-[140px] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => navigate(`/create-group/${group.id}`)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-gray-500" /> Edit
              </button>
              {group.role === "admin" && (
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Avatar overlapping bottom of image */}
        <div className="absolute -bottom-5 left-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden flex items-center justify-center"
          >
            {group.avatar_url
              ? <img src={group.avatar_url} className="w-full h-full object-cover" />
              : <Users className="h-5 w-5 text-gray-400" />}
          </div>
        </div>
      </div>

      {/* Text content */}
      <div className="pt-7 px-3 pb-4">
        <h3
          className="font-bold text-sm leading-snug line-clamp-1 text-gray-900"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {group.name}
        </h3>
        {group.description && (
          <p
            className="text-xs mt-0.5 line-clamp-2 leading-relaxed"
            style={{ color: "#635C59" }}
          >
            {group.description}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      <div className="max-w-5xl mx-auto px-5 pt-6">

        {/* Back + Title */}
        <div className="flex items-center gap-4 pt-2 pb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-70"
            style={{ background: "#E4DCCF" }}
          >
            <ChevronLeft className="h-5 w-5" style={{ color: "#2C2523" }} />
          </button>
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: "'EB Garamond', Georgia, serif", color: "#2C2523", fontSize: 32 }}
          >
            Manage Group{groups.length !== 1 ? "s" : ""}{!loading && ` (${groups.length})`}
          </h1>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: TEAL }} />
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
              style={{ background: TEAL }}
            >
              Start New Group
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 12 }}>
            {groups.map((g) => <GroupCard key={g.id} group={g} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublishedGroupsPage;
