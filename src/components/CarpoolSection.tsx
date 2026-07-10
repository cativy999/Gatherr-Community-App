import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { X } from "lucide-react";

interface CarpoolPost {
  id: string;
  user_id: string;
  type: "driver" | "rider";
  has_car: boolean;
  pickup_needed: boolean;
  seats: number | null;
  departure_window: string | null;
  lat: number | null;
  lng: number | null;
  distance?: number;
  profile: { name: string; avatar_url: string | null };
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

export default function CarpoolSection({ eventId }: { eventId: string }) {
  const { session } = useAuth();
  const { locationLat, locationLng } = useLocation();
  const userId = session?.user?.id;

  const [posts, setPosts] = useState<CarpoolPost[]>([]);
  const [myPost, setMyPost] = useState<CarpoolPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"rider" | "driver" | null>(null);

  // Rider form
  const [hasCar, setHasCar] = useState<boolean | null>(null);
  const [pickupNeeded, setPickupNeeded] = useState<boolean | null>(null);

  // Driver form
  const [seats, setSeats] = useState(3);
  const [departure, setDeparture] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchPosts(); }, [eventId]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("carpool_posts")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (!rows) { setLoading(false); return; }

    // Fetch profiles
    const uids = [...new Set(rows.map((r: any) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", uids);

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p: any) => [p.user_id, p])
    );

    const mapped: CarpoolPost[] = rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      has_car: row.has_car,
      pickup_needed: row.pickup_needed,
      seats: row.seats,
      departure_window: row.departure_window,
      lat: row.lat,
      lng: row.lng,
      profile: profileMap[row.user_id] ?? { name: "Someone", avatar_url: null },
      distance:
        locationLat && locationLng && row.lat && row.lng
          ? haversineKm(locationLat, locationLng, row.lat, row.lng)
          : undefined,
    }));

    mapped.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    setPosts(mapped);
    setMyPost(userId ? (mapped.find((p) => p.user_id === userId) ?? null) : null);
    setLoading(false);
  };

  const submitRider = async () => {
    if (!userId || hasCar === null) return;
    if (!hasCar && pickupNeeded === null) return;
    setSubmitting(true);
    await supabase.from("carpool_posts").upsert(
      {
        event_id: eventId,
        user_id: userId,
        type: "rider",
        has_car: hasCar,
        pickup_needed: hasCar ? false : (pickupNeeded ?? false),
        seats: null,
        departure_window: null,
        lat: locationLat,
        lng: locationLng,
        status: "active",
      },
      { onConflict: "event_id,user_id" }
    );
    setModal(null); setHasCar(null); setPickupNeeded(null); setSubmitting(false);
    fetchPosts();
  };

  const submitDriver = async () => {
    if (!userId || !departure) return;
    setSubmitting(true);
    await supabase.from("carpool_posts").upsert(
      {
        event_id: eventId,
        user_id: userId,
        type: "driver",
        has_car: true,
        pickup_needed: false,
        seats,
        departure_window: departure,
        lat: locationLat,
        lng: locationLng,
        status: "active",
      },
      { onConflict: "event_id,user_id" }
    );
    setModal(null); setDeparture(null); setSeats(3); setSubmitting(false);
    fetchPosts();
  };

  const cancelPost = async () => {
    if (!myPost) return;
    await supabase.from("carpool_posts").update({ status: "cancelled" }).eq("id", myPost.id);
    setMyPost(null);
    fetchPosts();
  };

  return (
    <>
      <div className="space-y-4">
        <h2
          className="text-[16px] font-bold pb-2 border-b"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif", borderColor: "rgba(0,0,0,0.1)" }}
        >
          Carpool 🚗
        </h2>

        {/* My post or action buttons */}
        {myPost ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div>
              <p className="text-sm font-semibold">
                {myPost.type === "driver"
                  ? `You're offering a ride · ${myPost.seats} seat${myPost.seats !== 1 ? "s" : ""}`
                  : "You need a ride"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {myPost.type === "driver"
                  ? myPost.departure_window
                  : myPost.has_car
                  ? "Has car · Open to driving if needed"
                  : myPost.pickup_needed
                  ? "Needs pickup"
                  : "Can meet driver"}
              </p>
            </div>
            <button onClick={cancelPost} className="text-xs text-red-500 font-medium hover:underline ml-4 shrink-0">
              Cancel
            </button>
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
              onClick={() => { setModal("driver"); setDeparture(null); setSeats(3); }}
              className="flex-1 h-11 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              🚗 I can drive
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Sign in to join carpool</p>
        )}

        {/* Posts */}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No carpool posts yet — be the first!</p>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden shrink-0">
                  {post.profile.avatar_url ? (
                    <img src={post.profile.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                      {post.profile.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{post.profile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {post.type === "driver"
                      ? `🚗 ${post.seats} seat${post.seats !== 1 ? "s" : ""} · ${post.departure_window}`
                      : post.has_car
                      ? "🚗 Has car · Open to driving"
                      : post.pickup_needed
                      ? "🙋 Needs pickup"
                      : "🙋 Can meet driver"}
                  </p>
                </div>
                {post.distance !== undefined && (
                  <span className="text-xs text-muted-foreground shrink-0">{fmtDist(post.distance)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rider modal */}
      {modal === "rider" && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-6 space-y-5 pb-28 md:pb-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">I need a ride</h3>
              <button onClick={() => setModal(null)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Do you have a car?</p>
              <div className="flex gap-2">
                {[{ label: "Yes, I have a car", val: true }, { label: "No car", val: false }].map(({ label, val }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setHasCar(val); setPickupNeeded(null); }}
                    className={`flex-1 h-11 rounded-xl border-2 text-sm font-semibold transition-all ${hasCar === val ? "bg-black text-white border-black" : "border-gray-200"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {hasCar === false && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Can you get to the driver, or need pickup?</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "I can meet the driver 📍", val: false },
                    { label: "I need to be picked up 🚪", val: true },
                  ].map(({ label, val }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPickupNeeded(val)}
                      className={`w-full h-12 rounded-xl border-2 text-sm font-semibold transition-all ${pickupNeeded === val ? "bg-black text-white border-black" : "border-gray-200"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={submitRider}
              disabled={submitting || hasCar === null || (hasCar === false && pickupNeeded === null)}
              className="w-full h-12 rounded-xl bg-black text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}

      {/* Driver modal */}
      {modal === "driver" && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-6 space-y-5 pb-28 md:pb-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">I can drive</h3>
              <button onClick={() => setModal(null)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">How many seats can you offer?</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeats(n)}
                    className={`w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all ${seats === n ? "bg-black text-white border-black" : "border-gray-200"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Rough departure time</p>
              <div className="grid grid-cols-2 gap-2">
                {["Morning", "Afternoon", "Evening", "Flexible"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDeparture(d)}
                    className={`h-11 rounded-xl border-2 text-sm font-semibold transition-all ${departure === d ? "bg-black text-white border-black" : "border-gray-200"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={submitDriver}
              disabled={submitting || !departure}
              className="w-full h-12 rounded-xl bg-black text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
