import { createContext, useContext, useState, ReactNode } from "react";

interface LocationContextType {
  location: string;
  setLocation: (location: string) => void;
  locationLat: number | null;
  locationLng: number | null;
  setLocationCoords: (lat: number, lng: number) => void;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState("Everywhere");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);

  const setLocationCoords = (lat: number, lng: number) => {
    setLocationLat(lat);
    setLocationLng(lng);
  };

  const clearLocation = () => {
    setLocation("Everywhere");
    setLocationLat(null);
    setLocationLng(null);
  };
  return (
    <LocationContext.Provider value={{ location, setLocation, locationLat, locationLng, setLocationCoords, clearLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used within LocationProvider");
  return context;
};