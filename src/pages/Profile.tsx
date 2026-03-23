import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, LogOut, Pencil, Check, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface LocationResult {
  display_name: string;
  place_id: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { setPreferredAge, preferredAgeMin, preferredAgeMax } = useUserProfile();
  const { setLocation: setGlobalLocation } = useLocation();

  const user = session?.user;
  const avatar = user?.user_metadata?.avatar_url;

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [ward, setWard] = useState("");
  const [age, setAge] = useState<string>("");
  const [tempAge, setTempAge] = useState<string>("");
  const [ageRange, setAgeRange] = useState<[number, number]>([preferredAgeMin, preferredAgeMax]);

  const [editing, setEditing] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [tempRange, setTempRange] = useState<[number, number]>([preferredAgeMin, preferredAgeMax]);
  const [saving, setSaving] = useState(false);

  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U";

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, location, ward, preferred_age_min, preferred_age_max, avatar_url, age")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setName(data.name ?? "");
        setLocation(data.location || "");
        setWard(data.ward || "");
        setAge(data.age ? String(data.age) : "");
        const min = data.preferred_age_min ?? preferredAgeMin;
        const max = data.preferred_age_max ?? preferredAgeMax;
        setAgeRange([min, max]);
        setTempRange([min, max]);
      }
    };
    fetchProfile();
  }, [user]);

  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) { setLocationResults([]); return; }
    setLocationLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`
      );
      const data = await res.json();
      setLocationResults(data);
    } catch { setLocationResults([]); }
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
    if (parts.length >= 3) return `${parts[0]}, ${parts[parts.length - 2]}`;
    return parts.slice(0, 2).join(", ");
  };

  const startEdit = (field: string) => {
    if (field === "ageRange") {
      setTempRange([...ageRange]);
    } else if (field === "location") {
      setLocationSearch("");
      setLocationResults([]);
    } else if (field === "name") {
      setTempValue(name);
    } else if (field === "ward") {
      setTempValue(ward);
    } else if (field === "age") {
      setTempAge(age);
    }
    setEditing(field);
  };

  const cancelEdit = () => setEditing(null);

  const saveField = async (field: string) => {
    if (!user) return;
    setSaving(true);
    try {
      if (field === "name") {
        await supabase.from("profiles").upsert({ user_id: user.id, name: tempValue }, { onConflict: "user_id" });
        setName(tempValue);
        toast.success("Name updated!");
      } else if (field === "ward") {
        await supabase.from("profiles").upsert({ user_id: user.id, ward: tempValue }, { onConflict: "user_id" });
        setWard(tempValue);
        toast.success("Ward updated!");
      } else if (field === "age") {
        await supabase.from("profiles").upsert({ user_id: user.id, age: parseInt(tempAge) }, { onConflict: "user_id" });
        setAge(tempAge);
        toast.success("Age updated!");
      } else if (field === "ageRange") {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          preferred_age_min: tempRange[0],
          preferred_age_max: tempRange[1],
        }, { onConflict: "user_id" });
        setAgeRange(tempRange);
        setPreferredAge(tempRange[0], tempRange[1]);
        toast.success("Age range updated!");
      }
    } catch { toast.error("Something went wrong"); }
    setSaving(false);
    setEditing(null);
  };

  const selectLocation = async (result: LocationResult) => {
    if (!user) return;
    const formatted = formatLocation(result);
    await supabase.from("profiles").upsert({ user_id: user.id, location: formatted }, { onConflict: "user_id" });
    setLocation(formatted);
    setGlobalLocation(formatted);
    setEditing(null);
    toast.success("Location updated!");
  };

  const handleRangeChange = (val: number[]) => {
    let [low, high] = val as [number, number];
    if (high - low > 10) {
      if (low !== tempRange[0]) high = Math.min(low + 10, 80);
      else low = Math.max(high - 10, 18);
    }
    setTempRange([low, high]);
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const fields = [
    { key: "name", label: "Name", value: name },
    { key: "age", label: "Age", value: age },
    { key: "location", label: "Location", value: location },
    { key: "ward", label: "LDS Ward", value: ward },
    { key: "ageRange", label: "Age Range", value: `${ageRange[0]}–${ageRange[1]}` },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Avatar + Name */}
          <div className="flex flex-col items-center space-y-4 text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatar} referrerPolicy="no-referrer" />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{name}</h2>
              {location && (
                <p className="text-muted-foreground flex items-center justify-center gap-1 mt-1 text-sm">
                  <MapPin className="h-4 w-4" />
                  {location}
                </p>
              )}
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-2 rounded-2xl border border-border overflow-hidden">
            {fields.map(({ key, label, value }) => (
              <div key={key} className="border-b border-border last:border-0">
                {editing === key ? (
                  <div className="p-4 space-y-3 bg-accent/30">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>

                    {key === "ageRange" && (
                      <div className="space-y-3">
                        <div className="relative flex justify-between mb-2" style={{
                          paddingLeft: `${((tempRange[0] - 18) / 62) * 100}%`,
                          paddingRight: `${((80 - tempRange[1]) / 62) * 100}%`,
                        }}>
                          <span className="text-xs font-semibold text-primary">{tempRange[0]}</span>
                          <span className="text-xs font-semibold text-primary">{tempRange[1]}</span>
                        </div>
                        <Slider min={18} max={80} step={1} value={tempRange} onValueChange={handleRangeChange} className="w-full" />
                      </div>
                    )}

                    {key === "location" && (
                      <div className="space-y-2">
                        <Input
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          placeholder="Search any city..."
                          className="h-10 text-sm"
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
                              <span>{formatLocation(result)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(key === "name" || key === "ward") && (
                      <Input
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="h-10 text-sm"
                        autoFocus
                      />
                    )}

                    {key === "age" && (
                      <Input
                        type="number"
                        value={tempAge}
                        onChange={(e) => setTempAge(e.target.value)}
                        placeholder="Enter your age"
                        className="h-10 text-sm"
                        min={13}
                        max={120}
                        autoFocus
                      />
                    )}

                    {key !== "location" && (
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 px-3 gap-1">
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                        <Button size="sm" onClick={() => saveField(key)} className="h-8 px-3 gap-1" disabled={saving}>
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors group"
                  >
                    <div className="text-left">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{value || "Not set"}</p>
                    </div>
                    <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Log Out */}
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 text-destructive hover:text-destructive"
            onClick={handleLogOut}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Log Out
          </Button>

        </div>
      </main>

      <BottomNav currentPage="profile" />
    </div>
  );
};

export default Profile;