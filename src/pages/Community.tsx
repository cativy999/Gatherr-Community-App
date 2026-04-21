import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

const Community = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-5 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Community
          </h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading...</p>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center pt-16">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-lg">No groups yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Create a group to build a community around shared interests.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigate(`/group/${group.id}`)}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
                    {group.avatar_url ? (
                      <img src={group.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                      {group.name}
                    </p>
                    {group.address && (
                      <p className="text-xs text-muted-foreground truncate">{group.address}</p>
                    )}
                    {group.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{group.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Community;