import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MoreHorizontal, Trash2, Pencil, Users } from "lucide-react";
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
      // Groups the user owns
      const { data: owned } = await supabase
        .from("groups")
        .select("id, name, description, avatar_url, cover_image_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Groups the user co-admins (accepted)
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

      // Merge, dedupe by id (in case someone is both owner and has an admin row)
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
      className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer flex flex-col"
    >
      <div className="relative">
        {group.cover_image_url ? (
          <img src={group.cover_image_url} alt={group.name} className="w-full h-28 object-cover" />
        ) : (
          <div className="w-full h-28 bg-secondary flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Avatar */}
        <div className="absolute -bottom-6 left-3">
          <div className="w-12 h-12 rounded-full border-2 border-background bg-muted overflow-hidden flex items-center justify-center">
            {group.avatar_url
              ? <img src={group.avatar_url} className="w-full h-full object-cover" />
              : <span className="text-xl">👥</span>}
          </div>
        </div>

        {/* Role badge */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.role === "admin" ? "bg-black/60 text-white" : "bg-purple-600/80 text-white"}`}>
            {group.role === "admin" ? "Admin" : "Co-admin"}
          </span>
        </div>

        {/* Menu */}
        <div
          className="absolute top-2 right-2"
          ref={openMenuId === group.id ? menuRef : null}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === group.id ? null : group.id); }}
            className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <MoreHorizontal className="h-4 w-4 text-white" />
          </button>
          {openMenuId === group.id && (
            <div
              className="absolute right-0 top-8 bg-card border border-border rounded-xl shadow-lg z-20 min-w-[130px] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => navigate(`/create-group/${group.id}`)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit
              </button>
              {group.role === "admin" && (
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-8 px-3 pb-3 flex flex-col gap-1">
        <h3
          className="font-semibold text-sm leading-tight line-clamp-1"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          {group.name}
        </h3>
        {group.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background pb-10">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 max-w-4xl mx-auto px-5 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Manage Groups
          </h1>
          <span className="text-sm text-muted-foreground">({groups.length})</span>
        </div>
      </header>

      <main className="flex-1 px-5 py-4">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-lg">No groups yet</p>
              <p className="text-sm text-muted-foreground">Groups you create will appear here.</p>
              <button
                onClick={() => navigate("/create-group")}
                className="mt-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
              >
                Create Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {groups.map((g) => <GroupCard key={g.id} group={g} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PublishedGroupsPage;
