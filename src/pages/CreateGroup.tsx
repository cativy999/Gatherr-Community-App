import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Image as ImageIcon, Loader2, Link, Link2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const WARD_LIST = [
  { type: "header", label: "YSA Wards" },
  { type: "ward", label: "Santa Monica YSA" },
  { type: "ward", label: "South Bay YSA" },
  { type: "ward", label: "San Gabriel Valley YSA" },
  { type: "ward", label: "Huntington Beach YSA" },
  { type: "ward", label: "Inland Empire YSA" },
  { type: "header", label: "Single Adult Wards" },
  { type: "ward", label: "Glendale SA Ward" },
  { type: "ward", label: "Huntington Beach SA" },
  { type: "ward", label: "Inland Empire Mid-Singles" },
  { type: "ward", label: "Heritage Park Mid-Singles" },
  { type: "ward", label: "Corona Single Adult" },
];




const CreateGroup = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { id } = useParams();
  const isEditing = !!id;
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goodToKnow, setGoodToKnow] = useState("");
  const [address, setAddress] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [claimedWards, setClaimedWards] = useState<string[]>([]);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("groups")
      .select("name, id")
      .then(({ data }) => {
        // When editing, exclude current group from claimed list
        setClaimedWards((data ?? []).filter((g: any) => g.id !== id).map((g: any) => g.name));
      });
  }, [id]);

  // Load existing data when editing
  useEffect(() => {
    if (!id) return;
    supabase.from("groups").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) return;
      setName(data.name ?? "");
      setDescription(data.description ?? "");
      setGoodToKnow(data.good_to_know ?? "");
      setAddress(data.address ?? "");
      setFacebook(data.facebook_url ?? "");
      setInstagram(data.instagram_url ?? "");
      setWebsite(data.website_url ?? "");
      if (data.cover_image_url) { setCoverPreview(data.cover_image_url); setExistingCoverUrl(data.cover_image_url); }
      if (data.avatar_url) { setAvatarPreview(data.avatar_url); setExistingAvatarUrl(data.avatar_url); }
    });
  }, [id]);

  

  const handleImagePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (v: string) => void,
    setFile: (f: File) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File, folder: string) => {
    const fileName = `${folder}/${session!.user.id}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("group-images").upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from("group-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Group name is required"); return; }
    if (!session?.user) return;

    setSaving(true);

    let coverUrl = existingCoverUrl;
    let avatarUrl = existingAvatarUrl;

    if (coverFile) coverUrl = await uploadImage(coverFile, "covers");
    if (avatarFile) avatarUrl = await uploadImage(avatarFile, "avatars");

    const payload = {
      user_id: session.user.id,
      name: name.trim(),
      description: description.trim(),
      good_to_know: goodToKnow.trim(),
      address: address.trim(),
      facebook_url: facebook.trim() || null,
      instagram_url: instagram.trim() || null,
      website_url: website.trim() || null,
      cover_image_url: coverUrl,
      avatar_url: avatarUrl,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("groups").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("groups").insert(payload));
    }

    if (error) {
      console.error(error);
      toast.error(isEditing ? "Failed to update group." : "Failed to create group. Try again.");
    } else {
      toast.success(isEditing ? "Group updated! ✅" : "Group created! 🎉");
      navigate(isEditing ? `/group/${id}` : "/community");
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            {isEditing ? "Edit Group" : "Create Group"}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-6">
        <div className="max-w-xl mx-auto space-y-6">

          {/* Cover Photo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cover Photo</label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="relative w-full h-40 rounded-2xl overflow-hidden border border-border cursor-pointer bg-secondary flex items-center justify-center"
            >
              {coverPreview ? (
                <img src={coverPreview} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-sm">Tap to upload cover photo</span>
                </div>
              )}
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleImagePick(e, setCoverPreview, setCoverFile)} />
          </div>

          {/* Avatar */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Profile Picture</label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-20 h-20 rounded-full border border-border cursor-pointer bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Tap to upload a profile picture for your group</p>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleImagePick(e, setAvatarPreview, setAvatarFile)} />
          </div>

          

          {/* Group Name */}
<div className="space-y-2">
  <label className="text-sm font-medium">Select Your Ward *</label>
  <select
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full h-12 px-3 text-base rounded-md border border-input bg-background"
  >
    <option value="">Select a ward...</option>
    {WARD_LIST.map((item, i) => {
      if (item.type === "header") {
        return <option key={i} disabled className="font-bold text-muted-foreground">── {item.label} ──</option>;
      }
      const isClaimed = claimedWards.includes(item.label);
      return (
        <option key={i} value={item.label} disabled={isClaimed}>
          {item.label} {isClaimed ? "(Claimed)" : ""}
        </option>
      );
    })}
  </select>
</div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Address
            </label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 3400 Sawtelle Blvd, Los Angeles, CA" className="h-12" />
          </div>

          {/* About */}
          <div className="space-y-2">
            <label className="text-sm font-medium">About</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people about your group..."
              className="w-full h-28 px-4 py-3 rounded-xl border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={500} />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>

          {/* Good to Know */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Good to Know</label>
            <textarea value={goodToKnow} onChange={(e) => setGoodToKnow(e.target.value)}
              placeholder="e.g. Sacrament Meeting: 12:30 PM, Parking available..."
              className="w-full h-24 px-4 py-3 rounded-xl border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={300} />
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Social Links</label>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Link className="h-4 w-4 text-blue-600" />
              </div>
              <Input value={facebook} onChange={(e) => setFacebook(e.target.value)}
                placeholder="Facebook URL" className="h-11" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
              <Link2 className="h-4 w-4 text-pink-600" />
              </div>
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)}
                placeholder="Instagram URL" className="h-11" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Globe className="h-4 w-4 text-green-600" />
              </div>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)}
                placeholder="Website URL" className="h-11" />
            </div>
          </div>

          {/* Submit */}
          <Button onClick={handleCreate} disabled={saving || !name.trim()} className="w-full h-12 rounded-2xl text-base font-semibold">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : isEditing ? "Save Changes ✅" : "Create Group 🎉"}
          </Button>

        </div>
      </main>
    </div>
  );
};

export default CreateGroup;