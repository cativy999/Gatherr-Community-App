import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface LocationContextType {
  location: string;
  setLocation: (location: string) => void;
  locationLat: number | null;
  locationLng: number | null;
  setLocationCoords: (lat: number, lng: number) => void;
  clearLocation: () => void;
  detectedLocation: string | null;
  detectedLat: number | null;
  detectedLng: number | null;
  restoreDetectedLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const CACHE_KEY = "gatherr_location_cache";
const DETECTED_KEY = "gatherr_detected_location";

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  // Load from cache first so there's no flash of "Everywhere"
  const cached = (() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch { return null; }
  })();

  // Load previously detected location so "My Location" works even after "Everywhere"
  const cachedDetected = (() => {
    try { return JSON.parse(localStorage.getItem(DETECTED_KEY) || "null"); } catch { return null; }
  })();

  const [location, setLocationState] = useState<string>(cached?.location || "Everywhere");
  const [locationLat, setLocationLat] = useState<number | null>(cached?.lat || null);
  const [locationLng, setLocationLng] = useState<number | null>(cached?.lng || null);

  const [detectedLocation, setDetectedLocation] = useState<string | null>(cachedDetected?.location || null);
  const [detectedLat, setDetectedLat] = useState<number | null>(cachedDetected?.lat || null);
  const [detectedLng, setDetectedLng] = useState<number | null>(cachedDetected?.lng || null);

  const setLocation = (loc: string) => {
    setLocationState(loc);
  };

  const setLocationCoords = (lat: number, lng: number) => {
    setLocationLat(lat);
    setLocationLng(lng);
  };

  const clearLocation = () => {
    setLocationState("Everywhere");
    setLocationLat(null);
    setLocationLng(null);
    localStorage.removeItem(CACHE_KEY);
  };

  const restoreDetectedLocation = () => {
    if (detectedLocation && detectedLat && detectedLng) {
      setLocationState(detectedLocation);
      setLocationLat(detectedLat);
      setLocationLng(detectedLng);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ location: detectedLocation, lat: detectedLat, lng: detectedLng }));
    }
  };

  // Auto-detect location on first load if nothing is cached
  useEffect(() => {
    if (cached?.location && cached.location !== "Everywhere") return; // already have a location
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const { city, town, village, state, country } = data.address || {};
          const place = city || town || village || data.display_name?.split(",")[0];
          const label = place ? `${place}, ${state || country}` : "Everywhere";

          setLocationState(label);
          setLocationLat(lat);
          setLocationLng(lng);

          // Save as detected location (persists through "Everywhere" clears)
          setDetectedLocation(label);
          setDetectedLat(lat);
          setDetectedLng(lng);
          localStorage.setItem(DETECTED_KEY, JSON.stringify({ location: label, lat, lng }));

          // Cache for next session
          localStorage.setItem(CACHE_KEY, JSON.stringify({ location: label, lat, lng }));
        } catch {
          // reverse geocode failed — stay Everywhere
        }
      },
      () => {
        // user denied or error — stay Everywhere
      },
      { timeout: 8000 }
    );
  }, []);

  // Keep cache in sync when user manually picks a location
  useEffect(() => {
    if (location !== "Everywhere" && locationLat && locationLng) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ location, lat: locationLat, lng: locationLng }));
    }
  }, [location, locationLat, locationLng]);

  return (
    <LocationContext.Provider value={{ location, setLocation, locationLat, locationLng, setLocationCoords, clearLocation, detectedLocation, detectedLat, detectedLng, restoreDetectedLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used within LocationProvider");
  return context;
};
