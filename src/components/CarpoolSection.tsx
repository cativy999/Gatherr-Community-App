import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { X, ChevronRight } from "lucide-react";

interface CarpoolPost {
  id: string;
  user_id: string;
  type: "driver" | "rider";
  has_car: boolean;
  pickup_needed: boolean;
  pickup_offered: boolean;
  seats: number | null;
  departure_window: string | null;
  lat: number | null;
  lng: number | null;
  distance?: number;
  seats_taken: number;
  profile: { name: string; avatar_url: string | null };
}

interface CarpoolRequest {
  id: string;
  carpool_post_id: string;
  requester_user_id: string;
  status: "pending" | "accepted" | "declined";
  profile?: { name: string; avatar_url: string | null };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number) {
  const mi = km * 0.621371;
  return mi < 1 ? "< 1 mi" : `${Math.round(mi)} mi`;
}

function Avatar({ url, name, size = 9 }: { url: string | null; name: string; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gray-200 overflow-hidden shrink-0`}>
      {url ? (
        <img src={url} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
          {name[0]}
        </div>
      )}
    </div>
  );
}

export default function CarpoolSection({ eventId }: { eventId: string }) {
  const { session } = useAuth();
  const { locationLat, locationLng } = useLocation();
  const userId = session?.user?.id;

  const [posts, setPosts] = useState<CarpoolPost[]>([]);
  const [myPost, setMyPost] = useState<CarpoolPost | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modal, setModal] = useState<"rider" | "driver" | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<CarpoolPost | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  // Rider form
  const [hasCar, setHasCar] = useState<boolean | null>(null);
  const [pickupNeeded, setPickupNeeded] = useState<boolean | null>(null);

  // Driver form
  const [seats, setSeats] = useState(3);
  const [departure, setDeparture] = useState<string | null>(null);
  const [pickupOffered, setPickupOffered] = useState<boolean | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Requests
  const [myRequest, setMyRequest] = useState<CarpoolRequest | null>(null);
  const [driverRequests, setDriverRequests] = useState<CarpoolRequest[]>([]);

  useEffect(() => { fetchAll(); }, [eventId, userId]);

  const fetchAll = async () => {
    setLoading(true);

    const { data: rows } = await supabase
      .from("carpool_posts")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (!rows) { setLoading(false); return; }

    // Fetch requests counts
    const postIds = rows.map((r: any) => r.id);
    const { data: allRequests } = postIds.length
      ? await supabase.from("carpool_requests").select("*").in("carpool_post_id", postIds)
      : { data: [] };

    // Fetch profiles
    const uids = [...new Set(rows.map((r: any) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", uids);

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p: any) => [p.user_id, p])
    );

    const mapped: CarpoolPost[] = rows.map((row: any) => {
      const accepted = (allRequests ?? []).filter(
        (r: any) => r.carpool_post_id === row.id && r.status === "accepted"
      ).length;
      return {
        id: row.id,
        user_id: row.user_id,
        type: row.type,
        has_car: row.has_car,
        pickup_needed: row.pickup_needed,
        pickup_offered: row.pickup_offered ?? false,
        seats: row.seats,
        departure_window: row.departure_window,
        lat: row.lat,
        lng: row.lng,
        seats_taken: accepted,
        profile: profileMap[row.user_id] ?? { name: "Someone", avatar_url: null },
        distance:
          locationLat && locationLng && row.lat && row.lng
            ? haversineKm(locationLat, locationLng, row.lat, row.lng)
            : undefined,
      };
    });

    mapped.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    setPosts(mapped);

    const mine = userId ? (mapped.find((p) => p.user_id === userId) ?? null) : null;
    setMyPost(mine);

    // Load my request (to any driver)
    if (userId && postIds.length) {
      const req = (allRequests ?? []).find(
        (r: any) => r.requester_user_id === userId
      );
      setMyRequest(req ?? null);
    }

    // Load requests for my driver post + their profiles
    if (mine?.type === "driver") {
      const reqs = (allRequests ?? []).filter(
        (r: any) => r.carpool_post_id === mine.id
      );
      if (reqs.length) {
        const reqUids = reqs.map((r: any) => r.requester_user_id);
        const { data: reqProfiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", reqUids);
        const reqProfileMap = Object.fromEntries(
          (reqProfiles ?? []).map((p: any) => [p.user_id, p])
        );
        setDriverRequests(
          reqs.map((r: any) => ({
            ...r,
            profile: reqProfileMap[r.requester_user_id] ?? { name: "Someone", avatar_url: null },
          }))
        );
      } else {
        setDriverRequests([]);
      }
    }

    setLoading(false);
  };

  const submitRider = async () => {
    if (!userId || hasCar === null) return;
    if (!hasCar && pickupNeeded === null) return;
    setSubmitting(true);
    await supabase.from("carpool_posts").upsert(
      { event_id: eventId, user_id: userId, type: "rider", has_car: hasCar,
        pickup_needed: hasCar ? false : (pickupNeeded ?? false),
        seats: null, departure_window: null, pickup_offered: false,
        lat: locationLat, lng: locationLng, status: "active" },
      { onConflict: "event_id,user_id" }
    );
    setModal(null); setHasCar(null); setPickupNeeded(null); setSubmitting(false);
    fetchAll();
  };

  const submitDriver = async () => {
    if (!userId || !departure || pickupOffered === null) return;
    setSubmitting(true);
    await supabase.from("carpool_posts").upsert(
      { event_id: eventId, user_id: userId, type: "driver", has_car: true,
        pickup_needed: false, pickup_offered: pickupOffered,
        seats, departure_window: departure,
        lat: locationLat, lng: locationLng, status: "active" },
      { onConflict: "event_id,user_id" }
    );
    setModal(null); setDeparture(null); setSeats(3); setPickupOffered(null); setSubmitting(false);
    fetchAll();
  };

  const cancelPost = async () => {
    if (!myPost) return;
    await supabase.from("carpool_posts").delete().eq("id", myPost.id);
    setMyPost(null); setManageOpen(false);
    fetchAll();
  };

  const cancelRequest = async () => {
    if (!myRequest) return;
    await supabase.from("carpool_requests").delete().eq("id", myRequest.id);
    setMyRequest(null);
    setSelectedDriver(null);
    fetchAll();
  };

  const requestRide = async (driverPost: CarpoolPost) => {
    if (!userId) return;
    setSubmitting(true);
    const { data: req } = await supabase
      .from("carpool_requests")
      .insert({ carpool_post_id: driverPost.id, requester_user_id: userId, status: "pending" })
      .select()
      .single();

    if (req) {
      // Notify the driver
      const { data: myProfile } = await supabase
        .from("profiles").select("name").eq("user_id", userId).single();
      await supabase.from("notifications").insert({
        user_id: driverPost.user_id,
        type: "carpool_request",
        message: `${myProfile?.name ?? "Someone"} requested a ride from you`,
        reference_id: req.id,
      });
    }
    setSubmitting(false);
    setSelectedDriver(null);
    fetchAll();
  };

  const respondToRequest = async (requestId: string, status: "accepted" | "declined") => {
    await supabase.from("carpool_requests").update({ status }).eq("id", requestId);
    // Notify requester
    const req = driverRequests.find((r) => r.id === requestId);
    if (req) {
      const { data: myProfile } = await supabase
        .from("profiles").select("name").eq("user_id", userId!).single();
      await supabase.from("notifications").insert({
        user_id: req.requester_user_id,
        type: status === "accepted" ? "carpool_accepted" : "carpool_declined",
        message: status === "accepted"
          ? `${myProfile?.name ?? "Your driver"} accepted your ride request! 🚗`
          : `${myProfile?.name ?? "Your driver"} couldn't take your ride request.`,
        reference_id: requestId,
      });
    }
    fetchAll();
  };

  const pendingRequests = driverRequests.filter((r) => r.status === "pending");
  const acceptedRequests = driverRequests.filter((r) => r.status === "accepted");

  const myRequestForSelected = selectedDriver
    ? myRequest?.carpool_post_id === selectedDriver.id ? myRequest : null
    : null;

  const seatsLeft = (post: CarpoolPost) =>
    post.type === "driver" && post.seats !== null
      ? Math.max(0, post.seats - post.seats_taken)
      : null;

  return (
    <>
      <div className="space-y-4">
        <h2
          className="text-[16px] font-bold pb-2 border-b"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: "rgba(0,0,0,0.1)" }}
        >
          Carpool 🚗
        </h2>

        {/* My post */}
        {myPost ? (
          <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold">
                  {myPost.type === "driver"
                    ? `You're offering a ride · ${seatsLeft(myPost)} seat${seatsLeft(myPost) !== 1 ? "s" : ""} left`
                    : "You need a ride"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {myPost.type === "driver"
                    ? `${myPost.departure_window} · ${myPost.pickup_offered ? "You pick riders up" : "Riders meet you"}`
                    : myPost.has_car
                    ? "Has car · Open to driving"
                    : myPost.pickup_needed ? "Needs pickup" : "Can meet driver"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {myPost.type === "driver" && pendingRequests.length > 0 && (
                  <button
                    onClick={() => setManageOpen(true)}
                    className="text-xs font-semibold text-white bg-black px-3 py-1.5 rounded-full"
                  >
                    {pendingRequests.length} request{pendingRequests.length !== 1 ? "s" : ""}
                  </button>
                )}
                {myPost.type === "driver" && (
                  <button onClick={() => setManageOpen(true)} className="text-xs text-gray-500 font-medium hover:underline">
                    Manage
                  </button>
                )}
                <button onClick={cancelPost} className="text-xs text-red-500 font-medium hover:underline">
                  Cancel
                </button>
              </div>
            </div>
            {/* Accepted riders */}
            {myPost.type === "driver" && acceptedRequests.length > 0 && (
              <div className="px-3 pb-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Riders:</span>
                {acceptedRequests.map((r) => (
                  <div key={r.id} title={r.profile?.name} className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                    {r.profile?.avatar_url
                      ? <img src={r.profile.avatar_url} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{r.profile?.name[0]}</div>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : session ? (
          <div className="flex gap-2">
            <button
              onClick={() => { setModal("rider"); setHasCar(null); setPickupNeeded(null); }}
              className="flex-1 h-11 rounded-xl border-2 border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors"
            >
              🙋 I need a ride
            </button>
            <button
              onClick={() => { setModal("driver"); setDeparture(null); setSeats(3); setPickupOffered(null); }}
              className="flex-1 h-11 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              🚗 I can drive
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Sign in to join carpool</p>
        )}

        {/* Posts list */}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : posts.filter(p => p.user_id !== userId).length === 0 && !myPost ? (
          <p className="text-xs text-muted-foreground text-center py-4">No carpool posts yet — be the first!</p>
        ) : (
          <div className="space-y-2">
            {posts.filter(p => p.user_id !== userId).map((post) => {
              const left = seatsLeft(post);
              const isDriver = post.type === "driver";
              const myReqForThis = myRequest?.carpool_post_id === post.id ? myRequest : null;
              return (
                <button
                  key={post.id}
                  onClick={() => isDriver ? setSelectedDriver(post) : undefined}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-left transition-colors ${isDriver ? "hover:border-gray-300 hover:bg-gray-100 cursor-pointer" : "cursor-default"}`}
                >
                  <Avatar url={post.profile.avatar_url} name={post.profile.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{post.profile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isDriver
                        ? `🚗 ${left} seat${left !== 1 ? "s" : ""} left · ${post.departure_window} · ${post.pickup_offered ? "Picks you up" : "Meet driver"}`
                        : post.has_car
                        ? "🚗 Has car · Open to driving"
                        : post.pickup_needed
                        ? "🙋 Needs pickup"
                        : "🙋 Can meet driver"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {post.distance !== undefined && (
                      <span className="text-xs text-muted-foreground">{fmtDist(post.distance)}</span>
                    )}
                    {myReqForThis && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${myReqForThis.status === "accepted" ? "bg-green-100 text-green-700" : myReqForThis.status === "declined" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                        {myReqForThis.status === "accepted" ? "✓ In" : myReqForThis.status === "declined" ? "Declined" : "Pending"}
                      </span>
                    )}
                    {isDriver && !myReqForThis && <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Driver detail sheet ── */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setSelectedDriver(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-6 space-y-5 pb-28 md:pb-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Ride offer</h3>
              <button onClick={() => setSelectedDriver(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>

            <div className="flex items-center gap-3">
              <Avatar url={selectedDriver.profile.avatar_url} name={selectedDriver.profile.name} size={12} />
              <div>
                <p className="font-semibold">{selectedDriver.profile.name}</p>
                {selectedDriver.distance !== undefined && (
                  <p className="text-xs text-muted-foreground">{fmtDist(selectedDriver.distance)} from you</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-lg font-bold">{seatsLeft(selectedDriver)}</p>
                <p className="text-xs text-muted-foreground">seats left</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm font-semibold">{selectedDriver.departure_window}</p>
                <p className="text-xs text-muted-foreground">departure</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm font-semibold">{selectedDriver.pickup_offered ? "Picks up" : "Meet there"}</p>
                <p className="text-xs text-muted-foreground">pickup</p>
              </div>
            </div>

            {!myPost || myPost.user_id === userId ? (
              myRequestForSelected ? (
                <div className="space-y-2">
                  <div className={`w-full h-12 rounded-xl flex items-center justify-center text-sm font-semibold ${myRequestForSelected.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" : myRequestForSelected.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                    {myRequestForSelected.status === "accepted" ? "✓ You're in!" : myRequestForSelected.status === "declined" ? "Request declined" : "⏳ Request sent — waiting for driver"}
                  </div>
                  {myRequestForSelected.status !== "accepted" && (
                    <button
                      onClick={cancelRequest}
                      className="w-full h-10 rounded-xl border border-red-200 text-red-500 text-sm font-medium"
                    >
                      Cancel request
                    </button>
                  )}
                </div>
              ) : myPost?.type === "driver" ? (
                <p className="text-xs text-muted-foreground text-center">You already posted as a driver</p>
              ) : (seatsLeft(selectedDriver) ?? 0) > 0 ? (
                <button
                  onClick={() => requestRide(selectedDriver)}
                  disabled={submitting}
                  className="w-full h-12 rounded-xl bg-black text-white font-semibold text-sm disabled:opacity-40"
                >
                  {submitting ? "Sending…" : "Request a Ride"}
                </button>
              ) : (
                <div className="w-full h-12 rounded-xl flex items-center justify-center text-sm font-semibold bg-gray-100 text-gray-400">
                  No seats left
                </div>
              )
            ) : null}
          </div>
        </div>
      )}

      {/* ── Manage requests sheet (driver) ── */}
      {manageOpen && myPost?.type === "driver" && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setManageOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-6 space-y-5 pb-28 md:pb-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Manage Ride</h3>
              <button onClick={() => setManageOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>

            <div className="text-sm text-muted-foreground">
              {seatsLeft(myPost)} of {myPost.seats} seats left · {myPost.departure_window} · {myPost.pickup_offered ? "You pick up" : "Riders meet you"}
            </div>

            {driverRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No requests yet</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending</p>
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="flex items-center gap-3">
                        <Avatar url={req.profile?.avatar_url ?? null} name={req.profile?.name ?? "?"} />
                        <p className="flex-1 text-sm font-medium">{req.profile?.name}</p>
                        <button onClick={() => respondToRequest(req.id, "declined")} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 font-medium">Decline</button>
                        <button onClick={() => respondToRequest(req.id, "accepted")} className="text-xs px-3 py-1.5 rounded-full bg-black text-white font-medium">Accept</button>
                      </div>
                    ))}
                  </>
                )}
                {acceptedRequests.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">In your car</p>
                    {acceptedRequests.map((req) => (
                      <div key={req.id} className="flex items-center gap-3">
                        <Avatar url={req.profile?.avatar_url ?? null} name={req.profile?.name ?? "?"} />
                        <p className="flex-1 text-sm font-medium">{req.profile?.name}</p>
                        <span className="text-xs text-green-600 font-semibold">✓ Accepted</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            <button onClick={cancelPost} className="w-full h-11 rounded-xl border border-red-200 text-red-500 text-sm font-semibold">
              Cancel my ride offer
            </button>
          </div>
        </div>
      )}

      {/* ── Rider form ── */}
      {modal === "rider" && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-6 space-y-5 pb-28 md:pb-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">I need a ride</h3>
              <button onClick={() => setModal(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Do you have a car?</p>
              <div className="flex gap-2">
                {[{ label: "Yes, I have a car", val: true }, { label: "No car", val: false }].map(({ label, val }) => (
                  <button key={label} type="button"
                    onClick={() => { setHasCar(val); setPickupNeeded(null); }}
                    className={`flex-1 h-11 rounded-xl border-2 text-sm font-semibold transition-all ${hasCar === val ? "bg-black text-white border-black" : "border-gray-200"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {hasCar === false && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Can you get to the driver, or need pickup?</p>
                <div className="flex flex-col gap-2">
                  {[{ label: "I can meet the driver 📍", val: false }, { label: "I need to be picked up 🚪", val: true }].map(({ label, val }) => (
                    <button key={label} type="button"
                      onClick={() => setPickupNeeded(val)}
                      className={`w-full h-12 rounded-xl border-2 text-sm font-semibold transition-all ${pickupNeeded === val ? "bg-black text-white border-black" : "border-gray-200"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={submitRider}
              disabled={submitting || hasCar === null || (hasCar === false && pickupNeeded === null)}
              className="w-full h-12 rounded-xl bg-black text-white font-semibold text-sm disabled:opacity-40">
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}

      {/* ── Driver form ── */}
      {modal === "driver" && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-6 space-y-5 pb-28 md:pb-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">I can drive</h3>
              <button onClick={() => setModal(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">How many seats can you offer?</p>
              <div className="flex gap-2">
                {[1,2,3,4,5,6].map((n) => (
                  <button key={n} type="button" onClick={() => setSeats(n)}
                    className={`w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all ${seats === n ? "bg-black text-white border-black" : "border-gray-200"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Rough departure time</p>
              <div className="grid grid-cols-2 gap-2">
                {["Morning", "Afternoon", "Evening", "Flexible"].map((d) => (
                  <button key={d} type="button" onClick={() => setDeparture(d)}
                    className={`h-11 rounded-xl border-2 text-sm font-semibold transition-all ${departure === d ? "bg-black text-white border-black" : "border-gray-200"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Will you pick riders up?</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Yes, I'll pick people up 🚗", val: true },
                  { label: "Riders meet me 📍", val: false },
                ].map(({ label, val }) => (
                  <button key={label} type="button" onClick={() => setPickupOffered(val)}
                    className={`w-full h-12 rounded-xl border-2 text-sm font-semibold transition-all ${pickupOffered === val ? "bg-black text-white border-black" : "border-gray-200"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={submitDriver}
              disabled={submitting || !departure || pickupOffered === null}
              className="w-full h-12 rounded-xl bg-black text-white font-semibold text-sm disabled:opacity-40">
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
