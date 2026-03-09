import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Pencil, Check, MapPin } from "lucide-react";

const LOCATIONS = [
  "Los Angeles, CA",
  "San Diego, CA",
  "San Francisco, CA",
  "Santa Monica, CA",
  "Long Beach, CA",
  "Irvine, CA",
  "Pasadena, CA",
  "Burbank, CA",
  "Glendale, CA",
  "Anaheim, CA",
  "Provo, UT",
  "Salt Lake City, UT",
  "Orem, UT",
  "Lehi, UT",
  "Mesa, AZ",
  "Gilbert, AZ",
  "Rexburg, ID",
  "Boise, ID",
  "Las Vegas, NV",
  "Portland, OR",
  "Seattle, WA",
  "New York, NY",
  "Austin, TX",
  "Dallas, TX",
  "Houston, TX",
  "Chicago, IL",
  "Miami, FL",
  "Denver, CO",
];

interface UserProfile {
  name: string;
  location: string;
  ward: string;
  ldsWard: string;
  ageRange: [number, number];
}

const ProfilePopup = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const [profile, setProfile] = useState<UserProfile>({
    name: "Ivy Wang",
    location: "LA",
    ward: "Santa Monica",
    ldsWard: "Santa Monica 3rd",
    ageRange: [29, 39],
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [tempRange, setTempRange] = useState<[number, number]>([29, 39]);
  const [locationSearch, setLocationSearch] = useState("");

  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) return LOCATIONS.slice(0, 6);
    return LOCATIONS.filter((loc) =>
      loc.toLowerCase().includes(locationSearch.toLowerCase())
    ).slice(0, 6);
  }, [locationSearch]);

  const startEdit = (field: string) => {
    if (field === "ageRange") {
      setTempRange([...profile.ageRange]);
    } else if (field === "location") {
      setLocationSearch("");
    } else {
      setTempValue(profile[field as keyof UserProfile] as string);
    }
    setEditing(field);
  };

  const saveEdit = () => {
    if (!editing) return;
    if (editing === "ageRange") {
      setProfile((p) => ({ ...p, ageRange: tempRange }));
    } else {
      setProfile((p) => ({ ...p, [editing]: tempValue }));
    }
    setEditing(null);
  };

  const selectLocation = (loc: string) => {
    setProfile((p) => ({ ...p, location: loc }));
    setEditing(null);
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
            placeholder="Search location..."
            className="h-10 text-sm rounded-xl"
            autoFocus
          />
          <div className="max-h-[180px] overflow-y-auto space-y-0.5">
            {filteredLocations.map((loc) => (
              <button
                key={loc}
                onClick={() => selectLocation(loc)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors text-left"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">{loc}</span>
              </button>
            ))}
            {filteredLocations.length === 0 && (
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
      <DialogContent className="sm:max-w-[360px] rounded-2xl p-0 overflow-hidden">
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
