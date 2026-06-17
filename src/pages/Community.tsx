import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import VideoBackground from "@/components/VideoBackground";

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
    <div className="relative flex min-h-screen flex-col pb-20">
      <VideoBackground />
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm px-5 py-4">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {groups.map((group) => (
                <div
                  key={group.id}
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
                    <div className="absolute -bottom-6 left-3">
                      <div className="w-12 h-12 rounded-full border-2 border-background bg-muted overflow-hidden flex items-center justify-center">
                        {group.avatar_url
                          ? <img src={group.avatar_url} className="w-full h-full object-cover" />
                          : <span className="text-xl">👥</span>}
                      </div>
                    </div>
                  </div>
                  <div className="pt-8 px-3 pb-3 flex flex-col gap-1">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>
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