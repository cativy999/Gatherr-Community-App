import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface InviteInfo {
  event_id: string;
  event_title: string;
  invited_by_name: string;
  revoked: boolean;
  already_member: boolean;
}

const CohostInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .rpc("get_cohost_invite_info", { p_token: token })
      .then(({ data, error: rpcError }) => {
        if (rpcError || !data || data.length === 0) {
          setError("This invite link isn't valid.");
        } else {
          setInfo(data[0]);
        }
        setLoading(false);
      });
  }, [token]);

  const handleSignIn = () => {
    if (token) localStorage.setItem("postAuthRedirect", `/cohost-invite/${token}`);
    navigate("/");
  };

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    const { data, error: rpcError } = await supabase.rpc("accept_cohost_invite", { p_token: token });
    setAccepting(false);
    if (rpcError) {
      toast.error(rpcError.message || "Couldn't accept this invite.");
      return;
    }
    toast.success("You're now a co-host!");
    navigate(`/event/${data ?? info?.event_id}`);
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-2">
        <p className="text-lg font-semibold">Invite not found</p>
        <p className="text-sm text-muted-foreground">{error ?? "This invite link isn't valid."}</p>
        <button onClick={() => navigate("/wards")} className="mt-4 px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold">
          Go to Gatherr
        </button>
      </div>
    );
  }

  if (info.revoked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-2">
        <p className="text-lg font-semibold">This invite link has been turned off</p>
        <p className="text-sm text-muted-foreground">Ask the host of "{info.event_title}" for a new link.</p>
        <button onClick={() => navigate("/wards")} className="mt-4 px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold">
          Go to Gatherr
        </button>
      </div>
    );
  }

  if (info.already_member) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-2">
        <p className="text-lg font-semibold">You're already in on this one</p>
        <p className="text-sm text-muted-foreground">You already have host access to "{info.event_title}".</p>
        <button onClick={() => navigate(`/event/${info.event_id}`)} className="mt-4 px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold">
          View Event
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-1">
        <Users className="h-6 w-6 text-primary" />
      </div>
      <p className="text-lg font-semibold">Co-host invite</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        <span className="font-semibold text-foreground">{info.invited_by_name}</span> invited you to co-host{" "}
        <span className="font-semibold text-foreground">"{info.event_title}"</span>. You'll be able to edit the
        event and help manage it.
      </p>

      {!session ? (
        <button onClick={handleSignIn} className="mt-3 px-6 py-3 rounded-full bg-black text-white text-sm font-semibold">
          Sign in to accept
        </button>
      ) : (
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => navigate("/wards")} className="px-5 py-3 rounded-full border border-gray-300 text-sm font-semibold">
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="px-6 py-3 rounded-full bg-black text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2"
          >
            {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
            Accept
          </button>
        </div>
      )}
    </div>
  );
};

export default CohostInvite;
