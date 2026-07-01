import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
  const [accepted, setAccepted] = useState<string | null>(null); // event_id after accept

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
    if (!token || !info) return;
    setAccepting(true);
    const { data, error: rpcError } = await supabase.rpc("accept_cohost_invite", { p_token: token });
    if (rpcError) {
      setAccepting(false);
      toast.error(rpcError.message || "Couldn't accept this invite.");
      return;
    }

    // Send notifications — fetch host user_id + co-host's display name in parallel
    const eventId = data ?? info.event_id;
    const [{ data: eventRow }, { data: myProfile }] = await Promise.all([
      supabase.from("events").select("user_id").eq("id", info.event_id).single(),
      supabase.from("profiles").select("name").eq("user_id", session!.user.id).single(),
    ]);
    const myName = myProfile?.name || "Someone";
    const hostUserId = eventRow?.user_id;

    // Notifications are best-effort — don't let them block the accept flow
    try {
      await Promise.all([
        hostUserId
          ? supabase.from("notifications").insert({
              user_id: hostUserId,
              from_user_id: session!.user.id,
              type: "cohost_accepted",
              message: `${myName} accepted your co-host invite for "${info.event_title}"`,
              event_id: info.event_id,
            })
          : Promise.resolve(),
        supabase.from("notifications").insert({
          user_id: session!.user.id,
          from_user_id: session!.user.id,
          type: "cohost_accepted",
          message: `You're now a co-host for "${info.event_title}" — you can edit and manage it`,
          event_id: info.event_id,
        }),
      ]);
    } catch (_) {
      // Notification failure is non-fatal
    }

    setAccepting(false);
    setAccepted(eventId);
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
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-4">
        <img src="/Cohost mobile.png" alt="" className="h-[100px] w-auto md:hidden" />
        <img src="/Cohost desktop.png" alt="" className="h-[80px] w-auto hidden md:block" />
        <p className="text-lg font-semibold">You're already in on this one</p>
        <p className="text-sm text-muted-foreground max-w-xs">You already have host access to "{info.event_title}".</p>
        <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
          <button onClick={() => navigate(`/event/${info.event_id}`)} className="w-full px-6 py-3.5 rounded-full bg-black text-white text-sm font-semibold">
            View Event
          </button>
          <button onClick={() => navigate("/wards")} className="w-full px-6 py-3.5 rounded-full border border-gray-300 text-sm font-semibold">
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-4">
        <img src="/Cohost mobile.png" alt="" className="h-[100px] w-auto md:hidden" />
        <img src="/Cohost desktop.png" alt="" className="h-[80px] w-auto hidden md:block" />
        <p className="text-xl font-bold">You're now a co-host! 🎉</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          You can edit and manage <span className="font-semibold text-foreground">"{info?.event_title}"</span> alongside the host.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
          <button
            onClick={() => navigate(`/event/${accepted}`)}
            className="w-full px-6 py-3.5 rounded-full bg-black text-white text-sm font-semibold"
          >
            View Event
          </button>
          <button
            onClick={() => navigate("/wards")}
            className="w-full px-6 py-3.5 rounded-full border border-gray-300 text-sm font-semibold"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-3">
      <img src="/Cohost mobile.png" alt="" className="h-[100px] w-auto md:hidden mb-1" />
      <img src="/Cohost desktop.png" alt="" className="h-[80px] w-auto hidden md:block mb-1" />
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
