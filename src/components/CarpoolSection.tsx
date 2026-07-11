import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { X, ChevronRight, Phone, Car, Check } from "lucide-react";

interface CarpoolPost {
  id: string;
  user_id: string;
  type: "driver" | "rider";
  has_car: boolean;
  pickup_needed: boolean;
  pickup_offered: boolean;
  seats: number | null;
  departure_window: string | null;
  phone_number: string | null;
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
  phone_number: string | null;
  driver_initiated: boolean;
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
  const sz = `w-${size} h-${size}`;
  return (
    <div className={`${sz} rounded-full bg-gray-200 overflow-hidden shrink-0`}>
      {url
        ? <img src={url} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">{name[0]}</div>
      }
    </div>
  );
}

function PhoneLink({ number, label }: { number: string; label: string }) {
  return (
    <a href={`tel:${number.replace(/\D/g, "")}`}
      className="flex items-center gap-1.5 text-xs text-blue-600 font-medium"
      onClick={(e) => e.stopPropagation()}>
      <Phone className="h-3 w-3" />{label}: {number}
    </a>
  );
}

// Reusable sheet wrapper — renders at z-[70] so it stacks above the main carpool sheet
function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-6 space-y-5 pb-10 md:pb-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        {children}
      </div>
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

  // Main carpool sheet
  const [carpoolOpen, setCarpoolOpen] = useState(false);

  // Sub-sheets
  const [modal, setModal] = useState<"rider" | "driver" | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<CarpoolPost | null>(null);
  const [selectedRider, setSelectedRider] = useState<CarpoolPost | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [requestConfirmDriver, setRequestConfirmDriver] = useState<CarpoolPost | null>(null);
  const [riderPhone, setRiderPhone] = useState("");

  // Rider form state
  const [hasCar, setHasCar] = useState<boolean | null>(null);
  const [pickupNeeded, setPickupNeeded] = useState<boolean | null>(null);

  // Driver form state
  const [seats, setSeats] = useState(3);
  const [departure, setDeparture] = useState<string | null>(null);
  const [pickupOffered, setPickupOffered] = useState<boolean | null>(null);
  const [driverPhone, setDriverPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  // Requests
  const [myRequest, setMyRequest] = useState<CarpoolRequest | null>(null);
  const [myAcceptedRide, setMyAcceptedRide] = useState<CarpoolRequest | null>(null);
  const [pendingOffersToMe, setPendingOffersToMe] = useState<any[]>([]);
  const [driverRequests, setDriverRequests] = useState<CarpoolRequest[]>([]);
  const [editingSeats, setEditingSeats] = useState<number | null>(null);
  const [confirmedRiderIds, setConfirmedRiderIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchAll(); }, [eventId, userId]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("carpool_posts")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (!rows) { setLoading(false); return; }

    const postIds = rows.map((r: any) => r.id);
    const { data: allRequests } = postIds.length
      ? await supabase.from("carpool_requests").select("*").in("carpool_post_id", postIds)
      : { data: [] };

    // Riders who already have an accepted request — hide them from the "need a ride" list
    const acceptedRequesterIds = new Set<string>(
      (allRequests ?? []).filter((r: any) => r.status === "accepted").map((r: any) => r.requester_user_id)
    );
    setConfirmedRiderIds(acceptedRequesterIds);

    const uids = [...new Set(rows.map((r: any) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles").select("user_id, name, avatar_url").in("user_id", uids);

    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));

    const mapped: CarpoolPost[] = rows.map((row: any) => {
      const accepted = (allRequests ?? []).filter(
        (r: any) => r.carpool_post_id === row.id && r.status === "accepted"
      ).length;
      return {
        id: row.id, user_id: row.user_id, type: row.type,
        has_car: row.has_car, pickup_needed: row.pickup_needed,
        pickup_offered: row.pickup_offered ?? false,
        seats: row.seats, departure_window: row.departure_window,
        phone_number: row.phone_number ?? null,
        lat: row.lat, lng: row.lng, seats_taken: accepted,
        profile: profileMap[row.user_id] ?? { name: "Someone", avatar_url: null },
        distance: locationLat && locationLng && row.lat && row.lng
          ? haversineKm(locationLat, locationLng, row.lat, row.lng) : undefined,
      };
    });

    mapped.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    setPosts(mapped);

    const mine = userId ? (mapped.find((p) => p.user_id === userId) ?? null) : null;
    setMyPost(mine);

    if (userId) {
      // My outgoing request (I chose a driver and requested)
      const outgoing = (allRequests ?? []).find(
        (r: any) => r.requester_user_id === userId && !r.driver_initiated
      ) ?? null;
      setMyRequest(outgoing);

      // Any accepted ride — either I requested and got accepted, or a driver offered and I accepted
      const accepted = (allRequests ?? []).find(
        (r: any) => r.requester_user_id === userId && r.status === "accepted"
      ) ?? null;
      setMyAcceptedRide(accepted);

      // Pending driver offers TO me (driver reached out proactively)
      const offers = (allRequests ?? [])
        .filter((r: any) => r.requester_user_id === userId && r.driver_initiated && r.status === "pending")
        .map((r: any) => ({ ...r, driverPost: mapped.find((p) => p.id === r.carpool_post_id) ?? null }));
      setPendingOffersToMe(offers);
    }

    if (mine?.type === "driver") {
      const reqs = (allRequests ?? []).filter((r: any) => r.carpool_post_id === mine.id);
      if (reqs.length) {
        const reqUids = reqs.map((r: any) => r.requester_user_id);
        const { data: reqProfiles } = await supabase
          .from("profiles").select("user_id, name, avatar_url").in("user_id", reqUids);
        const reqProfileMap = Object.fromEntries((reqProfiles ?? []).map((p: any) => [p.user_id, p]));
        setDriverRequests(reqs.map((r: any) => ({
          ...r,
          driver_initiated: r.driver_initiated ?? false,
          phone_number: r.phone_number ?? null,
          profile: reqProfileMap[r.requester_user_id] ?? { name: "Someone", avatar_url: null },
        })));
      } else { setDriverRequests([]); }
    }

    setLoading(false);
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const submitRider = async () => {
    if (!userId || hasCar === null) return;
    if (hasCar === true && pickupNeeded === null) return;
    setSubmitting(true);
    await supabase.from("carpool_posts").upsert(
      { event_id: eventId, user_id: userId, type: "rider", has_car: hasCar,
        pickup_needed: hasCar ? (pickupNeeded ?? false) : true,
        seats: null, departure_window: null, pickup_offered: false,
        lat: locationLat, lng: locationLng },
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
        phone_number: driverPhone.trim() || null,
        lat: locationLat, lng: locationLng },
      { onConflict: "event_id,user_id" }
    );
    setModal(null); setDeparture(null); setSeats(3); setPickupOffered(null); setDriverPhone(""); setSubmitting(false);
    fetchAll();
  };

  const cancelPost = async () => {
    if (!myPost) return;
    if (myPost.type === "driver") {
      const accepted = driverRequests.filter((r) => r.status === "accepted");
      if (accepted.length) {
        const [{ data: myProfile }, { data: eventData }] = await Promise.all([
          supabase.from("profiles").select("name").eq("user_id", userId!).single(),
          supabase.from("events").select("title").eq("id", eventId).single(),
        ]);
        const ev = eventData?.title ? ` for "${eventData.title}"` : "";
        await supabase.from("notifications").insert(
          accepted.map((r) => ({
            user_id: r.requester_user_id, type: "carpool_cancelled",
            message: `${myProfile?.name ?? "Your driver"} cancelled their ride offer${ev}. You may need to find another way.`,
            event_id: eventId,
          }))
        );
      }
    }
    await supabase.from("carpool_posts").delete().eq("id", myPost.id);
    setMyPost(null); setManageOpen(false); fetchAll();
  };

  const cancelRequest = async () => {
    const rideToCancel = myRequest ?? myAcceptedRide;
    if (!rideToCancel) return;
    const driverPost = posts.find((p) => p.id === rideToCancel.carpool_post_id);
    if (driverPost && rideToCancel.status === "accepted") {
      const [{ data: myProfile }, { data: eventData }] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", userId!).single(),
        supabase.from("events").select("title").eq("id", eventId).single(),
      ]);
      const ev = eventData?.title ? ` for "${eventData.title}"` : "";
      await supabase.from("notifications").insert({
        user_id: driverPost.user_id, type: "carpool_cancelled",
        message: `${myProfile?.name ?? "A rider"} can no longer make the ride${ev}. A seat has opened up.`,
        event_id: eventId,
      });
    }
    await supabase.from("carpool_requests").delete().eq("id", rideToCancel.id);
    setMyRequest(null); setMyAcceptedRide(null); setSelectedDriver(null); fetchAll();
  };

  const requestRide = async (driverPost: CarpoolPost) => {
    if (!userId) return;
    setSubmitting(true);
    const { data: req } = await supabase
      .from("carpool_requests")
      .insert({ carpool_post_id: driverPost.id, requester_user_id: userId, status: "pending",
        phone_number: riderPhone.trim() || null, driver_initiated: false })
      .select().single();
    if (req) {
      const [{ data: myProfile }, { data: eventData }] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", userId).single(),
        supabase.from("events").select("title").eq("id", eventId).single(),
      ]);
      const ev = eventData?.title ? ` for "${eventData.title}"` : "";
      await supabase.from("notifications").insert({
        user_id: driverPost.user_id, type: "carpool_request",
        message: `${myProfile?.name ?? "Someone"} requested a ride from you${ev}`,
        reference_id: req.id, event_id: eventId,
      });
    }
    setSubmitting(false); setRequestConfirmDriver(null); setRiderPhone(""); setSelectedDriver(null);
    fetchAll();
  };

  // Driver proactively offers a ride to someone in the "Need a ride" list
  const offerRide = async (riderPost: CarpoolPost) => {
    if (!userId || !myPost) return;
    setOfferSubmitting(true);
    const { data: offer } = await supabase
      .from("carpool_requests")
      .insert({
        carpool_post_id: myPost.id,
        requester_user_id: riderPost.user_id,
        status: "pending",
        driver_initiated: true,
      })
      .select().single();
    if (offer) {
      const [{ data: myProfile }, { data: eventData }] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", userId).single(),
        supabase.from("events").select("title").eq("id", eventId).single(),
      ]);
      const ev = eventData?.title ? ` for "${eventData.title}"` : "";
      await supabase.from("notifications").insert({
        user_id: riderPost.user_id, type: "carpool_offer",
        message: `${myProfile?.name ?? "A driver"} offered you a ride${ev} 🚗`,
        event_id: eventId,
      });
    }
    setOfferSubmitting(false); setSelectedRider(null);
    fetchAll();
  };

  // Rider responds to a driver's proactive offer
  const respondToOffer = async (offer: any, accept: boolean) => {
    if (accept) {
      await supabase.from("carpool_requests").update({ status: "accepted" }).eq("id", offer.id);
      const [{ data: myProfile }, { data: eventData }] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", userId!).single(),
        supabase.from("events").select("title").eq("id", eventId).single(),
      ]);
      const ev = eventData?.title ? ` for "${eventData.title}"` : "";
      await supabase.from("notifications").insert({
        user_id: offer.driverPost?.user_id, type: "carpool_accepted",
        message: `${myProfile?.name ?? "A rider"} accepted your ride offer${ev} 🎉`,
        event_id: eventId,
      });
    } else {
      await supabase.from("carpool_requests").delete().eq("id", offer.id);
      const [{ data: myProfile }, { data: eventData }] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", userId!).single(),
        supabase.from("events").select("title").eq("id", eventId).single(),
      ]);
      const ev = eventData?.title ? ` for "${eventData.title}"` : "";
      await supabase.from("notifications").insert({
        user_id: offer.driverPost?.user_id, type: "carpool_declined",
        message: `${myProfile?.name ?? "A rider"} declined your ride offer${ev}.`,
        event_id: eventId,
      });
    }
    fetchAll();
  };

  const respondToRequest = async (requestId: string, status: "accepted" | "declined") => {
    await supabase.from("carpool_requests").update({ status }).eq("id", requestId);
    const req = driverRequests.find((r) => r.id === requestId);
    if (req) {
      const [{ data: myProfile }, { data: eventData }] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", userId!).single(),
        supabase.from("events").select("title").eq("id", eventId).single(),
      ]);
      const ev = eventData?.title ? ` for "${eventData.title}"` : "";
      await supabase.from("notifications").insert({
        user_id: req.requester_user_id,
        type: status === "accepted" ? "carpool_accepted" : "carpool_declined",
        message: status === "accepted"
          ? `${myProfile?.name ?? "Your driver"} accepted your ride request${ev} 🚗`
          : `${myProfile?.name ?? "Your driver"} couldn't take your ride request${ev}.`,
        reference_id: requestId, event_id: eventId,
      });
    }
    fetchAll();
  };

  const updateSeats = async (newSeats: number) => {
    if (!myPost) return;
    setEditingSeats(newSeats);
    await supabase.from("carpool_posts").update({ seats: newSeats }).eq("id", myPost.id);
    fetchAll();
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  // Rider-initiated requests in the driver's manage sheet
  const pendingRiderRequests = driverRequests.filter((r) => r.status === "pending" && !r.driver_initiated);
  // Driver-initiated offers awaiting rider response
  const pendingOffersSent = driverRequests.filter((r) => r.status === "pending" && r.driver_initiated);
  const acceptedRequests = driverRequests.filter((r) => r.status === "accepted");

  const seatsLeft = (post: CarpoolPost) =>
    post.type === "driver" && post.seats !== null
      ? Math.max(0, post.seats - post.seats_taken) : null;

  // Only show drivers with seats still available (excluding self)
  const drivers = posts.filter((p) => p.type === "driver" && p.user_id !== userId && (seatsLeft(p) ?? 0) > 0);
  // Hide riders who already have a confirmed ride (excluding self)
  const riders = posts.filter((p) => p.type === "rider" && p.user_id !== userId && !confirmedRiderIds.has(p.user_id));

  const myRequestForSelected = selectedDriver
    ? myRequest?.carpool_post_id === selectedDriver.id ? myRequest : null : null;

  // Confirmed driver — either I requested + got accepted, or driver offered + I accepted
  const myConfirmedDriver = myAcceptedRide
    ? posts.find((p) => p.id === myAcceptedRide.carpool_post_id) ?? null
    : null;

  const availableDriverCount = posts.filter((p) => p.type === "driver" && (seatsLeft(p) ?? 0) > 0).length;
  const riderCount = posts.filter((p) => p.type === "rider").length;

  // Has this driver already sent an offer to a specific rider?
  const alreadyOffered = (riderUserId: string) =>
    driverRequests.some((r) => r.requester_user_id === riderUserId && r.driver_initiated);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Inline summary on event page ── */}
      <div className="space-y-3">
        <h2
          className="text-[16px] font-bold pb-2 border-b"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: "rgba(0,0,0,0.1)" }}
        >
          Carpool 🚗
        </h2>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : (
          <>
            {/* My status — compact */}
            {myPost && (
              <div className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${myConfirmedDriver ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {myConfirmedDriver ? (
                    <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="h-5 w-5 text-white" strokeWidth={3} />
                    </div>
                  ) : myPost.type === "driver" ? (
                    <Car className="h-4 w-4 text-gray-500 shrink-0" />
                  ) : (
                    <span className="text-sm shrink-0">🙋</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {myPost.type === "driver"
                        ? `Offering a ride · ${seatsLeft(myPost)} seat${seatsLeft(myPost) !== 1 ? "s" : ""} left`
                        : myConfirmedDriver
                        ? "Ride confirmed"
                        : myRequest?.status === "declined"
                        ? "Request declined"
                        : myRequest ? "Request pending…"
                        : pendingOffersToMe.length > 0 ? `${pendingOffersToMe.length} ride offer${pendingOffersToMe.length !== 1 ? "s" : ""}!`
                        : "Looking for a ride"}
                    </p>
                    {myPost.type === "driver" && acceptedRequests.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground">Riders:</span>
                        {acceptedRequests.map((r) => (
                          <div key={r.id} title={r.profile?.name} className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden border border-white">
                            {r.profile?.avatar_url
                              ? <img src={r.profile.avatar_url} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-gray-500">{r.profile?.name?.[0]}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {myConfirmedDriver && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span className="inline-block w-3.5 h-3.5 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {myConfirmedDriver.profile.avatar_url
                            ? <img src={myConfirmedDriver.profile.avatar_url} className="w-full h-full object-cover" />
                            : <span className="flex items-center justify-center w-full h-full text-[8px] font-bold text-gray-500">{myConfirmedDriver.profile.name[0]}</span>}
                        </span>
                        {myConfirmedDriver.profile.name} · {myConfirmedDriver.pickup_offered ? "They'll pick you up" : "Meet them there"}
                      </p>
                    )}
                  </div>
                </div>
                {myPost.type === "driver" && pendingRiderRequests.length > 0 && (
                  <span className="text-xs font-semibold text-white bg-black px-2.5 py-1 rounded-full shrink-0 ml-2">
                    {pendingRiderRequests.length} new
                  </span>
                )}
                {myPost.type === "rider" && pendingOffersToMe.length > 0 && !myConfirmedDriver && (
                  <span className="text-xs font-semibold text-white bg-blue-500 px-2.5 py-1 rounded-full shrink-0 ml-2">
                    {pendingOffersToMe.length} offer{pendingOffersToMe.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}

            {/* Count + open button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {availableDriverCount === 0 && riderCount === 0
                  ? "No carpool activity yet"
                  : [
                      availableDriverCount > 0 && `${availableDriverCount} ${availableDriverCount === 1 ? "driver" : "drivers"} available`,
                      riderCount > 0 && `${riderCount} need a ride`,
                    ].filter(Boolean).join(" · ")}
              </p>
              <button
                onClick={() => setCarpoolOpen(true)}
                className="text-sm font-semibold text-black flex items-center gap-0.5 hover:opacity-60 transition-opacity shrink-0 ml-3"
              >
                {myPost ? "Manage" : "View"} <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {!myPost && session && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setCarpoolOpen(true); setModal("rider"); setHasCar(null); setPickupNeeded(null); }}
                  className="flex-1 h-11 rounded-xl border-2 border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors"
                >
                  🙋 I need a ride
                </button>
                <button
                  onClick={() => { setCarpoolOpen(true); setModal("driver"); setDeparture(null); setSeats(3); setPickupOffered(null); setDriverPhone(""); }}
                  className="flex-1 h-11 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  🚗 I can drive
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Main carpool full sheet (z-[60]) ── */}
      {carpoolOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" onClick={() => setCarpoolOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-2xl bg-white rounded-t-2xl md:rounded-2xl flex flex-col"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b shrink-0">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  Carpool 🚗
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {availableDriverCount > 0 || riderCount > 0
                    ? [availableDriverCount > 0 && `${availableDriverCount} ${availableDriverCount === 1 ? "driver" : "drivers"} available`, riderCount > 0 && `${riderCount} need a ride`].filter(Boolean).join(" · ")
                    : "Be the first to post"}
                </p>
              </div>
              <button onClick={() => setCarpoolOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 pb-10">

              {/* My post */}
              {myPost ? (
                <div className="rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {myPost.type === "driver"
                          ? `You're offering a ride · ${seatsLeft(myPost)} seat${seatsLeft(myPost) !== 1 ? "s" : ""} left`
                          : "You need a ride"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {myPost.type === "driver"
                          ? `${myPost.departure_window} · ${myPost.pickup_offered ? "You pick up" : "Riders meet you"}`
                          : myPost.pickup_needed ? "Needs pickup" : "Has car · Can meet driver"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {myPost.type === "driver" && (
                        <button
                          onClick={() => { setManageOpen(true); setEditingSeats(myPost.seats ?? 3); }}
                          className="text-xs font-semibold bg-black text-white px-3 py-1.5 rounded-full"
                        >
                          {pendingRiderRequests.length > 0 ? `${pendingRiderRequests.length} request${pendingRiderRequests.length !== 1 ? "s" : ""}` : "Manage"}
                        </button>
                      )}
                      <button onClick={cancelPost} className="text-xs text-red-500 font-medium">Cancel</button>
                    </div>
                  </div>
                  {myPost.type === "driver" && acceptedRequests.length > 0 && (
                    <div className="px-4 pb-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Riders:</span>
                      {acceptedRequests.map((r) => (
                        <div key={r.id} title={r.profile?.name} className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                          {r.profile?.avatar_url
                            ? <img src={r.profile.avatar_url} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{r.profile?.name?.[0]}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Rider: confirmed */}
                  {myPost.type === "rider" && myConfirmedDriver && (
                    <div className="mx-4 mb-4 rounded-2xl bg-green-50 border border-green-200 p-5 flex flex-col items-center text-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                        <Check className="h-8 w-8 text-white" strokeWidth={3} />
                      </div>
                      <div>
                        <p className="text-base font-bold text-green-800">Ride confirmed!</p>
                        <p className="text-sm text-green-700 flex items-center justify-center gap-1.5 mt-1">
                          <span className="inline-flex w-5 h-5 rounded-full bg-white border border-green-200 overflow-hidden shrink-0">
                            {myConfirmedDriver.profile.avatar_url
                              ? <img src={myConfirmedDriver.profile.avatar_url} className="w-full h-full object-cover" />
                              : <span className="flex items-center justify-center w-full h-full text-[9px] font-bold text-green-700">{myConfirmedDriver.profile.name[0]}</span>}
                          </span>
                          {myConfirmedDriver.profile.name}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {myConfirmedDriver.departure_window} · {myConfirmedDriver.pickup_offered ? "They'll pick you up" : "Meet them there"}
                        </p>
                        {myConfirmedDriver.phone_number && (
                          <div className="mt-2">
                            <PhoneLink number={myConfirmedDriver.phone_number} label="Driver" />
                          </div>
                        )}
                      </div>
                      <button onClick={cancelRequest} className="text-xs text-red-500 font-medium mt-1">
                        Cancel my spot
                      </button>
                    </div>
                  )}
                  {/* Rider: pending offers from drivers */}
                  {myPost.type === "rider" && !myConfirmedDriver && pendingOffersToMe.length > 0 && (
                    <div className="mx-4 mb-4 space-y-3">
                      <p className="text-xs font-semibold text-gray-700">Ride offers for you</p>
                      {pendingOffersToMe.map((offer) => (
                        <div key={offer.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              url={offer.driverPost?.profile?.avatar_url ?? null}
                              name={offer.driverPost?.profile?.name ?? "Driver"}
                            />
                            <div>
                              <p className="text-sm font-semibold">{offer.driverPost?.profile?.name ?? "A driver"} offered you a ride</p>
                              <p className="text-xs text-muted-foreground">
                                {offer.driverPost?.departure_window} · {offer.driverPost?.pickup_offered ? "Will pick you up" : "Meet them there"}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => respondToOffer(offer, false)}
                              className="flex-1 h-10 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => respondToOffer(offer, true)}
                              className="flex-1 h-10 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                            >
                              Accept
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Rider: pending/declined request */}
                  {myPost.type === "rider" && myRequest && !myConfirmedDriver && (
                    <div className="px-4 pb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${myRequest.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                        {myRequest.status === "declined" ? "Request declined — try another driver" : "⏳ Waiting for driver"}
                      </span>
                    </div>
                  )}
                </div>
              ) : session ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setModal("rider"); setHasCar(null); setPickupNeeded(null); }}
                    className="flex-1 h-12 rounded-xl border-2 border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors"
                  >
                    🙋 I need a ride
                  </button>
                  <button
                    onClick={() => { setModal("driver"); setDeparture(null); setSeats(3); setPickupOffered(null); setDriverPhone(""); }}
                    className="flex-1 h-12 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    🚗 I can drive
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Sign in to join carpool</p>
              )}

              {/* Drivers section */}
              {drivers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Offering rides <span className="text-muted-foreground font-normal">· {drivers.length}</span>
                  </p>
                  {drivers.map((post) => {
                    const left = seatsLeft(post);
                    const myReqForThis = myRequest?.carpool_post_id === post.id ? myRequest : null;
                    return (
                      <button
                        key={post.id}
                        onClick={() => setSelectedDriver(post)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-white text-left hover:border-gray-400 transition-colors shadow-sm"
                      >
                        <Avatar url={post.profile.avatar_url} name={post.profile.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{post.profile.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {`${left} seat${left !== 1 ? "s" : ""} left · ${post.departure_window} · ${post.pickup_offered ? "Picks you up" : "Meet driver"}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {post.distance !== undefined && (
                            <span className="text-xs text-muted-foreground">{fmtDist(post.distance)}</span>
                          )}
                          {myReqForThis ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${myReqForThis.status === "accepted" ? "bg-green-100 text-green-700" : myReqForThis.status === "declined" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                              {myReqForThis.status === "accepted" ? "✓ In" : myReqForThis.status === "declined" ? "Declined" : "Pending"}
                            </span>
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Riders section */}
              {riders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Need a ride <span className="text-muted-foreground font-normal">· {riders.length}</span>
                    {myPost?.type === "driver" && (
                      <span className="text-xs font-normal text-blue-600 ml-2">· tap to offer a ride</span>
                    )}
                  </p>
                  {riders.map((post) => {
                    const isDriver = myPost?.type === "driver";
                    const offered = isDriver && alreadyOffered(post.user_id);
                    const card = (
                      <div className={`flex items-center gap-3 p-3.5 rounded-2xl border bg-white shadow-sm w-full text-left ${isDriver ? "hover:border-gray-400 transition-colors cursor-pointer" : ""} ${offered ? "border-blue-200 bg-blue-50" : "border-gray-200"}`}>
                        <Avatar url={post.profile.avatar_url} name={post.profile.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{post.profile.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {post.has_car ? "Has car · Can meet driver" : "Needs pickup"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {post.distance !== undefined && (
                            <span className="text-xs text-muted-foreground">{fmtDist(post.distance)}</span>
                          )}
                          {isDriver && (
                            offered
                              ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Offered</span>
                              : <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    );
                    return isDriver ? (
                      <button key={post.id} onClick={() => setSelectedRider(post)} className="w-full">{card}</button>
                    ) : (
                      <div key={post.id}>{card}</div>
                    );
                  })}
                </div>
              )}

              {availableDriverCount === 0 && riderCount === 0 && !myPost && (
                <p className="text-sm text-muted-foreground text-center py-6">No carpool posts yet — be the first!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-sheets (z-[70], stack above carpool sheet) ── */}

      {/* Driver detail (rider tapping a driver card) */}
      {selectedDriver && !requestConfirmDriver && (
        <Sheet onClose={() => setSelectedDriver(null)} title="Ride offer">
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
              <p className={`text-lg font-bold ${seatsLeft(selectedDriver) === 0 ? "text-red-500" : ""}`}>
                {seatsLeft(selectedDriver) === 0 ? "Full" : seatsLeft(selectedDriver)}
              </p>
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
          {myRequestForSelected?.status === "accepted" && selectedDriver.phone_number && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <PhoneLink number={selectedDriver.phone_number} label="Driver" />
            </div>
          )}
          {!myPost || myPost.user_id === userId ? (
            myRequestForSelected ? (
              <div className="space-y-2">
                <div className={`w-full h-12 rounded-xl flex items-center justify-center text-sm font-semibold ${myRequestForSelected.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" : myRequestForSelected.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                  {myRequestForSelected.status === "accepted" ? "✓ You're in!" : myRequestForSelected.status === "declined" ? "Request declined" : "⏳ Waiting for driver"}
                </div>
                <button onClick={cancelRequest} className="w-full h-10 rounded-xl border border-red-200 text-red-500 text-sm font-medium">
                  {myRequestForSelected.status === "accepted" ? "Cancel my spot" : "Cancel request"}
                </button>
              </div>
            ) : myPost?.type === "driver" ? (
              <p className="text-xs text-muted-foreground text-center">You already posted as a driver</p>
            ) : myConfirmedDriver ? (
              <div className="space-y-2">
                <div className="w-full h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-400 cursor-not-allowed">
                  Request a Ride
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  You already have a ride to this event. You can only request one ride.
                </p>
              </div>
            ) : (seatsLeft(selectedDriver) ?? 0) > 0 ? (
              <button
                onClick={() => { setRequestConfirmDriver(selectedDriver); setRiderPhone(""); }}
                className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm"
              >
                Request a Ride
              </button>
            ) : (
              <div className="w-full h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-400">
                🔒 Car is full
              </div>
            )
          ) : null}
        </Sheet>
      )}

      {/* Rider detail (driver tapping a rider card to offer a ride) */}
      {selectedRider && myPost?.type === "driver" && (
        <Sheet onClose={() => setSelectedRider(null)} title="Offer a ride">
          <div className="flex items-center gap-3">
            <Avatar url={selectedRider.profile.avatar_url} name={selectedRider.profile.name} size={12} />
            <div>
              <p className="font-semibold">{selectedRider.profile.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedRider.has_car ? "Has car · Can meet you" : "Needs pickup"}
                {selectedRider.distance !== undefined && ` · ${fmtDist(selectedRider.distance)} away`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-sm font-semibold">{selectedRider.pickup_needed ? "Needs pickup" : "Can meet"}</p>
              <p className="text-xs text-muted-foreground">pickup</p>
            </div>
            {selectedRider.distance !== undefined && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm font-semibold">{fmtDist(selectedRider.distance)}</p>
                <p className="text-xs text-muted-foreground">from you</p>
              </div>
            )}
          </div>
          {alreadyOffered(selectedRider.user_id) ? (
            <div className="w-full h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-sm font-semibold text-blue-700">
              ✓ Offer sent — waiting for their reply
            </div>
          ) : (seatsLeft(myPost) ?? 0) <= 0 ? (
            <div className="w-full h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-400">
              🔒 Your car is full
            </div>
          ) : (
            <button
              onClick={() => offerRide(selectedRider)}
              disabled={offerSubmitting}
              className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm disabled:opacity-40"
            >
              {offerSubmitting ? "Sending…" : `Offer a ride to ${selectedRider.profile.name.split(" ")[0]}`}
            </button>
          )}
        </Sheet>
      )}

      {/* Request confirm (phone) */}
      {requestConfirmDriver && (
        <Sheet onClose={() => setRequestConfirmDriver(null)} title={`Request from ${requestConfirmDriver.profile.name}`}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Your phone number <span className="font-normal text-muted-foreground">(optional)</span></label>
            <p className="text-xs text-muted-foreground">Shared with the driver only if they accept you.</p>
            <input type="tel" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm focus:border-black focus:outline-none transition-colors" />
          </div>
          <button onClick={() => requestRide(requestConfirmDriver)} disabled={submitting}
            className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm disabled:opacity-40">
            {submitting ? "Sending…" : "Send Request"}
          </button>
        </Sheet>
      )}

      {/* Manage sheet (driver) */}
      {manageOpen && myPost?.type === "driver" && (
        <Sheet onClose={() => setManageOpen(false)} title="Manage Ride">
          {/* Seat editor */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Seats offered</p>
                <p className="text-xs text-muted-foreground">{myPost.departure_window} · {myPost.pickup_offered ? "You pick up" : "Riders meet you"}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { const n = (editingSeats ?? myPost.seats ?? 3) - 1; if (n >= acceptedRequests.length) updateSeats(n); }}
                  disabled={(editingSeats ?? myPost.seats ?? 3) <= acceptedRequests.length}
                  className="w-8 h-8 rounded-full border-2 border-gray-300 text-lg font-bold flex items-center justify-center disabled:opacity-30 hover:border-black transition-colors"
                >−</button>
                <span className="text-xl font-bold w-5 text-center">{editingSeats ?? myPost.seats}</span>
                <button
                  onClick={() => { const n = (editingSeats ?? myPost.seats ?? 3) + 1; if (n <= 8) updateSeats(n); }}
                  disabled={(editingSeats ?? myPost.seats ?? 3) >= 8}
                  className="w-8 h-8 rounded-full border-2 border-gray-300 text-lg font-bold flex items-center justify-center disabled:opacity-30 hover:border-black transition-colors"
                >+</button>
              </div>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: editingSeats ?? myPost.seats ?? 3 }).map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full ${i < acceptedRequests.length ? "bg-black" : "bg-gray-200"}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {acceptedRequests.length} of {editingSeats ?? myPost.seats} seats filled
              {acceptedRequests.length === (editingSeats ?? myPost.seats) && " · Car is full 🔒"}
            </p>
          </div>

          {driverRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No requests yet</p>
          ) : (
            <div className="space-y-3">
              {/* Incoming requests (riders who tapped your card) */}
              {pendingRiderRequests.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Requests from riders</p>
                    {acceptedRequests.length === (editingSeats ?? myPost.seats) && (
                      <p className="text-xs text-amber-600 font-medium">Tap + to open a spot</p>
                    )}
                  </div>
                  {pendingRiderRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3">
                      <Avatar url={req.profile?.avatar_url ?? null} name={req.profile?.name ?? "?"} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{req.profile?.name}</p>
                        {req.phone_number && <PhoneLink number={req.phone_number} label="Phone" />}
                      </div>
                      <button onClick={() => respondToRequest(req.id, "declined")} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 font-medium shrink-0">Decline</button>
                      <button
                        onClick={() => respondToRequest(req.id, "accepted")}
                        disabled={acceptedRequests.length >= (editingSeats ?? myPost.seats ?? 0)}
                        className="text-xs px-3 py-1.5 rounded-full bg-black text-white font-medium shrink-0 disabled:opacity-40"
                      >Accept</button>
                    </div>
                  ))}
                </>
              )}

              {/* Offers sent (driver reached out, awaiting rider response) */}
              {pendingOffersSent.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">Offers you sent · waiting on reply</p>
                  {pendingOffersSent.map((req) => (
                    <div key={req.id} className="flex items-center gap-3">
                      <Avatar url={req.profile?.avatar_url ?? null} name={req.profile?.name ?? "?"} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{req.profile?.name}</p>
                        <p className="text-xs text-muted-foreground">Waiting for their reply…</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 shrink-0">Offered</span>
                    </div>
                  ))}
                </>
              )}

              {/* Confirmed riders */}
              {acceptedRequests.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">In your car</p>
                  {acceptedRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3">
                      <Avatar url={req.profile?.avatar_url ?? null} name={req.profile?.name ?? "?"} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{req.profile?.name}</p>
                        {req.phone_number && <PhoneLink number={req.phone_number} label="Phone" />}
                      </div>
                      <span className="text-xs text-green-600 font-semibold shrink-0">✓ In</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          <button onClick={cancelPost} className="w-full h-11 rounded-xl border border-red-200 text-red-500 text-sm font-semibold">
            Cancel my ride offer
          </button>
        </Sheet>
      )}

      {/* Rider form */}
      {modal === "rider" && (
        <Sheet onClose={() => setModal(null)} title="I need a ride">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Do you have a car?</p>
            <div className="flex flex-col gap-2">
              {[{ label: "Yes — but I'd rather not drive", val: true }, { label: "No car", val: false }].map(({ label, val }) => (
                <button key={label} type="button"
                  onClick={() => { setHasCar(val); if (!val) setPickupNeeded(true); else setPickupNeeded(null); }}
                  className={`w-full h-12 rounded-2xl border-2 text-sm font-semibold transition-all text-left px-4 ${hasCar === val ? "bg-black text-white border-black" : "border-gray-200 text-gray-800"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {hasCar === true && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Can you meet the driver, or need pickup?</p>
              <div className="flex flex-col gap-2">
                {[{ label: "I can meet the driver 📍", val: false }, { label: "I need to be picked up 🚪", val: true }].map(({ label, val }) => (
                  <button key={label} type="button" onClick={() => setPickupNeeded(val)}
                    className={`w-full h-12 rounded-2xl border-2 text-sm font-semibold transition-all text-left px-4 ${pickupNeeded === val ? "bg-black text-white border-black" : "border-gray-200 text-gray-800"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {hasCar === false && (
            <p className="text-xs text-muted-foreground bg-gray-50 rounded-xl px-4 py-3">
              Since you don't have a car, you'll be marked as needing pickup.
            </p>
          )}
          <button onClick={submitRider}
            disabled={submitting || hasCar === null || (hasCar === true && pickupNeeded === null)}
            className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm disabled:opacity-40">
            {submitting ? "Posting…" : "Post"}
          </button>
        </Sheet>
      )}

      {/* Driver form */}
      {modal === "driver" && (
        <Sheet onClose={() => setModal(null)} title="I can drive">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">How many seats can you offer?</p>
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
            <p className="text-sm font-semibold text-gray-700">Rough departure time</p>
            <div className="grid grid-cols-2 gap-2">
              {["Morning", "Afternoon", "Evening", "Flexible"].map((d) => (
                <button key={d} type="button" onClick={() => setDeparture(d)}
                  className={`h-12 rounded-2xl border-2 text-sm font-semibold transition-all ${departure === d ? "bg-black text-white border-black" : "border-gray-200 text-gray-800"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Will you pick riders up?</p>
            <div className="flex flex-col gap-2">
              {[{ label: "Yes, I'll pick people up 🚗", val: true }, { label: "Riders meet me at a spot 📍", val: false }].map(({ label, val }) => (
                <button key={label} type="button" onClick={() => setPickupOffered(val)}
                  className={`w-full h-12 rounded-2xl border-2 text-sm font-semibold transition-all text-left px-4 ${pickupOffered === val ? "bg-black text-white border-black" : "border-gray-200 text-gray-800"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Your phone number <span className="font-normal text-muted-foreground">(optional)</span></label>
            <p className="text-xs text-muted-foreground">Shared only with riders you accept.</p>
            <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm focus:border-black focus:outline-none transition-colors" />
          </div>
          <button onClick={submitDriver} disabled={submitting || !departure || pickupOffered === null}
            className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm disabled:opacity-40">
            {submitting ? "Posting…" : "Post"}
          </button>
        </Sheet>
      )}
    </>
  );
}
