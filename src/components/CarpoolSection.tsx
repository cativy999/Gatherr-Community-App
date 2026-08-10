import { CE_BG,CE_LIGHT,CE_MUTED,CE_SURFACE,CE_TEAL_PRESS,CE_ERROR,CE_SUCCESS,CE_SUCCESS_BG_LIGHT } from '../tokens';
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { X, ChevronRight, Phone, Car, Check, MoreVertical, Home, Smile } from "lucide-react";
import LodgingSetupModal from "./LodgingSetupModal";

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
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="cp-panel relative w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 pb-10 md:pb-6 max-h-[90vh] overflow-y-auto space-y-5"
          style={{ background: CE_BG, border: "1px solid #E4DCCF" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div style={{ width: 40 }} />
            <h3 className="font-bold text-xl" style={{ color: "#2C2523", fontFamily: "'EB Garamond', Georgia, serif" }}>{title}</h3>
            <button onClick={onClose} className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70" style={{ width: 40, height: 40, background: "#E4DCCF" }}>
              <X className="h-4 w-4" style={{ color: "#2C2523" }} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

export default function CarpoolSection({ eventId, eventLocation }: { eventId: string; eventLocation?: string }) {
  const { session } = useAuth();
  const { locationLat, locationLng } = useLocation();
  const navigate = useNavigate();
  const userId = session?.user?.id;

  // Parse "City, State" from full location string (e.g. "Newport Beach, CA 92660")
  const eventCity = (() => {
    if (!eventLocation) return null;
    const parts = eventLocation.split(",").map(s => s.trim());
    if (parts.length >= 2) return `${parts[0]}, ${parts[1].replace(/\s+\d{5}.*/, "").trim()}`;
    return parts[0] || null;
  })();

  const [posts, setPosts] = useState<CarpoolPost[]>([]);
  const [myPost, setMyPost] = useState<CarpoolPost | null>(null);
  const [loading, setLoading] = useState(true);
  const autoRsvpDone = useRef(false); // fire auto-RSVP at most once per mount

  const [carpoolOpen, setCarpoolOpen] = useState(false);
  const [lodgingModalOpen, setLodgingModalOpen] = useState(false);
  const [lodgingGroupId, setLodgingGroupId] = useState<string | null>(null);
  const [modal, setModal] = useState<"rider" | "driver" | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [needType, setNeedType] = useState<"carpooling" | "lodging" | null>(null);
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
  const anySheetOpen = carpoolOpen || myPostMenuOpen || !!selectedDriver || !!selectedRider || !!requestConfirmDriver || !!acceptingOffer || requestOpen || !!modal;
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

  const handleLodgingClick = async () => {
    const { data } = await supabase
      .from("lodging_groups")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();
    setLodgingGroupId(data?.id ?? null);
    setLodgingModalOpen(true);
  };

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
    setCarpoolOpen(true);
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
    setCarpoolOpen(true);
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
      {/* ── Carpool + Lodging: stack on mobile, side-by-side on desktop ── */}
      <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: "stretch" }}>

        {/* LEFT: Carpool */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* No post — Figma horizontal card */}
          {!loading && !myPost && (
            <div
              className="flex-1 rounded-2xl flex items-center cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: "#fff", border: "1px solid #E4DCCF", padding: 20, gap: 25 }}
              onClick={() => { setRequestOpen(true); setNeedType("carpooling"); setModal(null); setHasCar(null); setPickupNeeded(null); setSeats(3); setDeparture(null); setPickupOffered(null); setDriverPhone(""); }}
            >
              {/* Illustration */}
              <div style={{ width: 120, height: 96, flexShrink: 0, overflow: "hidden" }}>
                <img
                  src="/Event%20detail%20Icons/carpool/Frame%202095594427.png"
                  alt="Carpool"
                  style={{ width: 120, height: 96, objectFit: "contain" }}
                />
              </div>
              {/* Text + button */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <div style={{ width: "100%" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600, color: "#2C2523", marginBottom: 4 }}>Carpooling</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#635C59" }}>Find or offer a ride</p>
                </div>
                <div
                  style={{
                    width: "100%", height: 44, background: "#1F4E5B",
                    borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                    color: CE_BG, fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Request
                </div>
              </div>
            </div>
          )}

          {/* Driver status card */}
          {!loading && myPost && myPost.type === "driver" && (
            <div
              className="flex-1 rounded-2xl cursor-pointer transition-opacity hover:opacity-80 flex flex-col"
              style={{ background: "#fff", border: `1px solid ${CE_LIGHT}`, boxShadow: "0px 12px 12px rgba(0,0,0,0.05), 0px 2px 4px rgba(0,0,0,0.04)" }}
              onClick={() => setMyPostMenuOpen(true)}
            >
              <div className="flex flex-col gap-3 p-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full self-start" style={{ background: CE_SURFACE, border: `1px solid ${CE_LIGHT}` }}>
                      <Car className="h-3 w-3 shrink-0" style={{ color: "#1F4E5B" }} />
                      <span className="text-[10px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: "#1F4E5B" }}>Offering a ride</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Smile className="h-3 w-3 shrink-0" style={{ color: "#9CA3AF" }} />
                      <span className="text-xs font-bold" style={{ color: "#6B7280" }}>
                        {seatsLeft(myPost)} seat{seatsLeft(myPost) !== 1 ? "s" : ""} left
                      </span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setMyPostMenuOpen(true); }} className="p-1 rounded-full transition-colors hover:bg-black/5 shrink-0">
                    <MoreVertical className="h-4 w-4" style={{ color: "#6B7280" }} />
                  </button>
                </div>
                <div>
                  <p className="font-bold text-base leading-snug" style={{ color: "#111827" }}>To {eventCity || "the event"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                    {acceptedRequests.length > 0 ? `${acceptedRequests.length} rider${acceptedRequests.length !== 1 ? "s" : ""} confirmed` : "Carpool details"}
                  </p>
                </div>
              </div>
              {(posts.length > 0 || myPost) && (
                <div className="cursor-pointer transition-opacity hover:opacity-80" style={{ borderTop: "1px solid #F0EBE4" }} onClick={(e) => { e.stopPropagation(); setCarpoolOpen(true); }}>
                  <div className="flex items-center justify-center gap-0.5 px-4 py-2.5">
                    <span className="text-xs font-semibold" style={{ color: "#1F4E5B" }}>See all carpool posts</span>
                    <ChevronRight className="h-3.5 w-3.5" style={{ color: "#1F4E5B" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rider status card */}
          {!loading && myPost && myPost.type === "rider" && (
            <div
              className="flex-1 rounded-2xl cursor-pointer transition-opacity hover:opacity-80 flex flex-col"
              style={{
                background: myConfirmedDriver ? "rgba(34,139,74,0.08)" : "#fff",
                border: myConfirmedDriver ? "1px solid rgba(34,139,74,0.25)" : `1px solid ${CE_LIGHT}`,
              }}
              onClick={() => setMyPostMenuOpen(true)}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 flex-1">
                {myConfirmedDriver ? (
                  <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 36, height: 36, background: CE_SUCCESS }}>
                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  </div>
                ) : requestedDriver ? (
                  <div className="shrink-0 rounded-full overflow-hidden" style={{ width: 36, height: 36 }}>
                    {requestedDriver.profile.avatar_url
                      ? <img src={requestedDriver.profile.avatar_url} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center font-bold text-sm" style={{ background: "#E4DCCF", color: "#2C2523" }}>{requestedDriver.profile.name?.[0] ?? "?"}</div>}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-xl shrink-0 overflow-hidden" style={{ width: 44, height: 44, background: "#F5F1EB" }}>
                    <img src="/Event%20detail%20Icons/carpool/Frame%202095594427.png" alt="Carpool" style={{ width: 38, height: 38, objectFit: "contain" }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: myConfirmedDriver ? CE_SUCCESS : "#2C2523" }}>
                    {myConfirmedDriver ? "Ride confirmed"
                      : myRequest?.status === "declined" ? "Request declined"
                      : myRequest ? "Request pending…"
                      : pendingOffersToMe.length > 0 ? `${pendingOffersToMe.length} offer${pendingOffersToMe.length !== 1 ? "s" : ""}!`
                      : "Looking for a ride"}
                  </p>
                  {myConfirmedDriver && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#635C59" }}>
                      {myConfirmedDriver.profile.name} · {myConfirmedDriver.pickup_offered ? "Pickup" : "Meet there"}
                    </p>
                  )}
                  {!myConfirmedDriver && myRequest && requestedDriver && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: myRequest.status === "declined" ? CE_ERROR : "#635C59" }}>
                      {requestedDriver.profile.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {myPostBadge > 0 && (
                    <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ background: "#1F4E5B" }}>{myPostBadge}</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setMyPostMenuOpen(true); }} className="p-1.5 rounded-full transition-colors hover:bg-black/5">
                    <MoreVertical className="h-4 w-4" style={{ color: "#635C59" }} />
                  </button>
                </div>
              </div>
              {myConfirmedDriver && myAcceptedRide && !myAcceptedRide.phone_number && (
                <div className="px-4 pb-3 border-t border-green-100">
                  <p className="text-xs text-muted-foreground pt-2 pb-1.5">Add your phone so your driver can reach you</p>
                  <div className="flex gap-2">
                    <input type="tel" value={riderPhoneInput} onChange={(e) => setRiderPhoneInput(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="flex-1 h-9 rounded-xl border border-green-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none transition-colors" />
                    <button onClick={updateRiderPhone} disabled={submitting || !riderPhoneInput.trim()}
                      className="px-3 h-9 rounded-xl bg-green-600 text-white text-xs font-semibold disabled:opacity-40 shrink-0 whitespace-nowrap hover:bg-green-700 transition-colors">
                      {submitting ? "…" : "Send"}
                    </button>
                  </div>
                </div>
              )}
              {(posts.length > 0 || myPost) && (
                <div className="cursor-pointer transition-opacity hover:opacity-80" style={{ borderTop: "1px solid #F0EBE4" }} onClick={(e) => { e.stopPropagation(); setCarpoolOpen(true); }}>
                  <div className="flex items-center justify-center gap-0.5 px-4 py-2.5">
                    <span className="text-xs font-semibold" style={{ color: "#1F4E5B" }}>See all carpool posts</span>
                    <ChevronRight className="h-3.5 w-3.5" style={{ color: "#1F4E5B" }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Lodging */}
        <div
          className="rounded-2xl flex items-center cursor-pointer transition-opacity hover:opacity-80"
          style={{ flex: 1, background: "#fff", border: "1px solid #E4DCCF", padding: 20, gap: 25 }}
          onClick={handleLodgingClick}
        >
          {/* Illustration */}
          <div style={{ width: 102, height: 96, flexShrink: 0, overflow: "hidden" }}>
            <img
              src="/Event%20detail%20Icons/carpool/Frame%202095594425.png"
              alt="Lodging"
              style={{ width: 102, height: 96, objectFit: "contain" }}
            />
          </div>
          {/* Text + button */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div style={{ width: "100%" }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600, color: "#2C2523", marginBottom: 4 }}>Lodging</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#635C59" }}>Find a place to stay</p>
            </div>
            <div
              style={{
                width: "100%", height: 44, background: "#1F4E5B",
                borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                color: CE_BG, fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif",
              }}
            >
              Find
            </div>
          </div>
        </div>

      </div>

      {/* ── ⋮ Options sheet ── */}
      {myPostMenuOpen && myPost && (
        <Sheet onClose={() => setMyPostMenuOpen(false)} title={myPost.type === "driver" ? "Carpool Management" : "Carpool options"}>
          {/* DRIVER options */}
          {myPost.type === "driver" && (
            <div className="space-y-4">
              {/* Inline seat editor */}
              <div className="cp-item rounded-2xl p-4 space-y-3" style={{ animationDelay: "0ms", background: "#fff", border: "1px solid #E4DCCF" }}>
                <p className="font-semibold text-sm" style={{ color: "#2C2523" }}>Seats offered</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { const n = currentSeats - 1; if (n >= acceptedRequests.length) updateSeats(n); }}
                      disabled={currentSeats <= acceptedRequests.length}
                      className="w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center disabled:opacity-30 transition-colors"
                      style={{ border: `2px solid ${CE_LIGHT}`, color: "#2C2523" }}
                    >−</button>
                    <span className="text-xl font-bold w-5 text-center" style={{ color: "#2C2523" }}>{currentSeats}</span>
                    <button
                      onClick={() => { const n = currentSeats + 1; if (n <= 8) updateSeats(n); }}
                      disabled={currentSeats >= 8}
                      className="w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center disabled:opacity-30 transition-colors"
                      style={{ border: `2px solid ${CE_LIGHT}`, color: "#2C2523" }}
                    >+</button>
                  </div>
                  <p className="text-xs" style={{ color: CE_MUTED }}>
                    {acceptedRequests.length} of {currentSeats} seats filled
                    {acceptedRequests.length === currentSeats && " · Full 🔒"}
                  </p>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: currentSeats }).map((_, i) => (
                    <div key={i} className="flex-1 h-2 rounded-full" style={{ background: i < acceptedRequests.length ? "#1F4E5B" : "#E4DCCF" }} />
                  ))}
                </div>
              </div>

              {/* Pending ride requests from riders — Accept / Decline */}
              {pendingRiderRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-widest" style={{ color: "#635C59" }}>
                    REQUESTS · {pendingRiderRequests.length}
                  </p>
                  {pendingRiderRequests.map((req, i) => (
                    <div key={req.id} className="cp-item rounded-2xl p-4 space-y-3"
                      style={{ animationDelay: `${(i + 1) * 60}ms`, background: "#fff", border: "1px solid #E4DCCF" }}>
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 rounded-full overflow-hidden flex items-center justify-center" style={{ width: 40, height: 40, background: "#E4DCCF" }}>
                          {req.profile?.avatar_url
                            ? <img src={req.profile.avatar_url} className="w-full h-full object-cover" />
                            : <span className="font-bold" style={{ color: "#2C2523" }}>{(req.profile?.name ?? "?")[0]}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: "#2C2523" }}>{req.profile?.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: CE_MUTED }}>Requesting a seat</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => respondToRequest(req.id, "declined")}
                          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-70"
                          style={{ background: "#fff", border: `1.5px solid ${CE_LIGHT}`, color: "#2C2523" }}>Decline</button>
                        <button onClick={() => respondToRequest(req.id, "accepted")}
                          className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-80"
                          style={{ background: "#1F4E5B" }}>Accept</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Offers sent — awaiting reply */}
              {pendingOffersSent.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-widest" style={{ color: "#635C59" }}>
                    OFFERS SENT · {pendingOffersSent.length}
                  </p>
                  {pendingOffersSent.map((req, i) => (
                    <div key={req.id} className="cp-item flex items-center gap-3 p-4 rounded-2xl"
                      style={{ animationDelay: `${(i + 1) * 60}ms`, background: CE_SUCCESS_BG_LIGHT, border: "2px solid #1F4E5B" }}>
                      <div className="shrink-0 rounded-full overflow-hidden flex items-center justify-center" style={{ width: 40, height: 40, background: "#E4DCCF" }}>
                        {req.profile?.avatar_url
                          ? <img src={req.profile.avatar_url} className="w-full h-full object-cover" />
                          : <span className="font-bold" style={{ color: "#2C2523" }}>{(req.profile?.name ?? "?")[0]}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: "#2C2523" }}>{req.profile?.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#635C59" }}>Waiting for their reply…</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: "rgba(112,185,190,0.2)", color: "#1F4E5B" }}>Offered</span>
                    </div>
                  ))}
                </div>
              )}

              {/* In your car */}
              {acceptedRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-widest" style={{ color: "#635C59" }}>
                    IN YOUR CAR · {acceptedRequests.length} {acceptedRequests.length === 1 ? "PASSENGER" : "PASSENGERS"}
                  </p>
                  {acceptedRequests.map((req, i) => (
                    <div key={req.id} className="cp-item rounded-2xl p-4"
                      style={{ animationDelay: `${(pendingOffersSent.length + i + 1) * 60}ms`, background: "rgba(34,139,74,0.07)", border: "1px solid rgba(34,139,74,0.25)" }}>
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 40, height: 40, background: "#E4DCCF" }}>
                            {req.profile?.avatar_url
                              ? <img src={req.profile.avatar_url} className="w-full h-full object-cover" />
                              : <span className="font-bold" style={{ color: "#2C2523" }}>{(req.profile?.name ?? "?")[0]}</span>}
                          </div>
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center" style={{ background: CE_SUCCESS }}>
                            <Check className="h-2 w-2 text-white" strokeWidth={3} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: "#2C2523" }}>{req.profile?.name}</p>
                          {req.phone_number
                            ? <PhoneLink number={req.phone_number} label="Phone" />
                            : <p className="text-xs mt-0.5" style={{ color: CE_MUTED }}>No phone yet</p>}
                        </div>
                        {!req.phone_number && (
                          phoneRequestSent.has(req.requester_user_id)
                            ? <span className="text-xs font-medium shrink-0" style={{ color: CE_SUCCESS }}>✓ Sent</span>
                            : <button onClick={() => sendPhoneRequest(req)}
                                className="text-xs px-2.5 py-1 rounded-full font-medium transition-opacity hover:opacity-70 shrink-0"
                                style={{ border: `1px solid ${CE_LIGHT}`, background: "#fff", color: "#2C2523" }}>Ask for #</button>
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
                  <p className="text-xs font-semibold tracking-widest" style={{ color: "#635C59" }}>RIDE OFFERS FOR YOU</p>
                  {pendingOffersToMe.map((offer) => (
                    <div key={offer.id} className="rounded-2xl p-4 space-y-3" style={{ background: "#fff", border: "1px solid #E4DCCF" }}>
                      <div className="flex items-center gap-3">
                        <div className="shrink-0" style={{ width: 44, height: 44 }}>
                          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: "#E4DCCF" }}>
                            {offer.driverPost?.profile?.avatar_url
                              ? <img src={offer.driverPost.profile.avatar_url} className="w-full h-full object-cover" />
                              : <span className="font-bold" style={{ color: "#2C2523" }}>{(offer.driverPost?.profile?.name ?? "D")[0]}</span>}
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "#2C2523" }}>{offer.driverPost?.profile?.name ?? "A driver"} offered you a ride</p>
                          <p className="text-xs mt-0.5" style={{ color: CE_MUTED }}>
                            {offer.driverPost?.departure_window} · {offer.driverPost?.pickup_offered ? "Will pick you up" : "Meet them there"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => declineOffer(offer)}
                          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-70"
                          style={{ background: "#fff", border: `1.5px solid ${CE_LIGHT}`, color: "#2C2523" }}>
                          Decline
                        </button>
                        <button onClick={() => { setAcceptingOffer(offer); setOfferAcceptPhone(""); }}
                          className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-80"
                          style={{ background: "#1F4E5B" }}>
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

              {/* Cancel / remove — always available for rider posts */}
              <div className="text-center pt-1">
                <button
                  onClick={myConfirmedDriver || myRequest ? cancelRequest : cancelPost}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  {myConfirmedDriver ? "Cancel my spot"
                    : myRequest ? (myRequest.status === "declined" ? "Dismiss" : "Cancel request")
                    : "Remove 'looking for a ride'"}
                </button>
              </div>

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
          {/* Driver info card */}
          <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #E4DCCF" }}>
            <div className="shrink-0" style={{ width: 44, height: 44 }}>
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: "#E4DCCF", border: `2px solid ${CE_TEAL_PRESS}` }}>
                {acceptingOffer.driverPost?.profile?.avatar_url
                  ? <img src={acceptingOffer.driverPost.profile.avatar_url} className="w-full h-full object-cover" />
                  : <span className="font-bold" style={{ color: "#2C2523" }}>{(acceptingOffer.driverPost?.profile?.name ?? "D")[0]}</span>}
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: "#2C2523" }}>{acceptingOffer.driverPost?.profile?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: CE_MUTED }}>
                {acceptingOffer.driverPost?.departure_window} · {acceptingOffer.driverPost?.pickup_offered ? "Will pick you up" : "Meet them there"}
              </p>
            </div>
          </div>
          {/* Phone */}
          <div className="space-y-2">
            <p className="font-semibold text-sm" style={{ color: "#2C2523" }}>Your phone number <span className="font-normal" style={{ color: CE_MUTED }}>(optional)</span></p>
            <p className="text-sm" style={{ color: CE_MUTED }}>Shared with the driver so they can coordinate pickup.</p>
            <input type="tel" value={offerAcceptPhone} onChange={(e) => setOfferAcceptPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="w-full h-12 px-4 text-sm outline-none"
              style={{ borderRadius: 16, border: `1.5px solid ${CE_LIGHT}`, background: "#fff", color: "#2C2523", fontFamily: "'Inter', sans-serif" }} />
          </div>
          <div style={{ height: 1, background: CE_LIGHT }} />
          <button onClick={acceptOffer} disabled={submitting}
            className="w-full py-4 rounded-full font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "#1F4E5B", fontSize: 16 }}>
            {submitting ? "Confirming…" : "Confirm ride"}
          </button>
        </Sheet>
      )}

      {/* ── "What do you need?" request modal ── */}
      {requestOpen && createPortal(
        <>
          <style>{SHEET_STYLES}</style>
          <div className="cp-backdrop fixed inset-0 flex items-end md:items-center justify-center" style={{ zIndex: 9999 }}
            onClick={() => setRequestOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="cp-panel relative w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 pb-10 md:pb-6 max-h-[90vh] overflow-y-auto"
              style={{ background: CE_BG }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: "#2C2523", fontFamily: "'EB Garamond', Georgia, serif" }}>
                  What do you need?
                </h2>
                <button
                  onClick={() => setRequestOpen(false)}
                  className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70 flex-shrink-0"
                  style={{ width: 40, height: 40, background: "#E4DCCF" }}
                >
                  <X className="h-4 w-4" style={{ color: "#2C2523" }} />
                </button>
              </div>

              {/* TRANSPORTATION options — straight to this since user already picked Carpool */}
              {needType === "carpooling" && (
                <>
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        label: "I need a ride",
                        img: "/Event%20detail%20Icons/carpool/carseats.png",
                        onClick: () => { setRequestOpen(false); setNeedType(null); setModal("rider"); setHasCar(null); setPickupNeeded(null); },
                      },
                      {
                        label: "I can offer rides",
                        img: "/Event%20detail%20Icons/carpool/steeringwheel.png",
                        onClick: () => { setRequestOpen(false); setNeedType(null); setModal("driver"); setDeparture(null); setSeats(3); setPickupOffered(null); setDriverPhone(""); },
                      },
                    ].map(({ label, img, onClick }) => (
                      <button
                        key={label}
                        onClick={onClick}
                        className="flex items-center gap-3 text-left transition-all hover:opacity-80"
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          background: "#fff",
                          border: "1px solid #E4DCCF",
                        }}
                      >
                        {/* Illustration */}
                        <div style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <img src={img} alt={label} style={{ width: 34, height: 34, objectFit: "contain" }} />
                        </div>
                        <span className="flex-1 font-semibold" style={{ fontSize: 14, color: "#2C2523" }}>{label}</span>
                        {/* Radio */}
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #E4DCCF", flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Footer info */}
              <div style={{ height: 1, background: CE_LIGHT, marginTop: 20, marginBottom: 16 }} />
              <p className="text-xs flex items-center gap-2" style={{ color: "#635C59" }}>
                <span className="flex-shrink-0">ⓘ</span>
                Connect with other players to share travel costs and stays.
              </p>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Main carpool sheet — See all ── */}
      {carpoolOpen && createPortal(
        <>
          <style>{SHEET_STYLES}</style>
          <div className="cp-backdrop fixed inset-0 flex items-end md:items-center justify-center" style={{ zIndex: 9998 }} onClick={() => setCarpoolOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="cp-panel relative w-full max-w-lg rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden"
              style={{ maxHeight: "90vh", background: CE_BG, border: "1px solid #E4DCCF", boxShadow: "0px 16px 32px -4px rgba(30,26,24,0.15)" }}
              onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex flex-col items-center pt-7 pb-5 px-7 shrink-0" style={{ borderBottom: "1px solid #E4DCCF" }}>
                <div className="flex items-center justify-between w-full mb-1">
                  {/* invisible spacer to center title */}
                  <div style={{ width: 36, height: 36 }} />
                  <h2 className="font-bold" style={{ fontSize: 26, color: "#2C2523", fontFamily: "'EB Garamond', Georgia, serif" }}>Carpool</h2>
                  <button
                    onClick={() => setCarpoolOpen(false)}
                    className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                    style={{ width: 40, height: 40, background: "#E4DCCF" }}
                  >
                    <X className="h-4 w-4" style={{ color: "#2C2523" }} />
                  </button>
                </div>
                <p className="text-sm" style={{ color: CE_MUTED }}>
                  {availableDriverCount > 0 || riderCount > 0
                    ? [availableDriverCount > 0 && `${availableDriverCount} ${availableDriverCount === 1 ? "driver" : "drivers"} available`, riderCount > 0 && `${riderCount} need a ride`].filter(Boolean).join(" · ")
                    : "Be the first to post"}
                </p>
              </div>

              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6 pb-10">

                {/* Post buttons for users without a post */}
                {!myPost && session && (
                  <div className="flex gap-2">
                    <button onClick={() => { setCarpoolOpen(false); setModal("rider"); setHasCar(null); setPickupNeeded(null); }}
                      className="flex-1 h-12 rounded-full border-2 text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ borderColor: "#1F4E5B", color: "#1F4E5B" }}>
                      🙋 I need a ride
                    </button>
                    <button onClick={() => { setCarpoolOpen(false); setModal("driver"); setDeparture(null); setSeats(3); setPickupOffered(null); setDriverPhone(""); }}
                      className="flex-1 h-12 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-80"
                      style={{ background: "#1F4E5B" }}>
                      🚗 I can drive
                    </button>
                  </div>
                )}
                {!session && <p className="text-sm text-center py-2" style={{ color: CE_MUTED }}>Sign in to join carpool</p>}

                {/* Drivers offering rides */}
                {drivers.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold" style={{ fontSize: 15, color: "#2C2523" }}>Offering rides</p>
                      <p style={{ fontSize: 15, color: CE_MUTED }}>· {drivers.length}</p>
                    </div>
                    {drivers.map((post, i) => {
                      const left = seatsLeft(post);
                      const isMe = post.user_id === userId;
                      const myReqForThis = !isMe && myRequest?.carpool_post_id === post.id ? myRequest : null;
                      const inner = (
                        <div className="cp-item w-full flex items-center gap-3 text-left relative"
                          style={{ animationDelay: `${i * 60}ms`, background: "#fff", border: "1px solid #E4DCCF", borderRadius: 16, padding: 16 }}>
                          {/* Avatar */}
                          <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
                            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                              style={{ background: "#E4DCCF", border: isMe ? `2px solid ${CE_TEAL_PRESS}` : "none" }}>
                              {post.profile.avatar_url
                                ? <img src={post.profile.avatar_url} className="w-full h-full object-cover" />
                                : <span className="font-bold text-lg" style={{ color: "#2C2523" }}>{post.profile.name?.[0] ?? "?"}</span>}
                            </div>
                            {isMe && (
                              <div className="absolute flex items-center justify-center rounded-full"
                                style={{ bottom: -4, left: "50%", transform: "translateX(-50%)", background: CE_TEAL_PRESS, border: "0.8px solid #fff", paddingLeft: 5, paddingRight: 5, paddingTop: 2, paddingBottom: 2 }}>
                                <span className="font-bold text-white" style={{ fontSize: 8 }}>You</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate" style={{ fontSize: 15, color: "#2C2523" }}>{post.profile.name}</p>
                            <p className="mt-0.5" style={{ fontSize: 13, color: CE_MUTED }}>
                              {`${left} seat${left !== 1 ? "s" : ""} left · ${post.departure_window} · ${post.pickup_offered ? "Picks up" : "Meet there"}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isMe
                              ? <span className="font-bold" style={{ fontSize: 11, color: "#2C2523" }}>Your ride</span>
                              : myReqForThis ? (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${myReqForThis.status === "accepted" ? "bg-green-100 text-green-700" : myReqForThis.status === "declined" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                                  {myReqForThis.status === "accepted" ? "✓ In" : myReqForThis.status === "declined" ? "Declined" : "Pending"}
                                </span>
                              ) : (
                                <span style={{ fontSize: 16, color: "#2C2523" }}>›</span>
                              )}
                          </div>
                        </div>
                      );
                      return isMe
                        ? <div key={post.id}>{inner}</div>
                        : <button key={post.id} onClick={() => setSelectedDriver(post)} className="w-full transition-opacity hover:opacity-80">{inner}</button>;
                    })}
                  </div>
                )}

                {/* Divider between sections */}
                {drivers.length > 0 && riders.length > 0 && (
                  <div style={{ height: 1, background: CE_LIGHT }} />
                )}

                {/* Riders needing a ride */}
                {riders.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold" style={{ fontSize: 15, color: "#2C2523" }}>Need a ride</p>
                      <p style={{ fontSize: 15, color: CE_MUTED }}>· {riders.length}</p>
                      {myPost?.type === "driver" && (
                        <>
                          <span style={{ fontSize: 14, color: CE_MUTED }}>·</span>
                          <button onClick={() => {}} className="font-bold underline" style={{ fontSize: 14, color: "#1F4E5B" }}>tap to offer a ride</button>
                        </>
                      )}
                    </div>
                    {riders.map((post, i) => {
                      const isDriver = myPost?.type === "driver";
                      const isMe = post.user_id === userId;
                      const offered = isDriver && !isMe && alreadyOffered(post.user_id);
                      const tappable = isDriver && !isMe;
                      const delay = (drivers.length + i) * 60;
                      const card = (
                        <div className="cp-item flex items-center gap-3 w-full text-left relative"
                          style={{ animationDelay: `${delay}ms`, background: offered ? CE_SUCCESS_BG_LIGHT : "#fff", border: `${offered ? "2px" : "1px"} solid ${offered ? "#1F4E5B" : "#E4DCCF"}`, borderRadius: 16, padding: 16 }}>
                          {/* Avatar */}
                          <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
                            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                              style={{ background: "#E4DCCF", border: isMe ? `2px solid ${CE_TEAL_PRESS}` : "none" }}>
                              {post.profile.avatar_url
                                ? <img src={post.profile.avatar_url} className="w-full h-full object-cover" />
                                : <span className="font-bold text-lg" style={{ color: "#2C2523" }}>{post.profile.name?.[0] ?? "?"}</span>}
                            </div>
                            {isMe && (
                              <div className="absolute flex items-center justify-center rounded-full"
                                style={{ bottom: -4, left: "50%", transform: "translateX(-50%)", background: CE_TEAL_PRESS, border: "0.8px solid #fff", paddingLeft: 5, paddingRight: 5, paddingTop: 2, paddingBottom: 2 }}>
                                <span className="font-bold text-white" style={{ fontSize: 8 }}>You</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate" style={{ fontSize: 15, color: "#2C2523" }}>{post.profile.name}</p>
                            <p className="mt-0.5" style={{ fontSize: 13, color: CE_MUTED }}>
                              {post.pickup_needed ? "Needs pickup" : "Has car · Can meet driver"}
                            </p>
                          </div>
                          <div className="flex items-center shrink-0">
                            {isMe
                              ? <span style={{ fontSize: 13, color: CE_MUTED }}>In queue</span>
                              : offered
                                ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(112,185,190,0.15)", color: "#1F4E5B" }}>Offered</span>
                                : tappable
                                  ? <span style={{ fontSize: 16, color: "#2C2523" }}>›</span>
                                  : null}
                          </div>
                        </div>
                      );
                      return tappable
                        ? <button key={post.id} onClick={() => setSelectedRider(post)} className="w-full transition-opacity hover:opacity-80">{card}</button>
                        : <div key={post.id}>{card}</div>;
                    })}
                  </div>
                )}

                {availableDriverCount === 0 && riderCount === 0 && !myPost && (
                  <p className="text-sm text-center py-6" style={{ color: CE_MUTED }}>No carpool posts yet — be the first!</p>
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
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0" style={{ width: 52, height: 52 }}>
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: "#E4DCCF", border: `2px solid ${CE_TEAL_PRESS}` }}>
                {selectedDriver.profile.avatar_url
                  ? <img src={selectedDriver.profile.avatar_url} className="w-full h-full object-cover" />
                  : <span className="font-bold text-xl" style={{ color: "#2C2523" }}>{selectedDriver.profile.name?.[0] ?? "?"}</span>}
              </div>
            </div>
            <div>
              <p className="font-bold" style={{ fontSize: 16, color: "#2C2523" }}>{selectedDriver.profile.name}</p>
              {selectedDriver.distance !== undefined && <p className="text-sm" style={{ color: CE_MUTED }}>{fmtDist(selectedDriver.distance)} from you</p>}
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            {[
              { value: seatsLeft(selectedDriver) === 0 ? "Full" : String(seatsLeft(selectedDriver)), label: "seats left", red: seatsLeft(selectedDriver) === 0 },
              { value: selectedDriver.departure_window ?? "—", label: "departure", red: false },
              { value: selectedDriver.pickup_offered ? "Picks up" : "Meet there", label: "pickup", red: false },
            ].map(({ value, label, red }) => (
              <div key={label} className="flex flex-col items-center justify-center py-4 rounded-2xl" style={{ background: "#fff", border: "1px solid #E4DCCF" }}>
                <p className="font-bold" style={{ fontSize: 17, color: red ? CE_ERROR : "#2C2523" }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: CE_MUTED }}>{label}</p>
              </div>
            ))}
          </div>

          {myRequestForSelected?.status === "accepted" && selectedDriver.phone_number && (
            <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(112,185,190,0.1)", border: "1px solid #1F4E5B" }}>
              <PhoneLink number={selectedDriver.phone_number} label="Driver" />
            </div>
          )}

          <div style={{ height: 1, background: CE_LIGHT }} />

          {myRequestForSelected ? (
            <div className="space-y-3">
              <div className={`w-full py-3.5 rounded-full flex items-center justify-center text-sm font-semibold ${myRequestForSelected.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" : myRequestForSelected.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                {myRequestForSelected.status === "accepted" ? "✓ You're in!" : myRequestForSelected.status === "declined" ? "Request declined" : "⏳ Waiting for driver"}
              </div>
              <div className="text-center">
                <button onClick={cancelRequest} className="text-xs transition-opacity hover:opacity-70" style={{ color: CE_ERROR }}>
                  {myRequestForSelected.status === "accepted" ? "Cancel my spot" : "Cancel request"}
                </button>
              </div>
            </div>
          ) : myPost?.type === "driver" ? (
            <p className="text-sm text-center" style={{ color: CE_MUTED }}>You already posted as a driver</p>
          ) : myConfirmedDriver ? (
            <div className="space-y-2">
              <div className="w-full py-3.5 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: "#E4DCCF", color: "#635C59" }}>Request a Ride</div>
              <p className="text-xs text-center" style={{ color: CE_MUTED }}>You already have a ride to this event.</p>
            </div>
          ) : (seatsLeft(selectedDriver) ?? 0) > 0 ? (
            <button onClick={() => { setRequestConfirmDriver(selectedDriver); setRiderPhone(""); }}
              className="w-full py-4 rounded-full font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: "#1F4E5B", fontSize: 16 }}>
              Request a Ride
            </button>
          ) : (
            <div className="w-full py-3.5 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: "#E4DCCF", color: "#635C59" }}>🔒 Car is full</div>
          )}
        </Sheet>
      )}

      {/* ── Rider detail sheet (driver offering) ── */}
      {selectedRider && myPost?.type === "driver" && (
        <Sheet onClose={() => setSelectedRider(null)} title="Offer a ride">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0" style={{ width: 52, height: 52 }}>
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: "#E4DCCF" }}>
                {selectedRider.profile.avatar_url
                  ? <img src={selectedRider.profile.avatar_url} className="w-full h-full object-cover" />
                  : <span className="font-bold text-xl" style={{ color: "#2C2523" }}>{selectedRider.profile.name?.[0] ?? "?"}</span>}
              </div>
            </div>
            <div>
              <p className="font-bold" style={{ fontSize: 16, color: "#2C2523" }}>{selectedRider.profile.name}</p>
              <p className="text-sm" style={{ color: CE_MUTED }}>
                {selectedRider.pickup_needed ? "Needs pickup" : "Has car · Can meet you"}
                {selectedRider.distance !== undefined && ` · ${fmtDist(selectedRider.distance)} away`}
              </p>
            </div>
          </div>
          <div className={`grid gap-2.5 text-center ${selectedRider.distance !== undefined ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="flex flex-col items-center justify-center py-4 rounded-2xl" style={{ background: "#fff", border: "1px solid #E4DCCF" }}>
              <p className="font-bold" style={{ fontSize: 15, color: "#2C2523" }}>{selectedRider.pickup_needed ? "Needs pickup" : "Can meet"}</p>
              <p className="text-xs mt-0.5" style={{ color: CE_MUTED }}>pickup</p>
            </div>
            {selectedRider.distance !== undefined && (
              <div className="flex flex-col items-center justify-center py-4 rounded-2xl" style={{ background: "#fff", border: "1px solid #E4DCCF" }}>
                <p className="font-bold" style={{ fontSize: 15, color: "#2C2523" }}>{fmtDist(selectedRider.distance)}</p>
                <p className="text-xs mt-0.5" style={{ color: CE_MUTED }}>from you</p>
              </div>
            )}
          </div>
          <div style={{ height: 1, background: CE_LIGHT }} />
          {alreadyOffered(selectedRider.user_id) ? (
            <div className="w-full py-3.5 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: "rgba(112,185,190,0.1)", border: "1px solid #1F4E5B", color: "#1F4E5B" }}>
              ✓ Offer sent — waiting for their reply
            </div>
          ) : (seatsLeft(myPost) ?? 0) <= 0 ? (
            <div className="w-full py-3.5 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: "#E4DCCF", color: "#635C59" }}>🔒 Your car is full</div>
          ) : (
            <button onClick={() => offerRide(selectedRider)} disabled={offerSubmitting}
              className="w-full py-4 rounded-full font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "#1F4E5B", fontSize: 16 }}>
              {offerSubmitting ? "Sending…" : `Offer a ride to ${selectedRider.profile.name.split(" ")[0]}`}
            </button>
          )}
        </Sheet>
      )}

      {/* ── Request confirm (phone) ── */}
      {requestConfirmDriver && (
        <Sheet onClose={() => setRequestConfirmDriver(null)} title={`Request from ${requestConfirmDriver.profile.name}`}>
          <div className="space-y-2">
            <p className="font-semibold text-sm" style={{ color: "#2C2523" }}>
              Your phone number <span className="font-normal" style={{ color: CE_MUTED }}>(optional)</span>
            </p>
            <p className="text-sm" style={{ color: CE_MUTED }}>Shared with the driver only if they accept you.</p>
            <input type="tel" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="w-full h-12 px-4 text-sm outline-none transition-colors"
              style={{ borderRadius: 16, border: `1.5px solid ${CE_LIGHT}`, background: "#fff", color: "#2C2523", fontFamily: "'Inter', sans-serif" }} />
          </div>
          <div style={{ height: 1, background: CE_LIGHT }} />
          <button onClick={() => requestRide(requestConfirmDriver)} disabled={submitting}
            className="w-full py-4 rounded-full font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "#1F4E5B", fontSize: 16 }}>
            {submitting ? "Sending…" : "Send Request"}
          </button>
        </Sheet>
      )}

      {/* ── Rider form ── */}
      {modal === "rider" && createPortal(
        <>
          <style>{SHEET_STYLES}</style>
          <div className="cp-backdrop fixed inset-0 flex items-end md:items-center justify-center" style={{ zIndex: 9999 }}
            onClick={() => setModal(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="cp-panel relative w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 pb-10 md:pb-6 max-h-[90vh] overflow-y-auto space-y-5"
              style={{ background: CE_BG }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setModal(null); setRequestOpen(true); setNeedType("carpooling"); }}
                  className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  style={{ width: 40, height: 40, background: "#E4DCCF" }}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "#2C2523" }} />
                </button>
                <h2 className="text-xl font-bold" style={{ color: "#2C2523", fontFamily: "'EB Garamond', Georgia, serif" }}>I need a ride</h2>
                <button
                  onClick={() => setModal(null)}
                  className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  style={{ width: 40, height: 40, background: "#E4DCCF" }}
                >
                  <X className="h-4 w-4" style={{ color: "#2C2523" }} />
                </button>
              </div>

              {/* Do you have a car? */}
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "#2C2523" }}>Do you have a car?</p>
                <div className="flex flex-col gap-2">
                  {[{ label: "Yes — but I'd rather not drive", val: true }, { label: "No car", val: false }].map(({ label, val }) => (
                    <button key={label} type="button"
                      onClick={() => { setHasCar(val); if (!val) setPickupNeeded(true); else setPickupNeeded(null); }}
                      className="flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-sm transition-all text-left hover:opacity-80"
                      style={{
                        background: hasCar === val ? CE_SUCCESS_BG_LIGHT : "#fff",
                        borderColor: hasCar === val ? "#1F4E5B" : CE_LIGHT,
                        color: "#2C2523",
                      }}
                    >
                      {label}
                      <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                        style={{ borderColor: hasCar === val ? "#1F4E5B" : CE_LIGHT }}>
                        {hasCar === val && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#1F4E5B" }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Can you meet the driver? */}
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "#2C2523" }}>Can you meet the driver, or need pickup?</p>
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    { label: "I can meet the driver",  img: "/Event detail Icons/carpool/I can meet the driver.png",  val: false },
                    { label: "I need to be picked up", img: "/Event detail Icons/carpool/I need to be picked up.png", val: true  },
                  ].map(({ label, img, val }) => {
                    const selected = pickupNeeded === val;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPickupNeeded(val)}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 12,
                          padding: "20px 12px",
                          borderRadius: 16,
                          background: selected ? "rgba(112, 185, 190, 0.11)" : "#fff",
                          border: selected ? "2px solid #1F4E5B" : "1px solid #E4DCCF",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <img
                          src={img}
                          alt={label}
                          style={{ width: "100%", maxWidth: 110, height: 90, objectFit: "contain" }}
                        />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "#2C2523", textAlign: "center", lineHeight: 1.3 }}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ height: 1, background: CE_LIGHT }} />
              <button onClick={submitRider} disabled={submitting || hasCar === null || (hasCar === true && pickupNeeded === null)}
                className="w-full py-4 rounded-full font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "#1F4E5B", fontSize: 16 }}>
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Driver form ── */}
      {modal === "driver" && createPortal(
        <>
          <style>{SHEET_STYLES}</style>
          <div className="cp-backdrop fixed inset-0 flex items-end md:items-center justify-center" style={{ zIndex: 9999 }}
            onClick={() => setModal(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="cp-panel relative w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 pb-10 md:pb-6 max-h-[90vh] overflow-y-auto space-y-5"
              style={{ background: CE_BG }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setModal(null); setRequestOpen(true); setNeedType("carpooling"); }}
                  className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  style={{ width: 40, height: 40, background: "#E4DCCF" }}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "#2C2523" }} />
                </button>
                <h2 className="text-xl font-bold" style={{ color: "#2C2523", fontFamily: "'EB Garamond', Georgia, serif" }}>I can drive</h2>
                <button
                  onClick={() => setModal(null)}
                  className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  style={{ width: 40, height: 40, background: "#E4DCCF" }}
                >
                  <X className="h-4 w-4" style={{ color: "#2C2523" }} />
                </button>
              </div>

              {/* Seats */}
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "#2C2523" }}>How many seats can you offer?</p>
                <div className="flex gap-2">
                  {[1,2,3,4,5,6].map((n) => (
                    <button key={n} type="button" onClick={() => setSeats(n)}
                      className="w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all flex items-center justify-center"
                      style={{
                        background: seats === n ? CE_SUCCESS_BG_LIGHT : "#fff",
                        border: seats === n ? "2px solid #1F4E5B" : `2px solid ${CE_LIGHT}`,
                        color: "#2C2523",
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Departure time */}
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "#2C2523" }}>Rough departure time</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Morning", "Afternoon", "Evening", "Flexible"].map((d) => (
                    <button key={d} type="button" onClick={() => setDeparture(d)}
                      className="py-3.5 rounded-2xl border-2 text-sm font-medium transition-all"
                      style={{
                        background: departure === d ? CE_SUCCESS_BG_LIGHT : "#fff",
                        borderColor: departure === d ? "#1F4E5B" : CE_LIGHT,
                        color: "#2C2523",
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pickup offered */}
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "#2C2523" }}>Will you pick riders up?</p>
                <div className="flex flex-col gap-2">
                  {[{ label: "Yes, I'll pick people up", emoji: "🚗", val: true }, { label: "Riders meet me at a spot", emoji: "📍", val: false }].map(({ label, emoji, val }) => (
                    <button key={label} type="button" onClick={() => setPickupOffered(val)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-sm transition-all text-left hover:opacity-80"
                      style={{
                        background: pickupOffered === val ? CE_SUCCESS_BG_LIGHT : "#fff",
                        borderColor: pickupOffered === val ? "#1F4E5B" : CE_LIGHT,
                        color: "#2C2523",
                      }}
                    >
                      <span className="text-base">{emoji}</span>
                      <span className="flex-1">{label}</span>
                      <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                        style={{ borderColor: pickupOffered === val ? "#1F4E5B" : CE_LIGHT }}>
                        {pickupOffered === val && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#1F4E5B" }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone number */}
              <div className="space-y-1.5">
                <p className="text-sm font-semibold" style={{ color: "#2C2523" }}>Your phone number</p>
                <p className="text-xs" style={{ color: "#635C59" }}>Shared only with riders you accept.</p>
                <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 text-sm focus:outline-none transition-colors"
                  style={{ borderColor: CE_LIGHT, background: "#fff", color: "#2C2523" }} />
              </div>

              <div style={{ height: 1, background: CE_LIGHT }} />
              <button onClick={submitDriver} disabled={submitting || !departure || pickupOffered === null}
                className="w-full py-4 rounded-full font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "#1F4E5B", fontSize: 16 }}>
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Lodging setup modal ── */}
      {lodgingModalOpen && (
        <LodgingSetupModal
          eventId={eventId}
          initialGroupId={lodgingGroupId}
          onClose={() => setLodgingModalOpen(false)}
        />
      )}
    </>
  );
}
