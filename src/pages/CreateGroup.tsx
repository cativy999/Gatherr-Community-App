import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Image, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATEGORIES = ["Social", "Spiritual", "FHE", "Service", "Sports", "Study", "Other"];

const CreateGroup = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Group name is required"); return; }
    if (!session?.user) return;

    setSaving(true);
    const { error } = await supabase.from("groups").insert({
      user_id: session.user.id,
      name: name.trim(),
      description: description.trim(),
      category,
    });

    if (error) {
      console.error(error);
      toast.error("Failed to create group. Try again.");
    } else {
      toast.success("Group created!");
      navigate("/community");
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Create Group
          </h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-6">
        <div className="max-w-xl mx-auto space-y-6">

          {/* Group image placeholder */}
          <button className="w-full h-36 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-accent transition-colors">
            <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
              <Image className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-sm">Add group image</span>
            <span className="text-xs opacity-60">Coming soon</span>
          </button>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Group Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Santa Monica Singles"
              className="h-11 rounded-xl"
              maxLength={60}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              className="w-full h-24 px-4 py-3 rounded-xl border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/300</p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(category === cat ? "" : cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-foreground border-[#BBBBBB] hover:bg-gray-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-accent/50">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Groups let you build a community around shared interests. Members can discover events posted by the group.
            </p>
          </div>

          {/* Create button */}
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="w-full h-12 rounded-2xl text-base font-semibold"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Create Group"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CreateGroup;
