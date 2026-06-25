import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Camera, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface OOTDItem {
  id: string;
  photo: string;
  name: string;
}

const OOTDReview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const passedPhoto: string | undefined = (location.state as { photo?: string } | null)?.photo;

  const [heroPhoto, setHeroPhoto] = useState<string | undefined>(passedPhoto);
  const [gender, setGender] = useState<"Women" | "Men">("Women");
  const [items, setItems] = useState<OOTDItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const mainPhotoInputRef = useRef<HTMLInputElement>(null);
  const itemPhotoInputRef = useRef<HTMLInputElement>(null);
  const retakeInputRef = useRef<HTMLInputElement>(null);

  // No photo to review (e.g. direct nav) — bounce back to the capture screen.
  useEffect(() => {
    if (!passedPhoto) navigate("/ootd", { replace: true });
  }, [passedPhoto, navigate]);

  const activeItem = items.find((i) => i.id === activeId) || null;

  const handleChangeMainPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroPhoto(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleAddItem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const id = `${Date.now()}`;
    setItems((prev) => [...prev, { id, photo: url, name: "" }]);
    setActiveId(id);
    e.target.value = "";
  };

  const handleRetakeItem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    const url = URL.createObjectURL(file);
    setItems((prev) => prev.map((i) => (i.id === activeId ? { ...i, photo: url } : i)));
    e.target.value = "";
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setActiveId((curr) => (curr === id ? null : curr));
  };

  const updateActiveName = (name: string) => {
    if (!activeId) return;
    setItems((prev) => prev.map((i) => (i.id === activeId ? { ...i, name } : i)));
  };

  const handleAllDone = () => {
    if (items.length === 0) {
      toast.error("Add at least one item before finishing.");
      return;
    }
    // TODO: hand off to the price-tag template builder once it's built.
    toast.success("Saved! Next step coming soon ✨");
  };

  if (!heroPhoto) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="w-full max-w-[480px] mx-auto px-6 pt-4 pb-10 flex flex-col gap-7">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full border"
            style={{ borderColor: "#eaeaea" }}
            aria-label="Back"
          >
            <ChevronLeft size={20} color="#1a1a1a" />
          </button>

          <div className="flex items-center p-1 rounded-full border bg-white" style={{ borderColor: "#eaeaea" }}>
            {(["Women", "Men"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{
                  background: gender === g ? "#111" : "transparent",
                  color: gender === g ? "#fff" : "#666",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                }}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="w-10 h-10" />
        </div>

        {/* Title */}
        <div className="flex items-center gap-2">
          <h1
            className="text-[30px] sm:text-[34px] font-semibold text-[#1a1a1a] leading-none"
            style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
          >
            My OOTD
          </h1>
          <img src="/OOTD/stars.png" alt="" draggable={false} className="h-6 sm:h-7 w-auto select-none" />
        </div>

        {/* Hero photo */}
        <div className="relative w-full h-[340px] sm:h-[400px] rounded-2xl overflow-hidden bg-[#f1f1f1]">
          <img src={heroPhoto} alt="Your outfit" className="absolute inset-0 w-full h-full object-contain" />
          <button
            onClick={() => mainPhotoInputRef.current?.click()}
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold"
            style={{
              background: "rgba(255,255,255,0.93)",
              border: "1px solid #eaeaea",
              color: "#111",
              boxShadow: "0px 6px 16px 0px rgba(0,0,0,0.08)",
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}
          >
            <Camera size={16} />
            Change Photo
          </button>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p
              className="text-[13px] leading-snug"
              style={{ color: "#666", fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              Add a close-up photo of each item you're wearing — hat, top, shoes, accessories — so people can shop your look.
            </p>
            <div className="flex items-start gap-4 overflow-x-auto pt-2 -mx-6 px-6 sm:mx-0 sm:px-0">
            {items.map((item) => (
              <div key={item.id} className="relative flex-shrink-0">
                <button
                  onClick={() => setActiveId(item.id)}
                  className="w-20 h-20 rounded-2xl bg-white p-1"
                  style={{
                    border: activeId === item.id ? "2px dashed #111" : "1px solid #eaeaea",
                  }}
                >
                  <img
                    src={item.photo}
                    alt={item.name || "Outfit item"}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                  className="absolute -right-2 -top-2 flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-white"
                  style={{ background: "#111" }}
                >
                  <X size={10} color="#fff" />
                </button>
              </div>
            ))}

            <button
              onClick={() => itemPhotoInputRef.current?.click()}
              aria-label="Add item photo"
              className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: "#d1d5db" }}
            >
              <Plus size={22} color="#666" />
            </button>
            </div>
          </div>

          {activeItem && (
            <div className="flex flex-col gap-2">
              <p
                className="text-[13px] font-semibold uppercase tracking-wide"
                style={{ color: "#666", fontFamily: "'Hanken Grotesk', sans-serif" }}
              >
                Item Name
              </p>
              <div className="flex items-center gap-3">
                <input
                  value={activeItem.name}
                  onChange={(e) => updateActiveName(e.target.value)}
                  placeholder="e.g. Black Felt Fedora"
                  className="flex-1 h-[52px] rounded-2xl px-4 text-[15px] text-[#1a1a1a] outline-none border focus:border-[#111] transition-colors"
                  style={{ borderColor: "#eaeaea", fontFamily: "'Hanken Grotesk', sans-serif" }}
                />
                <button
                  onClick={() => retakeInputRef.current?.click()}
                  aria-label="Retake item photo"
                  className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 w-[52px] h-[52px] rounded-2xl border"
                  style={{ borderColor: "#eaeaea" }}
                >
                  <Camera size={15} color="#111" />
                  <span
                    className="text-[10px] leading-none"
                    style={{ color: "#666", fontFamily: "'Hanken Grotesk', sans-serif" }}
                  >
                    Retake
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* All Done — same primary-button style as the capture screen */}
        <button
          onClick={handleAllDone}
          className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ background: "#0F172A", fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          All Done
        </button>
      </div>

      {/* Hidden file inputs */}
      <input ref={mainPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleChangeMainPhoto} />
      <input ref={itemPhotoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddItem} />
      <input ref={retakeInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleRetakeItem} />
    </div>
  );
};

export default OOTDReview;
