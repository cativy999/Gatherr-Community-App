import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BedDouble } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { isOwnerUserId } from "@/lib/admin";

interface Props {
  eventId: string;
}

const LodgingSection = ({ eventId }: Props) => {
  const { session } = useAuth();
  const navigate = useNavigate();
  // undefined = loading, null = no group, string = groupId
  const [groupId, setGroupId] = useState<string | null | undefined>(undefined);
  const isOwner = isOwnerUserId(session?.user?.id);

  useEffect(() => {
    if (!isOwner) return;
    supabase
      .from("lodging_groups")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle()
      .then(({ data }) => setGroupId(data?.id ?? null));
  }, [eventId, isOwner]);

  // Feature-flagged: only visible to owner accounts
  if (!isOwner || groupId === undefined) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        Lodging
      </h2>

      {groupId ? (
        // Existing group — show a summary card
        <button
          onClick={() => navigate(`/event/${eventId}/lodging/${groupId}`)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-accent/30 transition-colors text-left"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 flex-shrink-0">
            <BedDouble className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">View Lodging Group</p>
            <p className="text-xs text-muted-foreground">Tap to manage options and rooms</p>
          </div>
        </button>
      ) : (
        // No group yet — entry buttons
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/event/${eventId}/lodging/new`)}
            className="flex-1 py-3 px-4 rounded-2xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            Need Lodging
          </button>
          <button
            onClick={() => navigate(`/event/${eventId}/lodging/new`)}
            className="flex-1 py-3 px-4 rounded-2xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Start Lodging Group
          </button>
        </div>
      )}
    </div>
  );
};

export default LodgingSection;
