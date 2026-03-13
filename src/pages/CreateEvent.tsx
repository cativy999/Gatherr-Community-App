import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Calendar, MapPin, Users, Image as ImageIcon, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { session, loading: sessionLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<"ward" | "community" | null>(null);
  const [isFree, setIsFree] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([25, 35]);
  const [existingStatus, setExistingStatus] = useState<string>("draft");

  // Load existing event data if editing
  useEffect(() => {
    if (!id) return;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching event:", error);
        return;
      }

      setTitle(data.title ?? "");
      setDescription(data.description ?? "");
      setCategory(data.category ?? null);
      setIsFree(data.is_free ?? true);
      setDate(data.date ?? "");
      setMaxAttendees(data.max_attendees?.toString() ?? "");
      setLocation(data.location ?? "");
      setImagePreview(data.image_url ?? null);
      setAgeRange([data.age_min ?? 25, data.age_max ?? 35]);
      setExistingStatus(data.status ?? "draft");
    };

    fetchEvent();
  }, [id]);

  const handleAgeRangeChange = (val: number[]) => {
    let [low, high] = val as [number, number];
    if (high - low > 10) {
      if (low !== ageRange[0]) {
        high = Math.min(low + 10, 80);
      } else {
        low = Math.max(high - 10, 18);
      }
    }
    setAgeRange([low, high]);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressed = new File([blob], file.name, { type: "image/jpeg" });
            setImageFile(compressed);
            setImagePreview(URL.createObjectURL(compressed));
          }
        }, "image/jpeg", 0.7);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    setDeleteOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      alert("Failed to delete event.");
      console.error(error);
    } else {
      navigate("/post");
    }
  };

  const handleSubmit = async (isDraft = false) => {
    if (!title || !date || !location || !category) {
      alert("Please fill in title, date, location and category!");
      return;
    }
    if (sessionLoading) {
      alert("Still loading, please wait a moment!");
      return;
    }
    if (!session?.user) {
      alert("Not logged in!");
      return;
    }

    setLoading(true);
    let imageUrl = imagePreview;

    if (imageFile) {
      const fileName = `${session.user.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, imageFile);

      if (uploadError) {
        console.error("Image upload error:", uploadError);
      } else {
        const { data } = supabase.storage
          .from("event-images")
          .getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }
    }

    const eventData = {
      user_id: session.user.id,
      title,
      description,
      category,
      is_free: isFree,
      date,
      max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      location,
      image_url: imageUrl,
      status: isDraft ? "draft" : "published",
      age_min: ageRange[0],
      age_max: ageRange[1],
    };

    let error;

    if (isEditing) {
      ({ error } = await supabase.from("events").update(eventData).eq("id", id));
    } else {
      ({ error } = await supabase.from("events").insert(eventData));
    }

    if (error) {
      console.error("Error saving event:", JSON.stringify(error));
      alert(JSON.stringify(error));
    } else {
      navigate("/post");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
  <h1 className="text-2xl font-bold">{isEditing ? "Edit Event" : "Create Event"}</h1>
  <div className="flex items-center gap-2">
   
    <Button variant="ghost" size="sm" onClick={() => navigate("/post")}>
      Cancel
    </Button>
    {isEditing && (
      <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={handleDelete} disabled={loading}>
        <Trash2 className="h-5 w-5" />
      </Button>
    )}
  </div>
</div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          <div
            className="flex items-center justify-center w-full h-48 bg-secondary rounded-2xl border-2 border-dashed border-border hover:bg-accent transition-colors cursor-pointer overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <div className="text-center space-y-2">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Tap to upload event image</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Title</label>
              <Input
                placeholder="e.g., Community Picnic"
                className="h-12 text-base"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Tell people about your event..."
                className="min-h-32 text-base"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Activity Category</label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={category === "ward" ? "default" : "outline"}
                  size="lg"
                  className="rounded-full h-12 text-base"
                  onClick={() => setCategory("ward")}
                >
                  Ward
                </Button>
                <Button
                  type="button"
                  variant={category === "community" ? "default" : "outline"}
                  size="lg"
                  className="rounded-full h-12 text-base"
                  onClick={() => setCategory("community")}
                >
                  Community
                </Button>
              </div>
            </div>

            {/* Age Range */}
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Age Range</label>
                <span className="text-sm font-bold text-primary">{ageRange[0]}–{ageRange[1]}</span>
              </div>
              <div className="relative">
                <div className="relative flex justify-between mb-2" style={{
                  paddingLeft: `${((ageRange[0] - 18) / 62) * 100}%`,
                  paddingRight: `${((80 - ageRange[1]) / 62) * 100}%`,
                }}>
                  <span className="text-xs font-semibold text-primary">{ageRange[0]}</span>
                  <span className="text-xs font-semibold text-primary">{ageRange[1]}</span>
                </div>
                <Slider
                  min={18}
                  max={80}
                  step={1}
                  value={ageRange}
                  onValueChange={(val) => setAgeRange(val as [number, number])}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Free Event</label>
                <p className="text-xs text-muted-foreground">
                  {isFree ? "This event is free" : "Attendees need to pay"}
                </p>
              </div>
              <Switch
                checked={isFree}
                onCheckedChange={setIsFree}
                className="data-[state=checked]:bg-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </label>
                <Input
                  type="date"
                  className="h-12 text-base"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Max Attendees
                </label>
                <Input
                  type="number"
                  placeholder="50"
                  className="h-12 text-base"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <Input
                placeholder="e.g., Central Park"
                className="h-12 text-base"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>


          <div className="flex gap-3">
            {/* Show "Save as Draft" only for drafts, not for published events */}
            {(!isEditing || existingStatus === "draft") && (
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-14 text-base font-semibold"
                onClick={() => handleSubmit(true)}
                disabled={loading || sessionLoading}
              >
                Save as Draft
              </Button>
            )}
            <Button
              size="lg"
              className="flex-1 h-14 text-base font-semibold"
              onClick={() => handleSubmit(false)}
              disabled={loading || sessionLoading}
            >
              {loading ? "Saving..." : "Publish"}
            </Button>
          </div>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl">
    <DialogHeader>
      <DialogTitle>Delete Event</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-muted-foreground">Are you sure you want to delete this event? This cannot be undone.</p>
    <div className="flex gap-3 mt-2">
      <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
        Not now
      </Button>
      <Button variant="destructive" className="flex-1" onClick={confirmDelete}>
        Yes, delete
      </Button>
    </div>
  </DialogContent>
</Dialog>

        </div>
        
      </main>

      <BottomNav currentPage="post" />
    </div>
  );
};

export default CreateEvent;