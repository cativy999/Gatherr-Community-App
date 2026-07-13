import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { X, ChevronRight, Phone, Car, Check, MoreVertical } from "lucide-react";

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

const SHEET_STYLES = `
  @keyframes cp-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes cp-fade-scale { from { opacity: 0; transform: scale(0.97) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes cp-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cp-item-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .cp-panel { animation: cp-slide-up 0.32s cubic-bezier(0.32,0.72,0,1); }
  .cp-backdrop { animation: cp-fade-in 0.2s ease-out; }
  .cp-item { animation: cp-item-in 0.28s ease-out both; }
  @media (min-width: 768px) { .cp-panel { animation: cp-fade-scale 0.2s ease-out; } }
  /* Suppress stacking-context interference from sticky header when any carpool modal is open */
  html.cp-modal-open header { z-index: 0 !important; }
  html.cp-modal-open header button { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
`;

function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return createPortal(
    <>
      <style>{SHEET_STYLES}</style>
      <div className="cp-backdrop fixed inset-0 flex items-end md:items-center justify-center" style={{ zIndex: 9999 }} onClick={onClose}>
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="cp-panel relative w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-6 space-y-5 pb-10 md:pb-6 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">{title}</h3>
            <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

export default function CarpoolSection({ eventId }: { eventId: string }) {
  const { session } = useAuth();
  const { locationLat, locationLng } = useLocation();
  const userId = session?.user?.id;

  const [posts, setPosts] = useState<CarpoolPost[]>([]);
  const [myPost, setMyPost] = useState<CarpoolPost | null>(null);
  const [loading, setLoading] = useState(true);
  const autoRsvpDone = useRef(false); // fire auto-RSVP at most once per mount

  const [carpoolOpen, setCarpoolOpen] = useState(false);
  const [modal, setModal] = useState<"rider" | "driver" | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<CarpoolPost | null>(null);
  const [selectedRider, setSelectedRider] = useState<CarpoolPost | null>(null);
  const [myPostMenuOpen, setMyPostMenuOpen] = useState(false);
  const [requestConfirmDriver, setRequestConfirmDriver] = useState<CarpoolPost | null>(null);
  const [riderPhone, setRiderPhone] = useState("");

  const [acceptingOffer, setAcceptingOffer] = useState<any | null>(null);
  const [offerAcceptPhone, setOfferAcceptPhone] = useState("");

  const [hasCar, setHasCar] = useState<boolean | null>(null);
  const [pickupNeeded, setPickupNeeded] = useState<boolean | null>(null);

  const [seats, setSeats] = useState(3);
  const [departure, setDeparture] = useState<string | null>(null);
  const [pickupOffered, setPickupOffered] = useState<boolean | null>(null);
  const [driverPhone, setDriverPhone] = useState("");
  const [editingSeats, setEditingSeats] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [phoneRequestSent, setPhoneRequestSent] = useState<Set<string>>(new Set());
  const [riderPhoneInput, setRiderPhoneInput] = useState("");

  const [myRequest, setMyRequest] = useState<CarpoolRequest | null>(null);
  const [myAcceptedRide, setMyAcceptedRide] = useState<CarpoolRequest | null>(null);
  const [pendingOffersToMe, setPendingOffersToMe] = useState<any[]>([]);
  const [driverRequests, setDriverRequests] = useState<CarpoolRequest[]>([]);
  const [confirmedRiderIds, setConfirmedRiderIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchAll(); }, [eventId, userId]);

  // Toggle a class on <html> whenever any carpool sheet is open so the
  // EventDetails sticky header (which has backdrop-filter) doesn't composite
  // above our portal overlay.
  const anySheetOpen = carpoolOpen || myPostMenuOpen || !!selectedDriver || !!selectedRider || !!requestConfirmDriver || !!acceptingOffer;
  useEffect(() => {
    document.documentElement.classList.toggle("cp-modal-open", anySheetOpen);
    return () => { document.documentElement.classList.remove("cp-modal-open"); };
  }, [anySheetOpen]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("carpool_posts").select("*").eq("event_id", eventId).order("created_at", { ascending: true });

    if (!rows) { setLoading(false); return; }

    const postIds = rows.map((r: any) => r.id);
    const { data: allRequests } = postIds.length
      ? await supabase.from("carpool_requests").select("*").in("carpool_post_id", postIds)
      : { data: [] };

    const acceptedRequesterIds = new Set<string>(
      (allRequests ?? []).filter((r: any) => r.status === "accepted").map((r: any) => r.requester_user_id)
    );
    setConfirmedRiderIds(acceptedRequesterIds);

    const uids = [...new Set(rows.map((r: any) => r.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", uids);
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
    if (mine?.type === "driver") setEditingSeats(mine.seats ?? 3);

    if (userId) {
      const outgoing = (allRequests ?? []).find(
        (r: any) => r.requester_user_id === userId && !r.driver_initiated
      ) ?? null;
      setMyRequest(outgoing);

      const accepted = (allRequests ?? []).find(
        (r: any) => r.requester_user_id === userId && r.status === "accepted"
      ) ?? null;
      setMyAcceptedRide(accepted);

      // Auto-RSVP confirmed rider as "going" (fires once per mount, only if no RSVP exists)
      if (accepted && !autoRsvpDone.current) {
        autoRsvpDone.current = true;
        const { data: existingRsvp } = await supabase
          .from("rsvps").select("id").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
        if (!existingRsvp) {
          await supabase.from("rsvps").upsert(
            { event_id: eventId, user_id: userId, status: "going" },
            { onConflict: "user_id,event_id" }
          );
        }
      }

      const offers = (allRequests ?? [])
        .filter((r: any) => r.requester_user_id === userId && r.driver_initiated && r.status === "pending")
        .map((r: any) => ({ ...r, driverPost: mapped.find((p) => p.id === r.carpool_post_id) ?? null }));
      setPendingOffersToMe(offers);
    }

    if (mine?.type === "driver") {
      const reqs = (allRequests ?? []).filter((r: any) => r.carpool_post_id === mine.id);
      if (reqs.length) {
        const reqUids = reqs.map((r: any) => r.requester_user_id);
        const { data: reqProfiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", reqUids);
        const reqProfileMap = Object.fromEntries((reqProfiles ?? []).map((p: any) => [p.user_id, p]));
        setDriverRequests(reqs.map((r: any) => ({
          ...r, driver_initiated: r.driver_initiated ?? false,
          phone_number: r.phone_number ?? null,
          profile: reqProfileMap[r.requester_user_id] ?? { name: "Someone", avatar_url: null },
        })));
      } else { setDriverRequests([]); }
    }

    setLoading(false);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

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
    // Driver is clearly attending — auto-RSVP as "going" if not already
    await supabase.from("rsvps").upsert(
      { event_id: eventId, user_id: userId, status: "going" },
      { onConflict: "user_id,event_id" }
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
    setMyPost(null); setMyPostMenuOpen(false); fetchAll();
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
    setMyRequest(null); setMyAcceptedRide(null); setSelectedDriver(null); setMyPostMenuOpen(false); fetchAll();
  };

  const requestRide = async (driverPost: CarpoolPost) => {
    if (!userId) return;
    setSubmitting(true);
    const { data: req } = await supabase.from("carpool_requests")
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

  const offerRide = async (riderPost: CarpoolPost) => {
    if (!userId || !myPost) return;
    setOfferSubmitting(true);
    const { data: offer } = await supabase.from("carpool_requests")
      .insert({ carpool_post_id: myPost.id, requester_user_id: riderPost.user_id,
        status: "pending", driver_initiated: true })
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

  const acceptOffer = async () => {
    if (!acceptingOffer) return;
    setSubmitting(true);
    await supabase.from("carpool_requests")
      .update({ status: "accepted", phone_number: offerAcceptPhone.trim() || null })
      .eq("id", acceptingOffer.id);
    const [{ data: myProfile }, { data: eventData }] = await Promise.all([
      supabase.from("profiles").select("name").eq("user_id", userId!).single(),
      supabase.from("events").select("title").eq("id", eventId).single(),
    ]);
    const ev = eventData?.title ? ` for "${eventData.title}"` : "";
    await supabase.from("notifications").insert({
      user_id: acceptingOffer.driverPost?.user_id, type: "carpool_accepted",
      message: `${myProfile?.name ?? "A rider"} accepted your ride offer${ev} 🎉`,
      event_id: eventId,
    });
    // Rider just confirmed they're going — auto-RSVP as "going" if not already
    if (userId) {
      await supabase.from("rsvps").upsert(
        { event_id: eventId, user_id: userId, status: "going" },
        { onConflict: "user_id,event_id" }
      );
    }
    setSubmitting(false); setAcceptingOffer(null); setOfferAcceptPhone(""); setMyPostMenuOpen(false);
    fetchAll();
  };

  const declineOffer = async (offer: any) => {
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
    setMyPostMenuOpen(false);
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

  const sendPhoneRequest = async (req: CarpoolRequest) => {
    if (!userId) return;
    const [{ data: myProfile }, { data: eventData }] = await Promise.all([
      supabase.from("profiles").select("name").eq("user_id", userId).single(),
      supabase.from("events").select("title").eq("id", eventId).single(),
    ]);
    const ev = eventData?.title ? ` for "${eventData.title}"` : "";
    await supabase.from("notifications").insert({
      user_id: req.requester_user_id,
      type: "carpool_phone_request",
      message: `${myProfile?.name ?? "Your driver"} would like your phone number to coordinate the carpool${ev} — tap to add it`,
      event_id: eventId,
    });
    setPhoneRequestSent((prev) => new Set([...prev, req.requester_user_id]));
  };

  const updateRiderPhone = async () => {
    if (!myAcceptedRide || !riderPhoneInput.trim()) return;
    setSubmitting(true);
    await supabase.from("carpool_requests")
      .update({ phone_number: riderPhoneInput.trim() })
      .eq("id", myAcceptedRide.id);
    setSubmitting(false);
    setRiderPhoneInput("");
    fetchAll();
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const pendingRiderRequests = driverRequests.filter((r) => r.status === "pending" && !r.driver_initiated);
  const pendingOffersSent = driverRequests.filter((r) => r.status === "pending" && r.driver_initiated);
  const acceptedRequests = driverRequests.filter((r) => r.status === "accepted");

  const seatsLeft = (post: CarpoolPost) =>
    post.type === "driver" && post.seats !== null
      ? Math.max(0, post.seats - post.seats_taken) : null;

  const drivers = posts.filter((p) => p.type === "driver" && (seatsLeft(p) ?? 0) > 0);
  const riders = posts.filter((p) => p.type === "rider" && !confirmedRiderIds.has(p.user_id));
  const myRequestForSelected = selectedDriver
    ? myRequest?.carpool_post_id === selectedDriver.id ? myRequest : null : null;
  const myConfirmedDriver = myAcceptedRide
    ? posts.find((p) => p.id === myAcceptedRide.carpool_post_id) ?? null : null;
  // Driver the rider has a pending/declined request with
  const requestedDriver = myRequest
    ? posts.find((p) => p.id === myRequest.carpool_post_id) ?? null : null;

  const availableDriverCount = posts.filter((p) => p.type === "driver" && (seatsLeft(p) ?? 0) > 0).length;
  const riderCount = posts.filter((p) => p.type === "rider" && !confirmedRiderIds.has(p.user_id)).length;
  const alreadyOffered = (riderUserId: string) =>
    driverRequests.some((r) => r.requester_user_id === riderUserId && r.driver_initiated);

  const myPostBadge = myPost?.type === "driver" ? pendingRiderRequests.length : pendingOffersToMe.length;
  const currentSeats = editingSeats ?? myPost?.seats ?? 3;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Event page summary ── */}
      <div className="space-y-3">
        <h2 className="text-[16px] font-bold pb-2 border-b"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: "rgba(0,0,0,0.1)" }}>
          Carpool 🚗
        </h2>

        {loading ? <p className="text-xs text-muted-foreground">Loading...</p> : (
          <>
            {/* My status card */}
            {myPost && (
              <div className={`rounded-2xl border ${myConfirmedDriver ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
                {/* Status row — tappable (same as ⋮) */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-t-2xl transition-colors ${myConfirmedDriver ? "hover:bg-green-100/60" : "hover:bg-gray-50"}`}
                  onClick={() => setMyPostMenuOpen(true)}
                >
                  {myConfirmedDriver ? (
                    <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="h-5 w-5 text-white" strokeWidth={3} />
                    </div>
                  ) : myPost.type === "driver" ? (
                    <Car className="h-4 w-4 text-gray-500 shrink-0" />
                  ) : requestedDriver ? (
                    <Avatar url={requestedDriver.profile.avatar_url} name={requestedDriver.profile.name} size={9} />
                  ) : (
                    <span className="text-sm shrink-0">🙋</span>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {myPost.type === "driver"
                        ? `Offering a ride · ${seatsLeft(myPost)} seat${seatsLeft(myPost) !== 1 ? "s" : ""} left`
                        : myConfirmedDriver ? "Ride confirmed"
                        : myRequest?.status === "declined" ? "Request declined"
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
                    {/* Show driver name + status for pending/declined requests */}
                    {!myConfirmedDriver && myRequest && requestedDriver && (
                      <p className="text-xs mt-0.5 flex items-center gap-1">
                        <span className={myRequest.status === "declined" ? "text-red-500" : "text-amber-600"}>
                          {requestedDriver.profile.name}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className={myRequest.status === "declined" ? "text-red-500" : "text-muted-foreground"}>
                          {myRequest.status === "declined" ? "Declined" : "Waiting on their reply"}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {myPostBadge > 0 && (
                      <span className="text-xs font-semibold text-white bg-black px-2 py-0.5 rounded-full">{myPostBadge}</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setMyPostMenuOpen(true); }}
                      className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Cancel request — visible on card for pending/declined, no need to open ⋮ */}
                {myPost.type === "rider" && !myConfirmedDriver && myRequest && (
                  <div
                    className="px-4 pb-3 text-center border-t border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={cancelRequest}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors pt-2 inline-block"
                    >
                      {myRequest.status === "declined" ? "Dismiss" : "Cancel request"}
                    </button>
                  </div>
                )}

                {/* Inline phone input — shown when rider has a confirmed seat but no phone on file */}
                {myPost.type === "rider" && myConfirmedDriver && myAcceptedRide && !myAcceptedRide.phone_number && (
                  <div className="px-4 pb-3 border-t border-green-100">
                    <p className="text-xs text-muted-foreground pt-2 pb-1.5">Share your phone so your driver can reach you</p>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={riderPhoneInput}
                        onChange={(e) => setRiderPhoneInput(e.target.value)}
                        placeholder="(555) 000-0000"
                        className="flex-1 h-9 rounded-xl border border-green-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={updateRiderPhone}
                        disabled={submitting || !riderPhoneInput.trim()}
                        className="px-3 h-9 rounded-xl bg-green-600 text-white text-xs font-semibold disabled:opacity-40 shrink-0 whitespace-nowrap hover:bg-green-700 transition-colors"
                      >
                        {submitting ? "…" : "Send to driver"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Count + See all */}
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
                See all <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {!myPost && session && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setCarpoolOpen(true); setModal("rider"); setHasCar(null); setPickupNeeded(null); }}
                  className="flex-1 h-11 rounded-xl border-2 border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors"
                >🙋 I need a ride</button>
                <button
                  onClick={() => { setCarpoolOpen(true); setModal("driver"); setDeparture(null); setSeats(3); setPickupOffered(null); setDriverPhone(""); }}
                  className="flex-1 h-11 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                >🚗 I can drive</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ⋮ Options sheet ── */}
      {myPostMenuOpen && myPost && (
        <Sheet onClose={() => setMyPostMenuOpen(false)} title={myPost.type === "driver" ? "Carpool Management" : "Carpool options"}>
          {/* DRIVER options */}
          {myPost.type === "driver" && (
            <div className="space-y-4">
              {/* Inline seat editor */}
              <div className="cp-item bg-gray-50 rounded-2xl p-4 space-y-3" style={{ animationDelay: "0ms" }}>
                <p className="text-sm font-semibold">Seats offered</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { const n = currentSeats - 1; if (n >= acceptedRequests.length) updateSeats(n); }}
                      disabled={currentSeats <= acceptedRequests.length}
                      className="w-8 h-8 rounded-full border-2 border-gray-300 text-lg font-bold flex items-center justify-center disabled:opacity-30 hover:border-black transition-colors"
                    >−</button>
                    <span className="text-xl font-bold w-5 text-center">{currentSeats}</span>
                    <button
                      onClick={() => { const n = currentSeats + 1; if (n <= 8) updateSeats(n); }}
                      disabled={currentSeats >= 8}
                      className="w-8 h-8 rounded-full border-2 border-gray-300 text-lg font-bold flex items-center justify-center disabled:opacity-30 hover:border-black transition-colors"
                    >+</button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {acceptedRequests.length} of {currentSeats} seats filled
                    {acceptedRequests.length === currentSeats && " · Full 🔒"}
                  </p>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: currentSeats }).map((_, i) => (
                    <div key={i} className={`flex-1 h-2 rounded-full ${i < acceptedRequests.length ? "bg-black" : "bg-gray-200"}`} />
                  ))}
                </div>
              </div>
              {/* Pending ride requests from riders — Accept / Decline */}
              {pendingRiderRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Requests · {pendingRiderRequests.length}
                  </p>
                  {pendingRiderRequests.map((req, i) => (
                    <div key={req.id} className="cp-item rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2.5"
                      style={{ animationDelay: `${(i + 1) * 60}ms` }}>
                      <div className="flex items-center gap-3">
                        <Avatar url={req.profile?.avatar_url ?? null} name={req.profile?.name ?? "?"} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{req.profile?.name}</p>
                          <p className="text-xs text-muted-foreground">Requesting a seat</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToRequest(req.id, "declined")}
                          className="flex-1 h-9 rounded-xl border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
                        >Decline</button>
                        <button
                          onClick={() => respondToRequest(req.id, "accepted")}
                          className="flex-1 h-9 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                        >Accept</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Offers sent — awaiting reply */}
              {pendingOffersSent.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Offers sent · {pendingOffersSent.length}
                  </p>
                  {pendingOffersSent.map((req, i) => (
                    <div key={req.id} className="cp-item flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100"
                      style={{ animationDelay: `${(i + 1) * 60}ms` }}>
                      <Avatar url={req.profile?.avatar_url ?? null} name={req.profile?.name ?? "?"} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{req.profile?.name}</p>
                        <p className="text-xs text-muted-foreground">Waiting for their reply…</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200 shrink-0">Offered</span>
                    </div>
                  ))}
                </div>
              )}

              {/* In your car */}
              {acceptedRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    In your car · {acceptedRequests.length} {acceptedRequests.length === 1 ? "passenger" : "passengers"}
                  </p>
                  {acceptedRequests.map((req, i) => (
                    <div key={req.id} className="cp-item rounded-xl bg-green-50 border border-green-100 p-3"
                      style={{ animationDelay: `${(pendingOffersSent.length + i + 1) * 60}ms` }}>
                      <div className="flex items-center gap-3">
                        {/* Avatar with checkmark badge */}
                        <div className="relative shrink-0">
                          <Avatar url={req.profile?.avatar_url ?? null} name={req.profile?.name ?? "?"} />
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                            <Check className="h-2 w-2 text-white" strokeWidth={3} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{req.profile?.name}</p>
                          {req.phone_number
                            ? <PhoneLink number={req.phone_number} label="Phone" />
                            : <p className="text-xs text-muted-foreground">No phone yet</p>}
                        </div>
                        {!req.phone_number && (
                          phoneRequestSent.has(req.requester_user_id)
                            ? <span className="text-xs text-green-600 font-medium shrink-0">✓ Sent</span>
                            : <button
                                onClick={() => sendPhoneRequest(req)}
                                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 font-medium hover:bg-gray-50 transition-colors shrink-0"
                              >Ask for #</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Small cancel link */}
              <div className="text-center pt-1">
                <button onClick={cancelPost} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                  Cancel my ride offer
                </button>
              </div>
            </div>
          )}

          {/* RIDER options */}
          {myPost.type === "rider" && (
            <div className="space-y-4">
              {/* Confirmed ride info */}
              {myConfirmedDriver && (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </div>
                    <p className="text-sm font-bold text-green-800">Ride confirmed</p>
                  </div>
                  <p className="text-xs text-green-700 ml-9">
                    {myConfirmedDriver.profile.name} · {myConfirmedDriver.departure_window} · {myConfirmedDriver.pickup_offered ? "They'll pick you up" : "Meet them there"}
                  </p>
                  {myConfirmedDriver.phone_number && (
                    <div className="ml-9 mt-1">
                      <PhoneLink number={myConfirmedDriver.phone_number} label="Driver" />
                    </div>
                  )}
                </div>
              )}

              {/* Pending driver offers */}
              {!myConfirmedDriver && pendingOffersToMe.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ride offers for you</p>
                  {pendingOffersToMe.map((offer) => (
                    <div key={offer.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar url={offer.driverPost?.profile?.avatar_url ?? null} name={offer.driverPost?.profile?.name ?? "Driver"} />
                        <div>
                          <p className="text-sm font-semibold">{offer.driverPost?.profile?.name ?? "A driver"} offered you a ride</p>
                          <p className="text-xs text-muted-foreground">
                            {offer.driverPost?.departure_window} · {offer.driverPost?.pickup_offered ? "Will pick you up" : "Meet them there"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => declineOffer(offer)}
                          className="flex-1 h-10 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors">
                          Decline
                        </button>
                        <button onClick={() => { setAcceptingOffer(offer); setOfferAcceptPhone(""); }}
                          className="flex-1 h-10 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending outgoing request — show the driver */}
              {!myConfirmedDriver && myRequest && (
                <div className={`rounded-2xl border p-4 space-y-2 ${myRequest.status === "declined" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                  {requestedDriver ? (
                    <div className="flex items-center gap-3">
                      <Avatar url={requestedDriver.profile.avatar_url} name={requestedDriver.profile.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{requestedDriver.profile.name}</p>
                        {requestedDriver.departure_window && (
                          <p className="text-xs text-muted-foreground">
                            {requestedDriver.departure_window} · {requestedDriver.pickup_offered ? "Will pick you up" : "Meet them there"}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <p className={`text-xs font-medium ${myRequest.status === "declined" ? "text-red-600" : "text-amber-700"}`}>
                    {myRequest.status === "declined" ? "❌ They couldn't take your request — try another driver" : "⏳ Waiting for them to accept your request"}
                  </p>
                </div>
              )}

              {/* Add phone number — shown right under the confirmed card when missing */}
              {myConfirmedDriver && myAcceptedRide && !myAcceptedRide.phone_number && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground px-1">Add your phone number so your driver can reach you</p>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={riderPhoneInput}
                      onChange={(e) => setRiderPhoneInput(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="flex-1 h-11 rounded-xl border-2 border-gray-200 px-3 text-sm focus:border-black focus:outline-none transition-colors"
                    />
                    <button
                      onClick={updateRiderPhone}
                      disabled={submitting || !riderPhoneInput.trim()}
                      className="px-4 h-11 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-40 shrink-0"
                    >
                      {submitting ? "…" : "Send"}
                    </button>
                  </div>
                </div>
              )}

              {/* Small cancel link */}
              {(myConfirmedDriver || myRequest) && (
                <div className="text-center pt-1">
                  <button onClick={cancelRequest} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                    {myConfirmedDriver ? "Cancel my spot" : "Cancel request"}
                  </button>
                </div>
              )}

              {!myConfirmedDriver && !myRequest && pendingOffersToMe.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Open "See all" to request a ride from a driver.
                </p>
              )}
            </div>
          )}
        </Sheet>
      )}

      {/* ── Accept offer — phone number ── */}
      {acceptingOffer && (
        <Sheet onClose={() => { setAcceptingOffer(null); setOfferAcceptPhone(""); }} title="Accept ride offer">
          <div className="flex items-center gap-3 rounded-2xl bg-blue-50 border border-blue-200 p-4">
            <Avatar url={acceptingOffer.driverPost?.profile?.avatar_url ?? null} name={acceptingOffer.driverPost?.profile?.name ?? "Driver"} size={10} />
            <div>
              <p className="text-sm font-semibold">{acceptingOffer.driverPost?.profile?.name}</p>
              <p className="text-xs text-muted-foreground">
                {acceptingOffer.driverPost?.departure_window} · {acceptingOffer.driverPost?.pickup_offered ? "Will pick you up" : "Meet them there"}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Your phone number <span className="font-normal text-muted-foreground">(optional)</span></label>
            <p className="text-xs text-muted-foreground">Shared with the driver so they can coordinate pickup.</p>
            <input type="tel" value={offerAcceptPhone} onChange={(e) => setOfferAcceptPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm focus:border-black focus:outline-none transition-colors" />
          </div>
          <button onClick={acceptOffer} disabled={submitting}
            className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm disabled:opacity-40">
            {submitting ? "Confirming…" : "Confirm ride"}
          </button>
        </Sheet>
      )}

      {/* ── Main carpool sheet — See all ── */}
      {carpoolOpen && createPortal(
        <>
          <style>{SHEET_STYLES}</style>
          <div className="cp-backdrop fixed inset-0 flex items-end md:items-center justify-center" style={{ zIndex: 9998 }} onClick={() => setCarpoolOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="cp-panel relative w-full max-w-2xl bg-white rounded-t-2xl md:rounded-2xl flex flex-col"
            style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b shrink-0">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>Carpool 🚗</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {availableDriverCount > 0 || riderCount > 0
                    ? [availableDriverCount > 0 && `${availableDriverCount} ${availableDriverCount === 1 ? "driver" : "drivers"} available`, riderCount > 0 && `${riderCount} need a ride`].filter(Boolean).join(" · ")
                    : "Be the first to post"}
                </p>
              </div>
              <button onClick={() => setCarpoolOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 pb-10">

              {/* Post buttons for users without a post */}
              {!myPost && session && (
                <div className="flex gap-2">
                  <button onClick={() => { setModal("rider"); setHasCar(null); setPickupNeeded(null); }}
                    className="flex-1 h-12 rounded-xl border-2 border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors">
                    🙋 I need a ride
                  </button>
                  <button onClick={() => { setModal("driver"); setDeparture(null); setSeats(3); setPickupOffered(null); setDriverPhone(""); }}
                    className="flex-1 h-12 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
                    🚗 I can drive
                  </button>
                </div>
              )}
              {!session && <p className="text-sm text-muted-foreground text-center py-2">Sign in to join carpool</p>}

              {/* Drivers offering rides */}
              {drivers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Offering rides <span className="text-muted-foreground font-normal">· {drivers.length}</span>
                  </p>
                  {drivers.map((post, i) => {
                    const left = seatsLeft(post);
                    const isMe = post.user_id === userId;
                    const myReqForThis = !isMe && myRequest?.carpool_post_id === post.id ? myRequest : null;
                    const inner = (
                      <div className={`cp-item w-full flex items-center gap-3 p-3.5 rounded-2xl border bg-white text-left shadow-sm ${isMe ? "border-black/20 bg-gray-50" : "border-gray-200 hover:border-gray-400 transition-colors"}`}
                        style={{ animationDelay: `${i * 60}ms` }}>
                        <Avatar url={post.profile.avatar_url} name={post.profile.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                            {post.profile.name}
                            {isMe && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black text-white">You</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {`${left} seat${left !== 1 ? "s" : ""} left · ${post.departure_window} · ${post.pickup_offered ? "Picks up" : "Meet there"}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isMe && post.distance !== undefined && <span className="text-xs text-muted-foreground">{fmtDist(post.distance)}</span>}
                          {isMe
                            ? <span className="text-xs text-muted-foreground">Your ride</span>
                            : myReqForThis ? (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${myReqForThis.status === "accepted" ? "bg-green-100 text-green-700" : myReqForThis.status === "declined" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                                {myReqForThis.status === "accepted" ? "✓ In" : myReqForThis.status === "declined" ? "Declined" : "Pending"}
                              </span>
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                        </div>
                      </div>
                    );
                    return isMe
                      ? <div key={post.id}>{inner}</div>
                      : <button key={post.id} onClick={() => setSelectedDriver(post)} className="w-full">{inner}</button>;
                  })}
                </div>
              )}

              {/* Riders needing a ride */}
              {riders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Need a ride <span className="text-muted-foreground font-normal">· {riders.length}</span>
                    {myPost?.type === "driver" && <span className="text-xs font-normal text-blue-600 ml-2">· tap to offer a ride</span>}
                  </p>
                  {riders.map((post, i) => {
                    const isDriver = myPost?.type === "driver";
                    const isMe = post.user_id === userId;
                    const offered = isDriver && !isMe && alreadyOffered(post.user_id);
                    const tappable = isDriver && !isMe;
                    const delay = (drivers.length + i) * 60;
                    const card = (
                      <div className={`cp-item flex items-center gap-3 p-3.5 rounded-2xl border bg-white shadow-sm w-full text-left ${tappable ? "hover:border-gray-400 transition-colors cursor-pointer" : ""} ${offered ? "border-blue-200 bg-blue-50" : isMe ? "border-black/20 bg-gray-50" : "border-gray-200"}`}
                        style={{ animationDelay: `${delay}ms` }}>
                        <Avatar url={post.profile.avatar_url} name={post.profile.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                            {post.profile.name}
                            {isMe && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black text-white">You</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {post.has_car ? "Has car · Can meet driver" : "Needs pickup"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {post.distance !== undefined && !isMe && <span className="text-xs text-muted-foreground">{fmtDist(post.distance)}</span>}
                          {isMe
                            ? <span className="text-xs text-muted-foreground">In queue</span>
                            : isDriver && (offered
                              ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Offered</span>
                              : <ChevronRight className="h-4 w-4 text-gray-400" />)}
                        </div>
                      </div>
                    );
                    return tappable
                      ? <button key={post.id} onClick={() => setSelectedRider(post)} className="w-full">{card}</button>
                      : <div key={post.id}>{card}</div>;
                  })}
                </div>
              )}

              {availableDriverCount === 0 && riderCount === 0 && !myPost && (
                <p className="text-sm text-muted-foreground text-center py-6">No carpool posts yet — be the first!</p>
              )}
            </div>
          </div>
        </div>
        </>,
        document.body
      )}

      {/* ── Driver detail sheet ── */}
      {selectedDriver && !requestConfirmDriver && (
        <Sheet onClose={() => setSelectedDriver(null)} title="Ride offer">
          <div className="flex items-center gap-3">
            <Avatar url={selectedDriver.profile.avatar_url} name={selectedDriver.profile.name} size={12} />
            <div>
              <p className="font-semibold">{selectedDriver.profile.name}</p>
              {selectedDriver.distance !== undefined && <p className="text-xs text-muted-foreground">{fmtDist(selectedDriver.distance)} from you</p>}
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
          {myRequestForSelected ? (
            <div className="space-y-3">
              <div className={`w-full h-12 rounded-xl flex items-center justify-center text-sm font-semibold ${myRequestForSelected.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" : myRequestForSelected.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                {myRequestForSelected.status === "accepted" ? "✓ You're in!" : myRequestForSelected.status === "declined" ? "Request declined" : "⏳ Waiting for driver"}
              </div>
              <div className="text-center">
                <button onClick={cancelRequest} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                  {myRequestForSelected.status === "accepted" ? "Cancel my spot" : "Cancel request"}
                </button>
              </div>
            </div>
          ) : myPost?.type === "driver" ? (
            <p className="text-xs text-muted-foreground text-center">You already posted as a driver</p>
          ) : myConfirmedDriver ? (
            <div className="space-y-2">
              <div className="w-full h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-400 cursor-not-allowed">Request a Ride</div>
              <p className="text-xs text-muted-foreground text-center">You already have a ride to this event.</p>
            </div>
          ) : (seatsLeft(selectedDriver) ?? 0) > 0 ? (
            <button onClick={() => { setRequestConfirmDriver(selectedDriver); setRiderPhone(""); }}
              className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm">
              Request a Ride
            </button>
          ) : (
            <div className="w-full h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-400">🔒 Car is full</div>
          )}
        </Sheet>
      )}

      {/* ── Rider detail sheet (driver offering) ── */}
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
            <div className="w-full h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-400">🔒 Your car is full</div>
          ) : (
            <button onClick={() => offerRide(selectedRider)} disabled={offerSubmitting}
              className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm disabled:opacity-40">
              {offerSubmitting ? "Sending…" : `Offer a ride to ${selectedRider.profile.name.split(" ")[0]}`}
            </button>
          )}
        </Sheet>
      )}

      {/* ── Request confirm (phone) ── */}
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

      {/* ── Rider form ── */}
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
          <button onClick={submitRider} disabled={submitting || hasCar === null || (hasCar === true && pickupNeeded === null)}
            className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm disabled:opacity-40">
            {submitting ? "Posting…" : "Post"}
          </button>
        </Sheet>
      )}

      {/* ── Driver form ── */}
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
