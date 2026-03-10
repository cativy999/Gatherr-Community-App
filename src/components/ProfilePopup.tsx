import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Pencil, Check, MapPin, Loader2 } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/lib/supabase";

interface LocationResult {
  display_name: string;
  place_id: number;
}

interface UserProfile {
  name: string;
  location: string;
  ward: string;
  ldsWard: string;
  ageRange: [number, number];
}

const ProfilePopup = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { location, setLocation: setGlobalLocation } = useLocation();
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    location: location,
    ward: "",
    ldsWard: "",
    ageRange: [25, 35],
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [tempRange, setTempRange] = useState<[number, number]>([25, 35]);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile((p) => ({
          ...p,
          name: data.name || user.user_metadata?.full_name || user.email || "",
          ldsWard: data.ward || "",
          ward: data.ward || "",
          location: data.location || location,
          ageRange: [data.preferred_age_min || 25, data.preferred_age_max || 35],
        }));
        setTempRange([data.preferred_age_min || 25, data.preferred_age_max || 35]);
      }
    };

    if (open) fetchProfile();
  }, [open]);

  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setLocationResults([]);
      return;
    }
    setLocationLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`
      );
      const data = await res.json();
      setLocationResults(data);
    } catch (e) {
      setLocationResults([]);
    }
    setLocationLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (editing === "location") searchLocations(locationSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [locationSearch, editing, searchLocations]);

  const formatLocation = (result: LocationResult) => {
    const parts = result.display_name.split(", ");
    if (parts.length >= 3) {
      return `${parts[0]}, ${parts[parts.length - 2]}`;
    }
    return parts.slice(0, 2).join(", ");
  };

  const startEdit = (field: string) => {
    if (field === "ageRange") {
      setTempRange([...profile.ageRange]);
    } else if (field === "location") {
      setLocationSearch("");
      setLocationResults([]);
    } else {
      setTempValue(profile[field as keyof UserProfile] as string);
    }
    setEditing(field);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { data: { user } } = await supabase.auth.getUser();

    if (editing === "ageRange") {
      setProfile((p) => ({ ...p, ageRange: tempRange }));
      if (user) {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          preferred_age_min: tempRange[0],
          preferred_age_max: tempRange[1],
        }, { onConflict: 'user_id' });
      }
    } else if (editing === "ldsWard") {
      setProfile((p) => ({ ...p, ldsWard: tempValue, ward: tempValue }));
      if (user) {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          ward: tempValue,
        }, { onConflict: 'user_id' });
      }
    } else if (editing === "name") {
      setProfile((p) => ({ ...p, name: tempValue }));
      if (user) {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          name: tempValue,
        }, { onConflict: 'user_id' });
      }
    } else {
      setProfile((p) => ({ ...p, [editing]: tempValue }));
    }
    setEditing(null);
  };

  const selectLocation = async (result: LocationResult) => {
    const formatted = formatLocation(result);
    setProfile((p) => ({ ...p, location: formatted }));
    setGlobalLocation(formatted);
    setEditing(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({
        user_id: user.id,
        location: formatted,
      }, { onConflict: 'user_id' });
    }
  };

  const handleRangeChange = (val: number[]) => {
    let [low, high] = val as [number, number];
    if (high - low > 10) {
      if (low !== tempRange[0]) {
        high = Math.min(low + 10, 80);
      } else {
        low = Math.max(high - 10, 18);
      }
    }
    setTempRange([low, high]);
  };

  const fields = [
    { key: "name", label: "Name" },
    { key: "location", label: "Location" },
    { key: "ldsWard", label: "LDS Ward" },
    { key: "ageRange", label: "Age Range" },
  ];

  const renderEditField = (key: string) => {
    if (key === "ageRange") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
            <span className="text-primary">{tempRange[0]}</span>
            <span className="text-muted-foreground">–</span>
            <span className="text-primary">{tempRange[1]}</span>
          </div>
          <Slider min={18} max={80} step={1} value={tempRange} onValueChange={handleRangeChange} className="w-full" />
          <p className="text-[10px] text-muted-foreground text-center">Max 10 year span</p>
        </div>
      );
    }

    if (key === "location") {
      return (
        <div className="space-y-2">
          <Input
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            placeholder="Search any city..."
            className="h-10 text-sm rounded-xl"
            autoFocus
          />
          {locationLoading && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          <div className="max-h-[180px] overflow-y-auto space-y-0.5">
            {locationResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => selectLocation(result)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors text-left"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">{formatLocation(result)}</span>
              </button>
            ))}
            {!locationLoading && locationSearch.length > 1 && locationResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No locations found</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <Input
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        className="h-10 text-sm rounded-xl"
        autoFocus
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-lg font-bold">My Profile</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-1">
          {fields.map(({ key, label }) => (
            <div key={key}>
              {editing === key ? (
                <div className="py-3 space-y-3 bg-accent/50 -mx-5 px-5 rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
                  {renderEditField(key)}
                  {key !== "location" && (
                    <div className="flex justify-end">
                      <Button size="sm" onClick={saveEdit} className="h-8 px-3 rounded-lg gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => startEdit(key)}
                  className="w-full flex items-center justify-between py-3 hover:bg-accent/30 -mx-2 px-2 rounded-lg transition-colors group"
                >
                  <div className="text-left">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-medium text-foreground">
                      {key === "ageRange"
                        ? `${profile.ageRange[0]}–${profile.ageRange[1]}`
                        : (profile[key as keyof UserProfile] as string)}
                    </p>
                  </div>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePopup;