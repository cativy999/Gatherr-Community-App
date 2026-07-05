import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const GroupAdminInvite = () => {
  const { inviteId } = useParams<{ inviteId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [invite, setInvite] = useState<{
    id: string;
    groupId: string;
    groupName: string;
    groupAvatar: string | null;
    inviterName: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteId) return;

    const load = async () => {
      // Fetch the group_admins row
      const { data: adminRow } = await supabase
        .from("group_admins")
        .select("id, group_id, user_id, invited_by, status")
        .eq("id", inviteId)
        .maybeSingle();

      if (!adminRow) {
        setError("Invite not found.");
        setLoading(false);
        return;
      }

      // Confirm this invite is for the current user
      if (session && adminRow.user_id !== session.user.id) {
        setError("This invite isn't for your account.");
        setLoading(false);
        return;
      }

      // Fetch group info + inviter profile in parallel
      const [{ data: group }, { data: inviter }] = await Promise.all([
        supabase.from("groups").select("id, name, avatar_url").eq("id", adminRow.group_id).maybeSingle(),
        supabase.from("profiles").select("name").eq("user_id", adminRow.invited_by).maybeSingle(),
      ]);

      setInvite({
        id:          adminRow.id,
        groupId:     adminRow.group_id,
        groupName:   group?.name ?? "Unknown Group",
        groupAvatar: group?.avatar_url ?? null,
        inviterName: inviter?.name ?? "Someone",
        status:      adminRow.status,
      });
      setLoading(false);
    };

    load();
  }, [inviteId, session]);

  const handleRespond = async (accept: boolean) => {
    if (!invite || !session) return;
    setResponding(true);

    const newStatus = accept ? "accepted" : "declined";

    const { error: updateErr } = await supabase
      .from("group_admins")
      .update({ status: newStatus })
      .eq("id", invite.id);

    if (updateErr) {
      toast.error("Something went wrong. Please try again.");
      setResponding(false);
      return;
    }

    // Notify the group owner of the outcome
    const { data: ownerRow } = await supabase
      .from("groups")
      .select("user_id")
      .eq("id", invite.groupId)
      .maybeSingle();

    if (ownerRow?.user_id) {
      const myName = session.user.user_metadata?.name ?? session.user.email ?? "Someone";
      await supabase.from("notifications").insert({
        user_id:      ownerRow.user_id,
        from_user_id: session.user.id,
        type:         accept ? "group_coadmin_accepted" : "group_coadmin_declined",
        message:      accept
          ? `${myName} accepted your co-admin invite for "${invite.groupName}".`
          : `${myName} declined your co-admin invite for "${invite.groupName}".`,
        reference_id: invite.id,
        read:         false,
      });
    }

    if (accept) {
      toast.success("You're now a co-admin!");
      navigate(`/group/${invite.groupId}`);
    } else {
      toast.success("Invite declined.");
      navigate("/community");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-2xl">😕</p>
        <p className="text-base font-medium">{error ?? "Something went wrong."}</p>
        <button onClick={() => navigate("/community")} className="text-sm text-primary underline underline-offset-2">
          Go home
        </button>
      </div>
    );
  }

  if (invite.status !== "pending") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-2xl">{invite.status === "accepted" ? "✅" : "👋"}</p>
        <p className="text-base font-medium">
          {invite.status === "accepted"
            ? "You already accepted this invite."
            : "This invite has already been used."}
        </p>
        <button onClick={() => navigate(`/group/${invite.groupId}`)} className="text-sm text-primary underline underline-offset-2">
          View group
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Group avatar */}
        <div className="w-20 h-20 rounded-full bg-muted border-4 border-background overflow-hidden flex items-center justify-center shadow-md">
          {invite.groupAvatar
            ? <img src={invite.groupAvatar} className="w-full h-full object-cover" />
            : <span className="text-3xl">👥</span>
          }
        </div>

        {/* Message */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Co-Admin Invite
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{invite.inviterName}</span> invited you to
            co-admin the{" "}
            <span className="font-semibold text-foreground">{invite.groupName}</span> group.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            As a co-admin you can edit the group page, but cannot invite other co-admins.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={() => handleRespond(true)}
            disabled={responding}
            className="w-full h-12 rounded-2xl text-base font-semibold"
          >
            {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept Invite"}
          </Button>
          <Button
            onClick={() => handleRespond(false)}
            disabled={responding}
            variant="outline"
            className="w-full h-12 rounded-2xl text-base font-semibold"
          >
            Decline
          </Button>
        </div>

      </div>
    </div>
  );
};

export default GroupAdminInvite;
