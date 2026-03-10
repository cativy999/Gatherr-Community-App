import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Users, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const Post = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<"ward" | "community" | null>(null);
  const [isFree, setIsFree] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  const handleSubmit = async () => {
    if (!title || !date || !location || !category) {
      alert("Please fill in title, date, location and category!");
      return;
    }
    if (!userId) {
      alert("Not logged in!");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("events").insert({
      user_id: userId,
      title,
      description,
      category,
      is_free: isFree,
      date,
      max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      location,
    });

    if (error) {
      console.error("Error creating event:", error);
      alert("Something went wrong!");
    } else {
      navigate("/home");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Create Event</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate("/home")}>
            Cancel
          </Button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-center w-full h-32 bg-secondary rounded-2xl border-2 border-dashed border-border hover:bg-accent transition-colors cursor-pointer">
            <div className="text-center space-y-2">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload event image</p>
            </div>
          </div>

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

          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </main>

      <BottomNav currentPage="post" />
    </div>
  );
};

export default Post;